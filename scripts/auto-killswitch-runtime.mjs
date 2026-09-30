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
assert.ok(anon&&email&&password&&sha,'UGO_TEST_KILLSWITCH_INPUTS_REQUIRED')

await fs.mkdir('artifacts',{recursive:true})
const db=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
let browser=null
let page=null
let target=null
let activated=false
let recovered=false
let modeBefore=null
let runtimeEvidence=null

async function persistFailure(error){
  const evidence={
    readiness_id:'auto-killswitch',
    task_id:'readiness-auto-killswitch',
    environment:'UGO TEST',
    sha,
    result:'FAIL',
    production_touched:false,
    target,
    mode_before:modeBefore,
    activated,
    recovered,
    error:String(error?.stack||error),
    completed_at:new Date().toISOString()
  }
  await fs.writeFile('artifacts/auto-killswitch-runtime.json',JSON.stringify(evidence,null,2)+'\n')
}

try{
  const {data:login,error:loginError}=await db.auth.signInWithPassword({email,password})
  assert.ifError(loginError)
  assert.ok(login.session&&login.user,'UGO_TEST_SUPERADMIN_SESSION_REQUIRED')

  const {data:profile,error:profileError}=await db.from('usuarios').select('tipo,activo').eq('id',login.user.id).single()
  assert.ifError(profileError)
  assert.equal(profile?.tipo,'superadmin','UGO_TEST_SUPERADMIN_REQUIRED')
  assert.equal(profile?.activo,true,'UGO_TEST_SUPERADMIN_ACTIVE_REQUIRED')

  const {data:company,error:companyError}=await db.from('autonomous_company_state').select('mode').eq('singleton',true).single()
  assert.ifError(companyError)
  modeBefore=company.mode

  const [{data:agents,error:agentsError},{data:activeJobs,error:jobsError},{data:activeSwitches,error:switchError}]=await Promise.all([
    db.from('autonomous_agents').select('id,department_id,name,status,authority_class').neq('status','DISABLED').order('department_id').order('name'),
    db.from('autonomous_jobs').select('agent_id').in('status',['QUEUED','RUNNING','WAITING_APPROVAL','BLOCKED']),
    db.from('autonomous_kill_switches').select('scope_type,scope_key').eq('enabled',true)
  ])
  assert.ifError(agentsError);assert.ifError(jobsError);assert.ifError(switchError)
  const busy=new Set((activeJobs||[]).map(x=>String(x.agent_id||'')))
  const killed=new Set((activeSwitches||[]).filter(x=>x.scope_type==='AGENT').map(x=>String(x.scope_key||'')))
  target=(agents||[]).find(a=>!busy.has(String(a.id))&&!killed.has(String(a.id)))||null
  assert.ok(target,'ISOLATED_IDLE_AGENT_REQUIRED')

  const scopeKey=String(target.id)
  const activationReason='readiness auto-killswitch '+sha.slice(0,12)
  const recoveryReason='readiness verified recovery '+sha.slice(0,12)
  const idempotency='readiness-auto-killswitch-'+sha.slice(0,16)

  const {data:activatedRow,error:activationError}=await db.rpc('superadmin_set_kill_switch',{
    p_scope_type:'AGENT',
    p_scope_key:scopeKey,
    p_enabled:true,
    p_reason:activationReason
  })
  assert.ifError(activationError)
  assert.equal(activatedRow?.enabled,true,'KILL_SWITCH_DID_NOT_ENABLE')
  activated=true

  const {data:persistedSwitch,error:persistError}=await db.from('autonomous_kill_switches')
    .select('id,scope_type,scope_key,enabled,reason,activated_by,activated_at,updated_at')
    .eq('scope_type','AGENT').eq('scope_key',scopeKey).single()
  assert.ifError(persistError)
  assert.equal(persistedSwitch.enabled,true,'KILL_SWITCH_NOT_PERSISTED_ACTIVE')
  assert.equal(persistedSwitch.reason,activationReason,'KILL_SWITCH_REASON_MISMATCH')

  const {data:auditRows,error:auditError}=await db.from('audit_log')
    .select('id,evento,actor_id,entidad_id,detalles,created_at')
    .eq('evento','autonomy.kill_switch.changed')
    .eq('entidad_id',persistedSwitch.id)
    .order('created_at',{ascending:false}).limit(1)
  assert.ifError(auditError)
  assert.ok(auditRows?.length,'KILL_SWITCH_AUDIT_REQUIRED')

  const {data:blocked,error:blockedError}=await db.rpc('autonomous_enqueue_job',{
    p_department_id:target.department_id,
    p_agent_id:target.id,
    p_objective:'Readiness proof: kill switch must fail closed',
    p_trigger_type:'TEST',
    p_target_type:'READINESS',
    p_target_id:'auto-killswitch',
    p_service_id:null,
    p_authority_class:target.authority_class,
    p_idempotency_key:idempotency,
    p_input_evidence:[{type:'READINESS_RUNTIME',sha}]
  })
  assert.equal(blocked,null,'BLOCKED_ENQUEUE_MUST_NOT_RETURN_JOB')
  assert.ok(blockedError,'KILL_SWITCH_MUST_BLOCK_ENQUEUE')
  assert.match(String(blockedError.message||blockedError.details||blockedError),/AUTONOMY_KILL_SWITCH_ACTIVE/,'KILL_SWITCH_SPECIFIC_FAIL_CLOSED_REQUIRED')

  const {data:unexpectedJobs,error:unexpectedError}=await db.from('autonomous_jobs').select('id,status').eq('idempotency_key',idempotency)
  assert.ifError(unexpectedError)
  assert.equal(unexpectedJobs?.length||0,0,'BLOCKED_JOB_MUST_NOT_PERSIST')

  browser=await chromium.launch({headless:true})
  page=await browser.newPage({viewport:{width:1440,height:1100}})
  const pageErrors=[]
  page.on('pageerror',e=>pageErrors.push(String(e?.stack||e)))

  await page.goto(base+'/?app=admin',{waitUntil:'domcontentloaded'})
  const loginInput=page.getByPlaceholder('Usuario o email')
  await loginInput.waitFor({state:'visible',timeout:20000})
  await loginInput.fill(email)
  await page.getByPlaceholder('Contraseña').fill(password)
  await page.getByRole('button',{name:'Ingresar',exact:true}).click()
  await page.getByRole('button',{name:/Super Admin/}).first().waitFor({state:'visible',timeout:30000})
  await page.getByRole('button',{name:/Super Admin/}).first().click()
  await page.getByText('Control global de UGO',{exact:true}).waitFor({state:'visible',timeout:20000})
  await page.getByRole('button',{name:'Empresa Autónoma',exact:true}).click()
  await page.getByText('UGO Empresa Autónoma',{exact:true}).waitFor({state:'visible',timeout:20000})
  await page.getByRole('button',{name:'Kill Switch',exact:true}).click()
  const controls=page.locator('section.ugo-admin2-module-card').filter({hasText:'Kill Switches'}).first()
  await controls.waitFor({state:'visible',timeout:20000})
  const switchRow=controls.locator('div').filter({hasText:scopeKey}).filter({has:page.getByRole('button',{name:'Recuperar',exact:true})}).first()
  await switchRow.waitFor({state:'visible',timeout:15000})
  const activeText=(await switchRow.textContent())||''
  assert.ok(activeText.includes('ACTIVO'),'ACTIVE_KILL_SWITCH_NOT_VISIBLE')
  assert.ok(activeText.includes(activationReason),'ACTIVE_KILL_SWITCH_REASON_NOT_VISIBLE')

  page.once('dialog',dialog=>dialog.accept(recoveryReason))
  await switchRow.getByRole('button',{name:'Recuperar',exact:true}).click()
  await assert.doesNotReject(async()=>{
    await page.waitForFunction(({key,reason})=>{
      const text=document.body.innerText
      return text.includes(key)&&text.includes('inactivo')&&text.includes('RECOVERED AFTER VERIFIED RE-AUDIT: '+reason)
    },{key:scopeKey,reason:recoveryReason},{timeout:20000})
  },'RECOVERED_STATE_NOT_VISIBLE')
  recovered=true

  const {data:finalSwitch,error:finalError}=await db.from('autonomous_kill_switches')
    .select('id,scope_type,scope_key,enabled,reason,updated_at')
    .eq('scope_type','AGENT').eq('scope_key',scopeKey).single()
  assert.ifError(finalError)
  assert.equal(finalSwitch.enabled,false,'KILL_SWITCH_MUST_END_DISABLED')
  assert.match(String(finalSwitch.reason||''),/RECOVERED AFTER VERIFIED RE-AUDIT/,'RECOVERY_REASON_REQUIRED')

  const {data:recoveryRows,error:recoveryError}=await db.from('autonomous_recovery_audits')
    .select('id,scope_type,scope_key,decision,reason,evidence_hash,verification,created_at')
    .eq('scope_type','AGENT').eq('scope_key',scopeKey)
    .order('created_at',{ascending:false}).limit(1)
  assert.ifError(recoveryError)
  assert.ok(recoveryRows?.length,'RECOVERY_AUDIT_REQUIRED')
  assert.equal(recoveryRows[0].decision,'RECOVER','RECOVERY_DECISION_MISMATCH')
  assert.ok(recoveryRows[0].evidence_hash,'RECOVERY_EVIDENCE_HASH_REQUIRED')

  const {data:companyAfter,error:companyAfterError}=await db.from('autonomous_company_state').select('mode').eq('singleton',true).single()
  assert.ifError(companyAfterError)
  assert.equal(companyAfter.mode,modeBefore,'GLOBAL_AUTONOMY_MODE_MUST_NOT_CHANGE')
  assert.deepEqual(pageErrors,[],'RUNTIME_PAGE_ERRORS')

  await page.screenshot({path:'artifacts/auto-killswitch-runtime.png',fullPage:true})

  runtimeEvidence={
    schema_version:'UGO_READINESS_EVIDENCE_V1',
    readiness_id:'auto-killswitch',
    task_id:'readiness-auto-killswitch',
    job_id:'UGO-READINESS-AUTO-KILLSWITCH',
    environment:'UGO TEST',
    sha,
    actor_role:'superadmin',
    target:{agent_id:target.id,department_id:target.department_id,name:target.name,authority_class:target.authority_class,active_jobs_before:0},
    mode:{before:modeBefore,after:companyAfter.mode,changed:false},
    activation:{persisted:true,visible_in_ui:true,audited:true,reason:activationReason},
    stop:{rpc:'autonomous_enqueue_job',error_code:'AUTONOMY_KILL_SWITCH_ACTIVE',fail_closed:true,job_persisted:false,idempotency_key:idempotency},
    recovery:{via_ui:true,persisted:true,visible_in_ui:true,audited:true,evidence_hash_present:true,final_enabled:false,reason:recoveryReason},
    page_errors:pageErrors,
    production_touched:false,
    result:'PASS',
    completed_at:new Date().toISOString()
  }
  await fs.writeFile('artifacts/auto-killswitch-runtime.json',JSON.stringify(runtimeEvidence,null,2)+'\n')
  console.log(JSON.stringify({status:'PASS',sha,agent_id:target.id,department_id:target.department_id,mode:modeBefore}))
}catch(error){
  await persistFailure(error)
  throw error
}finally{
  if(activated&&!recovered&&target){
    const cleanupReason='runtime emergency cleanup '+sha.slice(0,12)
    const recovery=await db.rpc('superadmin_recover_kill_switch',{
      p_scope_type:'AGENT',
      p_scope_key:String(target.id),
      p_verification:{evidence_refs:['runtime-emergency-cleanup',sha]},
      p_reason:cleanupReason
    })
    if(recovery.error){
      await db.rpc('superadmin_set_kill_switch',{
        p_scope_type:'AGENT',p_scope_key:String(target.id),p_enabled:false,p_reason:cleanupReason
      })
    }
  }
  if(browser)await browser.close()
  await db.auth.signOut()
}
