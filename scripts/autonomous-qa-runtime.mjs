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
const bad=required.filter(k=>!cov?.some(x=>x.coverage_key===k&&x.status==='COVERED'&&x.last_run_id));
if(bad.length)throw new Error('QA_REAL_COVERAGE_INCOMPLETE:'+bad.join(','));
console.log(JSON.stringify({validated:true,basis:'persisted-and-runtime-ugo-test-evidence',scenarios:required}));
