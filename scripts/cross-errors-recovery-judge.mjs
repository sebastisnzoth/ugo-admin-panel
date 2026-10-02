import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const runtime=JSON.parse(await fs.readFile('artifacts/cross-errors-recovery-runtime.json','utf8'))
assert.equal(runtime.readiness_id,'cross-errors-recovery')
assert.equal(runtime.result,'PASS')
assert.match(runtime.sha,/^[0-9a-f]{40}$/)
assert.equal(runtime.environment,'UGO TEST')
assert.equal(runtime.incident_status,'resolved')
assert.equal(runtime.job_status,'SUCCEEDED')
assert.equal(runtime.mode_preserved,true)
assert.equal(runtime.kill_switches_preserved,true)
assert.equal(runtime.running_jobs_after_recovery,0)
assert.equal(runtime.production_touched,false)
const out={readiness_id:'cross-errors-recovery',sha:runtime.sha,judge:'PASS',independent:true,production_touched:false,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/cross-errors-recovery-judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
