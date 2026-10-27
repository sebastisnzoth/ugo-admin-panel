import { createClient } from '@supabase/supabase-js';
const url=process.env.UGO_TEST_SUPABASE_URL,key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY;
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY;
const clientEmail=process.env.UGO_TEST_CLIENT_EMAIL;
const clientPassword=process.env.UGO_TEST_CLIENT_PASSWORD;
const providerEmail=process.env.UGO_TEST_PROVIDER_EMAIL;
const providerPassword=process.env.UGO_TEST_PROVIDER_PASSWORD;
const adminEmail=process.env.UGO_TEST_ADMIN_EMAIL;
const adminPassword=process.env.UGO_TEST_ADMIN_PASSWORD;
if(!url?.includes('tmossnqfwfwjrtzwcbmm.supabase.co')||!key||!anon||!clientEmail||!clientPassword||!providerEmail||!providerPassword||!adminEmail||!adminPassword) throw new Error('UGO_TEST_ONLY');
const db=createClient(url,key,{auth:{persistSession:false}});
const required=['provider-radius','gps-geofence','payments','realtime','roles','permissions-rls','service-lifecycle'];
const {data:sc,error}=await db.from('autonomous_qa_scenarios').select('id,scenario_key,service_id,coverage_key').in('scenario_key',required);
if(error)throw error;
const missing=required.filter(k=>!sc?.some(s=>s.scenario_key===k)); if(missing.length)throw new Error('QA_SCENARIOS_MISSING:'+missing.join(','));
const persisted=['provider-radius','payments','service-lifecycle'];
const unbound=sc.filter(s=>persisted.includes(s.scenario_key)&&!s.service_id);
if(unbound.length) throw new Error('QA_REAL_RUNTIME_BINDING_REQUIRED:'+unbound.map(s=>s.scenario_key).join(','));
for(const s of sc.filter(s=>s.service_id)){
 const {data:svc,error:se}=await db.from('servicios').select('id,estado,cliente_id,proveedor_id,ambiente').eq('id',s.service_id).maybeSingle();
 if(se)throw se;if(!svc)throw new Error('QA_SERVICE_NOT_FOUND:'+s.scenario_key);
 if(svc.ambiente!=='demo')throw new Error('QA_NON_TEST_SERVICE_REJECTED:'+s.scenario_key);
}
// Record authenticated simulator actions for service-lifecycle before running the scenario
const lifecycleScenario=sc.find(s=>s.scenario_key==='service-lifecycle');
if(lifecycleScenario?.service_id){
 const svcId=lifecycleScenario.service_id;
 async function login(email,password){
  const sb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const r=await sb.auth.signInWithPassword({email,password});
  if(r.error)throw r.error;
  return sb;
 }
 const clientSb=await login(clientEmail,clientPassword);
 const providerSb=await login(providerEmail,providerPassword);
 const adminSb=await login(adminEmail,adminPassword);
 for(const [actorSb,simulatorKey] of [[clientSb,'qa-client-simulator'],[providerSb,'qa-provider-simulator'],[adminSb,'qa-admin-system-simulator']]){
  const {error:be}=await actorSb.rpc('autonomous_qa_record_actor_action',{p_service_id:svcId,p_simulator_key:simulatorKey,p_action_key:'observe_service'});
  if(be)throw be;
 }
 await Promise.allSettled([clientSb.auth.signOut(),providerSb.auth.signOut(),adminSb.auth.signOut()]);
}
for(const s of sc.filter(s=>persisted.includes(s.scenario_key))){
 const {error:re}=await db.rpc('autonomous_run_qa_service_scenario',{p_scenario_id:s.id,p_simulator_results:{runtime:'github-actions'},p_chaos_result:{}});
 if(re)throw re;
}
const {data:cov,error:ce}=await db.from('autonomous_quality_coverage').select('coverage_key,status,last_run_id').in('coverage_key',required);
if(ce)throw ce;
const bad=persisted.filter(k=>!cov?.some(x=>x.coverage_key===k&&x.status==='COVERED'&&x.last_run_id));
if(bad.length)throw new Error('QA_REAL_COVERAGE_INCOMPLETE:'+bad.join(','));
const independent=required.filter(k=>!persisted.includes(k));
const unverified=independent.filter(k=>!cov?.some(x=>x.coverage_key===k&&x.status==='COVERED'&&x.last_run_id));
if(unverified.length)throw new Error('QA_INDEPENDENT_COVERAGE_INCOMPLETE:'+unverified.join(','));
for(const k of independent){
 const row=cov.find(x=>x.coverage_key===k);
 const {data:job,error:je}=await db.from('autonomous_jobs').select('id,status,trigger_type,target_type,target_id,idempotency_key').eq('idempotency_key','qa-independent:'+row.last_run_id).eq('target_type','QA_RUN').eq('target_id',row.last_run_id).maybeSingle();
 if(je)throw je;if(!job||job.status!=='SUCCEEDED')throw new Error('QA_INDEPENDENT_JUDGE_REQUIRED:'+k);
 const [{count:eCount,error:ee},{count:dCount,error:de}]=await Promise.all([
  db.from('autonomous_evidence_ledger').select('id',{count:'exact',head:true}).eq('job_id',job.id),
  db.from('autonomous_decision_ledger').select('id',{count:'exact',head:true}).eq('job_id',job.id),
 ]);
 if(ee)throw ee;if(de)throw de;if(!eCount||!dCount)throw new Error('QA_INDEPENDENT_LEDGER_REQUIRED:'+k);
}
console.log(JSON.stringify({validated:true,basis:'persisted-runtime-and-independent-judge-evidence',persistedScenarios:persisted,independentScenarios:independent}));
