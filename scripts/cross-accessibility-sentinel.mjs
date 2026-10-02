import{readFile,writeFile}from'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA
if(!sha)throw new Error('UGO_RUNTIME_SHA required')
const runtime=JSON.parse(await readFile(`artifacts/cross-accessibility-runtime-${sha}.json`,'utf8'))
const judge=JSON.parse(await readFile(`artifacts/cross-accessibility-judge-${sha}.json`,'utf8'))
const forbidden=JSON.stringify(runtime).match(/service_role|OPENROUTER_API_KEY|private[_-]?key/i)
const result=runtime.result==='PASS'&&judge.result==='PASS'&&!forbidden?'PASS':'FAIL'
const out={validator:'Sentinel',readiness_id:'cross-accessibility',tested_sha:sha,result,production_touched:false,secret_scan:forbidden?'FAIL':'PASS',checked_at:new Date().toISOString()}
await writeFile(`artifacts/cross-accessibility-sentinel-${sha}.json`,JSON.stringify(out,null,2)+'\n')
if(result!=='PASS')process.exit(1)
console.log(JSON.stringify(out))
