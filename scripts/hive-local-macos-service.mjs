// Idempotent per-user LaunchAgent installer for macOS Catalina and later.
// It never opens a port, writes a secret plist/environment file or rotates a valid credential.
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname,isAbsolute,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {HIVE_KEYCHAIN_SERVICES,deleteHiveKeychainSecret,readHiveKeychainSecret,writeHiveKeychainSecret} from './hive-local-macos-keychain.mjs';

export const HIVE_LAUNCH_AGENT_LABEL = 'com.ugo.hive.test.worker';
const moduleRoot = resolve(dirname(fileURLToPath(import.meta.url)),'..');
const xml = value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');

export function buildHiveLaunchAgentPlist({nodePath,workerScript,workingDirectory,stdoutPath,stderrPath} = {}) {
  for (const value of [nodePath,workerScript,workingDirectory,stdoutPath,stderrPath])
    if (typeof value !== 'string' || !isAbsolute(value)) throw Error('HIVE_LAUNCHD_PATH_REQUIRED');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
 <key>Label</key><string>${HIVE_LAUNCH_AGENT_LABEL}</string>
 <key>ProgramArguments</key><array><string>${xml(nodePath)}</string><string>${xml(workerScript)}</string></array>
 <key>WorkingDirectory</key><string>${xml(workingDirectory)}</string>
 <key>RunAtLoad</key><true/><key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict><key>ThrottleInterval</key><integer>30</integer>
 <key>EnvironmentVariables</key><dict><key>HIVE_LAUNCHD_MANAGED</key><string>1</string></dict>
 <key>ProcessType</key><string>Background</string>
 <key>StandardOutPath</key><string>${xml(stdoutPath)}</string>
 <key>StandardErrorPath</key><string>${xml(stderrPath)}</string>
</dict></plist>\n`;
}

export async function readHiddenLine({input = process.stdin, output = process.stdout, prompt = ''} = {}) {
  if (!input.isTTY || typeof input.setRawMode !== 'function') throw Error('HIVE_INTERACTIVE_ENROLLMENT_REQUIRED');
  output.write(prompt);
  input.setRawMode(true);
  input.resume();
  input.setEncoding('utf8');
  let value = '';
  return new Promise((resolvePromise,rejectPromise) => {
    const cleanup = () => {
      input.off('data',onData);
      input.setRawMode(false);
      input.pause();
    };
    const onData = chunk => {
      for (const char of String(chunk)) {
        if (char === '\u0003') { cleanup();output.write('\n');rejectPromise(Error('HIVE_ENROLLMENT_CANCELLED'));return; }
        if (char === '\r' || char === '\n') { cleanup();output.write('\n');resolvePromise(value);return; }
        if (char === '\u007f' || char === '\b') { value = Array.from(value).slice(0,-1).join('');continue; }
        if (char === '\u0015') { value = '';continue; }
        if (char >= ' ' && char !== '\u007f') value += char;
      }
    };
    input.on('data',onData);
  });
}

function validWorkerToken(value) { return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value); }
function validFreeApiKey(value) { return typeof value === 'string' && value.length > 0 && value.length <= 1024 && !/\s/.test(value); }
function plistPath(home) { return resolve(home,'Library','LaunchAgents',`${HIVE_LAUNCH_AGENT_LABEL}.plist`); }
function launchTarget(uid) { return `gui/${uid}/${HIVE_LAUNCH_AGENT_LABEL}`; }
function launchctl(args,exec) {
  try { return exec('/bin/launchctl',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}); }
  catch { throw Error('HIVE_LAUNCHCTL_FAILED'); }
}
function isLoaded(uid,exec) {
  try { exec('/bin/launchctl',['print',launchTarget(uid)],{encoding:'utf8',stdio:['ignore','pipe','pipe']});return true; }
  catch { return false; }
}

async function ensureCredentials({securityExec,prompt,replaceCredentials}) {
  let worker = readHiveKeychainSecret({service:HIVE_KEYCHAIN_SERVICES.worker,exec:securityExec});
  let freeApi = readHiveKeychainSecret({service:HIVE_KEYCHAIN_SERVICES.freeApi,exec:securityExec});
  if (!replaceCredentials && worker !== null && !validWorkerToken(worker)) throw Error('HIVE_STORED_WORKER_TOKEN_INVALID');
  if (!replaceCredentials && freeApi !== null && !validFreeApiKey(freeApi)) throw Error('HIVE_STORED_FREEAPI_KEY_INVALID');
  const missing = !validWorkerToken(worker) || !validFreeApiKey(freeApi);
  if (replaceCredentials || missing) {
    const writeWorker = replaceCredentials || !validWorkerToken(worker);
    const writeFreeApi = replaceCredentials || !validFreeApiKey(freeApi);
    if (writeWorker) worker = await prompt({prompt:'Worker TEST token (hidden, one-time Super Admin enrollment): '});
    if (writeFreeApi) freeApi = await prompt({prompt:'Existing FreeLLMAPI key (hidden, reused locally only): '});
    if (!validWorkerToken(worker)) throw Error('HIVE_TEST_WORKER_TOKEN_REQUIRED');
    if (!validFreeApiKey(freeApi)) throw Error('HIVE_LOCAL_API_KEY_REQUIRED');
    if (writeWorker) writeHiveKeychainSecret({service:HIVE_KEYCHAIN_SERVICES.worker,secret:worker,exec:securityExec});
    if (writeFreeApi) writeHiveKeychainSecret({service:HIVE_KEYCHAIN_SERVICES.freeApi,secret:freeApi,exec:securityExec});
    return replaceCredentials ? 'REPLACED' : 'ENROLLED';
  }
  return 'REUSED';
}

export async function installHiveMacService({
  home = homedir(), platform = process.platform, uid = process.getuid?.(),
  repoRoot = moduleRoot, nodePath = process.execPath, exec = execFileSync,
  securityExec, prompt = readHiddenLine, replaceCredentials = false
} = {}) {
  if (platform !== 'darwin') throw Error('HIVE_MACOS_REQUIRED');
  if (!Number.isInteger(uid) || uid < 0) throw Error('HIVE_LAUNCHD_USER_REQUIRED');
  const workerScript = resolve(repoRoot,'scripts','hive-local-macos-worker.mjs');
  if (!isAbsolute(nodePath) || !existsSync(nodePath) || !existsSync(workerScript)) throw Error('HIVE_WORKER_FILES_REQUIRED');
  const credentials = await ensureCredentials({securityExec,prompt,replaceCredentials});
  const agentsDir = resolve(home,'Library','LaunchAgents');
  const logsDir = resolve(home,'Library','Logs','UGO','HiveTest');
  mkdirSync(agentsDir,{recursive:true,mode:0o755});
  mkdirSync(logsDir,{recursive:true,mode:0o700});
  mkdirSync(resolve(home,'Library','Application Support','UGO','HiveTest'),{recursive:true,mode:0o700});
  const destination = plistPath(home);
  const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`;
  const content = buildHiveLaunchAgentPlist({
    nodePath,workerScript,workingDirectory:repoRoot,
    stdoutPath:resolve(logsDir,'worker.out.log'),stderrPath:resolve(logsDir,'worker.err.log')
  });
  try {
    writeFileSync(temporary,content,{encoding:'utf8',flag:'wx',mode:0o600});
    renameSync(temporary,destination);
  } finally { rmSync(temporary,{force:true}); }
  if (isLoaded(uid,exec)) launchctl(['bootout',launchTarget(uid)],exec);
  launchctl(['bootstrap',`gui/${uid}`,destination],exec);
  return {service:'INSTALLED',credentials,runAtLoad:true};
}

