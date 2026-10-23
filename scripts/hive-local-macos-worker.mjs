// LaunchAgent entry point for the existing outbound Hive TEST worker.
// No inbound listener, no secret environment file and no autonomous capability.
import {randomUUID} from 'node:crypto';
import {lstatSync,mkdirSync,readFileSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {resolve} from 'node:path';
import {inspectLocalFreeAPI} from './hive-local-diagnose.mjs';
import {createLocalModelClient} from './hive-local-freellmapi-client.mjs';
import {runLocalHiveAgent} from './hive-local-agent-runner.mjs';
import {processHivePoll} from './hive-local-poll-worker.mjs';
import {createHiveTestTransport} from './hive-local-test-transport.mjs';
import {runHiveTestWorkerLoop} from './hive-local-test-daemon.mjs';
import {HIVE_KEYCHAIN_SERVICES,readHiveKeychainSecret} from './hive-local-macos-keychain.mjs';

export const HIVE_WORKER_MODEL = 'qwen3-coder-free';
const ENGINE_CHECK_MS = 30000;

export function hiveEngineStatus(inspection) {
  if (inspection?.status === 'CATALOG_OK')
    return Array.isArray(inspection.models) && inspection.models.includes(HIVE_WORKER_MODEL)
      ? 'AVAILABLE' : 'MODEL_UNAVAILABLE';
  if (['UNREACHABLE','AUTH_REJECTED','RATE_LIMITED','HTTP_ERROR','INVALID_CATALOG','CATALOG_TOO_LARGE'].includes(inspection?.status))
    return inspection.status;
  return 'UNKNOWN';
}

export function createEngineGuardedPoll({
  token, apiKey, transport, modelClient, inspect = inspectLocalFreeAPI,
  processPoll = processHivePoll, runAgent = runLocalHiveAgent,
  now = Date.now, checkIntervalMs = ENGINE_CHECK_MS
} = {}) {
  const channel = transport || createHiveTestTransport({token});
  const client = modelClient || createLocalModelClient({apiKey});
  if (typeof channel.reportEngine !== 'function') throw Error('HIVE_ENGINE_TRANSPORT_REQUIRED');
  let checkedAt = -Infinity;
  let engineStatus = 'UNKNOWN';
  return async ({policy}) => {
    const timestamp = now();
    if (timestamp - checkedAt >= checkIntervalMs) {
      engineStatus = hiveEngineStatus(await inspect({apiKey}));
      // The remote timestamp is written only after a real local /models check.
      await channel.reportEngine(engineStatus);
      checkedAt = timestamp;
    }
    if (engineStatus !== 'AVAILABLE') return {status:'ENGINE_UNAVAILABLE'};
    return processPoll({
      claim:channel.claim, complete:channel.complete, policy,
      run:({task,policy:taskPolicy}) => runAgent({task,policy:taskPolicy,modelClient:client})
    });
  };
}

function defaultIsAlive(pid) {
  try { process.kill(pid,0); return true; }
  catch (error) { return error?.code === 'EPERM'; }
}

export function acquireHiveWorkerLock({stateDir, isAlive = defaultIsAlive} = {}) {
  if (!stateDir || typeof stateDir !== 'string') throw Error('HIVE_WORKER_STATE_REQUIRED');
  mkdirSync(stateDir,{recursive:true,mode:0o700});
  const lockDir = resolve(stateDir,'worker.lock');
  const owner = JSON.stringify({pid:process.pid,nonce:randomUUID()});
  const create = () => {
    mkdirSync(lockDir,{mode:0o700});
    writeFileSync(resolve(lockDir,'owner.json'),owner,{encoding:'utf8',flag:'wx',mode:0o600});
  };
  try { create(); }
  catch (error) {
    if (error?.code !== 'EEXIST') throw Error('HIVE_WORKER_LOCK_FAILED');
    let stale = false;
    try {
      const stat = lstatSync(lockDir);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('HIVE_WORKER_LOCK_INVALID');
      const previous = JSON.parse(readFileSync(resolve(lockDir,'owner.json'),'utf8'));
      if (!Number.isInteger(previous.pid) || previous.pid <= 0 || typeof previous.nonce !== 'string')
        throw Error('HIVE_WORKER_LOCK_INVALID');
      if (isAlive(previous.pid)) throw Error('HIVE_WORKER_ALREADY_RUNNING');
      stale = true;
    } catch (lockError) {
      if (!stale) {
        if (/^HIVE_WORKER_/.test(lockError?.message)) throw lockError;
        throw Error('HIVE_WORKER_LOCK_INVALID');
      }
    }
    if (stale) {
      const quarantine = `${lockDir}.stale.${process.pid}.${randomUUID()}`;
      renameSync(lockDir,quarantine);
      rmSync(quarantine,{recursive:true,force:true});
      try { create(); } catch { throw Error('HIVE_WORKER_ALREADY_RUNNING'); }
    }
  }
  return () => {
    try {
      const current = readFileSync(resolve(lockDir,'owner.json'),'utf8');
      if (current === owner) rmSync(lockDir,{recursive:true,force:true});
    } catch (error) {
      if (error?.code !== 'ENOENT') throw Error('HIVE_WORKER_UNLOCK_FAILED');
    }
  };
}

export function hiveMacStateDirectory(home = homedir()) {
  return resolve(home,'Library','Application Support','UGO','HiveTest');
}

export function hiveWorkerFailureExitCode(code, managed) {
  const stopWithoutLaunchdRetry = new Set([
    'HIVE_WORKER_AUTH_STOP','HIVE_WORKER_RECONCILIATION_REQUIRED',
    'HIVE_TEST_WORKER_TOKEN_REQUIRED','HIVE_LOCAL_API_KEY_REQUIRED',
    'HIVE_WORKER_ALREADY_RUNNING','HIVE_WORKER_LOCK_INVALID'
  ]);
  return managed && stopWithoutLaunchdRetry.has(code) ? 0 : 1;
}

export async function runHiveMacWorker({home = homedir(), shouldStop = () => false, onEvent = () => {}} = {}) {
  if (process.platform !== 'darwin') throw Error('HIVE_MACOS_REQUIRED');
  const release = acquireHiveWorkerLock({stateDir:hiveMacStateDirectory(home)});
  try {
    const token = readHiveKeychainSecret({service:HIVE_KEYCHAIN_SERVICES.worker});
    const apiKey = readHiveKeychainSecret({service:HIVE_KEYCHAIN_SERVICES.freeApi});
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) throw Error('HIVE_TEST_WORKER_TOKEN_REQUIRED');
    if (!apiKey || /\s/.test(apiKey)) throw Error('HIVE_LOCAL_API_KEY_REQUIRED');
    const policy = JSON.parse(await readFile(new URL('../docs/UGO_SCHEDULER_POLICY.json',import.meta.url),'utf8'));
    const poll = createEngineGuardedPoll({token,apiKey});
    return await runHiveTestWorkerLoop({token,policy,poll,shouldStop,onEvent});
  } finally { release(); }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  let stop = false;
  const requestStop = () => { stop = true; };
  process.on('SIGINT',requestStop);
  process.on('SIGTERM',requestStop);
  let previous = '';
  try {
    await runHiveMacWorker({shouldStop:() => stop,onEvent:event => {
      if (event === 'IDLE' || event === previous) return;
      previous = event;
      // Fixed event codes only: no prompts, answers, provider bodies, paths or credentials.
      process.stdout.write(`${new Date().toISOString()} [HIVE TEST] ${event}\n`);
    }});
  } catch (error) {
    const code = /^HIVE_[A-Z0-9_]+$/.test(String(error?.message)) ? error.message : 'HIVE_WORKER_FATAL';
    process.stderr.write(`${new Date().toISOString()} [HIVE TEST] ${code}\n`);
    process.exitCode = hiveWorkerFailureExitCode(code,process.env.HIVE_LAUNCHD_MANAGED === '1');
  }
}
