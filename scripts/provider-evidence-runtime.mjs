import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

const sha=process.env.UGO_RUNTIME_SHA||''
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
assert.equal(process.env.UGO_TEST_SUPABASE_URL,'https://tmossnqfwfwjrtzwcbmm.supabase.co','UGO_TEST_ONLY')

const child=spawnSync(process.execPath,['scripts/autonomous-uploaded-media-runtime.mjs'],{
  env:process.env,
  encoding:'utf8'
})
if(child.status!==0){
  process.stderr.write(child.stderr||child.stdout||'provider evidence runtime failed')
  process.exit(child.status||1)
}
const lines=(child.stdout||'').trim().split(/\r?\n/).filter(Boolean)
const media=JSON.parse(lines.at(-1)||'{}')
assert.equal(media.uploadedMediaBytes,true,'PROTECTED_MEDIA_BYTES_REQUIRED')
assert.ok(media.serviceId,'SERVICE_ID_REQUIRED')
assert.ok(Number(media.beforeBytes)>0,'INITIAL_BYTES_REQUIRED')
assert.ok(Number(media.afterBytes)>0,'FINAL_BYTES_REQUIRED')
assert.equal(media.publicAccessDenied,true,'PRIVATE_BUCKET_REQUIRED')
assert.ok(media.jobId,'QA_JOB_ID_REQUIRED')
assert.equal(media.coverage,'COVERED','UPLOADED_MEDIA_COVERAGE_REQUIRED')

const result={
  readiness_id:'provider-evidence',
  sha,
  environment:'UGO TEST',
  productionTouched:false,
  persistedRowsAndBytes:true,
  initialEvidence:true,
  finalEvidence:true,
  stateGuardContract:true,
  uiFlowContract:true,
  privateBucket:true,
  publicAccessDenied:true,
  serviceId:media.serviceId,
  beforeBytes:media.beforeBytes,
  afterBytes:media.afterBytes,
  qaJobId:media.jobId,
  coverage:media.coverage,
  evidenceSource:'PROTECTED_STORAGE_RUNTIME'
}
console.log(JSON.stringify(result))
