import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildHiveLaunchAgentPlist,installHiveMacService,uninstallHiveMacService} from '../../scripts/hive-local-macos-service.mjs';
import {HIVE_KEYCHAIN_SERVICES,readHiveKeychainSecret,writeHiveKeychainSecret} from '../../scripts/hive-local-macos-keychain.mjs';
import {acquireHiveWorkerLock,createEngineGuardedPoll,hiveEngineStatus,hiveWorkerFailureExitCode} from '../../scripts/hive-local-macos-worker.mjs';

const token = 'a'.repeat(64);
const root = resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const temp = () => mkdtempSync(join(tmpdir(),'ugo-hive-mac-test-'));

test('LaunchAgent starts at login with bounded restart and contains no credentials or listener',()=>{
 const plist = buildHiveLaunchAgentPlist({nodePath:'/usr/local/bin/node',workerScript:'/Users/A & B/repo/scripts/hive-local-macos-worker.mjs',workingDirectory:'/Users/A & B/repo',stdoutPath:'/tmp/out',stderrPath:'/tmp/err'});
 assert.match(plist,/<key>RunAtLoad<\/key><true\/>/);
 assert.match(plist,/<key>KeepAlive<\/key><dict><key>SuccessfulExit<\/key><false\/><\/dict>/);
 assert.match(plist,/<key>HIVE_LAUNCHD_MANAGED<\/key><string>1<\/string>/);
 assert.match(plist,/<key>ThrottleInterval<\/key><integer>30<\/integer>/);
 assert.match(plist,/A &amp; B/);
 assert.doesNotMatch(plist,/HIVE_TEST_WORKER_TOKEN|HIVE_LOCAL_FREEAPI_KEY|apiKey|authorization|Sockets|Listen/);
});

test('Keychain writes secrets on security stdin, never argv, and verifies without logging',()=>{
 const calls = [];
 const exec = (command,args,options) => {
  calls.push({command,args,options});
  if (args[0] === '-i') return {status:0,stdout:'',stderr:''};
  return {status:0,stdout:token+'\n',stderr:''};
 };
 writeHiveKeychainSecret({service:HIVE_KEYCHAIN_SERVICES.worker,secret:token,exec});
 assert.equal(calls[0].args.includes(token),false);
 assert.equal(calls[0].options.input.includes(token),true);
 assert.equal(calls[1].args.includes(token),false);
 assert.equal(readHiveKeychainSecret({service:HIVE_KEYCHAIN_SERVICES.worker,exec}),token);
 assert.throws(()=>writeHiveKeychainSecret({service:HIVE_KEYCHAIN_SERVICES.worker,secret:'bad\nsecret',exec}),/HIVE_KEYCHAIN_SECRET_FORMAT_INVALID/);
});

test('installer is idempotent and reuses both valid Keychain credentials without prompting',async t=>{
 const home = temp();t.after(()=>rmSync(home,{recursive:true,force:true}));
 let prompts = 0, securityWrites = 0, bootstraps = 0;
 const securityExec = (_command,args) => {
  if (args[0] === '-i') { securityWrites++;return {status:0,stdout:'',stderr:''}; }
  const service = args[args.indexOf('-s')+1];
  return {status:0,stdout:(service===HIVE_KEYCHAIN_SERVICES.worker?token:'existing-free-key')+'\n',stderr:''};
 };
 const exec = (_command,args) => { if(args[0]==='bootstrap')bootstraps++;return ''; };
 const options = {home,platform:'darwin',uid:501,repoRoot:root,exec,securityExec,prompt:async()=>{prompts++;return 'unexpected';}};
 assert.deepEqual(await installHiveMacService(options),{service:'INSTALLED',credentials:'REUSED',runAtLoad:true});
 assert.deepEqual(await installHiveMacService(options),{service:'INSTALLED',credentials:'REUSED',runAtLoad:true});
 assert.equal(prompts,0);assert.equal(securityWrites,0);assert.equal(bootstraps,2);
 const plist = readFileSync(join(home,'Library','LaunchAgents','com.ugo.hive.test.worker.plist'),'utf8');
 assert.doesNotMatch(plist,new RegExp(token+'|existing-free-key'));
});

