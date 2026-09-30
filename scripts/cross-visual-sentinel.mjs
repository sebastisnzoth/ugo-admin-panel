import assert from'node:assert/strict'
import{readFile,writeFile}from'node:fs/promises'

const sha=process.env.UGO_RUNTIME_SHA||''
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
const runtimeText=await readFile('artifacts/role-ui-runtime.json','utf8')
const judgeText=await readFile(`artifacts/cross-visual-judge-${sha}.json`,'utf8')
const runtime=JSON.parse(runtimeText)
const judge=JSON.parse(judgeText)
const forbidden=/(service_role|OPENROUTER_API_KEY|private[_-]?key|password["']?\s*[:=]\s*["'][^"']+)/i.test(runtimeText+judgeText)
const checks=[
 runtime.sha===sha,
 runtime.environment==='UGO TEST',
 runtime.page_errors===0,
 judge.tested_sha===sha,
 judge.result==='PASS',
 judge.production_touched===false,
 forbidden===false,
]
const result=checks.every(Boolean)?'PASS':'FAIL'
const out={
 validator:'Sentinel',
 readiness_id:'cross-visual',
 tested_sha:sha,
 production_touched:false,
 secret_scan:forbidden?'FAIL':'PASS',
 result,
 checked_at:new Date().toISOString(),
}
await writeFile(`artifacts/cross-visual-sentinel-${sha}.json`,JSON.stringify(out,null,2)+'\n')
if(result!=='PASS')process.exit(1)
console.log(JSON.stringify(out))
