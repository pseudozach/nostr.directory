import { createServer as httpServer } from 'http';
import type { Server, ServerResponse } from 'http';
import type { DirectoryStore } from './store';
import type { QueryRelay } from './relay';
import { DirectorySearch, publicKey } from './search';
import { latest, validateDirectoryEvent } from '../../../src/identity/events';
import { PolicyError, RateLimiter, AdmissionPolicy } from './policy';
import { ingest } from './ingest';

export type ServerOptions = {store:DirectoryStore;relay:QueryRelay;policy?:AdmissionPolicy};
function json(response:ServerResponse,status:number,body:unknown) {
  response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  response.end(JSON.stringify(body));
}
export function createServer(options:ServerOptions): Server {
  const search=new DirectorySearch(options.store,options.relay);
  const policy=options.policy ?? new AdmissionPolicy(options.store);
  const reads=new RateLimiter(60,2);
  let active=0;
  const server=httpServer(async(req,res)=>{
    try {
      reads.take(req.socket.remoteAddress ?? 'unknown');
      if(active>=24) throw new PolicyError('service busy',503);
      active++;
      try {
        const url=new URL(req.url ?? '/', 'http://directory.local');
        if(req.method==='GET' && url.pathname==='/health') {json(res,200,{ok:true,coverage:options.store.state('coverage') ?? {status:'unknown'}});return;}
        if(req.method==='GET' && url.pathname==='/api/directory') {
          const args:Record<string,string>={};
          for(const [key,value] of url.searchParams) {if(key in args) throw new PolicyError('duplicate query');args[key]=value;}
          json(res,200,await search.list(args)); return;
        }
        if(req.method==='POST' && url.pathname==='/api/events') {
          if(url.search || req.headers['content-type']?.split(';')[0]?.trim().toLowerCase()!=='application/json') throw new PolicyError('expected JSON event');
          if(Number(req.headers['content-length'] ?? 0)>16384) throw new PolicyError('event too large',413);
          const chunks:Buffer[]=[];let size=0;
          let bodyTimer:ReturnType<typeof setTimeout> | undefined;
          const read=async()=>{for await(const raw of req) {const chunk=Buffer.from(raw);size+=chunk.length;if(size>16384)throw new PolicyError('event too large',413);chunks.push(chunk);}};
          try {await Promise.race([read(),new Promise<never>((_,reject)=>{bodyTimer=setTimeout(()=>reject(new PolicyError('request timeout',408)),3000);})]);}
          finally {clearTimeout(bodyTimer);}
          let event:unknown;try {event=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new PolicyError('invalid JSON event');}
          policy.admit(event,req.socket.remoteAddress ?? 'unknown');
          // Admission validates the original; ingest validates again at the durable relay boundary.
          await ingest(event as import('../../../src/identity/events').DirectoryEvent,options.relay,options.store);
          json(res,200,{eventId:(event as {id:string}).id,accepted:true});return;
        }
        if(req.method==='GET' && url.pathname.startsWith('/api/directory/')) {
          if(url.search) throw new PolicyError('invalid person query');
          const key=publicKey(decodeURIComponent(url.pathname.slice('/api/directory/'.length)));
          if(options.store.suppressed(key)) throw new PolicyError('not found',404);
          const controller=new AbortController();let timer:ReturnType<typeof setTimeout> | undefined;
          const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('relay observation timeout'));},2600);});
          try {
            const [event,metadata]=await Promise.race([Promise.all([
              options.relay.current(key,10011,controller.signal), options.relay.current(key,0,controller.signal)
            ]),timeout]);
            const cached=options.store.current(key,10011);
            if(cached && (!event || latest(cached,event).id!==event.id)) throw new Error('incomplete current observation');
            for(const item of [event,metadata]) {
              if(item && (!validateDirectoryEvent(item) || item.pubkey!==key)) throw new Error('invalid observation');
              if(item) {
                if(!options.store.has(key)) (options.policy ?? policy).admit(item,'detail');
                options.store.apply(item);
              }
            }
            json(res,200,{...search.person(key,true),asOf:new Date().toISOString(),stale:false,observationScope:'local Ditto relay; peer coverage partial'});return;
          } finally {clearTimeout(timer);controller.abort();}
        }
        throw new PolicyError('not found',404);
      } finally {active--;}
    } catch(error) {
      json(res,error instanceof PolicyError ? error.status : 503,{error:error instanceof PolicyError ? error.message : 'directory unavailable',stale:true,observedComplete:false});
    }
  });
  server.requestTimeout=5000;server.headersTimeout=5000;server.keepAliveTimeout=1000;
  return server;
}
export async function startServer(options:ServerOptions & {port?:number;host?:string}):Promise<Server> {
  const server=createServer(options);
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(options.port ?? 8080,options.host ?? '127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});
  return server;
}
