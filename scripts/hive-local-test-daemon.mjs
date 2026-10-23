// Explicitly started Mac worker. Outbound calls to TEST only; no daemon installation.
// No model-selected commands, and no automatic billing.
import { readFile } from 'node:fs/promises';
import { pollHiveTestOnce } from './hive-local-test-poll-once.mjs';
export async function runHiveTestWorkerLoop({ token, policy, poll=pollHiveTestOnce, wait=(ms)=>new Promise(resolve=>setTimeout(resolve,ms)), shouldStop=()=>false, onEvent=()=>{} }={}){
 if(!token||!policy)throw Error('HIVE_WORKER_CONFIGURATION_REQUIRED');
 let errors=0;
 while(!shouldStop()){
  try{const result=await poll({token,policy});errors=0;onEvent(result?.status==='IDLE'?'IDLE':result?.status==='SUCCEEDED'?'SUCCEEDED':'JOB_FAILED');}
  catch(err){if(/UNAUTHORIZED|AUTH_REQUIRED/.test(String(err?.message)))throw Error('HIVE_WORKER_AUTH_STOP');errors=Math.min(errors+1,6);onEvent('RETRY_WAIT');}
  if(shouldStop())break;
  await wait(errors?Math.min(60000,8000*Math.pow(2,errors-1)):8000);
 }
 return {status:'STOPPED'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const token=process.env.HIVE_TEST_WORKER_TOKEN;
 if(!token)throw Error('HIVE_TEST_WORKER_TOKEN_REQUIRED');
 const policy=JSON.parse(await readFile(new URL('../docs/UGO_SCHEDULER_POLICY.json',import.meta.url),'utf8'));
 let stop=false;process.on('SIGINT',()=>{stop=true});process.on('SIGTERM',()=>{stop=true});
 await runHiveTestWorkerLoop({token,policy,shouldStop:()=>stop,onEvent:(event)=>{if(event!=='IDLE')process.stdout.write('[HIVE TEST] '+event+'\n')}});
}