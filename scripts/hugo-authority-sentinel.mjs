import assert from'node:assert/strict'
import{readFile,writeFile}from'node:fs/promises'
const runtime=JSON.parse(await readFile('artifacts/hugo-authority-runtime.json','utf8')),judge=JSON.parse(await readFile('artifacts/hugo-authority-judge.json','utf8'))
assert.equal(judge.result,'PASS');assert.equal(runtime.production_touched,false);assert.equal(runtime.validated_sha,process.env.UGO_RUNTIME_SHA)
const negatives=runtime.matrix.filter(x=>x.expected==='DENY');assert.ok(negatives.length>=3);assert.ok(negatives.every(x=>x.actual!=='ALLOW'&&String(x.reason||'').length>0),'every denial must carry an explanation')
const result={validator:'Sentinel',result:'PASS',task_id:'readiness-hugo-authority',correlation_id:runtime.correlation_id,validated_sha:runtime.validated_sha,checks:['test-only-target','no-production','role-escalation-denied','denial-reason-present','same-sha']}
await writeFile('artifacts/hugo-authority-sentinel.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
