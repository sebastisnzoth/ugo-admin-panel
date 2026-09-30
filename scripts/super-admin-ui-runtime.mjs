import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {createClient} from '@supabase/supabase-js';

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co';
const url=process.env.UGO_TEST_SUPABASE_URL||'';
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'';
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'';
const email=process.env.UGO_TEST_ADMIN_EMAIL||'';
const password=process.env.UGO_TEST_ADMIN_PASSWORD||'';
const sha=process.env.UGO_RUNTIME_SHA||'';
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173';

assert.equal(url,TEST_URL,'UGO_TEST_ONLY');
assert.ok(anon&&serviceKey&&email&&password&&sha,'UGO_TEST_RUNTIME_INPUTS_REQUIRED');

const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const user=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:login,error:loginError}=await user.auth.signInWithPassword({email,password});
assert.ifError(loginError);
assert.ok(login.user&&login.session,'UGO_TEST_SUPERADMIN_SESSION_REQUIRED');
const {data:profile,error:profileError}=await admin.from('usuarios').select('tipo,activo').eq('id',login.user.id).single();
assert.ifError(profileError);
assert.equal(profile?.tipo,'superadmin','UGO_TEST_SUPERADMIN_REQUIRED');
assert.equal(profile?.activo,true,'UGO_TEST_SUPERADMIN_ACTIVE_REQUIRED');

const reader=user;
async function count(table){
  const {count,error}=await reader.from(table).select('*',{count:'exact',head:true});
  assert.ifError(error); return count||0;
}
async function visibleCount(table,limit){
  const {data,error}=await reader.from(table).select('id').limit(limit);
  assert.ifError(error); return (data||[]).length;
}
async function snapshot(){
  const [
    company, gate, qaSimulators, qaScenarios, qaRuns, qaCoverage,
    modelCandidates, modelRoutes, modelMetrics, risks, controls, challenges,
    empresasReadiness, empresasDemands, empresasSlots, jobs, departments
  ]=await Promise.all([
    reader.from('autonomous_company_state').select('*').maybeSingle(),
    reader.from('autonomous_release_gate').select('*').eq('gate_key','CUSTOMER_1').maybeSingle(),
    count('autonomous_qa_simulators'), count('autonomous_qa_scenarios'), visibleCount('autonomous_qa_runs',50), count('autonomous_quality_coverage'),
    count('autonomous_model_candidates'), count('autonomous_model_routes'), visibleCount('autonomous_model_metrics',50),
    count('autonomous_enterprise_risks'), count('autonomous_control_coverage'), count('autonomous_challenges'),
    reader.from('ugo_empresas_readiness').select('*').eq('product_key','UGO_EMPRESAS').maybeSingle(),
    reader.from('ugo_empresas_demands').select('id,company_ref,status,quantity,requirements').order('created_at',{ascending:false}).limit(20),
    reader.from('ugo_empresas_slots').select('id,demand_id,status,validated_minutes').order('slot_index').limit(100),
    reader.from('autonomous_jobs').select('id,service_id,correlation_id,status,authority_class,objective,created_at').order('created_at',{ascending:false}).limit(100),
    reader.from('autonomous_departments').select('department_id,name').order('department_id')
  ]);
  for(const r of [company,gate,empresasReadiness,empresasDemands,empresasSlots,jobs,departments]) assert.ifError(r.error);
  const {data:recentEvidence,error:recentEvidenceError}=await reader.from('autonomous_evidence_ledger').select('id,job_id,evidence_type,reference,correlation_id,created_at').order('created_at',{ascending:false}).limit(20);
  assert.ifError(recentEvidenceError);
  const departmentJobs=await Promise.all((departments.data||[]).map(async d=>{const[{count:total,error:totalError},{count:active,error:activeError},{data:lastRows,error:lastError}]=await Promise.all([reader.from('autonomous_jobs').select('id',{count:'exact',head:true}).eq('department_id',d.department_id),reader.from('autonomous_jobs').select('id',{count:'exact',head:true}).eq('department_id',d.department_id).in('status',['QUEUED','RUNNING','WAITING_APPROVAL','BLOCKED']),reader.from('autonomous_jobs').select('id,status,objective,correlation_id,created_at').eq('department_id',d.department_id).order('created_at',{ascending:false}).limit(1)]);assert.ifError(totalError);assert.ifError(activeError);assert.ifError(lastError);const lastJob=lastRows?.[0]||null;let lastEvidence=null;if(lastJob?.id){const evidenceResult=await reader.from('autonomous_evidence_ledger').select('id,evidence_type,reference,correlation_id,created_at').eq('job_id',lastJob.id).order('created_at',{ascending:false}).limit(1);assert.ifError(evidenceResult.error);lastEvidence=evidenceResult.data?.[0]||null}return{department_id:d.department_id,name:d.name,total_jobs:total||0,active_jobs:active||0,last_job:lastJob,last_evidence:lastEvidence}}));
  const correlated=(jobs.data||[]).find(j=>j.correlation_id);
  assert.ok(correlated,'CORRELATED_JOB_REQUIRED_FOR_TIMELINE_RUNTIME_PROOF');
  return {
    mode:company.data?.mode||'NO INICIALIZADO',
    launch:gate.data?.status||'NO EVALUADO',
    qa:{simulators:qaSimulators,scenarios:qaScenarios,runs:qaRuns,coverage:qaCoverage},
    models:{candidates:modelCandidates,routes:modelRoutes,metrics:modelMetrics},
    risk:{risks,controls,challenges,blockers:gate.data?.blockers||[],evidence:recentEvidence||[]},
    empresas:{readiness:empresasReadiness.data||null,demands:empresasDemands.data||[],slots:empresasSlots.data||[]},
    departmentJobs,
    correlated
  };
}
const before=await snapshot();

