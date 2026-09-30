import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const email=process.env.UGO_TEST_ADMIN_EMAIL||''
const password=process.env.UGO_TEST_ADMIN_PASSWORD||''
const runtimeSha=process.env.GITHUB_SHA||process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&email&&password&&runtimeSha,'AUTO_INBOX_TEST_INPUTS_REQUIRED')

const admin=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:login,error:loginError}=await admin.auth.signInWithPassword({email,password})
assert.ifError(loginError)
assert.ok(login.user&&login.session,'SUPERADMIN_SESSION_REQUIRED')
const {data:profile,error:profileError}=await admin.from('usuarios').select('tipo,activo').eq('id',login.user.id).single()
assert.ifError(profileError)
assert.equal(profile.tipo,'superadmin')
assert.equal(profile.activo,true)

const {data:agentFixture,error:agentFixtureError}=await admin.from('autonomous_agents').select('id,department_id,status,authority_class').neq('status','DISABLED').eq('authority_class','GREEN').order('department_id').limit(1).single()
assert.ifError(agentFixtureError)
assert.ok(agentFixture?.id&&agentFixture?.department_id,'GREEN_EXECUTABLE_AGENT_REQUIRED')
const departmentId=agentFixture.department_id
const agentId=agentFixture.id

const {data:company,error:companyError}=await admin.from('autonomous_company_state').select('mode,reason').eq('singleton',true).single()
assert.ifError(companyError)
const originalMode=company.mode
const originalReason=company.reason

const cancelActiveFixtures=async(reason)=>{
 const {data:rows,error}=await admin.from('autonomous_jobs').select('id,status,idempotency_key').like('idempotency_key','readiness-auto-inbox:%').in('status',['WAITING_APPROVAL','BLOCKED','QUEUED','RUNNING'])
 assert.ifError(error)
 for(const row of rows||[]){
  const cancelled=await admin.rpc('superadmin_cancel_autonomous_job',{p_job_id:row.id,p_reason:reason})
  if(cancelled.error&&!String(cancelled.error.message||'').includes('JOB_NOT_CANCELLABLE'))throw cancelled.error
 }
}
await cancelActiveFixtures('reconcile stale readiness-auto-inbox TEST fixture')

const enqueue=async({authority,idempotency,objective})=>{
 const {data,error}=await admin.rpc('autonomous_enqueue_job',{
  p_department_id:departmentId,
  p_agent_id:agentId,
  p_objective:objective,
  p_trigger_type:'READINESS_TEST',
  p_target_type:'READINESS',
  p_target_id:'auto-inbox',
  p_service_id:null,
  p_authority_class:authority,
  p_idempotency_key:idempotency,
  p_input_evidence:[{source:'readiness-auto-inbox',sha:runtimeSha}]
 })
 assert.ifError(error)
 assert.ok(data?.id,'ENQUEUED_JOB_ID_REQUIRED')
 return data
}

