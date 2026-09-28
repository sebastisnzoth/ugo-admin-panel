import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../../supabase/migrations/20260929063000_autonomous_release_gate_alias_fix.sql',import.meta.url),'utf8');
test('QA query does not shadow PL/pgSQL release-gate row variable',()=>{
 assert.match(sql,/declare blockers .*;r public\.autonomous_release_gate%rowtype/);
 assert.match(sql,/from public\.autonomous_qa_runs qa_run/);
 assert.match(sql,/qa_run\.scenario_id=scenario\.id/);
 assert.doesNotMatch(sql,/from public\.autonomous_qa_runs r\b/);
});
