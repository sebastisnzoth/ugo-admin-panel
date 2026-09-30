import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {chromium} from 'playwright'
import {createClient} from '@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const email=process.env.UGO_TEST_ADMIN_EMAIL||''
const password=process.env.UGO_TEST_ADMIN_PASSWORD||''
const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&email&&password&&sha,'UGO_TEST_DEPARTMENT_JOB_VISIBILITY_INPUTS_REQUIRED')

const db=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:login,error:loginError}=await db.auth.signInWithPassword({email,password})
assert.ifError(loginError)
assert.ok(login.session&&login.user,'UGO_TEST_SUPERADMIN_SESSION_REQUIRED')
const {data:profile,error:profileError}=await db.from('usuarios').select('tipo,activo').eq('id',login.user.id).single()
assert.ifError(profileError)
assert.equal(profile?.tipo,'superadmin','UGO_TEST_SUPERADMIN_REQUIRED')
assert.equal(profile?.activo,true,'UGO_TEST_SUPERADMIN_ACTIVE_REQUIRED')

const {data:departments,error:departmentsError}=await db.from('autonomous_departments').select('department_id,name').order('department_id')
assert.ifError(departmentsError)
assert.ok(departments?.length,'AUTONOMOUS_DEPARTMENTS_REQUIRED')
const activeStatuses=['QUEUED','RUNNING','WAITING_APPROVAL','BLOCKED']
const summaries=[]
for(const department of departments){
  const id=department.department_id
  const [{count:total,error:totalError},{count:active,error:activeError},{data:lastRows,error:lastError}]=await Promise.all([
    db.from('autonomous_jobs').select('id',{count:'exact',head:true}).eq('department_id',id),
    db.from('autonomous_jobs').select('id',{count:'exact',head:true}).eq('department_id',id).in('status',activeStatuses),
    db.from('autonomous_jobs').select('id,status,objective,correlation_id,created_at').eq('department_id',id).order('created_at',{ascending:false}).limit(1)
  ])
  assert.ifError(totalError);assert.ifError(activeError);assert.ifError(lastError)
  const lastJob=lastRows?.[0]||null
  let lastEvidence=null
  if(lastJob?.id){
    const evidenceResult=await db.from('autonomous_evidence_ledger').select('id,evidence_type,reference,correlation_id,created_at').eq('job_id',lastJob.id).order('created_at',{ascending:false}).limit(1)
    assert.ifError(evidenceResult.error)
    lastEvidence=evidenceResult.data?.[0]||null
  }
  summaries.push({department_id:id,name:department.name,total_jobs:total||0,active_jobs:active||0,last_job:lastJob,last_evidence:lastEvidence})
}

await fs.mkdir('artifacts',{recursive:true})
const browser=await chromium.launch({headless:true})
const page=await browser.newPage({viewport:{width:1440,height:1100}})
const pageErrors=[]
page.on('pageerror',error=>pageErrors.push(String(error?.stack||error)))
await page.addInitScript(session=>localStorage.setItem('ugo-test-admin-auth',JSON.stringify(session)),login.session)

try{
  await page.goto(base+'/?app=admin',{waitUntil:'domcontentloaded'})
  await page.getByRole('button',{name:/Super Admin/}).first().waitFor({state:'visible',timeout:20000})
  await page.getByRole('button',{name:/Super Admin/}).first().click()
  await page.getByText('Control global de UGO',{exact:true}).waitFor({state:'visible',timeout:20000})
  await page.getByRole('button',{name:'Empresa Autónoma',exact:true}).click()
  await page.getByText('UGO Empresa Autónoma',{exact:true}).waitFor({state:'visible',timeout:20000})
  await page.getByRole('button',{name:'Departamentos',exact:true}).click()
  await page.getByText('Departamentos corporativos',{exact:true}).waitFor({state:'visible',timeout:20000})
  const table=page.locator('table').filter({hasText:'Jobs totales'}).first()
  await table.waitFor({state:'visible',timeout:20000})

  for(const summary of summaries){
    const row=table.locator('tbody tr').filter({hasText:'D'+summary.department_id}).first()
    await row.waitFor({state:'visible',timeout:10000})
    const text=(await row.textContent())||''
    assert.ok(text.includes(String(summary.active_jobs)),'ACTIVE_JOBS_UI_BACKEND_MISMATCH D'+summary.department_id)
    assert.ok(text.includes(String(summary.total_jobs)),'TOTAL_JOBS_UI_BACKEND_MISMATCH D'+summary.department_id)
    if(summary.last_job){
      assert.ok(text.includes(String(summary.last_job.status)),'LAST_JOB_STATUS_MISMATCH D'+summary.department_id)
      assert.ok(text.includes(String(summary.last_job.correlation_id||'—')),'CORRELATION_MISMATCH D'+summary.department_id)
      if(summary.last_evidence)assert.ok(text.includes(String(summary.last_evidence.evidence_type||summary.last_evidence.reference)),'LAST_EVIDENCE_MISMATCH D'+summary.department_id)
    }
  }

  const first=summaries[0]
  const departmentFilter=page.getByLabel('Filtrar departamento')
  await departmentFilter.selectOption(String(first.department_id))
  await page.waitForTimeout(150)
  assert.equal(await table.locator('tbody tr').count(),1,'DEPARTMENT_FILTER_COUNT_MISMATCH')
  await departmentFilter.selectOption('ALL')

  await table.getByRole('button',{name:'Ver historial'}).first().click()
  const history=page.getByRole('dialog',{name:'Historial del departamento'})
  await history.waitFor({state:'visible',timeout:10000})
  const historyText=(await history.textContent())||''
  assert.match(historyText,/actualizado hace/i,'FRESHNESS_INDICATOR_REQUIRED')
  if(first.last_job)assert.ok(historyText.includes(String(first.last_job.status)),'HISTORY_LAST_JOB_MISSING')
  await page.getByRole('button',{name:'Cerrar historial'}).click()

  const pageText=(await page.locator('.ugo-autonomous-content').textContent())||''
  assert.ok(!pageText.includes('ALERTA · inconsistencia UI/backend detectada'),'UI_BACKEND_DIVERGENCE_ALERT_PRESENT')
  assert.deepEqual(pageErrors,[],'runtime page errors detected')

  await page.screenshot({path:'artifacts/department-job-visibility-runtime.png',fullPage:true})
  const evidence={
    readiness_id:'auto-department-job-visibility',
    task_id:'readiness-auto-department-job-visibility',
    job_id:'UGO-READINESS-AUTO-DEPARTMENT-JOB-VISIBILITY',
    environment:'UGO TEST',
    sha,
    production_touched:false,
    department_count:summaries.length,
    summaries,
    assertions:{
      active_counts_match:true,
      total_counts_match:true,
      last_job_matches:true,
      last_evidence_matches:true,
      correlation_id_visible:true,
      department_filter_works:true,
      history_dialog_works:true,
      freshness_visible:true,
      no_divergence_alert:true,
      no_page_errors:true
    },
    result:'PASS',
    completed_at:new Date().toISOString()
  }
  await fs.writeFile('artifacts/department-job-visibility-runtime.json',JSON.stringify(evidence,null,2)+'\n')
  console.log(JSON.stringify({status:'PASS',sha,department_count:summaries.length}))
}finally{
  await browser.close()
  await db.auth.signOut()
}
