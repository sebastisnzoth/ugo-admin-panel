import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const PROD_REF='trfsjuseqjxlhrxuvdsm';
const sha=process.env.UGO_RUNTIME_SHA||'';
const evidence=JSON.parse(await fs.readFile('artifacts/super-admin-ui-runtime.json','utf8'));
const judge=JSON.parse(await fs.readFile('artifacts/super-admin-ui-judge.json','utf8'));
assert.equal(judge.status,'PASS','SENTINEL_REQUIRES_JUDGE_PASS');
assert.equal(judge.sha,sha,'SENTINEL_JUDGE_SAME_SHA_REQUIRED');
assert.equal(evidence.sha,sha,'SENTINEL_RUNTIME_SAME_SHA_REQUIRED');
assert.equal(evidence.environment,'UGO TEST','SENTINEL_TEST_ONLY');
assert.ok(String(evidence.tested_url||'').startsWith('http://127.0.0.1:'),'SENTINEL_LOCAL_RUNTIME_REQUIRED');
assert.equal(evidence.authorized_action?.name,'superadmin_evaluate_release_gate','SENTINEL_MUTATION_SCOPE_VIOLATION');
assert.deepEqual(evidence.page_errors||[],[],'SENTINEL_BROWSER_PAGE_ERRORS');
assert.ok(!JSON.stringify(evidence).includes(PROD_REF),'SENTINEL_PRODUCTION_REFERENCE_FORBIDDEN');
const result={validator:'Sentinel',status:'PASS',task_id:'super-admin-ui',sha,checked_at:new Date().toISOString(),safe_environment:'UGO TEST'};
await fs.writeFile('artifacts/super-admin-ui-sentinel.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
