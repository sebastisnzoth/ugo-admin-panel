import fs from 'node:fs/promises'
const runtime=JSON.parse(await fs.readFile('artifacts/department-job-visibility-runtime.json','utf8'))
const judge=JSON.parse(await fs.readFile('artifacts/department-job-visibility-judge.json','utf8'))
const failures=[]
if(judge.result!=='PASS')failures.push('Judge did not PASS')
if(runtime.environment!=='UGO TEST')failures.push('environment is not UGO TEST')
if(runtime.production_touched!==false)failures.push('production touched')
if(runtime.department_count<13)failures.push('canonical department coverage incomplete')
const report={readiness_id:runtime.readiness_id,validator:'Sentinel',result:failures.length?'FAIL':'PASS',runtime_sha:runtime.sha,production_touched:false,failures,created_at:new Date().toISOString()}
await fs.writeFile('artifacts/department-job-visibility-sentinel.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report))
if(failures.length)process.exit(1)
