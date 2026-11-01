import {test,expect} from 'vitest';
import {DirectoryStore} from '../../services/directory/src/store';
import {DiscoveryWorker} from '../../services/directory/src/discovery';
import {fixture} from '../identity/fixtures';

test('failed durable admission never advances persisted peer progress',async()=>{
 const db=new DirectoryStore(':memory:');const event=fixture();
 const peer={async query(){return [event];},close(){}};
 const worker=new DiscoveryWorker(db,{async publish(){return {id:event.id,accepted:false};}} as any,[{name:'peer',relay:peer as any}],{delayMs:0});
 try {await worker.tick();expect(db.state('peer:peer')).toBeNull();expect(db.roster()).toEqual([]);expect((db.state('coverage') as any).upstreamUnavailable).toBe(true);}finally{worker.stop();db.close();}
});

test('bootstrap cap leaves the clipped discovery window replayable',async()=>{
 const db=new DirectoryStore(':memory:');const a=fixture();const b=fixture();
 const peer={async query(){return [a,b];},close(){}};
 const local={async publish(e:any){return {id:e.id,accepted:true};},async current(key:string){return key===a.pubkey?a:b;}};
 const worker=new DiscoveryWorker(db,local as any,[{name:'peer',relay:peer as any}],{bootstrapAuthors:1,delayMs:0});
 try {await worker.tick();expect(db.roster().length).toBe(1);expect((db.state('peer:peer') as any).watermark).toBe(0);expect((db.state('peer:peer') as any).capped).toBe(true);}finally{worker.stop();db.close();}
});

test('bounded discovery persists only durably read-back authors and records partial source coverage',async()=>{
 const db=new DirectoryStore(':memory:'); const event=fixture();const filters:any[]=[];
 const peer={async query(f:any){filters.push(f);return [event];},close(){}};
 const local={async publish(e:any){return {id:e.id,accepted:true};},async current(){return event;}};
 const worker=new DiscoveryWorker(db,local as any,[{name:'test-peer',relay:peer as any}],{bootstrapAuthors:1,delayMs:0});
 try {
   await worker.tick();expect(db.roster()).toEqual([event.pubkey]);
   expect((db.state('coverage') as any).status).toBe('partial');
   expect((db.state('coverage') as any).sources[0].lastCompletedAt).toBeTruthy();
   expect(filters[0].kinds).toEqual([10011]);
   expect(filters.some(f=>f.authors?.includes(event.pubkey) && f.kinds.includes(10011) && !f['#i'])).toBe(true);
 }finally{worker.stop();db.close();}
});
