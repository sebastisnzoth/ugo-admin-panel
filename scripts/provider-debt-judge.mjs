import assert from'node:assert/strict'
import fs from'node:fs/promises'

const file=process.env.UGO_PROVIDER_DEBT_EVIDENCE||'artifacts/provider-debt-runtime.json'
const sha=process.env.UGO_RUNTIME_SHA||''
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
const data=JSON.parse(await fs.readFile(file,'utf8'))

assert.equal(data.task,'provider-debt-runtime')
assert.equal(data.sha,sha,'SAME_SHA_REQUIRED')
assert.equal(data.environment,'UGO TEST')
assert.equal(data.three_debt_block_verified,true)
assert.equal(Number(data.threshold_probe?.threshold),3)
assert.equal(Number(data.threshold_probe?.temporary_real_debts),3)
assert.equal(Boolean(data.threshold_probe?.blocked_at_threshold),true)
assert.equal(Boolean(data.threshold_probe?.online_guard_rejected),true)
assert.equal(Boolean(data.threshold_probe?.fixture_restored),true)
assert.equal(Boolean(data.threshold_probe?.profile_restored),true)
assert.equal(Boolean(data.threshold_probe?.shared_fixture_lock),true)
assert.equal(Boolean(data.threshold_probe?.production_touched),false)

const result={validator:'Judge',readiness_id:'provider-debt',sha,status:'PASS',basis:['three temporary real debts reached threshold','debt guard blocked provider availability','fixture and profile restored','same-SHA runtime artifact'],checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/provider-debt-judge.json',JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
