import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBackupHandler,sha256} from '../../supabase/functions/ugo-hive-backup-receiver/handler.mjs';
const token='test-token-only-'.repeat(4),url='https://tmossnqfwfwjrtzwcbmm.supabase.co';
const blob=new Uint8Array(64);blob.set([70,65,80,73,66,75,49,0]);
async function harness(){
 let current={version:crypto.randomUUID(),object_key:'initial',bytes:blob.length,sha256:await sha256(blob),created_at:new Date().toISOString()};
 const files=new Map([['initial',blob]]);
 const store={stage:async()=>true,cleanup:async()=>{},ack:async()=>{},current:async()=>current,get:async k=>files.get(k),put:async(k,v)=>{files.set(k,v);},remove:async keys=>keys.forEach(k=>files.delete(k)),commit:async(expected,version,hash,bytes)=>{if(expected!==current.version)return {ok:false};current={version,object_key:'snapshots/'+version,sha256:hash,bytes,created_at:new Date().toISOString()};return {ok:true,version,garbage:[]};}};
 const handler=createBackupHandler({token,store,projectUrl:url});
 const req=(method,body,headers={})=>handler(new Request(url+'/functions/v1/ugo-hive-backup-receiver',{method,headers:{authorization:'Bearer '+token,'content-type':'application/octet-stream',...headers},body}));
 return {req,store,handler,files};
}
test('receiver rejects unauthorized, unsupported, unversioned, corrupted and oversized backups',async()=>{
 const {req,handler}=await harness();
 assert.equal((await req('GET',undefined,{authorization:'wrong'})).status,401);
 assert.equal((await req('POST')).status,405);
 assert.equal((await req('PUT',blob)).status,428);
 const etag=(await req('GET')).headers.get('etag');
 assert.equal((await req('PUT','broken',{'if-match':etag})).status,400);
 assert.equal((await req('PUT',blob,{'if-match':etag,'content-length':'9000000'})).status,413);
 assert.equal((await req('PUT',blob,{'if-match':etag,'content-type':'text/plain'})).status,415);
 const other=createBackupHandler({token,store:{},projectUrl:'https://production.supabase.co'});
 assert.equal((await other(new Request(url))).status,503);
 assert.equal((await handler(new Request(url+'?token=no',{headers:{authorization:'Bearer '+token}}))).status,400);
});
test('concurrent writes only commit once; stale writes cannot replace current snapshot',async()=>{
 const {req,files}=await harness();const etag=(await req('GET')).headers.get('etag');
 const results=await Promise.all([req('PUT',blob,{'if-match':etag}),req('PUT',blob,{'if-match':etag})]);
 assert.deepEqual(results.map(r=>r.status).sort(),[204,412]);
 assert.equal((await req('PUT',blob,{'if-match':etag})).status,412);
 assert.equal(files.size,2);
});
test('corrupt stored object, storage errors and uncertain commit outcomes fail safely',async()=>{
 const {req,store,files}=await harness();const initial=await store.current();files.set(initial.object_key,new Uint8Array(64));
 assert.equal((await req('GET')).status,502);
 files.set(initial.object_key,blob);store.commit=async()=>{throw new Error('secret-token')};
 assert.equal((await req('PUT',blob,{'if-match':'"'+initial.version+'"'})).status,503);
 assert.equal(files.size,2); // unknown committed outcome must not delete a possibly committed object
 store.current=async()=>{throw new Error('credentials')};
 const res=await req('GET');assert.equal(res.status,503);assert.equal((await res.text()).includes('credentials'),false);
});

test('receiver refuses stale or missing snapshot freshness and stops writes on cleanup backlog',async()=>{const {req,store}=await harness();const current=await store.current();current.created_at=new Date(Date.now()-86400001).toISOString();assert.equal((await req('GET')).status,409);current.created_at=new Date().toISOString();store.stage=async()=>false;assert.equal((await req('PUT',blob,{'if-match':'\"'+current.version+'\"'})).status,429);});
