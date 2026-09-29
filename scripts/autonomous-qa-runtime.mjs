import { createClient } from '@supabase/supabase-js';
const url=process.env.UGO_TEST_SUPABASE_URL,key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY;
if(!url?.includes('tmossnqfwfwjrtzwcbmm.supabase.co')||!key) throw new Error('UGO_TEST_ONLY');
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
 const {data:job,error:je}=await db.from('autonomous_jobs').select('id,status,trigger_type').eq('qa_run_id',row.last_run_id).eq('trigger_type','QA_INDEPENDENT_JUDGE').maybeSingle();
 if(je)throw je;if(!job||job.status!=='SUCCEEDED')throw new Error('QA_INDEPENDENT_JUDGE_REQUIRED:'+k);
 const [{count:eCount,error:ee},{count:dCount,error:de}]=await Promise.all([
  db.from('autonomous_evidence_ledger').select('id',{count:'exact',head:true}).eq('job_id',job.id),
  db.from('autonomous_decision_ledger').select('id',{count:'exact',head:true}).eq('job_id',job.id),
 ]);
 if(ee)throw ee;if(de)throw de;if(!eCount||!dCount)throw new Error('QA_INDEPENDENT_LEDGER_REQUIRED:'+k);
}
console.log(JSON.stringify({validated:true,basis:'persisted-runtime-and-independent-judge-evidence',persistedScenarios:persisted,independentScenarios:independent}));
