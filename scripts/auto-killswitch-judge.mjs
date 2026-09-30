import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const sha=process.env.UGO_RUNTIME_SHA||''
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
const runtime=JSON.parse(await fs.readFile('artifacts/auto-killswitch-runtime.json','utf8'))
const failures=[]
const check=(ok,label)=>{if(!ok)failures.push(label)}

check(runtime.readiness_id==='auto-killswitch','READINESS_ID')
check(runtime.environment==='UGO TEST','UGO_TEST_ONLY')
check(runtime.sha===sha,'SAME_SHA_REQUIRED')
check(runtime.result==='PASS','RUNTIME_PASS')
check(runtime.activation?.persisted===true,'ACTIVATION_PERSISTED')
check(runtime.activation?.visible_in_ui===true,'ACTIVATION_UI_VISIBLE')
check(runtime.activation?.audited===true,'ACTIVATION_AUDITED')
check(runtime.stop?.fail_closed===true,'STOP_FAIL_CLOSED')
check(runtime.stop?.error_code==='AUTONOMY_KILL_SWITCH_ACTIVE','KILL_SWITCH_SPECIFIC_SIGNAL')
check(runtime.stop?.job_persisted===false,'NO_BLOCKED_JOB_PERSISTED')
check(runtime.recovery?.via_ui===true,'RECOVERY_UI_WIRING')
check(runtime.recovery?.persisted===true,'RECOVERY_PERSISTED')
check(runtime.recovery?.audited===true,'RECOVERY_AUDITED')
check(runtime.recovery?.evidence_hash_present===true,'RECOVERY_EVIDENCE_HASH')
check(runtime.recovery?.final_enabled===false,'FINAL_SWITCH_DISABLED')
check(runtime.mode?.changed===false,'GLOBAL_MODE_UNCHANGED')
check(runtime.production_touched===false,'PRODUCTION_UNTOUCHED')
check(Array.isArray(runtime.page_errors)&&runtime.page_errors.length===0,'NO_PAGE_ERRORS')

const result=failures.length?'FAIL':'PASS'
const evidence={
  readiness_id:'auto-killswitch',
  validator:'Judge',
  result,
  runtime_sha:runtime.sha,
  failures,
  basis:[
    'scoped AGENT kill switch persisted and was visible in Super Admin',
    'autonomous enqueue failed closed with kill-switch-specific signal and no job persisted',
    'recovery ran through the UI and persisted an evidence-hashed recovery audit',
    'global autonomy mode was unchanged and production was untouched'
  ],
  created_at:new Date().toISOString()
}
await fs.writeFile('artifacts/auto-killswitch-judge.json',JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify(evidence))
assert.equal(result,'PASS','AUTO_KILLSWITCH_JUDGE_FAILED: '+failures.join(','))
