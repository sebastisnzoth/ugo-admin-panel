import { readFile, writeFile, mkdir } from 'node:fs/promises'
const runtime=JSON.parse(await readFile('artifacts/auto-departments-runtime.json','utf8'))
const judge=JSON.parse(await readFile('artifacts/auto-departments-judge.json','utf8'))
const canonical=[1,2,3,4,5,6,7,8,9,10,11,12,14]
const failures=[]
if(runtime.environment!=='UGO TEST')failures.push('environment is not UGO TEST')
if(String(process.env.UGO_TEST_SUPABASE_URL||'')!=='https://tmossnqfwfwjrtzwcbmm.supabase.co')failures.push('test project guard mismatch')
if(String(process.env.UGO_TEST_SUPABASE_URL||'').includes('trfsjuseqjxlhrxuvdsm'))failures.push('production project detected')
if(judge.result!=='PASS')failures.push('Judge did not PASS')
if(runtime.total!==canonical.length)failures.push('canonical department count mismatch')
for(const row of runtime.proof||[]){
 if(!canonical.includes(row.department_id))failures.push('unexpected department D'+row.department_id)
 if(row.responsible_agent?.status==='DISABLED')failures.push('disabled responsible agent D'+row.department_id)
 if(row.maturity!=='CONNECTED')failures.push('unsafe maturity state D'+row.department_id)
}
const report={schema_version:'UGO_AUTO_DEPARTMENTS_SENTINEL_V1',readiness_id:'auto-departments',validator:'Sentinel',result:failures.length?'FAIL':'PASS',runtime_sha:runtime.runtime_sha,production_touched:false,failures,created_at:new Date().toISOString()}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/auto-departments-sentinel.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report));if(failures.length)process.exit(1)
