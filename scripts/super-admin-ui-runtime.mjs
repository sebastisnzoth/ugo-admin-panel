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
assert.ok(login.user,'UGO_TEST_SUPERADMIN_LOGIN_REQUIRED');
const {data:profile,error:profileError}=await admin.from('usuarios').select('tipo,activo').eq('id',login.user.id).single();
assert.ifError(profileError);
assert.equal(profile?.tipo,'superadmin','UGO_TEST_SUPERADMIN_REQUIRED');
assert.equal(profile?.activo,true,'UGO_TEST_SUPERADMIN_ACTIVE_REQUIRED');

async function count(table){
  const {count,error}=await admin.from(table).select('*',{count:'exact',head:true});
  assert.ifError(error); return count||0;
}
async function snapshot(){
  const [
    company, gate, qaSimulators, qaScenarios, qaRuns, qaCoverage,
    modelCandidates, modelRoutes, modelMetrics, risks, controls, challenges,
    jobs
  ]=await Promise.all([
    admin.from('autonomous_company_state').select('*').maybeSingle(),
    admin.from('autonomous_release_gate').select('*').eq('gate_key','CUSTOMER_1').maybeSingle(),
    count('autonomous_qa_simulators'), count('autonomous_qa_scenarios'), count('autonomous_qa_runs'), count('autonomous_quality_coverage'),
    count('autonomous_model_candidates'), count('autonomous_model_routes'), count('autonomous_model_metrics'),
    count('autonomous_enterprise_risks'), count('autonomous_control_coverage'), count('autonomous_challenges'),
    admin.from('autonomous_jobs').select('id,service_id,correlation_id,status,authority_class,objective,created_at').not('correlation_id','is',null).order('created_at',{ascending:false}).limit(100)
  ]);
  for(const r of [company,gate,jobs]) assert.ifError(r.error);
  const correlated=(jobs.data||[]).find(j=>j.correlation_id);
  assert.ok(correlated,'CORRELATED_JOB_REQUIRED_FOR_TIMELINE_RUNTIME_PROOF');
  return {
    mode:company.data?.mode||'NO INICIALIZADO',
    launch:gate.data?.status||'NO EVALUADO',
    qa:{simulators:qaSimulators,scenarios:qaScenarios,runs:qaRuns,coverage:qaCoverage},
    models:{candidates:modelCandidates,routes:modelRoutes,metrics:modelMetrics},
    risk:{risks,controls,challenges},
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
  await page.goto(base+'/?app=admin',{waitUntil:'networkidle'});
  await page.getByPlaceholder('Usuario o email').fill(email);
  await page.getByPlaceholder('Contraseña').fill(password);
  await page.getByRole('button',{name:'Ingresar'}).click();
  await page.getByRole('button',{name:'Super Admin',exact:true}).waitFor({state:'visible',timeout:20000});
  await page.getByRole('button',{name:'Super Admin',exact:true}).click();
  await page.getByText('Control global de UGO',{exact:true}).waitFor({state:'visible',timeout:20000});
  await page.getByLabel('UGO ambiente de prueba').waitFor({state:'visible'});

  await page.getByRole('button',{name:'Empresa Autónoma',exact:true}).click();
  await page.getByText('UGO Empresa Autónoma',{exact:true}).waitFor({state:'visible'});
  const header=await page.locator('.ugo-autonomous-content header').textContent();
  assert.ok((header||'').includes('Modo: '+before.mode),'AUTONOMY_MODE_UI_BACKEND_MISMATCH');
  assert.ok((header||'').includes('Launch: '+before.launch),'LAUNCH_HEADER_UI_BACKEND_MISMATCH');

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
      login:'PASS',super_admin_authorization:'PASS',autonomy:'PASS',qa_lab:'PASS',
      model_router:'PASS',risk_audit:'PASS',launch_gate_action:'PASS',correlation_timeline:'PASS'
    },
    backend_before:before,
    backend_after:{mode:after.mode,launch:after.launch},
    authorized_action:{name:'superadmin_evaluate_release_gate',gate_key:'CUSTOMER_1',result:after.launch},
    page_errors:pageErrors,
    completed_at:new Date().toISOString()
  };
  await fs.writeFile('artifacts/super-admin-ui-runtime.json',JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',sha,environment:'UGO TEST',launch:after.launch,correlation_id:before.correlated.correlation_id}));
}finally{
  await browser.close();
  await user.auth.signOut();
}
