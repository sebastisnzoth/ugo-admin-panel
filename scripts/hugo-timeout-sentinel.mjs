import assert from'node:assert/strict'
import{readFile,writeFile}from'node:fs/promises'
const e=JSON.parse(await readFile('artifacts/hugo-timeout-runtime.json','utf8'))
assert.equal(e.production_touched,false)
assert.equal(e.external_model_call_performed,false)
assert.ok(e.gemini_timeout_ms<=12000)
assert.ok(e.openrouter_timeout_ms<=8000)
assert.equal(e.primary_timeout_fallback_success,true)
assert.equal(e.dual_timeout_bounded,true)
const out={readiness_id:'hugo-timeout',validator:'Sentinel',sha:e.sha,result:'PASS',production_touched:false,external_model_call:false,fail_closed:true,checked_at:new Date().toISOString()}
await writeFile('artifacts/hugo-timeout-sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
