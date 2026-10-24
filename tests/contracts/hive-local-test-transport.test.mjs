import test from 'node:test';
import assert from 'node:assert/strict';
import {createHiveTestTransport} from '../../scripts/hive-local-test-transport.mjs';
const token='a'.repeat(64);
const reply=(value,status=200)=>({ok:status>=200&&status<300,status, text:async()=>JSON.stringify(value)});
test('rejects arbitrary endpoints and missing credentials',()=>{
 assert.throws(()=>createHiveTestTransport({token,endpoint:'https://example.org'}),/HIVE_TEST_ENDPOINT_REQUIRED/);
 assert.throws(()=>createHiveTestTransport({token:'short'}),/HIVE_WORKER_TOKEN_REQUIRED/);
});
test('claims only from fixed TEST endpoint with authorization header',async()=>{
 const calls=[];
 const transport=createHiveTestTransport({token,fetchImpl:async(url,options)=>{
  calls.push({url,options});return reply({job:null});
 }});
 assert.equal(await transport.claim(),null);
 assert.equal(calls[0].url,'https://tmossnqfwfwjrtzwcbmm.supabase.co/functions/v1/ugo-hive-local-jobs');
 assert.equal(calls[0].options.headers.authorization,'Bearer '+token);
 assert.equal(JSON.parse(calls[0].options.body).action,'claim');
 assert.equal(calls[0].options.redirect,'error');
});
test('never accepts unauthorized or malformed claim',async()=>{
 for(const response of [reply({},200),reply({job:'bad'}),reply({error:'x'},403)]){
  const transport=createHiveTestTransport({token,fetchImpl:async()=>response});
  await assert.rejects(transport.claim(),/HIVE_TEST_(CLAIM_INVALID|WORKER_UNAUTHORIZED)/);
 }
});
test('engine presence uses a fixed status allowlist without inference or secret payloads',async()=>{
 const bodies=[];
 const transport=createHiveTestTransport({token,fetchImpl:async(_url,options)=>{bodies.push(JSON.parse(options.body));return reply({ok:true})}});
 await transport.reportEngine('AVAILABLE');
 assert.deepEqual(bodies,[{action:'engine_status',status:'AVAILABLE'}]);
 await assert.rejects(transport.reportEngine('SECRET_OR_INFERENCE_SUCCEEDED'),/HIVE_TEST_ENGINE_STATUS_INVALID/);
 assert.equal(bodies.length,1);
});
test('completion requires explicit status and server acknowledgment',async()=>{
 let called=false;
 const transport=createHiveTestTransport({token,fetchImpl:async()=>{called=true;return reply({ok:true})}});
 await assert.rejects(transport.complete({id:'x',lease:'y',status:'PENDING'}),/HIVE_TEST_COMPLETION_INVALID/);
 assert.equal(called,false);
 await transport.complete({id:'x',lease:'y',status:'FAILED',code:'HIVE_LOCAL_INFERENCE_FAILED'});
 assert.equal(called,true);
 const rejected=createHiveTestTransport({token,fetchImpl:async()=>reply({ok:false})});
 await assert.rejects(rejected.complete({id:'x',lease:'y',status:'FAILED',code:'HIVE_LOCAL_INFERENCE_FAILED'}),/HIVE_TEST_COMPLETION_REJECTED/);
});
test('timeouts, rate limits and excessive replies fail closed',async()=>{
 const cases=[
  [async()=>{throw Error('network')},/HIVE_TEST_TRANSPORT_UNREACHABLE/],
  [async()=>reply({},429),/HIVE_TEST_RATE_LIMITED/],
  [async()=>({ok:true,status:200,text:async()=>('x'.repeat(20001))}),/HIVE_TEST_REPLY_TOO_LARGE/]
 ];
 for(const [fetchImpl,error] of cases)
  await assert.rejects(createHiveTestTransport({token,fetchImpl}).claim(),error);
});
