import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const email=process.env.UGO_TEST_ADMIN_EMAIL||''
const password=process.env.UGO_TEST_ADMIN_PASSWORD||''
const runtimeSha=process.env.GITHUB_SHA||process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&serviceKey&&email&&password&&runtimeSha,'AUTO_INBOX_TEST_INPUTS_REQUIRED')

const root=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const admin=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:login,error:loginError}=await admin.auth.signInWithPassword({email,password})
assert.ifError(loginError)
assert.ok(login.user&&login.session,'SUPERADMIN_SESSION_REQUIRED')
const {data:profile,error:profileError}=await root.from('usuarios').select('tipo,activo').eq('id',login.user.id).single()
assert.ifError(profileError)
assert.equal(profile.tipo,'superadmin')
assert.equal(profile.activo,true)

const {data:agentFixture,error:agentFixtureError}=await root.from('autonomous_agents').select('id,department_id,status,authority_class').neq('status','DISABLED').eq('authority_class','GREEN').order('department_id').limit(1).single()
assert.ifError(agentFixtureError)
assert.ok(agentFixture?.id&&agentFixture?.department_id,'GREEN_EXECUTABLE_AGENT_REQUIRED')
const departmentId=agentFixture.department_id
const agentId=agentFixture.id
const staleFixtures=await root.from('autonomous_jobs').update({status:'CANCELLED',blocked_reason:'READINESS_AUTO_INBOX_STALE_FIXTURE_RECONCILED',finished_at:new Date().toISOString()}).like('idempotency_key','readiness-auto-inbox:%').in('status',['WAITING_APPROVAL','BLOCKED','QUEUED','RUNNING'])
assert.ifError(staleFixtures.error)
const {data:company,error:companyError}=await root.from('autonomous_company_state').select('mode,reason').eq('singleton',true).single()
assert.ifError(companyError)
const originalMode=company.mode
const originalReason=company.reason
if(originalMode!=='ON'){
 const modeChange=await admin.rpc('superadmin_set_autonomy_mode',{p_mode:'ON',p_reason:'readiness-auto-inbox isolated TEST'})
 assert.ifError(modeChange.error)
}

const duplicateCorrelation=crypto.randomUUID()
const yellowCorrelation=crypto.randomUUID()
const greenCorrelation=crypto.randomUUID()
const ids=[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()]
const now=Date.now()
const fixtures=[
 {id:ids[0],department_id:departmentId,agent_id:agentId,objective:'AUTO_INBOX_DUP_OLD',authority_class:'RED',status:'BLOCKED',idempotency_key:'readiness-auto-inbox:'+ids[0],correlation_id:duplicateCorrelation,blocked_reason:'TEST_ESCALATION',created_at:new Date(now-19*60000).toISOString()},
 {id:ids[1],department_id:departmentId,agent_id:agentId,objective:'AUTO_INBOX_DUP_NEW',authority_class:'RED',status:'BLOCKED',idempotency_key:'readiness-auto-inbox:'+ids[1],correlation_id:duplicateCorrelation,blocked_reason:'TEST_ESCALATION',created_at:new Date(now-16*60000).toISOString()},
 {id:ids[2],department_id:departmentId,agent_id:agentId,objective:'AUTO_INBOX_YELLOW',authority_class:'YELLOW',status:'WAITING_APPROVAL',idempotency_key:'readiness-auto-inbox:'+ids[2],correlation_id:yellowCorrelation,created_at:new Date(now-31*60000).toISOString()},
 {id:ids[3],department_id:departmentId,agent_id:agentId,objective:'AUTO_INBOX_GREEN',authority_class:'GREEN',status:'WAITING_APPROVAL',idempotency_key:'readiness-auto-inbox:'+ids[3],correlation_id:greenCorrelation,created_at:new Date(now-5*60000).toISOString()}
]
const inserted=await root.from('autonomous_jobs').insert(fixtures)
assert.ifError(inserted.error)

