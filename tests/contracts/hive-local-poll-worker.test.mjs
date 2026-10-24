import test from 'node:test';
import assert from 'node:assert/strict';
import {processHivePoll} from '../../scripts/hive-local-poll-worker.mjs';
const valid={id:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',lease:'x'.repeat(40),prompt:'Say OK',capability:'inference-only',authorized:true};
test('idle queue does not run inference or report completion',async()=>{
  let called=false;
  assert.deepEqual(await processHivePoll({claim:async()=>null,complete:async()=>{called=true},policy:{},run:async()=>{called=true}}),{status:'IDLE'});
  assert.equal(called,false);
});
test('reject unapproved or tool-capable jobs before model execution',async()=>{
  for(const job of [{...valid,authorized:false},{...valid,capability:'shell'},{...valid,command:'rm -rf'}]){
    let invoked=false;
    await assert.rejects(processHivePoll({claim:async()=>job,complete:async()=>{invoked=true},policy:{},run:async()=>{invoked=true}}),/HIVE_POLL_INVALID_JOB/);
    assert.equal(invoked,false);
  }
});
test('authorized inference acknowledges bounded result using lease',async()=>{
  const calls=[];
  const result=await processHivePoll({claim:async()=>valid,complete:async obj=>calls.push(obj),policy:{},
    run:async ({task})=>{assert.equal(task.capability,'inference-only');assert.equal(task.model,'qwen3-coder-free');return {status:'COMPLETED_LOCAL_INFERENCE',model:'qwen3-coder-free',answer:'UGO OK'}}});
  assert.equal(result.status,'SUCCEEDED');
  assert.equal(calls[0].lease,valid.lease);
  assert.equal(calls[0].answer,'UGO OK');
});
test('failed model call reports generic error without leaking detail',async()=>{
  const calls=[];
  await processHivePoll({claim:async()=>valid,complete:async obj=>calls.push(obj),policy:{},
    run:async()=>{throw Error('secret exception')}});
  assert.deepEqual({status:calls[0].status,code:calls[0].code},{status:'FAILED',code:'HIVE_LOCAL_INFERENCE_FAILED'});
  assert.equal(JSON.stringify(calls).includes('secret'),false);
});

test('rejects malformed UUID claims before invoking model',async()=>{
  let called=false;
  await assert.rejects(processHivePoll({claim:async()=>({...valid,id:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee-g'}),
    complete:async()=>{called=true},policy:{},run:async()=>{called=true}}),/HIVE_POLL_INVALID_JOB/);
  assert.equal(called,false);
});
test('does not acknowledge malformed or oversized inference as successful',async()=>{
  const bad=[null,{}, {status:'COMPLETED_LOCAL_INFERENCE',model:'unexpected',answer:'OK'},
    {status:'COMPLETED_LOCAL_INFERENCE',model:'qwen3-coder-free',answer:''},
    {status:'COMPLETED_LOCAL_INFERENCE',model:'qwen3-coder-free',answer:'x'.repeat(12001)}];
  for(const result of bad){
    const calls=[];
    const state=await processHivePoll({claim:async()=>valid,complete:async obj=>calls.push(obj),policy:{},run:async()=>result});
    assert.equal(state.status,'FAILED');
    assert.equal(calls[0].status,'FAILED');
    assert.equal(calls[0].code,'HIVE_INVALID_INFERENCE_RESULT');
    assert.equal(Object.hasOwn(calls[0],'answer'),false);
  }
});

test('worker reports allowlisted 429/503/timeouts but never leaks arbitrary exception',async()=>{
 const cases=[['HIVE_FREEAPI_RATE_LIMITED','HIVE_FREEAPI_RATE_LIMITED'],['HIVE_PROVIDER_UNAVAILABLE','HIVE_PROVIDER_UNAVAILABLE'],['secret: unsafe','HIVE_LOCAL_INFERENCE_FAILED']];
 for(const [message,expected] of cases){
  const calls=[];
  await processHivePoll({claim:async()=>valid,complete:async data=>calls.push(data),policy:{},run:async()=>{throw Error(message)}});
  assert.equal(calls[0].code,expected);
  assert.equal(JSON.stringify(calls).includes('secret'),false);
 }
});

test('failed completion acknowledgement blocks silent replay and hides transport detail',async()=>{
 let invokes=0;
 await assert.rejects(processHivePoll({claim:async()=>valid,complete:async()=>{throw Error('network secret')},policy:{},
  run:async()=>{invokes++;return {status:'COMPLETED_LOCAL_INFERENCE',model:'qwen3-coder-free',answer:'OK'}}}),
  /HIVE_COMPLETION_UNCERTAIN/);
 assert.equal(invokes,1);
});

test('TEST SQL claim forbids automatic replay after expired RUNNING lease',async()=>{
 const fs=await import('node:fs');
 const sql=fs.readFileSync('supabase/migrations/20261023060000_hive_local_expired_lease_fail_closed.sql','utf8');
 assert.match(sql,/q\.status='RUNNING' and q\.lease_until<now\(\)/);
 assert.match(sql,/error_code='RECONCILIATION_REQUIRED'/);
 assert.match(sql,/where q\.status='PENDING' and q\.attempts<3/);
 assert.doesNotMatch(sql,/or \(q\.status='RUNNING'/i);
 assert.match(sql,/grant execute on function public\.hive_local_claim_job\(\) to service_role/);
});

test('worker retains safe upstream HTTP error codes without revealing response contents',async()=>{
 for(const code of ['HIVE_PROVIDER_HTTP_400','HIVE_PROVIDER_HTTP_401','HIVE_PROVIDER_HTTP_404','HIVE_PROVIDER_HTTP_502']){
  const calls=[];
  await processHivePoll({claim:async()=>valid,complete:async data=>calls.push(data),policy:{},run:async()=>{throw Error(code)}});
  assert.equal(calls[0].status,'FAILED');
  assert.equal(calls[0].code,code);
  assert.equal(Object.hasOwn(calls[0],'answer'),false);
 }
});

test('network failure remains a safe actionable code in the persisted outcome',async()=>{
 const calls=[];
 await processHivePoll({claim:async()=>valid,complete:async data=>calls.push(data),policy:{},run:async()=>{throw Error('HIVE_PROVIDER_NETWORK_ERROR')}});
 assert.equal(calls.length,1);
 assert.equal(calls[0].status,'FAILED');
 assert.equal(calls[0].code,'HIVE_PROVIDER_NETWORK_ERROR');
 assert.equal(Object.hasOwn(calls[0],'answer'),false);
});

test('uncertain claim response halts before inference instead of automatically polling again',async()=>{
 let invoked=false;
 await assert.rejects(processHivePoll({
  claim:async()=>{throw Error('HIVE_TEST_TRANSPORT_UNREACHABLE')},
  complete:async()=>{invoked=true},policy:{},run:async()=>{invoked=true}
 }),/HIVE_CLAIM_UNCERTAIN/);
 assert.equal(invoked,false);
});

test('connection refusal and any bounded provider HTTP status retain precise safe codes',async()=>{
 for(const code of ['HIVE_LOCAL_CONNECTION_REFUSED','HIVE_PROVIDER_HTTP_418']){
  const calls=[];
  await processHivePoll({claim:async()=>valid,complete:async data=>calls.push(data),policy:{},run:async()=>{throw Error(code)}});
  assert.equal(calls[0].status,'FAILED');
  assert.equal(calls[0].code,code);
 }
});
