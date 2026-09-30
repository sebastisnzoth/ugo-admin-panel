import { mkdir, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})

const q=async(promise,label)=>{const {data,error,count}=await promise;if(error)throw new Error(label+': '+error.message);return {data:data||[],count}}
const [simulators,scenarios,runs,coverage,calibrations,independentJobs]=await Promise.all([
 q(db.from('autonomous_qa_simulators').select('*').eq('status','ACTIVE').order('role'),'simulators'),
 q(db.from('autonomous_qa_scenarios').select('*').eq('status','ACTIVE').order('scenario_key'),'scenarios'),
 q(db.from('autonomous_qa_runs').select('*').order('created_at',{ascending:false}).limit(100),'runs'),
 q(db.from('autonomous_quality_coverage').select('*').order('coverage_key'),'coverage'),
 q(db.from('autonomous_meta_qa_calibrations').select('*').order('created_at',{ascending:false}).limit(5),'meta_calibrations'),
 q(db.from('autonomous_jobs').select('id,status,idempotency_key,correlation_id,verification_result,capability,finished_at').like('idempotency_key','qa-independent:%').eq('status','SUCCEEDED').order('finished_at',{ascending:false}).limit(50),'independent_jobs')
])

const roles=new Set(simulators.data.map(x=>x.role))
for(const role of ['CLIENT','PROVIDER','ADMIN'])if(!roles.has(role))throw new Error('QA_SIMULATOR_ROLE_MISSING:'+role)
const requiredScenarios=['service-lifecycle','roles','permissions-rls','gps-geofence','qa-meta-seeded-defect']
const scenarioKeys=new Set(scenarios.data.map(x=>x.scenario_key))
for(const keyName of requiredScenarios)if(!scenarioKeys.has(keyName))throw new Error('QA_SCENARIO_MISSING:'+keyName)
if(runs.data.length<3)throw new Error('QA_RESULTS_MISSING')
if(!calibrations.data.length)throw new Error('PERSISTED_META_QA_CALIBRATION_REQUIRED')

const calibration=calibrations.data[0]
const runIds=[calibration.baseline_run_id,calibration.seeded_run_id,calibration.rerun_id]
const {data:metaRuns,error:metaRunsError}=await db.from('autonomous_qa_runs').select('*').in('id',runIds)
if(metaRunsError)throw metaRunsError
if((metaRuns||[]).length!==3)throw new Error('META_QA_THREE_RUNS_REQUIRED')
const byId=new Map((metaRuns||[]).map(r=>[r.id,r]))
const baseline=byId.get(calibration.baseline_run_id),seeded=byId.get(calibration.seeded_run_id),rerun=byId.get(calibration.rerun_id)
if(baseline?.status!=='PASSED'||seeded?.status!=='FAILED'||rerun?.status!=='PASSED')throw new Error('META_QA_FAIL_REMEDIATE_PASS_REQUIRED')
if(seeded?.judge_result?.seeded_defect_detected!==true||!seeded?.remediation_request||rerun?.permanent_regression!==true)throw new Error('META_QA_DETECTION_OR_REGRESSION_MISSING')

const [{data:metaJob,error:metaJobError},{count:decisionCount,error:decisionError},{count:evidenceCount,error:evidenceError}]=await Promise.all([
 db.from('autonomous_jobs').select('id,status,correlation_id,verification_result,capability').eq('id',calibration.job_id).single(),
 db.from('autonomous_decision_ledger').select('id',{count:'exact',head:true}).eq('job_id',calibration.job_id),
 db.from('autonomous_evidence_ledger').select('id',{count:'exact',head:true}).eq('job_id',calibration.job_id)
])
if(metaJobError)throw metaJobError
if(decisionError)throw decisionError
if(evidenceError)throw evidenceError
if(metaJob?.status!=='SUCCEEDED'||metaJob?.verification_result?.passed!==true||metaJob?.verification_result?.seeded_defect_detected!==true)throw new Error('META_QA_AGENT_JOB_UNVERIFIED')
if((decisionCount||0)<1||(evidenceCount||0)<1)throw new Error('META_QA_INDEPENDENT_LEDGER_MISSING')
if(independentJobs.data.length<1)throw new Error('INDEPENDENT_QA_JUDGE_MISSING')

const protectedKeys=['physical-gps-device','uploaded-media-bytes','real-customer-acceptance']
const protectedCoverage=coverage.data.filter(x=>protectedKeys.includes(x.coverage_key))
if(protectedCoverage.length!==protectedKeys.length||protectedCoverage.some(x=>x.status==='COVERED'))throw new Error('PHYSICAL_HUMAN_GATES_MUST_REMAIN_FAIL_CLOSED')

const scenarioSummary=scenarios.data.map(s=>{
 const sr=runs.data.filter(r=>r.scenario_id===s.id)
 const latest=sr[0]||null
 const cov=coverage.data.find(x=>x.scenario_id===s.id||x.coverage_key===s.scenario_key)||null
 return {scenario_id:s.id,scenario_key:s.scenario_key,status:s.status,service_id:s.service_id||latest?.service_id||null,run_count:sr.length,latest_run_id:latest?.id||null,latest_status:latest?.status||null,latest_correlation_id:latest?.correlation_id||null,coverage_status:cov?.status||null}
})
const payload={
 schema_version:'UGO_READINESS_ADMIN_QA_V1',
 readiness_id:'admin-qa',
 task_id:'readiness-admin-qa',
 job_id:'UGO-READINESS-ADMIN-QA',
 correlation_id:process.env.UGO_READINESS_CORRELATION_ID||'readiness-admin-qa',
 environment:'UGO TEST',
 runtime_sha:process.env.GITHUB_SHA||process.env.UGO_RUNTIME_SHA||'local',
 generated_at:new Date().toISOString(),
 production_touched:false,
 qa_lab:{active_simulators:simulators.data.map(x=>({id:x.id,key:x.simulator_key,role:x.role,status:x.status})),active_scenarios:scenarioSummary,total_recent_runs:runs.data.length,coverage:coverage.data.map(x=>({coverage_key:x.coverage_key,status:x.status,scenario_id:x.scenario_id||null,last_run_id:x.last_run_id||null}))},
 meta_qa:{calibration_id:calibration.id,service_id:calibration.service_id,baseline_run_id:calibration.baseline_run_id,seeded_run_id:calibration.seeded_run_id,rerun_id:calibration.rerun_id,baseline_status:baseline.status,seeded_status:seeded.status,rerun_status:rerun.status,seeded_defect_detected:true,remediation_requested:true,permanent_regression:true,agent_job_id:metaJob.id,agent_correlation_id:metaJob.correlation_id,decision_ledger_rows:decisionCount||0,evidence_ledger_rows:evidenceCount||0},
 independent_judge:{successful_jobs:independentJobs.data.length,latest_job_id:independentJobs.data[0]?.id||null,latest_correlation_id:independentJobs.data[0]?.correlation_id||null,source:independentJobs.data[0]?.verification_result?.source||null},
 fail_closed:{protected_keys:protectedKeys,protected_coverage:protectedCoverage.map(x=>({coverage_key:x.coverage_key,status:x.status})),self_certification_allowed:false}
}
await mkdir('artifacts/readiness-admin-qa',{recursive:true})
await writeFile('artifacts/readiness-admin-qa/runtime.json',JSON.stringify(payload,null,2)+'\n')
console.log(JSON.stringify(payload))
