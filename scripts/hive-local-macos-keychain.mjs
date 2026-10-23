// macOS login-Keychain access for the existing outbound Hive TEST worker.
// Secret values are never included in argv, logs, errors or return status metadata.
import {spawnSync} from 'node:child_process';

export const HIVE_KEYCHAIN_ACCOUNT = 'ugo-hive-test';
export const HIVE_KEYCHAIN_SERVICES = Object.freeze({
  worker: 'com.ugo.hive.test.worker-token',
  freeApi: 'com.ugo.hive.test.freellmapi-key'
});

function runSecurity(args, {exec = spawnSync, input} = {}) {
  const result = exec('/usr/bin/security', args, {
    encoding: 'utf8', input, timeout: 10000, maxBuffer: 4096,
    stdio: input === undefined ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe']
  });
  if (result.error) throw Error('HIVE_KEYCHAIN_UNAVAILABLE');
  return result;
}

export function readHiveKeychainSecret({service, account = HIVE_KEYCHAIN_ACCOUNT, exec} = {}) {
  if (!Object.values(HIVE_KEYCHAIN_SERVICES).includes(service)) throw Error('HIVE_KEYCHAIN_SERVICE_INVALID');
  const result = runSecurity(['find-generic-password', '-a', account, '-s', service, '-w'], {exec});
  if (result.status === 0) return String(result.stdout).replace(/\r?\n$/, '');
  // /usr/bin/security maps errSecItemNotFound to status 44 on macOS.
  if (result.status === 44) return null;
  throw Error('HIVE_KEYCHAIN_READ_FAILED');
}

export function writeHiveKeychainSecret({service, secret, account = HIVE_KEYCHAIN_ACCOUNT, exec} = {}) {
  if (!Object.values(HIVE_KEYCHAIN_SERVICES).includes(service)) throw Error('HIVE_KEYCHAIN_SERVICE_INVALID');
  // Interactive security(1) receives the command on stdin, not in the process argument list.
  // Restrict the grammar instead of interpolating quotes, whitespace or shell metacharacters.
  if (typeof secret !== 'string' || !/^[A-Za-z0-9._~+/=:-]{1,1024}$/.test(secret))
    throw Error('HIVE_KEYCHAIN_SECRET_FORMAT_INVALID');
  const command = `add-generic-password -a ${account} -s ${service} -U -w ${secret}\n`;
  const result = runSecurity(['-i'], {exec, input: command});
  if (result.status !== 0) throw Error('HIVE_KEYCHAIN_WRITE_FAILED');
  const stored = readHiveKeychainSecret({service, account, exec});
  if (stored !== secret) throw Error('HIVE_KEYCHAIN_VERIFY_FAILED');
}

export function deleteHiveKeychainSecret({service, account = HIVE_KEYCHAIN_ACCOUNT, exec} = {}) {
  if (!Object.values(HIVE_KEYCHAIN_SERVICES).includes(service)) throw Error('HIVE_KEYCHAIN_SERVICE_INVALID');
  const result = runSecurity(['delete-generic-password', '-a', account, '-s', service], {exec});
  if (result.status !== 0 && result.status !== 44) throw Error('HIVE_KEYCHAIN_DELETE_FAILED');
}
