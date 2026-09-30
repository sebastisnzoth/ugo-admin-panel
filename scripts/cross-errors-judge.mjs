import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const ui=JSON.parse(await fs.readFile('artifacts/cross-errors-ui-runtime.json','utf8'))
const api=JSON.parse(await fs.readFile('artifacts/cross-errors-api-runtime.json','utf8'))
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
for(const item of [ui,api]){
 assert.equal(item.sha,sha,'JUDGE_SAME_SHA_REQUIRED')
 assert.equal(item.status,'PASS','JUDGE_RUNTIME_PASS_REQUIRED')
 assert.equal(item.production_touched,false,'JUDGE_PRODUCTION_UNTOUCHED_REQUIRED')
}
assert.match(ui.message,/volvé a intentar|volver a intentar|reintentar/i)
assert.equal(api.status_code,401)
assert.match(api.next_step,/sesión|session/i)
const result={validator:'Judge',control:'cross-errors',status:'PASS',sha,basis:['UI injected auth failure exposes cause + retry/recovery path','API missing-auth failure returns 401 + explicit next_step','same-SHA evidence; production untouched'],source_artifacts:['cross-errors-ui-runtime.json','cross-errors-api-runtime.json'],completed_at:new Date().toISOString()}
await fs.writeFile('artifacts/cross-errors-judge.json',JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
