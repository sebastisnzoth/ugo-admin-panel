import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const sha=process.env.UGO_RUNTIME_SHA||''
const input=process.argv[2]||'artifacts/readiness-safe-batch-runtime.json'
const output=process.argv[3]||'artifacts/readiness-safe-batch-judge.json'
const runtime=JSON.parse(await fs.readFile(input,'utf8'))

assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
assert.equal(runtime.sha,sha,'JUDGE_SAME_SHA_REQUIRED')
assert.equal(runtime.environment,'UGO TEST','JUDGE_TEST_ENV_ONLY')
assert.equal(runtime.production_touched,false,'JUDGE_PRODUCTION_MUST_BE_UNTOUCHED')

assert.equal(runtime.hugo_action?.status,'PASS','Hugo action runtime did not pass')
assert.equal(runtime.hugo_action?.persisted_effect,true,'Hugo action effect was not persisted')
assert.equal(runtime.hugo_action?.audit_metadata?.source,'hugo-conversational','Hugo audit source missing')
assert.equal(runtime.hugo_action?.audit_metadata?.voice,true,'Hugo voice audit flag missing')
assert.ok(runtime.hugo_action?.service_id,'Hugo persisted service id missing')
assert.ok(runtime.hugo_action?.cleanup_state,'Hugo cleanup state missing')

assert.equal(runtime.fault_injection?.ui_session_error?.status,'PASS','UI fault injection failed')
assert.equal(runtime.fault_injection?.api_auth_error?.status,'PASS','API fault injection failed')
assert.equal(runtime.fault_injection?.api_auth_error?.status_code,401,'API auth fault must fail closed with 401')
assert.match(String(runtime.fault_injection?.ui_session_error?.message||''),/sesión|session/i,'UI error cause missing')
assert.match(String(runtime.fault_injection?.ui_session_error?.message||''),/iniciar sesión|login|volver a iniciar/i,'UI next step missing')

assert.equal(runtime.performance?.status,'PASS','Performance runtime did not pass')
for(const [name,value] of Object.entries(runtime.performance||{})){
 if(name.endsWith('_navigation_ms'))assert.ok(Number.isFinite(value)&&value<=4000,name+' exceeds navigation SLO')
 if(name.endsWith('_initial_load_ms'))assert.ok(Number.isFinite(value)&&value<=8000,name+' exceeds load SLO')
}
assert.ok(Number.isFinite(runtime.performance?.p95_ms),'p95 missing')
assert.ok(Number.isFinite(runtime.performance?.max_ms),'max missing')

const result={
 validator:'Judge',
 status:'PASS',
 sha,
 basis:{
   hugo:'persistent INTENT→ACTION→EFFECT with auditable TEST service',
   errors:'UI/API fault injection communicates cause and next step',
   performance:'critical role loads and navigation satisfy runtime SLOs'
 },
 source_artifact:input,
 completed_at:new Date().toISOString()
}
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
