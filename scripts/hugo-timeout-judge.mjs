import assert from'node:assert/strict'
import{readFile,writeFile}from'node:fs/promises'
const e=JSON.parse(await readFile('artifacts/hugo-timeout-runtime.json','utf8'))
assert.equal(e.sha,process.env.UGO_RUNTIME_SHA)
for(const k of ['primary_timeout_fallback_success','telemetry_primary_timeout','telemetry_fallback_success','dual_timeout_bounded'])assert.equal(e[k],true,k)
assert.equal(e.fallback_provider,'openrouter')
assert.equal(e.fallback_used,true)
assert.equal(e.dual_timeout_error_code,'HUGO_MODEL_FALLBACK_EXHAUSTED')
assert.ok(e.telemetry_correlation_id)
assert.ok(e.dual_timeout_correlation_id)
assert.ok(e.first_elapsed_ms<2000)
assert.ok(e.second_elapsed_ms<2000)
assert.equal(e.result,'PASS')
const out={readiness_id:'hugo-timeout',validator:'Judge',sha:e.sha,result:'PASS',checked_at:new Date().toISOString(),evidence:['primary_timeout_fallback_success','telemetry_correlation_id','dual_timeout_bounded']}
await writeFile('artifacts/hugo-timeout-judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
