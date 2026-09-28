import{createClient}from'@supabase/supabase-js';
const key=process.env.OPENROUTER_API_KEY||process.env.UGO_OPENROUTER_API_KEY,url=process.env.UGO_TEST_SUPABASE_URL||'',sk=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'';
if(!key)throw new Error('OPENROUTER_API_KEY_REQUIRED');if(!url.includes('tmossnqfwfwjrtzwcbmm.supabase.co')||!sk)throw new Error('UGO_TEST_CREDENTIALS_REQUIRED');
const db=createClient(url,sk,{auth:{persistSession:false,autoRefreshToken:false}});
const{data:agents,error}=await db.from('autonomous_agents').select('id,agent_key,name,capability,model_provider').order('department_id');if(error){if(error.code==='42501')throw new Error('UGO_TEST_MIGRATION_REQUIRED autonomous_worker_agent_grants');throw error}if(!agents?.length)throw new Error('NO_AUTONOMOUS_AGENTS');
const{data:routes,routeError}=await db.from('autonomous_model_candidates').select('model_id,availability,eligible,benchmark_score,free_tier,last_benchmarked_at').eq('provider','openrouter').eq('free_tier',true).eq('eligible',true).order('benchmark_score',{ascending:false,nullsFirst:false});
if(routeError)throw routeError;
const available=(routes||[]).filter(r=>r.availability==='AVAILABLE'&&r.model_id);
if(!available.length){console.log(JSON.stringify({connected:false,agents:agents.filter(a=>a.model_provider==='openrouter').length,provider:'openrouter',state:'DEGRADED_FREE_CAPACITY',reason:'NO_RUNTIME_VALIDATED_FREE_MODEL',secretExposed:false}));process.exit(0)}
const selected=available[0].model_id;
for(const agent of agents){if(agent.model_provider!=='openrouter')continue;const{error:u}=await db.from('autonomous_agents').update({model_id:selected,updated_at:new Date().toISOString()}).eq('id',agent.id);if(u)throw u;}
console.log(JSON.stringify({connected:true,agents:agents.filter(a=>a.model_provider==='openrouter').length,provider:'openrouter',model:selected,source:'runtime-validated-candidate',secretExposed:false}));