let browser
let payload
let redJob=null
let yellowJob=null
try{
 if(originalMode!=='ON'){
  const modeChange=await admin.rpc('superadmin_set_autonomy_mode',{p_mode:'ON',p_reason:'readiness-auto-inbox isolated TEST'})
  assert.ifError(modeChange.error)
 }

 const redKey='readiness-auto-inbox:red:'+runtimeSha
 const yellowKey='readiness-auto-inbox:yellow:'+runtimeSha
 redJob=await enqueue({authority:'RED',idempotency:redKey,objective:'AUTO_INBOX_RED'})
 const redDuplicate=await enqueue({authority:'RED',idempotency:redKey,objective:'AUTO_INBOX_RED_DUPLICATE_CALL'})
 assert.equal(redDuplicate.id,redJob.id,'INBOX_IDEMPOTENCY_DUPLICATED_JOB')
 yellowJob=await enqueue({authority:'YELLOW',idempotency:yellowKey,objective:'AUTO_INBOX_YELLOW'})

 browser=await chromium.launch({headless:true})
 const page=await browser.newPage({viewport:{width:1440,height:1000}})
 const pageErrors=[]
 page.on('pageerror',e=>pageErrors.push(String(e?.message||e)))
 await page.addInitScript(({key,value})=>window.localStorage.setItem(key,value),{key:'ugo-test-admin-auth',value:JSON.stringify(login.session)})
 await page.goto(base+'/?app=admin',{waitUntil:'networkidle'})
 await page.getByRole('button',{name:'◉ Super Admin',exact:true}).waitFor({state:'visible',timeout:20000})
 await page.getByRole('button',{name:'◉ Super Admin',exact:true}).click()
 await page.getByText('Control global de UGO',{exact:true}).waitFor({state:'visible',timeout:20000})
 await page.getByRole('button',{name:'Empresa Autónoma',exact:true}).click()
 await page.getByText('UGO Empresa Autónoma',{exact:true}).waitFor({state:'visible'})
 await page.getByRole('button',{name:'Inbox ejecutivo',exact:true}).click()
 await page.getByRole('heading',{name:'Inbox ejecutivo'}).waitFor({state:'visible'})
 await page.waitForTimeout(800)

 const cards=page.locator('.ugo-autonomous-inbox-job')
 const texts=await cards.allTextContents()
 const correlations=await cards.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-correlation-id')))
 const redIndex=correlations.indexOf(String(redJob.correlation_id))
 const yellowIndex=correlations.indexOf(String(yellowJob.correlation_id))
 assert.equal(correlations.filter(x=>x===String(redJob.correlation_id)).length,1,'INBOX_IDEMPOTENCY_ROW_RENDERED_MORE_THAN_ONCE')
 assert.equal(correlations.filter(x=>x===String(yellowJob.correlation_id)).length,1,'INBOX_YELLOW_ROW_RENDERED_MORE_THAN_ONCE')
 assert.ok(redIndex>=0&&yellowIndex>=0,'INBOX_FIXTURES_NOT_VISIBLE')
 assert.ok(redIndex<yellowIndex,'INBOX_PRIORITY_ORDER_INVALID')
 assert.match(texts[redIndex],/Prioridad P0/)
 assert.match(texts[redIndex],/SLA .* restantes/)
 assert.match(texts[yellowIndex],/Prioridad P1/)
 assert.match(texts[yellowIndex],/SLA .* restantes/)
 assert.deepEqual(pageErrors,[])
 await fs.mkdir('artifacts/readiness-auto-inbox',{recursive:true})
 await page.screenshot({path:'artifacts/readiness-auto-inbox/inbox.png',fullPage:true})

 const firstApproval=await admin.rpc('superadmin_decide_autonomous_job',{p_job_id:yellowJob.id,p_approve:true,p_reason:'readiness auto-inbox first approval'})
 assert.ifError(firstApproval.error)
 assert.equal(firstApproval.data.status,'WAITING_APPROVAL')
 assert.equal(Number(firstApproval.data.approval_count),1)
 const firstLedger=await admin.from('autonomous_decision_ledger').select('id,decision,authorization_result,correlation_id,created_at').eq('job_id',yellowJob.id).order('created_at')
 assert.ifError(firstLedger.error)
 assert.equal(firstLedger.data?.length,1)
 assert.equal(firstLedger.data?.[0]?.decision,'YELLOW_FIRST_APPROVAL')

 const duplicateApproval=await admin.rpc('superadmin_decide_autonomous_job',{p_job_id:yellowJob.id,p_approve:true,p_reason:'duplicate approval must fail'})
 assert.ok(duplicateApproval.error)
 assert.match(String(duplicateApproval.error.message),/INDEPENDENT_SECOND_APPROVER_REQUIRED/)
 const afterDuplicate=await admin.from('autonomous_decision_ledger').select('id').eq('job_id',yellowJob.id)
 assert.ifError(afterDuplicate.error)
 assert.equal(afterDuplicate.data?.length,1,'DUPLICATE_APPROVAL_CREATED_LEDGER_ROW')

 const rejection=await admin.rpc('superadmin_decide_autonomous_job',{p_job_id:redJob.id,p_approve:false,p_reason:'readiness auto-inbox rejection'})
 assert.ifError(rejection.error)
 assert.equal(rejection.data.status,'CANCELLED')
 const rejectionRetry=await admin.rpc('superadmin_decide_autonomous_job',{p_job_id:redJob.id,p_approve:false,p_reason:'duplicate rejection must fail'})
 assert.ok(rejectionRetry.error)
 assert.match(String(rejectionRetry.error.message),/JOB_NOT_WAITING_APPROVAL/)
 const rejectLedger=await admin.from('autonomous_decision_ledger').select('id,decision,authorization_result,correlation_id,created_at').eq('job_id',redJob.id)
 assert.ifError(rejectLedger.error)
 assert.equal(rejectLedger.data?.length,1,'DUPLICATE_REJECTION_CREATED_LEDGER_ROW')
 assert.equal(rejectLedger.data?.[0]?.decision,'HUMAN_REJECTED')

 payload={
  schema_version:'UGO_READINESS_AUTO_INBOX_V2',
  readiness_id:'auto-inbox',
  task_id:'readiness-auto-inbox',
  job_id:'UGO-READINESS-AUTO-INBOX',
  correlation_id:process.env.UGO_READINESS_CORRELATION_ID||'readiness-auto-inbox',
  environment:'UGO TEST',
  test_project:'tmossnqfwfwjrtzwcbmm',
  runtime_sha:runtimeSha,
  generated_at:new Date().toISOString(),
  production_touched:false,
  ui:{idempotency_deduplicated:true,duplicate_rows_rendered:1,priority_order:'PASS',sla_labels:'PASS',page_errors:0},
  approvals:{first_approval:'PASS',same_actor_duplicate_blocked:true,approval_count:1,decision_rows:firstLedger.data},
  rejection:{status:'CANCELLED',duplicate_retry_blocked:true,decision_rows:rejectLedger.data},
  audit:{approval_decisions:firstLedger.data?.length||0,rejection_decisions:rejectLedger.data?.length||0,duplicate_side_effect_rows:0},
  cleanup:{active_fixtures_closed:false,audit_history_retained:true,company_mode_restored:false}
 }
}finally{
 if(browser)await browser.close().catch(()=>{})
 await cancelActiveFixtures('close readiness-auto-inbox TEST fixture')
 if(originalMode!=='ON')await admin.rpc('superadmin_set_autonomy_mode',{p_mode:originalMode,p_reason:originalReason||'restore after readiness-auto-inbox TEST'})
}

const active=await admin.from('autonomous_jobs').select('id,status').like('idempotency_key','readiness-auto-inbox:%').in('status',['WAITING_APPROVAL','BLOCKED','QUEUED','RUNNING'])
assert.ifError(active.error)
assert.equal(active.data?.length||0,0,'ACTIVE_FIXTURE_JOBS_NOT_CLOSED')
const retained=await admin.from('autonomous_jobs').select('id,status').like('idempotency_key','readiness-auto-inbox:%')
assert.ifError(retained.error)
assert.ok((retained.data?.length||0)>=2,'AUDIT_FIXTURE_HISTORY_MISSING')
const restored=await admin.from('autonomous_company_state').select('mode').eq('singleton',true).single()
assert.ifError(restored.error)
assert.equal(restored.data.mode,originalMode,'AUTONOMY_MODE_NOT_RESTORED')
payload.cleanup={active_fixtures_closed:true,audit_history_retained:true,company_mode_restored:true}
await fs.mkdir('artifacts/readiness-auto-inbox',{recursive:true})
await fs.writeFile('artifacts/readiness-auto-inbox/runtime.json',JSON.stringify(payload,null,2)+'\n')
console.log(JSON.stringify(payload))
