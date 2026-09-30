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
assert.equal(runtime.hugo_action?.action,'cancel_service','Hugo backend action mismatch')
assert.equal(runtime.hugo_action?.before?.state,'buscando','Hugo fixture initial state mismatch')
assert.notEqual(runtime.hugo_action?.after?.state,'buscando','Hugo persisted cancellation missing')
assert.equal(runtime.hugo_action?.audit_trail?.runtime_sha,sha,'Hugo runtime audit SHA missing')
assert.equal(runtime.hugo_action?.audit_trail?.channel,'ugo:native-voice-tool-call','Hugo action channel audit missing')
assert.ok(runtime.hugo_action?.service_id,'Hugo persisted service id missing')
assert.ok(runtime.hugo_action?.cleanup_state,'Hugo cleanup state missing')

assert.ok(String(runtime.hugo_action?.confirmation_message||'').trim().length>0,'Hugo effect confirmation missing')

const result={
 validator:'Judge',
 status:'PASS',
 sha,
 basis:{
   hugo:'isolated TEST service cancelled through real Hugo tool channel with persisted backend effect, audit trail and brief confirmation'
 },
 source_artifact:input,
 completed_at:new Date().toISOString()
}
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
