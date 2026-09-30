import fs from 'node:fs/promises'
const runtime=JSON.parse(await fs.readFile('artifacts/client-location-runtime.json','utf8'))
const judge=JSON.parse(await fs.readFile('artifacts/client-location-judge.json','utf8'))
const failures=[]
if(judge.result!=='PASS')failures.push('Judge did not PASS')
if(runtime.environment!=='UGO TEST')failures.push('environment is not UGO TEST')
if(runtime.production_touched!==false)failures.push('production_touched must be false')
if(runtime.physical_gps_deferred!==true)failures.push('physical GPS must remain deferred to final human test')
if(String(process.env.UGO_TEST_SUPABASE_URL||'').includes('trfsjuseqjxlhrxuvdsm'))failures.push('production project detected')
const report={readiness_id:'client-location',validator:'Sentinel',result:failures.length?'FAIL':'PASS',runtime_sha:runtime.sha,production_touched:false,failures,created_at:new Date().toISOString()}
await fs.writeFile('artifacts/client-location-sentinel.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report))
if(failures.length)process.exit(1)
