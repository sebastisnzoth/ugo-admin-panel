import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const runtime=JSON.parse(await fs.readFile('artifacts/end-to-end-command-center-gate-runtime.json','utf8'))
const judge=JSON.parse(await fs.readFile('artifacts/end-to-end-command-center-gate-judge.json','utf8'))
assert.equal(judge.judge,'PASS')
assert.equal(judge.sha,runtime.sha)
assert.equal(runtime.autonomous_scope_complete,true)
assert.equal(runtime.launch_authorized,false,'FINAL_GATE_MUST_NOT_AUTHORIZE_PRODUCTION')
assert.equal(runtime.production_touched,false)
assert.ok(Array.isArray(runtime.human_required_ids))
assert.ok(runtime.human_required_ids.length>0,'HUMAN_FINAL_WORK_MUST_REMAIN_EXPLICIT')
const out={readiness_id:runtime.readiness_id,sha:runtime.sha,sentinel:'PASS',safe_boundary:true,human_required_count:runtime.human_required_ids.length,launch_authorized:false,production_touched:false,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/end-to-end-command-center-gate-sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
