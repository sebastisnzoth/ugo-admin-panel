import test from 'node:test';
import assert from 'node:assert/strict';
import {runHiveTestWorkerLoop} from '../../scripts/hive-local-test-daemon.mjs';
const token='a'.repeat(64),policy={allow:true};
test('worker stops without polling when instructed',async()=>{
 let called=0;
 const result=await runHiveTestWorkerLoop({token,policy,shouldStop:()=>true,poll:async()=>{called++;return {status:'IDLE'}}});
 assert.equal(result.status,'STOPPED');assert.equal(called,0);
});
test('worker performs one claim and stops cleanly',async()=>{
 let called=0;
 const events=[];
 await runHiveTestWorkerLoop({token,policy,poll:async()=>{called++;return {status:'SUCCEEDED'}},shouldStop:()=>called>0,onEvent:e=>events.push(e)});
 assert.equal(called,1);assert.deepEqual(events,['SUCCEEDED']);
});
test('worker stops on invalid credential without retry storm',async()=>{
 let called=0;
 await assert.rejects(runHiveTestWorkerLoop({token,policy,poll:async()=>{called++;throw Error('HIVE_TEST_WORKER_UNAUTHORIZED')},wait:async()=>{throw Error('MUST_NOT_WAIT')}}),/HIVE_WORKER_AUTH_STOP/);
 assert.equal(called,1);
});
test('network failures wait with exponential backoff and no tight loop',async()=>{
 let called=0;const delays=[];
 await runHiveTestWorkerLoop({token,policy,poll:async()=>{called++;throw Error('temporary')},wait:async ms=>{delays.push(ms)},shouldStop:()=>called===3});
 assert.deepEqual(delays,[8000,16000]);assert.equal(called,3);
});
test('idle uses bounded 8 second polling interval',async()=>{
 let called=0,delay=0;
 await runHiveTestWorkerLoop({token,policy,poll:async()=>{called++;return {status:'IDLE'}},wait:async(ms)=>{delay=ms},shouldStop:()=>called>=2});
 assert.equal(delay,8000);assert.equal(called,2);
});
test('transient disconnect recovers with bounded polling and no credential rotation',async()=>{
 let calls=0;const delays=[],events=[];
 await runHiveTestWorkerLoop({token,policy,poll:async()=>{calls++;if(calls===1)throw Error('HIVE_TEST_TRANSPORT_UNREACHABLE');return {status:'IDLE'}},wait:async ms=>{delays.push(ms)},shouldStop:()=>calls>=2,onEvent:event=>events.push(event)});
 assert.deepEqual(delays,[8000]);assert.deepEqual(events,['RETRY_WAIT','IDLE']);
});
test('engine unavailability is reported separately from a failed inference',async()=>{
 const events=[];let calls=0;
 await runHiveTestWorkerLoop({token,policy,poll:async()=>{calls++;return {status:'ENGINE_UNAVAILABLE'}},shouldStop:()=>calls>0,onEvent:event=>events.push(event)});
 assert.deepEqual(events,['ENGINE_UNAVAILABLE']);
});
test('uncertain completion halts the worker without retrying a lease',async()=>{
 let calls=0;
 await assert.rejects(runHiveTestWorkerLoop({token,policy,poll:async()=>{calls++;throw Error('HIVE_COMPLETION_UNCERTAIN')},
  wait:async()=>{throw Error('MUST_NOT_WAIT')}}),/HIVE_WORKER_RECONCILIATION_REQUIRED/);
 assert.equal(calls,1);
});
test('uncertain claim also halts without an automatic poll retry',async()=>{
 let calls=0;
 await assert.rejects(runHiveTestWorkerLoop({token,policy,poll:async()=>{calls++;throw Error('HIVE_CLAIM_UNCERTAIN')},
  wait:async()=>{throw Error('MUST_NOT_WAIT')}}),/HIVE_WORKER_RECONCILIATION_REQUIRED/);
 assert.equal(calls,1);
});
