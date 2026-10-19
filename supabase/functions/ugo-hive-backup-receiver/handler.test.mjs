import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createBackupHandler } from './handler.mjs';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const projectUrl='https://tmossnqfwfwjrtzwcbmm.supabase.co';
const token='x'.repeat(64);
const blob=new Uint8Array([70,65,80,73,66,75,49,0,...new Uint8Array(40)]);
function fixture(){
  let current=null; const staged=new Map(); let seq=0;
  const store={
    async cleanup(){}, async current(){ return current; },
    async get(key){ return staged.get(key); },
    async stage(id){return true},
    async put(key,bytes){staged.set(key,bytes)},
    async commit(expected,id,sha,bytes){
      if((current?.version??null)!==(expected??null)) return {ok:false};
      current={version:id,object_key:'snapshots/'+id,sha256:sha,bytes,created_at:new Date().toISOString(),sequence:++seq};
      return {ok:true,version:id};
    },
    async remove(keys){for(const k of keys)staged.delete(k)},
    async ack(){}
  };
  const handler=createBackupHandler({token,store,projectUrl});
  const send=(headers={},method='PUT',data=blob)=>handler(new Request('https://example.test/backup',{method,headers,body:method==='GET'?undefined:data}));
  return {send,get:()=>current};
}
test('rejects anonymous and invalid authorization',async()=>{
 const f=fixture();
 assert.equal((await f.send({'if-none-match':'*','content-type':'application/octet-stream'})).status,401);
 assert.equal((await f.send({'authorization':'Bearer wrong','if-none-match':'*','content-type':'application/octet-stream'})).status,401);
});
test('initial bootstrap succeeds once, GET validates committed content and second bootstrap fails',async()=>{
 const f=fixture(),auth='Bearer '+token;
 const headers={authorization:auth,'if-none-match':'*','content-type':'application/octet-stream'};
 const first=await f.send(headers);
 assert.equal(first.status,204);
 assert.match(first.headers.get('etag'),/^"[0-9a-f-]{36}"$/);
 const get=await f.send({authorization:auth},'GET');
 assert.equal(get.status,200);
 assert.deepEqual(new Uint8Array(await get.arrayBuffer()),blob);
 assert.equal((await f.send(headers)).status,412);
});
test('concurrent initializations create at most one version',async()=>{
 const f=fixture(),headers={authorization:'Bearer '+token,'if-none-match':'*','content-type':'application/octet-stream'};
 const responses=await Promise.all([f.send(headers),f.send(headers)]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[204,412]);
});
test('later updates require current etag; corrupt envelope rejected',async()=>{
 const f=fixture(),a='Bearer '+token;
 assert.equal((await f.send({authorization:a,'content-type':'application/octet-stream'})).status,428);
 const first=await f.send({authorization:a,'if-none-match':'*','content-type':'application/octet-stream'});
 const etag=first.headers.get('etag');
 assert.equal((await f.send({authorization:a,'if-match':'"00000000-0000-0000-0000-000000000000"','content-type':'application/octet-stream'})).status,412);
 assert.equal((await f.send({authorization:a,'if-match':etag,'content-type':'application/octet-stream'},'PUT',new Uint8Array([1,2,3]))).status,400);
 assert.equal((await f.send({authorization:a,'if-match':etag,'content-type':'application/octet-stream'})).status,204);
});
