import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const sha=process.env.UGO_RUNTIME_SHA||'';
const evidence=JSON.parse(await fs.readFile('artifacts/super-admin-ui-runtime.json','utf8'));
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED');
assert.equal(evidence.sha,sha,'JUDGE_SAME_SHA_REQUIRED');
assert.equal(evidence.environment,'UGO TEST','JUDGE_TEST_ONLY');
assert.equal(evidence.actor_role,'superadmin','JUDGE_SUPERADMIN_REQUIRED');
for(const [key,value] of Object.entries(evidence.runtime_checks||{})) assert.equal(value,'PASS','JUDGE_RUNTIME_CHECK_FAILED:'+key);
assert.equal(evidence.authorized_action?.name,'superadmin_evaluate_release_gate','JUDGE_AUTHORIZED_ACTION_REQUIRED');
assert.equal(evidence.authorized_action?.result,evidence.backend_after?.launch,'JUDGE_ACTION_BACKEND_MISMATCH');
assert.ok(evidence.backend_before?.correlated?.correlation_id,'JUDGE_TIMELINE_CORRELATION_REQUIRED');
await fs.access('artifacts/super-admin-ui-runtime.png');
const result={validator:'Judge',status:'PASS',task_id:'super-admin-ui',sha,checked_at:new Date().toISOString()};
await fs.writeFile('artifacts/super-admin-ui-judge.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