await fs.mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const pageErrors=[];
page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));

const cardText=async label=>{
  const card=page.locator('article').filter({hasText:label}).first();
  await card.waitFor({state:'visible'});
  return (await card.textContent())||'';
};
const assertCardCount=async(label,value)=>{
  const text=await cardText(label);
  assert.ok(text.includes(String(value)),label+' UI/backend mismatch: '+text+' vs '+value);
};

try{
  await page.addInitScript(({key,value})=>window.localStorage.setItem(key,value),{
    key:'ugo-test-admin-auth',
    value:JSON.stringify(login.session)
  });
  await page.goto(base+'/?app=admin',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'◉ Super Admin',exact:true}).waitFor({state:'visible',timeout:20000});
  await page.getByRole('button',{name:'◉ Super Admin',exact:true}).click();
  await page.getByText('Control global de UGO',{exact:true}).waitFor({state:'visible',timeout:20000});
  await page.getByLabel('UGO ambiente de prueba').waitFor({state:'visible'});

  await page.getByRole('button',{name:'Empresa Autónoma',exact:true}).click();
  await page.getByText('UGO Empresa Autónoma',{exact:true}).waitFor({state:'visible'});
  let headerMatched=false;
  for(let attempt=0;attempt<30;attempt++){
    const autonomyText=(await page.locator('.ugo-autonomous-content').textContent())||'';
    if(autonomyText.includes('Modo: '+before.mode)&&autonomyText.includes('Launch: '+before.launch)){headerMatched=true;break}
    await page.waitForTimeout(250);
  }
  assert.ok(headerMatched,'AUTONOMY_HEADER_UI_BACKEND_MISMATCH_AFTER_RETRY');
  await page.screenshot({path:'artifacts/super-admin-ui-autonomy.png',fullPage:true});

  await page.getByRole('button',{name:'Departamentos',exact:true}).click();
  await page.getByText('Departamentos corporativos',{exact:true}).waitFor({state:'visible'});
  const departmentTable=page.locator('table').filter({hasText:'Jobs totales'}).first();
  await departmentTable.waitFor({state:'visible'});
  for(const summary of before.departmentJobs){
    const row=departmentTable.locator('tbody tr').filter({hasText:'D'+summary.department_id}).first();
    await row.waitFor({state:'visible'});
    const cells=row.locator('td');
    let activeText='',totalText='',activeCount=NaN,totalCount=NaN;
    for(let attempt=0;attempt<40;attempt++){
      activeText=((await cells.nth(5).textContent())||'').trim();
      totalText=((await cells.nth(6).textContent())||'').trim();
      activeCount=activeText==='—'?NaN:Number(activeText);
      totalCount=totalText==='—'?NaN:Number(totalText);
      if(Number.isFinite(activeCount)&&Number.isFinite(totalCount))break;
      await page.waitForTimeout(250);
    }
    assert.ok(Number.isFinite(activeCount)&&activeCount>=0,'DEPARTMENT_ACTIVE_JOBS_NUMERIC_REQUIRED D'+summary.department_id);
    assert.ok(Number.isFinite(totalCount)&&totalCount>=0,'DEPARTMENT_TOTAL_JOBS_NUMERIC_REQUIRED D'+summary.department_id);
    assert.ok(activeCount<=totalCount,'DEPARTMENT_ACTIVE_EXCEEDS_TOTAL D'+summary.department_id);
    const correlation=((await cells.nth(9).textContent())||'').trim();
    if(correlation&&correlation!=='—'){
      const [jobMatch,evidenceMatch]=await Promise.all([
        reader.from('autonomous_jobs').select('id,status,correlation_id,department_id').eq('department_id',summary.department_id).eq('correlation_id',correlation).order('created_at',{ascending:false}).limit(1),
        reader.from('autonomous_evidence_ledger').select('id,job_id,correlation_id').eq('correlation_id',correlation).order('created_at',{ascending:false}).limit(1)
      ]);
      assert.ifError(jobMatch.error);
      assert.ifError(evidenceMatch.error);
      assert.ok((jobMatch.data?.length||0)>0||(evidenceMatch.data?.length||0)>0,'DEPARTMENT_CORRELATION_NOT_PERSISTED D'+summary.department_id);
    }else{
      const persistedCount=await reader.from('autonomous_jobs').select('id',{count:'exact',head:true}).eq('department_id',summary.department_id);
      assert.ifError(persistedCount.error);
      assert.equal(Number(persistedCount.count||0),0,'DEPARTMENT_MISSING_CORRELATION_WITH_PERSISTED_JOBS D'+summary.department_id);
    }
  }
  const departmentFilter=page.getByLabel('Filtrar departamento');
  const firstDepartment=before.departmentJobs[0];
  assert.ok(firstDepartment,'DEPARTMENT_RUNTIME_FIXTURE_REQUIRED');
  await departmentFilter.selectOption(String(firstDepartment.department_id));
  await page.waitForTimeout(150);
  assert.equal(await departmentTable.locator('tbody tr').count(),1,'DEPARTMENT_FILTER_COUNT_MISMATCH');
  await departmentFilter.selectOption('ALL');
  const firstRow=departmentTable.locator('tbody tr').first();
  const firstIdText=((await firstRow.locator('td').nth(0).textContent())||'').trim();
  const firstDepartmentId=Number(firstIdText.replace(/^D/,''));
  assert.ok(Number.isInteger(firstDepartmentId),'DEPARTMENT_HISTORY_ID_REQUIRED');
  await firstRow.getByRole('button',{name:'Ver historial'}).click();
  const historyDialog=page.getByRole('dialog',{name:'Historial del departamento'});
  await historyDialog.waitFor({state:'visible'});
  const historyText=(await historyDialog.textContent())||'';
  assert.ok(/actualizado hace/i.test(historyText),'DEPARTMENT_FRESHNESS_MISSING');
  const recentPersisted=await reader.from('autonomous_jobs').select('id').eq('department_id',firstDepartmentId).order('created_at',{ascending:false}).limit(10);
  assert.ifError(recentPersisted.error);
  if(recentPersisted.data?.length)assert.ok(recentPersisted.data.some(job=>historyText.includes(String(job.id))),'DEPARTMENT_HISTORY_NOT_BACKED_BY_PERSISTED_JOB');
  await page.getByRole('button',{name:'Cerrar historial'}).click();
  await page.screenshot({path:'artifacts/super-admin-ui-departments.png',fullPage:true});

  await page.getByRole('button',{name:'QA Lab',exact:true}).click();
  await assertCardCount('SIMULADORES',before.qa.simulators);
  await assertCardCount('ESCENARIOS',before.qa.scenarios);
  await assertCardCount('RUNS',before.qa.runs);

  await page.getByRole('button',{name:'Model Router',exact:true}).click();
  await assertCardCount('CANDIDATOS',before.models.candidates);
  await assertCardCount('RUTAS',before.models.routes);
  await assertCardCount('MÉTRICAS',before.models.metrics);

  await page.getByRole('button',{name:'Riesgo & Auditoría',exact:true}).click();
  await assertCardCount('RIESGOS',before.risk.risks);
  await assertCardCount('CONTROLES',before.risk.controls);
  await assertCardCount('CHALLENGES D14',before.risk.challenges);
  const riskAuditText=(await page.locator('.ugo-autonomous-content').textContent())||'';
  for(const blocker of before.risk.blockers) assert.ok(riskAuditText.includes(String(blocker)),'RISK_BLOCKER_UI_BACKEND_MISMATCH:'+blocker);
  const recentRiskEvidence=before.risk.evidence.slice(0,20);
  const visibleRiskEvidence=recentRiskEvidence.filter(evidence=>{
    const expected=String(evidence.reference||evidence.evidence_type||evidence.id);
    return riskAuditText.includes(expected)&&(evidence.correlation_id?riskAuditText.includes(String(evidence.correlation_id)):true);
  });
  assert.ok(recentRiskEvidence.length===0||visibleRiskEvidence.length>0,'RISK_EVIDENCE_UI_BACKEND_NO_OVERLAP');
  await page.screenshot({path:'artifacts/super-admin-ui-risk-audit.png',fullPage:true});

  await page.getByRole('button',{name:'UGO Empresas',exact:true}).click();
  await page.getByText('UGO Empresas',{exact:true}).last().waitFor({state:'visible'});
  assert.equal(before.empresas.readiness?.status,'READY','UGO_EMPRESAS_RUNTIME_NOT_READY');
  const enterpriseRuntimeSha=String(before.empresas.readiness?.metrics?.runtime_sha||'');
  assert.match(enterpriseRuntimeSha,/^[0-9a-f]{40}$/,'UGO_EMPRESAS_RUNTIME_SHA_INVALID');
  const enterpriseDemand=before.empresas.demands.find(d=>d.id===before.empresas.readiness?.metrics?.demand_id);
  assert.ok(enterpriseDemand,'UGO_EMPRESAS_EVIDENCE_DEMAND_NOT_VISIBLE');
  assert.equal(String(enterpriseDemand.requirements?.sha||''),enterpriseRuntimeSha,'UGO_EMPRESAS_EVIDENCE_SHA_MISMATCH');
  if(before.empresas.readiness?.metrics?.correlation_id)assert.equal(String(enterpriseDemand.requirements?.correlation_id||''),String(before.empresas.readiness.metrics.correlation_id),'UGO_EMPRESAS_CORRELATION_MISMATCH');
  const enterpriseSlots=before.empresas.slots.filter(s=>s.demand_id===enterpriseDemand.id);
  assert.equal(enterpriseSlots.length,enterpriseDemand.quantity,'UGO_EMPRESAS_SLOT_COUNT_MISMATCH');
  assert.ok(enterpriseSlots.every(s=>s.status==='VALIDATED'),'UGO_EMPRESAS_SLOT_STATE_MISMATCH');
  await page.getByText(enterpriseDemand.company_ref,{exact:false}).waitFor({state:'visible'});
  await page.screenshot({path:'artifacts/ugo-empresas-runtime.png',fullPage:true});

  await page.getByRole('button',{name:'Ledgers',exact:true}).click();
  const search=page.getByPlaceholder('correlation_id, job id o serviceId');
  await search.fill(String(before.correlated.correlation_id));
  await page.getByText(String(before.correlated.correlation_id),{exact:false}).first().waitFor({state:'visible'});
  const timelineText=await page.locator('.ugo-autonomous-content').textContent();
  assert.ok((timelineText||'').includes(String(before.correlated.status)),'TIMELINE_STATUS_MISMATCH');
  if(before.correlated.service_id)assert.ok((timelineText||'').includes(String(before.correlated.service_id)),'TIMELINE_SERVICE_ID_MISMATCH');

  await page.getByRole('button',{name:'Launch Gate',exact:true}).click();
  await page.getByRole('button',{name:'Evaluar Launch Gate',exact:true}).click();
  await page.waitForTimeout(1200);
  const after=await snapshot();
  await page.getByText('Launch Gate · '+after.launch,{exact:true}).waitFor({state:'visible',timeout:10000});

  await page.screenshot({path:'artifacts/super-admin-ui-runtime.png',fullPage:true});
  const evidence={
    task_id:'super-admin-ui',
    job_id:'UGO-SUPER-ADMIN-UI',
    sha,
    environment:'UGO TEST',
    tested_url:base+'/?app=admin',
    actor_role:profile.tipo,
    runtime_checks:{
      authenticated_session:'PASS',super_admin_authorization:'PASS',autonomy:'PASS',department_job_visibility:'PASS',qa_lab:'PASS',
      model_router:'PASS',risk_audit:'PASS',ugo_empresas:'PASS',launch_gate_action:'PASS',correlation_timeline:'PASS'
    },
    backend_before:before,
    backend_after:{mode:after.mode,launch:after.launch},
    authorized_action:{name:'superadmin_evaluate_release_gate',gate_key:'CUSTOMER_1',result:after.launch},
    page_errors:pageErrors,
    completed_at:new Date().toISOString()
  };
  await fs.writeFile('artifacts/super-admin-ui-runtime.json',JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',sha,environment:'UGO TEST',launch:after.launch,correlation_id:before.correlated.correlation_id}));
}catch(error){
  await page.screenshot({path:'artifacts/super-admin-ui-failure.png',fullPage:true}).catch(()=>{});
  await fs.writeFile('artifacts/super-admin-ui-failure.txt',await page.locator('body').innerText().catch(()=>String(error))).catch(()=>{});
  throw error;
}finally{
  await browser.close();
  await user.auth.signOut();
}
