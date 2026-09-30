import assert from'node:assert/strict'
import fs from'node:fs/promises'

const file=process.env.UGO_PROVIDER_DEBT_EVIDENCE||'artifacts/provider-debt-runtime.json'
const sha=process.env.UGO_RUNTIME_SHA||''
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
const data=JSON.parse(await fs.readFile(file,'utf8'))

assert.equal(data.sha,sha,'SAME_SHA_REQUIRED')
assert.equal(data.environment,'UGO TEST')
assert.equal(data.threshold_probe?.production_touched,false)
assert.equal(data.threshold_probe?.fixture_restored,true)
assert.equal(data.threshold_probe?.profile_restored,true)
assert.equal(data.threshold_probe?.shared_fixture_lock,true)
assert.equal(data.read_only,true)

const result={validator:'Sentinel',readiness_id:'provider-debt',sha,status:'PASS',production_touched:false,basis:['UGO TEST only','service-role probe isolated by advisory lock','temporary debt mutation restored','provider profile restored','authenticated RLS state read'],checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/provider-debt-sentinel.json',JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
