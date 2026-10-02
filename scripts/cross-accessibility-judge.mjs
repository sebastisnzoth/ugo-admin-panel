import{readFile,writeFile}from'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA
if(!sha)throw new Error('UGO_RUNTIME_SHA required')
const path=`artifacts/cross-accessibility-runtime-${sha}.json`
const evidence=JSON.parse(await readFile(path,'utf8'))
const checks=[
 evidence.readiness_id==='cross-accessibility',
 evidence.tested_sha===sha,
 evidence.production_touched===false,
 evidence.result==='PASS',
 Array.isArray(evidence.routes)&&evidence.routes.length>=4,
 evidence.routes.every(r=>r.violations.length===0&&r.labels.unlabeled.length===0&&r.labels.unnamed.length===0&&r.labels.undersized.length===0&&r.focusOk),
]
const result=checks.every(Boolean)?'PASS':'FAIL'
const out={validator:'Judge',readiness_id:'cross-accessibility',tested_sha:sha,result,checked_at:new Date().toISOString()}
await writeFile(`artifacts/cross-accessibility-judge-${sha}.json`,JSON.stringify(out,null,2)+'\n')
if(result!=='PASS')process.exit(1)
console.log(JSON.stringify(out))
