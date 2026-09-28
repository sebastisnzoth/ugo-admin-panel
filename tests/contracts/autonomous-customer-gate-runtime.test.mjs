import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../../scripts/autonomous-launch-gate-runtime.mjs',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../../.github/workflows/autonomous-worker-test.yml',import.meta.url),'utf8');
test('scheduled TEST workflow authenticates and evaluates Customer #1 gate',()=>{
 assert.match(workflow,/Evaluate Customer #1 gate with real TEST Super Admin/);
 assert.match(workflow,/run: node scripts\/autonomous-launch-gate-runtime\.mjs/);
 assert.match(workflow,/UGO_TEST_ADMIN_PASSWORD: \$\{\{ secrets\.UGO_TEST_ADMIN_PASSWORD \}\}/);
 assert.match(script,/signInWithPassword/);
 assert.match(script,/superadmin_evaluate_release_gate/);
 assert.match(script,/CUSTOMER_ACCEPTANCE_BLOCKER_REQUIRED/);
 assert.doesNotMatch(script,/trfsjuseqjxlhrxuvdsm/);
});
