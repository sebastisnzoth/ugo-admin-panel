import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const runtime=JSON.parse(await fs.readFile('artifacts/cross-errors-recovery-runtime.json','utf8'))
const judge=JSON.parse(await fs.readFile('artifacts/cross-errors-recovery-judge.json','utf8'))
assert.equal(judge.judge,'PASS')
assert.equal(judge.sha,runtime.sha)
assert.equal(runtime.result,'PASS')
assert.equal(runtime.production_touched,false)
assert.equal(runtime.mode_preserved,true)
assert.equal(runtime.kill_switches_preserved,true)
assert.equal(runtime.running_jobs_after_recovery,0)
const out={readiness_id:'cross-errors-recovery',sha:runtime.sha,sentinel:'PASS',safe_recovery:true,production_touched:false,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/cross-errors-recovery-sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
