import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const PROD_REF='trfsjuseqjxlhrxuvdsm'
const sha=process.env.UGO_RUNTIME_SHA||''
const evidence=JSON.parse(await fs.readFile('artifacts/admin-responsive-runtime.json','utf8'))
const judge=JSON.parse(await fs.readFile('artifacts/admin-responsive-judge.json','utf8'))
assert.equal(judge.status,'PASS','SENTINEL_REQUIRES_JUDGE_PASS')
assert.equal(judge.sha,sha,'SENTINEL_JUDGE_SAME_SHA_REQUIRED')
assert.equal(evidence.sha,sha,'SENTINEL_RUNTIME_SAME_SHA_REQUIRED')
assert.equal(evidence.environment,'UGO TEST','SENTINEL_TEST_ONLY')
assert.ok(String(evidence.tested_url||'').startsWith('http://127.0.0.1:'),'SENTINEL_LOCAL_RUNTIME_REQUIRED')
assert.deepEqual(evidence.page_errors||[],[],'SENTINEL_BROWSER_ERRORS')
assert.ok(!JSON.stringify(evidence).includes(PROD_REF),'SENTINEL_PRODUCTION_REFERENCE_FORBIDDEN')
const out={validator:'Sentinel',status:'PASS',task_id:'readiness-admin-responsive',readiness_id:'admin-responsive',sha,checked_at:new Date().toISOString(),production_touched:false,reconciliation:'PASS'}
await fs.writeFile('artifacts/admin-responsive-sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
