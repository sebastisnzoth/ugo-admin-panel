import { readFile, writeFile } from 'node:fs/promises'
const [p,j,independent,meta,surface]=await Promise.all([
 readFile('artifacts/readiness-admin-qa/runtime.json','utf8').then(JSON.parse),
 readFile('artifacts/readiness-admin-qa/judge.json','utf8').then(JSON.parse),
 readFile('tests/contracts/autonomous-independent-runtime-evidence.test.mjs','utf8'),
 readFile('tests/contracts/autonomous-meta-qa-agent-runtime.test.mjs','utf8'),
 readFile('src/mvp/AutonomousCorporationDashboard.tsx','utf8')
])
const fail=m=>{throw new Error('SENTINEL_FAIL:'+m)}
if(j.verdict!=='PASS'||j.runtime_sha!==p.runtime_sha)fail('judge_binding')
if(p.production_touched!==false||p.environment!=='UGO TEST')fail('environment')
if(p.fail_closed?.self_certification_allowed!==false)fail('autocertification')
for(const x of ['physical-gps-device','uploaded-media-bytes','real-customer-acceptance'])if(!independent.includes(x))fail('protected_'+x)
for(const x of ['baseline_run_id','seeded_run_id','rerun_id','permanent_regression'])if(!meta.includes(x))fail('meta_contract_'+x)
for(const x of ['QA Lab · escenarios persistidos','No se autocertifica','Correlation ID','Judge:'])if(!surface.includes(x))fail('surface_'+x)
const out={validator:'Sentinel',verdict:'PASS',readiness_id:'admin-qa',runtime_sha:p.runtime_sha,correlation_id:p.correlation_id,checked_at:new Date().toISOString(),production_touched:false,reconciliation:'PASS',protected_human_physical_gates:'FAIL_CLOSED'}
await writeFile('artifacts/readiness-admin-qa/sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
