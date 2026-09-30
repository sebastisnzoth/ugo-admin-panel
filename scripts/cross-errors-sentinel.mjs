import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const ui=JSON.parse(await fs.readFile('artifacts/cross-errors-ui-runtime.json','utf8'))
const api=JSON.parse(await fs.readFile('artifacts/cross-errors-api-runtime.json','utf8'))
const judge=JSON.parse(await fs.readFile('artifacts/cross-errors-judge.json','utf8'))
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
assert.equal(judge.status,'PASS','SENTINEL_REQUIRES_JUDGE_PASS')
assert.equal(judge.sha,sha,'SENTINEL_JUDGE_SAME_SHA_REQUIRED')
assert.equal(ui.sha,sha);assert.equal(api.sha,sha)
assert.equal(ui.production_touched,false);assert.equal(api.production_touched,false)
assert.equal(api.status_code,401,'SENTINEL_FAIL_CLOSED_REQUIRED')
assert.ok(Array.isArray(ui.assertions)&&ui.assertions.includes('next-step-visible'))
assert.ok(Array.isArray(api.assertions)&&api.assertions.includes('next-step-visible'))
const result={validator:'Sentinel',control:'cross-errors',status:'PASS',sha,checks:['same-sha-runtime','judge-pass','ui-cause-and-next-step','api-cause-and-next-step','api-fail-closed','production-untouched'],completed_at:new Date().toISOString()}
await fs.writeFile('artifacts/cross-errors-sentinel.json',JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
