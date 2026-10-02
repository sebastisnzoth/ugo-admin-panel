import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const runtime=JSON.parse(await fs.readFile('artifacts/end-to-end-command-center-gate-runtime.json','utf8'))
assert.equal(runtime.readiness_id,'end-to-end-command-center-gate')
assert.equal(runtime.result,'PASS')
assert.match(runtime.sha,/^[0-9a-f]{40}$/)
assert.equal(runtime.autonomous_scope_complete,true)
assert.equal(runtime.totals?.autonomous_remaining,0)
assert.equal(runtime.totals?.invalid_remaining,0)
assert.equal(runtime.command_center_truthful,true)
assert.equal(runtime.launch_authorized,false)
assert.equal(runtime.production_touched,false)
const out={readiness_id:runtime.readiness_id,sha:runtime.sha,judge:'PASS',autonomous_scope_complete:true,human_work_preserved:true,launch_authorized:false,production_touched:false,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/end-to-end-command-center-gate-judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