test('missing FreeLLMAPI credential does not rewrite a valid worker credential',async t=>{
 const home = temp();t.after(()=>rmSync(home,{recursive:true,force:true}));
 const store = new Map([[HIVE_KEYCHAIN_SERVICES.worker,token]]);
 const writes = [];
 const securityExec = (_command,args,options) => {
  if(args[0]==='-i') {
   const service = options.input.match(/ -s ([^ ]+) /)[1];
   const secret = options.input.match(/ -w ([^ \n]+)/)[1];
   store.set(service,secret);writes.push(service);return {status:0,stdout:'',stderr:''};
  }
  const service = args[args.indexOf('-s')+1];
  return store.has(service)?{status:0,stdout:store.get(service)+'\n',stderr:''}:{status:44,stdout:'',stderr:''};
 };
 let prompts = 0;
 const result = await installHiveMacService({home,platform:'darwin',uid:501,repoRoot:root,exec:()=>'',securityExec,prompt:async()=>{prompts++;return 'new-free-key';}});
 assert.equal(result.credentials,'ENROLLED');assert.equal(prompts,1);
 assert.deepEqual(writes,[HIVE_KEYCHAIN_SERVICES.freeApi]);
 assert.equal(store.get(HIVE_KEYCHAIN_SERVICES.worker),token);
});

test('uninstall preserves credentials by default and deletes them only explicitly',t=>{
 const home = temp();t.after(()=>rmSync(home,{recursive:true,force:true}));
 const deleted = [];
 const securityExec = (_command,args) => {
  if(args[0]==='delete-generic-password')deleted.push(args[args.indexOf('-s')+1]);
  return {status:0,stdout:'',stderr:''};
 };
 assert.equal(uninstallHiveMacService({home,platform:'darwin',uid:501,exec:()=>'',securityExec}).credentials,'RETAINED');
 assert.equal(deleted.length,0);
 assert.equal(uninstallHiveMacService({home,platform:'darwin',uid:501,exec:()=>'',securityExec,deleteCredentials:true}).credentials,'DELETED');
 assert.equal(deleted.length,2);
});

test('worker lock prevents duplicates, releases ownership and recovers a dead process lock',t=>{
 const stateDir = temp();t.after(()=>rmSync(stateDir,{recursive:true,force:true}));
 const releaseFirst = acquireHiveWorkerLock({stateDir,isAlive:()=>true});
 assert.throws(()=>acquireHiveWorkerLock({stateDir,isAlive:()=>true}),/HIVE_WORKER_ALREADY_RUNNING/);
 const releaseRecovered = acquireHiveWorkerLock({stateDir,isAlive:()=>false});
 releaseRecovered();releaseFirst();
 const releaseFinal = acquireHiveWorkerLock({stateDir});releaseFinal();
});

test('managed launchd does not restart authorization, reconciliation or duplicate-instance stops',()=>{
 for(const code of ['HIVE_WORKER_AUTH_STOP','HIVE_WORKER_RECONCILIATION_REQUIRED','HIVE_TEST_WORKER_TOKEN_REQUIRED','HIVE_WORKER_ALREADY_RUNNING'])
  assert.equal(hiveWorkerFailureExitCode(code,true),0);
 assert.equal(hiveWorkerFailureExitCode('HIVE_WORKER_FATAL',true),1);
 assert.equal(hiveWorkerFailureExitCode('HIVE_WORKER_AUTH_STOP',false),1);
});

test('engine availability is a real catalog/model check and blocks claims while unavailable',async()=>{
 assert.equal(hiveEngineStatus({status:'CATALOG_OK',models:['qwen3-coder-free']}),'AVAILABLE');
 assert.equal(hiveEngineStatus({status:'CATALOG_OK',models:['other']}),'MODEL_UNAVAILABLE');
 let clock = 0,claims = 0;
 const reports = [];
 const inspections = [
  {status:'UNREACHABLE'},
  {status:'CATALOG_OK',models:['qwen3-coder-free']}
 ];
 const poll = createEngineGuardedPoll({
  token,modelClient:{},now:()=>clock,checkIntervalMs:30000,
  inspect:async()=>inspections.shift(),
  transport:{reportEngine:async status=>reports.push(status),claim:async()=>null,complete:async()=>{}},
  processPoll:async()=>{claims++;return {status:'IDLE'};}
 });
 assert.deepEqual(await poll({policy:{}}),{status:'ENGINE_UNAVAILABLE'});
 clock = 30001;
 assert.deepEqual(await poll({policy:{}}),{status:'IDLE'});
 assert.deepEqual(reports,['UNREACHABLE','AVAILABLE']);assert.equal(claims,1);
});

test('failed engine report is retried without claiming or hiding an authorization failure',async()=>{
 let attempts = 0,claims = 0;
 const poll = createEngineGuardedPoll({token,modelClient:{},inspect:async()=>({status:'CATALOG_OK',models:['qwen3-coder-free']}),
  transport:{reportEngine:async()=>{attempts++;if(attempts===1)throw Error('HIVE_TEST_TRANSPORT_UNREACHABLE');},claim:async()=>null,complete:async()=>{}},
  processPoll:async()=>{claims++;return {status:'IDLE'};}});
 await assert.rejects(poll({policy:{}}),/HIVE_TEST_TRANSPORT_UNREACHABLE/);
 assert.deepEqual(await poll({policy:{}}),{status:'IDLE'});
 assert.equal(attempts,2);assert.equal(claims,1);
});
