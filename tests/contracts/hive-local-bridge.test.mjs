import test from 'node:test';
import assert from 'node:assert/strict';
import { createHiveLocalBridge } from '../../scripts/hive-local-bridge.mjs';
const token='a'.repeat(40),policy={version:'TEST'};
async function withBridge(run,fn){
 const server=createHiveLocalBridge({token,policy,run});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{return await fn('http://127.0.0.1:'+server.address().port);}
 finally{await new Promise(resolve=>server.close(resolve));}
}
test('bridge refuses unauthenticated local health',()=>withBridge(async()=>{},async url=>{
 const r=await fetch(url+'/health');assert.equal(r.status,401);
}));
test('bridge exposes safe health to authenticated local caller',()=>withBridge(async()=>{},async url=>{
 const r=await fetch(url+'/health',{headers:{'x-hive-local-token':token}});
 assert.equal(r.status,200);assert.equal((await r.json()).autonomy,'OFF');
}));
test('bridge delegates only inference-only task',()=>withBridge(async ({task})=>{
 assert.equal(task.capability,'inference-only');assert.equal(task.requires_approval,false);
 assert.equal(task.model,'qwen3-coder-free');
 return {status:'COMPLETED_LOCAL_INFERENCE',answer:'OK'};
},async url=>{
 const r=await fetch(url+'/inference',{method:'POST',
  headers:{'x-hive-local-token':token,'content-type':'application/json',origin:'http://localhost:5173'},
  body:JSON.stringify({prompt:'Hi'})});
 assert.equal(r.status,200);assert.equal((await r.json()).answer,'OK');
}));
test('bridge rejects unauthorized origins and extra action fields',()=>withBridge(async()=>{throw Error('MUST_NOT_EXECUTE')},async url=>{
 const headers={'x-hive-local-token':token,'content-type':'application/json'};
 for(const item of [{headers:{...headers,origin:'https://evil.invalid'},body:{prompt:'Hi'}},
  {headers,body:{prompt:'Hi',action:'external-write'}}]){
  const r=await fetch(url+'/inference',{method:'POST',headers:item.headers,body:JSON.stringify(item.body)});
  assert.notEqual(r.status,200);
 }
}));

test('bridge preserves rate-limit status and does not retry',()=>withBridge(async()=>{
 throw new Error('HIVE_FREEAPI_RATE_LIMITED: proveedor sin cuota temporal; no se reintenta automáticamente');
},async url=>{
 const r=await fetch(url+'/inference',{method:'POST',headers:{'x-hive-local-token':token,'content-type':'application/json'},body:JSON.stringify({prompt:'Hi'})});
 assert.equal(r.status,429);
 assert.equal((await r.json()).error,'HIVE_FREEAPI_RATE_LIMITED');
}));
test('bridge returns unavailable when local inference fails',()=>withBridge(async()=>{
 throw new Error('OFFLINE');
},async url=>{
 const r=await fetch(url+'/inference',{method:'POST',headers:{'x-hive-local-token':token,'content-type':'application/json'},body:JSON.stringify({prompt:'Hi'})});
 assert.equal(r.status,503);
 assert.equal((await r.json()).error,'HIVE_LOCAL_INFERENCE_FAILED');
}));
