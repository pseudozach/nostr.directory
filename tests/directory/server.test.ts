import { test, expect } from 'vitest';
import { DirectoryStore } from '../../services/directory/src/store';
import { createServer } from '../../services/directory/src/server';
import { fixture } from '../identity/fixtures';

async function running(relay: any, run: (base:string, db:DirectoryStore)=>Promise<void>) {
  const db=new DirectoryStore(':memory:'); const server=createServer({store:db,relay});
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  try {await run(`http://127.0.0.1:${(server.address() as any).port}`,db);}
  finally {await new Promise<void>(r=>server.close(()=>r()));db.close();}
}

test('detail only marks an empty observed list complete after actual successful relay observation',async()=>{
  const key=fixture().pubkey;
  await running({async query(){return [];},async current(){return null;}},async(base)=>{
    const response=await fetch(base+'/api/directory/'+key);expect(response.status).toBe(200);
    const body=await response.json();expect(body.currentEvent).toBeNull();expect(body.observedComplete).toBe(true);
  });
  await running({async current(){throw new Error('timeout');}},async(base)=>{
    const response=await fetch(base+'/api/directory/'+key);expect(response.status).toBe(503);
    expect((await response.json()).observedComplete).toBe(false);
  });
});

test('POST admits only original signed lists after durable matching ACK and readback',async()=>{
  const event=fixture();let published=0;
  await running({async publish(e:any){published++;return {id:e.id,accepted:true};},async current(){return event;}},async(base,db)=>{
    const bad=await fetch(base+'/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...event,content:'tampered'})});
    expect(bad.status).toBe(400);expect(published).toBe(0);
    const response=await fetch(base+'/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(event)});
    expect(response.status).toBe(200);expect(await response.json()).toEqual({eventId:event.id,accepted:true});
    expect(db.current(event.pubkey,10011)?.id).toBe(event.id);
  });
  await running({async publish(){return {id:'wrong',accepted:true};}},async(base,db)=>{
    expect((await fetch(base+'/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(event)})).status).toBe(503);
    expect(db.roster()).toEqual([]);
  });
});

test('real HTTP serves only public current roster and JSON validation errors',async()=>{
  await running({async query(){return [];},async current(){return null;}},async(base,db)=>{
    expect((await (await fetch(base+'/health')).json()).ok).toBe(true);
    expect((await (await fetch(base+'/api/directory')).json()).items).toEqual([]);
    const e=fixture(); db.apply(e);
    expect((await (await fetch(base+'/api/directory')).json()).items[0].pubkey).toBe(e.pubkey);
    const bad=await fetch(base+'/api/directory?limit=999999'); expect(bad.status).toBe(400);expect((await bad.json()).error).toBeTruthy();
    expect((await fetch(base+'/unknown')).status).toBe(404);
  });
});
