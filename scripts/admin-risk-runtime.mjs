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
assert.ok(anon&&email&&password&&sha,'ADMIN_RISK_RUNTIME_INPUTS_REQUIRED')

const db=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:login,error:loginError}=await db.auth.signInWithPassword({email,password})
assert.ifError(loginError)
assert.ok(login.session&&login.user,'SUPERADMIN_SESSION_REQUIRED')
const {data:profile,error:profileError}=await db.from('usuarios').select('tipo,activo').eq('id',login.user.id).single()
assert.ifError(profileError)
assert.equal(profile?.tipo,'superadmin','SUPERADMIN_ROLE_REQUIRED')
assert.equal(profile?.activo,true,'SUPERADMIN_ACTIVE_REQUIRED')

async function snapshot(){
  const [risks,controls,challenges,findings,gate,evidence,decisions]=await Promise.all([
    db.from('autonomous_enterprise_risks').select('*').order('updated_at',{ascending:false}),
    db.from('autonomous_control_coverage').select('*').order('control_key'),
    db.from('autonomous_challenges').select('*').order('created_at',{ascending:false}),
    db.from('autonomous_audit_findings').select('*').order('created_at',{ascending:false}).limit(100),
    db.from('autonomous_release_gate').select('*').eq('gate_key','CUSTOMER_1').maybeSingle(),
    db.from('autonomous_evidence_ledger').select('*').order('created_at',{ascending:false}).limit(100),
    db.from('autonomous_decision_ledger').select('*').order('created_at',{ascending:false}).limit(100)
  ])
  for(const r of [risks,controls,challenges,findings,gate,evidence,decisions])assert.ifError(r.error)
  return {
    risks:risks.data||[],controls:controls.data||[],challenges:challenges.data||[],
    findings:findings.data||[],gate:gate.data||null,evidence:evidence.data||[],decisions:decisions.data||[]
  }
}

await fs.mkdir('artifacts',{recursive:true})
const browser=await chromium.launch({headless:true})
const page=await browser.newPage({viewport:{width:1440,height:1100}})
const pageErrors=[]
page.on('pageerror',e=>pageErrors.push(String(e?.message||e)))
await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:'ugo-test-admin-auth',value:JSON.stringify(login.session)})

try{
  await page.goto(base+'/?app=admin',{waitUntil:'networkidle'})
  await page.getByRole('button',{name:'◉ Super Admin',exact:true}).waitFor({state:'visible',timeout:20000})
  await page.getByRole('button',{name:'◉ Super Admin',exact:true}).click()
  await page.getByText('Control global de UGO',{exact:true}).waitFor({state:'visible',timeout:20000})
  await page.getByRole('button',{name:'Empresa Autónoma',exact:true}).click()
  await page.getByText('UGO Empresa Autónoma',{exact:true}).waitFor({state:'visible',timeout:20000})
  await page.getByRole('button',{name:'Riesgo & Auditoría',exact:true}).click()
  await page.getByText('Bloqueadores de lanzamiento',{exact:true}).waitFor({state:'visible',timeout:20000})

  const state=await snapshot()
  const root=page.locator('.ugo-autonomous-content')
  const waitRootText=async(marker,code)=>{
    for(let attempt=0;attempt<40;attempt++){
      const current=(await root.textContent())||''
      if(current.includes(String(marker)))return current
      await page.waitForTimeout(250)
    }
    throw new Error(code+':'+String(marker))
  }
  const openFindings=state.findings.filter(x=>x.status!=='CLOSED')

  for(const [label,value] of [['Riesgos',state.risks.length],['Controles',state.controls.length],['Challenges D14',state.challenges.length],['Findings abiertos',openFindings.length]]){
    const card=root.locator('article').filter({hasText:String(label)}).first()
    await card.waitFor({state:'visible',timeout:10000})
    let matched=false
    for(let attempt=0;attempt<40;attempt++){
      const cardText=(await card.textContent())||''
      if(cardText.includes(String(value))){matched=true;break}
      await page.waitForTimeout(250)
    }
    assert.ok(matched,label+'_COUNT_MISMATCH')
  }
  for(const blocker of state.gate?.blockers||[])await waitRootText(blocker,'RISK_BLOCKER_UI_BACKEND_MISMATCH')

  const finding=openFindings[0]
  if(finding){
    await waitRootText(finding.finding_type||finding.id,'RISK_FINDING_UI_BACKEND_MISMATCH')
    await waitRootText(finding.status,'RISK_FINDING_STATUS_MISMATCH')
  }

  const evidence=state.evidence[0]
  assert.ok(evidence,'RISK_EVIDENCE_REQUIRED')
  const evidenceMarker=String(evidence.reference||evidence.evidence_type||evidence.id)
  await waitRootText(evidenceMarker,'RISK_EVIDENCE_UI_BACKEND_MISMATCH')
  if(evidence.correlation_id)await waitRootText(evidence.correlation_id,'RISK_EVIDENCE_CORRELATION_MISMATCH')
  if(/^https?:\/\//.test(String(evidence.reference||''))){
    const link=root.locator('a').filter({hasText:String(evidence.reference)}).first()
    assert.equal(await link.getAttribute('href'),String(evidence.reference),'RISK_EVIDENCE_LINK_MISMATCH')
    assert.equal(await link.getAttribute('target'),'_blank','RISK_EVIDENCE_LINK_TARGET_REQUIRED')
    assert.equal(await link.getAttribute('rel'),'noreferrer','RISK_EVIDENCE_LINK_REL_REQUIRED')
  }

  const decision=state.decisions[0]
  assert.ok(decision,'RISK_DECISION_REQUIRED')
  await waitRootText(decision.decision||'DECISION','RISK_DECISION_UI_BACKEND_MISMATCH')
  if(decision.correlation_id)await waitRootText(decision.correlation_id,'RISK_DECISION_CORRELATION_MISMATCH')

  assert.deepEqual(pageErrors,[],'RISK_BROWSER_PAGE_ERRORS')
  await page.screenshot({path:'artifacts/admin-risk-runtime.png',fullPage:true})
  const out={
    schema_version:'UGO_READINESS_ADMIN_RISK_V1',readiness_id:'admin-risk',task_id:'readiness-admin-risk',
    environment:'UGO TEST',sha,actor_role:'superadmin',production_touched:false,
    counts:{risks:state.risks.length,controls:state.controls.length,challenges:state.challenges.length,open_findings:openFindings.length,evidence:state.evidence.length,decisions:state.decisions.length},
    blockers:state.gate?.blockers||[],evidence_reference:evidenceMarker,
    evidence_link_safe:/^https?:\/\//.test(String(evidence.reference||''))?true:null,
    decision_id:decision.id,decision_correlation_id:decision.correlation_id||null,
    page_errors:pageErrors,result:'PASS',completed_at:new Date().toISOString()
  }
  await fs.writeFile('artifacts/admin-risk-runtime.json',JSON.stringify(out,null,2)+'\n')
  console.log(JSON.stringify({status:'PASS',sha,environment:'UGO TEST',counts:out.counts}))
}finally{
  await browser.close()
  await db.auth.signOut()
}