let browser
let payload
try{
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
 await page.waitForTimeout(500)
 const texts=await page.locator('.ugo-autonomous-inbox-job').allTextContents()
 const redIndex=texts.findIndex(x=>x.includes('AUTO_INBOX_DUP_NEW'))
 const yellowIndex=texts.findIndex(x=>x.includes('AUTO_INBOX_YELLOW'))
 const greenIndex=texts.findIndex(x=>x.includes('AUTO_INBOX_GREEN'))
 assert.equal(texts.some(x=>x.includes('AUTO_INBOX_DUP_OLD')),false,'INBOX_DEDUP_OLD_ROW_VISIBLE')
 assert.ok(redIndex>=0&&yellowIndex>=0&&greenIndex>=0,'INBOX_FIXTURES_NOT_VISIBLE')
 assert.ok(redIndex<yellowIndex&&yellowIndex<greenIndex,'INBOX_PRIORITY_SLA_ORDER_INVALID')
 assert.equal(await page.locator(`[data-correlation-id="${duplicateCorrelation}"]`).count(),1,'INBOX_CORRELATION_NOT_DEDUPED')
 assert.match(texts[redIndex],/Prioridad P0/)
 assert.match(texts[redIndex],/SLA vencido/)
 assert.match(texts[yellowIndex],/Prioridad P1/)
 assert.match(texts[yellowIndex],/SLA vencido/)
 assert.match(texts[greenIndex],/Prioridad P2/)
 assert.match(texts[greenIndex],/SLA .* restantes/)
 assert.deepEqual(pageErrors,[])
 await fs.mkdir('artifacts/readiness-auto-inbox',{recursive:true})
 await page.screenshot({path:'artifacts/readiness-auto-inbox/inbox.png',fullPage:true})

 const firstApproval=await admin.rpc('superadmin_decide_autonomous_job',{p_job_id:ids[2],p_approve:true,p_reason:'readiness auto-inbox first approval'})
 assert.ifError(firstApproval.error)
 assert.equal(firstApproval.data.status,'WAITING_APPROVAL')
 assert.equal(Number(firstApproval.data.approval_count),1)
 const firstLedger=await root.from('autonomous_decision_ledger').select('id,decision,authorization_result,correlation_id,created_at').eq('job_id',ids[2]).order('created_at')
 assert.ifError(firstLedger.error)
 assert.equal(firstLedger.data?.length,1)
 assert.equal(firstLedger.data?.[0]?.decision,'YELLOW_FIRST_APPROVAL')

 const duplicateApproval=await admin.rpc('superadmin_decide_autonomous_job',{p_job_id:ids[2],p_approve:true,p_reason:'duplicate approval must fail'})
 assert.ok(duplicateApproval.error)
 assert.match(String(duplicateApproval.error.message),/INDEPENDENT_SECOND_APPROVER_REQUIRED/)
 const afterDuplicate=await root.from('autonomous_decision_ledger').select('id').eq('job_id',ids[2])
 assert.ifError(afterDuplicate.error)
 assert.equal(afterDuplicate.data?.length,1,'DUPLICATE_APPROVAL_CREATED_LEDGER_ROW')

 const rejection=await admin.rpc('superadmin_decide_autonomous_job',{p_job_id:ids[3],p_approve:false,p_reason:'readiness auto-inbox rejection'})
 assert.ifError(rejection.error)
 assert.equal(rejection.data.status,'CANCELLED')
 const rejectionRetry=await admin.rpc('superadmin_decide_autonomous_job',{p_job_id:ids[3],p_approve:false,p_reason:'duplicate rejection must fail'})
 assert.ok(rejectionRetry.error)
 assert.match(String(rejectionRetry.error.message),/JOB_NOT_WAITING_APPROVAL/)
 const rejectLedger=await root.from('autonomous_decision_ledger').select('id,decision,authorization_result,correlation_id,created_at').eq('job_id',ids[3])
 assert.ifError(rejectLedger.error)
 assert.equal(rejectLedger.data?.length,1,'DUPLICATE_REJECTION_CREATED_LEDGER_ROW')
 assert.equal(rejectLedger.data?.[0]?.decision,'HUMAN_REJECTED')

 payload={
  schema_version:'UGO_READINESS_AUTO_INBOX_V1',
  readiness_id:'auto-inbox',
  task_id:'readiness-auto-inbox',
  job_id:'UGO-READINESS-AUTO-INBOX',
  correlation_id:process.env.UGO_READINESS_CORRELATION_ID||'readiness-auto-inbox',
  environment:'UGO TEST',
  test_project:'tmossnqfwfwjrtzwcbmm',
  runtime_sha:runtimeSha,
  generated_at:new Date().toISOString(),
  production_touched:false,
  ui:{deduplicated:true,duplicate_rows_rendered:1,old_duplicate_hidden:true,priority_order:'PASS',sla_labels:'PASS',page_errors:0},
  approvals:{first_approval:'PASS',same_actor_duplicate_blocked:true,approval_count:1,decision_rows:firstLedger.data},
  rejection:{status:'CANCELLED',duplicate_retry_blocked:true,decision_rows:rejectLedger.data},
  audit:{approval_decisions:firstLedger.data?.length||0,rejection_decisions:rejectLedger.data?.length||0,duplicate_side_effect_rows:0},
  cleanup:{active_fixtures_closed:false,audit_history_retained:false,company_mode_restored:false}
 }
}finally{
 if(browser)await browser.close().catch(()=>{})
 await root.from('autonomous_jobs').update({status:'CANCELLED',blocked_reason:'READINESS_AUTO_INBOX_FIXTURE_CLOSED',finished_at:new Date().toISOString()}).in('id',ids)
 if(originalMode!=='ON')await admin.rpc('superadmin_set_autonomy_mode',{p_mode:originalMode,p_reason:originalReason||'restore after readiness-auto-inbox TEST'})
}

const remaining=await root.from('autonomous_jobs').select('id,status').in('id',ids).in('status',['WAITING_APPROVAL','BLOCKED','QUEUED','RUNNING'])
assert.ifError(remaining.error)
assert.equal(remaining.data?.length||0,0,'ACTIVE_FIXTURE_JOBS_NOT_CLOSED')
const retained=await root.from('autonomous_jobs').select('id,status').in('id',ids)
assert.ifError(retained.error)
assert.equal(retained.data?.length||0,ids.length,'AUDIT_FIXTURE_HISTORY_MISSING')
const restored=await root.from('autonomous_company_state').select('mode').eq('singleton',true).single()
assert.ifError(restored.error)
assert.equal(restored.data.mode,originalMode,'AUTONOMY_MODE_NOT_RESTORED')
payload.cleanup={active_fixtures_closed:true,audit_history_retained:true,company_mode_restored:true}
await fs.mkdir('artifacts/readiness-auto-inbox',{recursive:true})
await fs.writeFile('artifacts/readiness-auto-inbox/runtime.json',JSON.stringify(payload,null,2)+'\n')
console.log(JSON.stringify(payload))
