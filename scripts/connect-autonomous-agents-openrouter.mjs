import{createClient}from'@supabase/supabase-js';
const key=process.env.OPENROUTER_API_KEY||process.env.UGO_OPENROUTER_API_KEY,url=process.env.UGO_TEST_SUPABASE_URL||'',sk=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'';
if(!key)throw new Error('OPENROUTER_API_KEY_REQUIRED');if(!url.includes('tmossnqfwfwjrtzwcbmm.supabase.co')||!sk)throw new Error('UGO_TEST_CREDENTIALS_REQUIRED');
const db=createClient(url,sk,{auth:{persistSession:false,autoRefreshToken:false}});
const{data:agents,error}=await db.from('autonomous_agents').select('id,agent_key,name,capability,model_provider').order('department_id');if(error)throw error;if(!agents?.length)throw new Error('NO_AUTONOMOUS_AGENTS');
const headers={authorization:'Bearer '+key,'content-type':'application/json','HTTP-Referer':'https://github.com/sebastisnzoth/ugo-admin-panel','X-Title':'UGO Autonomous Company'};
const catalog=await fetch('https://openrouter.ai/api/v1/models',{headers,signal:AbortSignal.timeout(7000)});if(!catalog.ok)throw new Error('OPENROUTER_AUTH_OR_CATALOG_FAILED_'+catalog.status);
const body=await catalog.json(),free=(body.data||[]).filter(m=>String(m?.pricing?.prompt)==='0'&&String(m?.pricing?.completion)==='0').map(m=>m.id);
const candidates=['openrouter/free',...free].filter((v,i,a)=>a.indexOf(v)===i).slice(0,5);let selected='';
for(const model of candidates){try{const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers,signal:AbortSignal.timeout(7000),body:JSON.stringify({model,messages:[{role:'system',content:'UGO governed agent connectivity check. Reply only UGO_AGENT_READY.'},{role:'user',content:'connectivity check'}],temperature:0,max_tokens:12})});const p=await r.json().catch(()=>({}));if(r.ok&&p?.choices?.[0]?.message?.content){selected=p.model||model;break}}catch{}}
if(!selected)throw new Error('OPENROUTER_FREE_ROUTE_UNAVAILABLE');
for(const agent of agents){if(agent.model_provider!=='openrouter')continue;const{error:u}=await db.from('autonomous_agents').update({model_id:selected,updated_at:new Date().toISOString()}).eq('id',agent.id);if(u)throw u;}
console.log(JSON.stringify({connected:true,agents:agents.filter(a=>a.model_provider==='openrouter').length,provider:'openrouter',model:selected,secretExposed:false}));
