import fs from 'node:fs/promises'
const runtime=JSON.parse(await fs.readFile('artifacts/department-job-visibility-runtime.json','utf8'))
const failures=[]
if(runtime.readiness_id!=='auto-department-job-visibility')failures.push('wrong readiness_id')
if(runtime.environment!=='UGO TEST')failures.push('environment is not UGO TEST')
if(runtime.sha!==(process.env.UGO_RUNTIME_SHA||process.env.GITHUB_SHA||runtime.sha))failures.push('runtime SHA mismatch')
for(const key of ['active_counts_match','total_counts_match','last_job_matches','last_evidence_matches','correlation_id_visible','department_filter_works','history_dialog_works','freshness_visible','no_divergence_alert','no_page_errors'])if(runtime.assertions?.[key]!==true)failures.push('missing PASS '+key)
const report={readiness_id:runtime.readiness_id,validator:'Judge',result:failures.length?'FAIL':'PASS',runtime_sha:runtime.sha,failures,created_at:new Date().toISOString()}
await fs.writeFile('artifacts/department-job-visibility-judge.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report))
if(failures.length)process.exit(1)
