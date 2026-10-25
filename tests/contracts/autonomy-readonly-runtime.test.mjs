import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source=readFileSync(new URL('../../scripts/role-ui-runtime.mjs',import.meta.url),'utf8')
const start=source.indexOf('async function testAutonomyControl(page,name){')
const end=source.indexOf('async function testAdmin(viewport,name)',start)
assert.ok(start>=0&&end>start,'autonomy runtime proof must exist')
const probe=source.slice(start,end)

test('cross-role runtime verifies autonomy mode without mutating shared TEST',()=>{
 assert.ok(probe.includes("select('mode,updated_by')"))
 assert.ok(probe.includes('AUTONOMY_STATE_CHANGED_DURING_TEST'))
 assert.ok(probe.includes('AUTONOMY_ACTOR_CHANGED_DURING_TEST'))
 assert.ok(probe.includes('AUTONOMY_UI_STATE_MISMATCH'))
 assert.ok(probe.includes('transition_tested:false'))
 for(const write of ['.click(','.update(','.upsert(','.insert(','.delete(',"method:'POST'","fetch('"]) {
   assert.ok(!probe.includes(write),'read-only autonomy probe must not contain '+write)
 }
})
test('non-idle shared TEST mode can never be reported as tested SHADOW transition',()=>{
 assert.ok(probe.includes("['OFF','SHADOW','ON']"))
 assert.ok(probe.includes("mode==='OFF'?'PASS':'SKIPPED'"))
 assert.ok(probe.includes('observed_mode:mode'))
 assert.ok(probe.includes('read_only_state_verified:true'))
})
