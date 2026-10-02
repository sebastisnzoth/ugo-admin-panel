import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const runtime=JSON.parse(await fs.readFile('artifacts/cross-realtime-consistency-runtime.json','utf8'))
const judge=JSON.parse(await fs.readFile('artifacts/cross-realtime-consistency-judge.json','utf8'))
assert.equal(judge.judge,'PASS')
assert.equal(judge.sha,runtime.sha)
assert.equal(runtime.result,'PASS')
assert.equal(runtime.client_provider_realtime,true)
assert.equal(runtime.admin_realtime_dependency_verified,true)
assert.equal(runtime.notification_persisted,true)
assert.equal(runtime.audit_event_persisted,true)
assert.equal(runtime.production_touched,false)
const out={readiness_id:'cross-realtime-consistency',sha:runtime.sha,sentinel:'PASS',no_manual_refresh:true,production_touched:false,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/cross-realtime-consistency-sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
