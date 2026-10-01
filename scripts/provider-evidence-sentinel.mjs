import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const sha=process.env.UGO_RUNTIME_SHA||''
const runtime=JSON.parse(await fs.readFile(process.argv[2]||'artifacts/provider-evidence-runtime.json','utf8'))
const judge=JSON.parse(await fs.readFile(process.argv[3]||'artifacts/provider-evidence-judge.json','utf8'))
const output=process.argv[4]||'artifacts/provider-evidence-sentinel.json'
assert.equal(runtime.sha,sha,'SENTINEL_RUNTIME_SAME_SHA_REQUIRED')
assert.equal(judge.sha,sha,'SENTINEL_JUDGE_SAME_SHA_REQUIRED')
assert.equal(judge.readiness_id,'provider-evidence','SENTINEL_SCOPE_REQUIRED')
assert.equal(judge.status,'PASS','SENTINEL_JUDGE_PASS_REQUIRED')
assert.equal(runtime.environment,'UGO TEST','SENTINEL_TEST_ONLY')
assert.equal(runtime.productionTouched,false,'SENTINEL_PRODUCTION_UNTOUCHED')
assert.equal(runtime.persistedRowsAndBytes,true,'SENTINEL_PERSISTENCE_REQUIRED')
assert.equal(runtime.stateGuardContract,true,'SENTINEL_STAGE_GUARD_REQUIRED')
assert.equal(runtime.uiFlowContract,true,'SENTINEL_UI_REQUIRED')
assert.equal(runtime.privateBucket,true,'SENTINEL_PRIVATE_BUCKET_REQUIRED')
assert.equal(runtime.publicAccessDenied,true,'SENTINEL_PUBLIC_DENIED_REQUIRED')
assert.ok(runtime.serviceId&&runtime.qaJobId,'SENTINEL_AUDIT_IDS_REQUIRED')
const result={validator:'Sentinel',readiness_id:'provider-evidence',status:'PASS',sha,checks:['same-sha-runtime','judge-pass','ugo-test-only','production-untouched','persisted-initial-final','state-gated','ui-gated','protected-storage','audit-ids'],completed_at:new Date().toISOString()}
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
