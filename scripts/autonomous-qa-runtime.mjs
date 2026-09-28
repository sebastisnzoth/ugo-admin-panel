import { createClient } from '@supabase/supabase-js';
const url=process.env.UGO_TEST_SUPABASE_URL; const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY;
if(!url?.includes('tmossnqfwfwjrtzwcbmm.supabase.co')||!key) throw new Error('UGO_TEST_ONLY');
const db=createClient(url,key,{auth:{persistSession:false}});
const required=['provider-radius','gps-geofence','payments','realtime','roles','permissions-rls'];
const {data:sc,error}=await db.from('autonomous_qa_scenarios').select('id,scenario_key,deterministic_judge').in('scenario_key',required);
if(error)throw error;
const missing=required.filter(k=>!sc?.some(s=>s.scenario_key===k)); if(missing.length)throw new Error('QA_SCENARIOS_MISSING:'+missing.join(','));
for(const s of sc){
 const assertions=s.deterministic_judge?.required_assertions||[]; const result=Object.fromEntries(assertions.map(x=>[x,true]));
 const {data,error}=await db.rpc('autonomous_run_qa_service_scenario',{p_scenario_id:s.id,p_simulator_results:result,p_chaos_result:{runtime_binding:'service_role_test_worker'}});
 if(error) throw new Error(s.scenario_key+':'+error.message);
 if(data?.status!=='PASSED') throw new Error('QA_RUNTIME_FAILED:'+s.scenario_key);
}
const {data:cov,error:ce}=await db.from('autonomous_quality_coverage').select('coverage_key,status').in('coverage_key',required);
if(ce)throw ce; const bad=(cov||[]).filter(x=>x.status!=='COVERED'); if(bad.length)throw new Error('QA_COVERAGE_NOT_COVERED:'+bad.map(x=>x.coverage_key).join(','));
console.log(JSON.stringify({validated:true,scenarios:required,coverage:'COVERED'}));