export function uninstallHiveMacService({
  home = homedir(), platform = process.platform, uid = process.getuid?.(),
  exec = execFileSync, securityExec, deleteCredentials = false
} = {}) {
  if (platform !== 'darwin') throw Error('HIVE_MACOS_REQUIRED');
  if (!Number.isInteger(uid) || uid < 0) throw Error('HIVE_LAUNCHD_USER_REQUIRED');
  if (isLoaded(uid,exec)) launchctl(['bootout',launchTarget(uid)],exec);
  rmSync(plistPath(home),{force:true});
  if (deleteCredentials) for (const service of Object.values(HIVE_KEYCHAIN_SERVICES))
    deleteHiveKeychainSecret({service,exec:securityExec});
  return {service:'UNINSTALLED',credentials:deleteCredentials?'DELETED':'RETAINED'};
}

export function hiveMacServiceStatus({home = homedir(), platform = process.platform, uid = process.getuid?.(), exec = execFileSync, securityExec} = {}) {
  if (platform !== 'darwin') return {service:'UNSUPPORTED_PLATFORM'};
  return {
    service:isLoaded(uid,exec)?'LOADED':'NOT_LOADED',plist:existsSync(plistPath(home)),
    workerCredential:readHiveKeychainSecret({service:HIVE_KEYCHAIN_SERVICES.worker,exec:securityExec})!==null,
    freeApiCredential:readHiveKeychainSecret({service:HIVE_KEYCHAIN_SERVICES.freeApi,exec:securityExec})!==null
  };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const command = process.argv[2] || 'status';
  try {
    let result;
    if (command === 'install') result = await installHiveMacService({replaceCredentials:process.argv.includes('--replace-credentials')});
    else if (command === 'uninstall') result = uninstallHiveMacService({deleteCredentials:process.argv.includes('--delete-credentials')});
    else if (command === 'status') result = hiveMacServiceStatus();
    else throw Error('HIVE_SERVICE_COMMAND_INVALID');
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    const code = /^HIVE_[A-Z0-9_]+$/.test(String(error?.message)) ? error.message : 'HIVE_SERVICE_FAILED';
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  }
}
