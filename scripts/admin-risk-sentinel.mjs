import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const PROD='trfsjuseqjxlhrxuvdsm'
const sha=process.env.UGO_RUNTIME_SHA||''
const e=JSON.parse(await fs.readFile('artifacts/admin-risk-runtime.json','utf8'))
const j=JSON.parse(await fs.readFile('artifacts/admin-risk-judge.json','utf8'))
assert.equal(j.result,'PASS','SENTINEL_REQUIRES_JUDGE_PASS')
assert.equal(j.runtime_sha,sha,'SENTINEL_JUDGE_SAME_SHA_REQUIRED')
assert.equal(e.sha,sha,'SENTINEL_RUNTIME_SAME_SHA_REQUIRED')
assert.equal(e.environment,'UGO TEST','SENTINEL_TEST_ONLY')
assert.equal(e.production_touched,false,'SENTINEL_PRODUCTION_TOUCH_FORBIDDEN')
assert.deepEqual(e.page_errors||[],[],'SENTINEL_BROWSER_ERRORS')
assert.ok(!JSON.stringify(e).includes(PROD),'SENTINEL_PRODUCTION_REFERENCE_FORBIDDEN')
const out={validator:'Sentinel',readiness_id:'admin-risk',result:'PASS',runtime_sha:sha,production_touched:false,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/admin-risk-sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
