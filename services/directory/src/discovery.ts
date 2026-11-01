import { validateDirectoryEvent } from '../../../src/identity/events';
import type { DirectoryEvent } from '../../../src/identity/events';
import type { DirectoryStore } from './store';
import type { QueryRelay } from './relay';
import type { DirectoryRelay } from './ingest';
import { ingest } from './ingest';
import { AdmissionPolicy } from './policy';

type Source = {name:string;relay:QueryRelay};
type Progress = {until:number;watermark:number;reconcileAfter:string;lastCompletedAt?:string;saturated?:boolean;capped?:boolean;error?:string};
export class DiscoveryWorker {
  private timer?:ReturnType<typeof setTimeout>;
  private busy=false;
  private idle:Promise<void>=Promise.resolve();
  private stopped=false;
  private controller?:AbortController;
  private policy:AdmissionPolicy;
  private bootstrap:number;
  constructor(private store:DirectoryStore,private local:DirectoryRelay,private peers:Source[],private options:{bootstrapAuthors?:number;delayMs?:number;intervalMs?:number;policy?:AdmissionPolicy}={}) {
    this.bootstrap=Math.min(300,Math.max(1,options.bootstrapAuthors ?? 300));
    this.policy=options.policy ?? new AdmissionPolicy(store);
    if(peers.length>4 || peers.some(p=>!p.name || p.name.length>200)) throw new Error('invalid sources');
  }
  private async accept(events:DirectoryEvent[],source:string,authorBudget:number):Promise<boolean> {
    let capped=false;
    for(const event of events) {
      if(this.stopped) throw new Error('discovery stopped');
      if(!validateDirectoryEvent(event)) throw new Error('invalid peer event');
      if(!this.store.has(event.pubkey) && this.store.roster(true).length>=authorBudget) {capped=true;continue;}
      if(event.kind===10011 && this.store.current(event.pubkey,10011)?.id===event.id) continue;
      this.policy.admit(event,source);
      await ingest(event,this.local,this.store);
      if(!this.stopped && (this.options.delayMs ?? 1100)>0) await new Promise<void>(resolve=>setTimeout(resolve,this.options.delayMs ?? 1100));
    }
    return capped;
  }
  async tick():Promise<void> {
    if(this.busy || this.stopped) return;
    this.busy=true; this.controller=new AbortController();
    let finish!:()=>void;
    this.idle=new Promise<void>(resolve=>{finish=resolve;});
    const statuses:Record<string,unknown>[]=[];
    let allSucceeded=true;
    try {
      for(const peer of this.peers) {
        if(this.stopped) return;
        const now=Math.floor(Date.now()/1000);
        const saved=this.store.state('peer:'+peer.name) as Progress | null;
        const progress:Progress=saved ?? {until:now,watermark:0,reconcileAfter:''};
        try {
          // One finite historical window and one finite overlapping live window per tick.
          const since=Math.max(0,progress.until-86400);
          const events=await peer.relay.query({kinds:[10011],since,until:progress.until,limit:300},this.controller.signal);
          const budget=saved ? this.policy.maxAuthors : Math.min(this.policy.maxAuthors,this.bootstrap+this.store.roster(true).length);
          const capped=await this.accept(events,peer.name,budget);
          if(this.stopped) return;
          progress.capped=capped;
          const saturated=events.length===300;
          progress.saturated=saturated;
          if(!capped && !saturated) progress.until=since;
          else if(!capped) {
            const oldest=Math.min(...events.map(e=>e.created_at));
            // Keep overlap at the exact second. Dense same-second windows remain explicitly incomplete.
            if(oldest<progress.until) progress.until=oldest;
          }
          const overlap=await peer.relay.query({kinds:[10011],since:0,until:now,limit:300},this.controller.signal);
          const overlapCapped=await this.accept(overlap,peer.name,budget);
          if(this.stopped) return;
          progress.capped=capped || overlapCapped;
          if(!overlapCapped && overlap.length<300) progress.watermark=now;
          else progress.saturated=true;
          const roster=this.store.roster(true);
          let batch=roster.filter(k=>k>progress.reconcileAfter).slice(0,50);
          if(!batch.length) batch=roster.slice(0,50);
          if(batch.length) {
            // No #i: a current empty replacement must be observed.
            const current=await peer.relay.query({kinds:[0,10011],authors:batch,limit:500},this.controller.signal);
            await this.accept(current.filter(e=>batch.includes(e.pubkey)),peer.name,budget);
            if(current.length===500) progress.saturated=true;
            else progress.reconcileAfter=batch[batch.length-1]!;
          }
          progress.lastCompletedAt=new Date().toISOString();delete progress.error;
          this.store.setState('peer:'+peer.name,progress);
        } catch {allSucceeded=false; progress.error='source unavailable or admission incomplete';}
        statuses.push({name:peer.name,...progress});
      }
      if(this.stopped) return;
      const previous=this.store.state('coverage') as Record<string,unknown> | null;
      this.store.setState('coverage',{status:'partial',scope:'bounded peer windows and rotating admitted-author reconciliation; not global Nostr coverage',sources:statuses,
        lastCompletedAt:allSucceeded && this.peers.length ? new Date().toISOString() : previous?.lastCompletedAt ?? null,
        upstreamUnavailable:!allSucceeded,maxAuthors:this.policy.maxAuthors});
    } finally {this.busy=false;this.controller=undefined;finish();}
  }
  start():void {
    if(this.timer || this.stopped) return;
    const cycle=async()=>{await this.tick().catch(()=>{});if(!this.stopped)this.timer=setTimeout(cycle,this.options.intervalMs ?? 60000);};
    void cycle();
  }
  async stop():Promise<void> {this.stopped=true;clearTimeout(this.timer);this.controller?.abort();await this.idle;}
}
