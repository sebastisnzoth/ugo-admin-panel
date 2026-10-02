import assert from'node:assert/strict'
import fs from'node:fs/promises'
const sha=String(process.env.UGO_RUNTIME_SHA||process.env.GITHUB_SHA||'').trim()
const r=JSON.parse(await fs.readFile('artifacts/cross-regression-runtime.json','utf8'))
assert.equal(r.readiness_id,'cross-regression')
assert.equal(r.sha,sha)
assert.equal(r.result,'PASS')
assert.equal(r.production_touched,false)
assert.equal(r.failing_tests,0)
assert.ok(r.regression_file_count>=10)
assert.ok(r.passing_tests>=r.regression_file_count)
assert.ok(r.source_guard_count>=6)
const out={validator:'Judge',readiness_id:'cross-regression',status:'PASS',sha,checks:['same-sha','all-regressions-pass','source-fixes-present','zero-failures'],completed_at:new Date().toISOString()}
await fs.writeFile('artifacts/cross-regression-judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
