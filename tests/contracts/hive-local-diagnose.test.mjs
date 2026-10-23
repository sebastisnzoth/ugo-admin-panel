import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectLocalFreeAPI } from '../../scripts/hive-local-diagnose.mjs';
test('checks local catalog once, without inference', async()=>{
 let calls=0;
 const result=await inspectLocalFreeAPI({apiKey:'test',fetchImpl:async(url,opts)=>{
  calls++;assert.equal(url,'http://127.0.0.1:3001/v1/models');
  assert.equal(opts.redirect,'error');
  return {status:200,ok:true,text:async()=>JSON.stringify({data:[{id:'qwen3-coder'}]})};
 }});
 assert.equal(calls,1);assert.deepEqual(result.models,['qwen3-coder']);
});
test('401 and 429 never retry',async()=>{
 for (const status of [401,429]) {
  let calls=0;
  const result=await inspectLocalFreeAPI({apiKey:'test',fetchImpl:async()=>{
   calls++;return {status,ok:false};
  }});
  assert.equal(calls,1);
  assert.equal(result.status,status===429?'RATE_LIMITED':'AUTH_REJECTED');
 }
});
test('never tests a remote endpoint',async()=>{
 await assert.rejects(inspectLocalFreeAPI({apiKey:'test',endpoint:'https://outside.example/v1',fetchImpl:()=>{throw new Error('must not call')}}),/HIVE_LOCAL_ENDPOINT_REQUIRED/);
});
