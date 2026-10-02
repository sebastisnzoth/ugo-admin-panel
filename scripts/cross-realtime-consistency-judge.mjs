import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const runtime=JSON.parse(await fs.readFile('artifacts/cross-realtime-consistency-runtime.json','utf8'))
assert.equal(runtime.readiness_id,'cross-realtime-consistency')
assert.equal(runtime.result,'PASS')
assert.match(runtime.sha,/^[0-9a-f]{40}$/)
assert.equal(runtime.environment,'UGO TEST')
assert.equal(runtime.client_provider_realtime,true)
assert.equal(runtime.admin_realtime_dependency_verified,true)
assert.equal(runtime.same_service_state_persisted,true)
assert.equal(runtime.notification_persisted,true)
assert.equal(runtime.audit_event_persisted,true)
assert.equal(runtime.manual_refresh_used,false)
assert.equal(runtime.production_touched,false)
const out={readiness_id:'cross-realtime-consistency',sha:runtime.sha,judge:'PASS',independent:true,production_touched:false,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/cross-realtime-consistency-judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
