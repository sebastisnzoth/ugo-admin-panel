import { readFile, writeFile } from 'node:fs/promises'
const p=JSON.parse(await readFile('artifacts/readiness-admin-qa/runtime.json','utf8'))
const fail=m=>{throw new Error('JUDGE_FAIL:'+m)}
if(p.readiness_id!=='admin-qa'||p.environment!=='UGO TEST')fail('identity')
if(p.production_touched!==false)fail('production')
const roles=new Set((p.qa_lab?.active_simulators||[]).map(x=>x.role))
for(const role of ['CLIENT','PROVIDER','ADMIN'])if(!roles.has(role))fail('simulator_'+role)
const keys=new Set((p.qa_lab?.active_scenarios||[]).map(x=>x.scenario_key))
for(const key of ['service-lifecycle','roles','permissions-rls','gps-geofence','qa-meta-seeded-defect'])if(!keys.has(key))fail('scenario_'+key)
if((p.qa_lab?.total_recent_runs||0)<3)fail('results')
const m=p.meta_qa||{}
if(m.baseline_status!=='PASSED'||m.seeded_status!=='FAILED'||m.rerun_status!=='PASSED')fail('meta_sequence')
if(m.seeded_defect_detected!==true||m.remediation_requested!==true||m.permanent_regression!==true)fail('meta_regression')
if((m.decision_ledger_rows||0)<1||(m.evidence_ledger_rows||0)<1)fail('meta_ledgers')
if((p.independent_judge?.successful_jobs||0)<1)fail('independent_judge')
if(p.fail_closed?.self_certification_allowed!==false)fail('self_certification')
const protectedRows=p.fail_closed?.protected_coverage||[]
if(protectedRows.length!==3||protectedRows.some(x=>x.status==='COVERED'))fail('protected_gates')
const out={validator:'Judge',verdict:'PASS',readiness_id:'admin-qa',runtime_sha:p.runtime_sha,correlation_id:p.correlation_id,checked_at:new Date().toISOString(),basis:['persisted simulators','persisted scenario results','Meta-QA fail-remediate-pass','decision/evidence ledgers','independent deterministic judge','physical/human gates fail closed']}
await writeFile('artifacts/readiness-admin-qa/judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
