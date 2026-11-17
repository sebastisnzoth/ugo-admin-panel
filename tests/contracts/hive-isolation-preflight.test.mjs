import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('../../scripts/hive-isolation-preflight.mjs', import.meta.url));
const clean = { PATH: process.env.PATH || '/usr/bin', UGO_HIVE_MODE: 'isolated', UGO_HIVE_READ_ONLY: 'true', UGO_HIVE_DATA_DIR: '/tmp/ugo-hive-isolated' };
const run = extra => spawnSync(process.execPath, [script], { env: {...clean, ...extra}, encoding:'utf8', timeout: 3000 });
test('allows minimal isolated environment without opening a connection', () => {
 const r=run({});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/PREFLIGHT_PASS/);
});
for (const [name, overrides] of [
 ['missing isolation mode',{UGO_HIVE_MODE:''}],
 ['missing read only',{UGO_HIVE_READ_ONLY:'false'}],
 ['relative data directory',{UGO_HIVE_DATA_DIR:'./data'}],
 ['production URL',{SUPABASE_URL:'https://trfsjuseqjxlhrxuvdsm.supabase.co'}],
 ['legacy test URL',{SUPABASE_URL:'https://tmossnqfwfwjrtzwcbmm.supabase.co'}],
 ['service role key',{SUPABASE_SERVICE_ROLE_KEY:'fake-sensitive-value'}],
 ['database connection string',{DATABASE_URL:'postgresql://test:pass@localhost/db'}],
 ['autonomy enabled',{UGO_HIVE_AUTONOMY_ON:'true'}],
 ['write enabled',{UGO_HIVE_ALLOW_PROD_WRITES:'true'}]
]) test('blocks '+name,()=>{const r=run(overrides);assert.equal(r.status,1,name);assert.match(r.stderr,/HIVE_ISOLATION_BLOCKED/);});
