import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../../supabase/migrations/20260929062000_autonomous_release_gate_current_qa.sql',import.meta.url),'utf8');
test('release gate evaluates latest persisted verdict per scenario and excludes detected seeded defects',()=>{
 assert.match(sql,/r\.scenario_id=scenario\.id/);
 assert.match(sql,/order by r\.finished_at desc nulls last/);
 assert.match(sql,/latest\.status in\('FAILED','BLOCKED'\)/);
 assert.match(sql,/expected_failure_detected/);
 assert.doesNotMatch(sql,/from public\.autonomous_qa_runs where status in\('FAILED','BLOCKED'\)/);
});
