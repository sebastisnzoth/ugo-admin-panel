import{createClient}from'@supabase/supabase-js';
const url=process.env.UGO_TEST_SUPABASE_URL||'',sk=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'';
if(!url.includes('tmossnqfwfwjrtzwcbmm.supabase.co')||!sk)throw new Error('UGO_TEST_CREDENTIALS_REQUIRED');
const db=createClient(url,sk,{auth:{persistSession:false,autoRefreshToken:false}});
const{data:agents,error}=await db.from('autonomous_agents').select('id,agent_key,name,capability,model_provider').order('department_id');if(error){if(error.code==='42501')throw new Error('UGO_TEST_MIGRATION_REQUIRED autonomous_worker_agent_grants');throw error}if(!agents?.length)throw new Error('NO_AUTONOMOUS_AGENTS');
const{data:routes,error:routeError}=await db.from('autonomous_model_candidates').select('provider,model_id,availability,eligible,benchmark_score,free_tier,last_benchmarked_at').in('provider',['gemini','openrouter']).eq('free_tier',true).eq('eligible',true).order('last_benchmarked_at',{ascending:false}).order('benchmark_score',{ascending:false,nullsFirst:false});if(routeError)throw routeError;
const freshCutoff=Date.now()-15*60*1000;
const fresh=(routes||[]).filter(r=>r.availability==='AVAILABLE'&&r.model_id&&r.last_benchmarked_at&&Date.parse(r.last_benchmarked_at)>=freshCutoff);const available=[...fresh.filter(r=>r.provider==='gemini'),...fresh.filter(r=>r.provider==='openrouter')];
if(!available.length){console.error(JSON.stringify({connected:false,agents:agents.filter(a=>a.model_provider==='openrouter'||a.model_provider==='gemini').length,provider:'model-router',state:'DEGRADED_FREE_CAPACITY',reason:'NO_FRESH_RUNTIME_VALIDATED_FREE_MODEL',secretExposed:false}));process.exit(1)}
const selected=available[0].model_id,selectedProvider=available[0].provider;let connectedAgents=0;
for(const agent of agents){if(agent.model_provider!=='openrouter'&&agent.model_provider!=='gemini')continue;const{error:u}=await db.from('autonomous_agents').update({model_provider:selectedProvider,model_id:selected,updated_at:new Date().toISOString()}).eq('id',agent.id);if(u)throw u;connectedAgents++;}
console.log(JSON.stringify({connected:true,agents:connectedAgents,provider:selectedProvider,model:selected,source:'fresh-runtime-validated-candidate',secretExposed:false}));
