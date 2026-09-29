import{randomUUID}from'node:crypto'
import{createClient}from'@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const gemini=String(process.env.GEMINI_API_KEY||'').trim(),openrouter=String(process.env.OPENROUTER_API_KEY||'').trim()
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
if(!gemini||!openrouter)throw new Error('MODEL_PROVIDER_KEYS_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const{data:route,error:re}=await db.from('autonomous_model_routes').select('primary_candidate_id,fallback_candidate_id,status,max_cost').eq('task_class','AGENT_CONSULTATION').single()
if(re)throw re
if(route.status!=='READY'||Number(route.max_cost)!==0)throw new Error('AGENT_CONSULTATION_ROUTE_NOT_READY')
const ids=[route.primary_candidate_id,route.fallback_candidate_id].filter(Boolean)
const{data:cands,error:ce}=await db.from('autonomous_model_candidates').select('id,provider,model_id,eligible,availability,free_tier').in('id',ids)
if(ce)throw ce
const primary=cands.find(x=>x.id===route.primary_candidate_id),fallback=cands.find(x=>x.id===route.fallback_candidate_id)
if(!primary||!fallback)throw new Error('ROUTE_CANDIDATES_MISSING')
if(primary.provider!=='gemini'||fallback.provider!=='openrouter')throw new Error('EXPECTED_GEMINI_TO_OPENROUTER_ROUTE')
if(!primary.eligible||primary.availability!=='AVAILABLE'||!primary.free_tier)throw new Error('PRIMARY_NOT_ELIGIBLE')
if(!fallback.eligible||fallback.availability!=='AVAILABLE'||!fallback.free_tier)throw new Error('FALLBACK_NOT_ELIGIBLE')
const correlation=randomUUID()
const startedPrimary=Date.now()
let primaryFailed=false
try{
 const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(primary.model_id)+':generateContent',{
  method:'POST',headers:{'content-type':'application/json','x-goog-api-key':gemini},
  body:JSON.stringify({contents:[{role:'user',parts:[{text:'UGO controlled failover drill'}]}]}),
  signal:AbortSignal.timeout(1)
 })
 if(r.ok)throw new Error('CONTROLLED_PRIMARY_FAILURE_DID_NOT_TRIGGER')
 primaryFailed=true
}catch{primaryFailed=true}
if(!primaryFailed)throw new Error('PRIMARY_FAILURE_NOT_OBSERVED')
const{error:pm}=await db.from('autonomous_model_metrics').insert({
 candidate_id:primary.id,task_class:'AGENT_CONSULTATION',correlation_id:correlation,
 quality_score:null,latency_ms:Date.now()-startedPrimary,success:false,cost:0,failure_code:'CONTROLLED_PRIMARY_TIMEOUT_TEST'
})
if(pm)throw pm
const startedFallback=Date.now()
const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{
 method:'POST',
 headers:{authorization:'Bearer '+openrouter,'content-type':'application/json','x-title':'UGO Autonomous Company'},
 body:JSON.stringify({model:fallback.model_id,messages:[{role:'system',content:'Reply only UGO_FALLBACK_OK'},{role:'user',content:'controlled fallback drill'}],temperature:0,max_tokens:24}),
 signal:AbortSignal.timeout(15000)
})
const payload=await response.json().catch(()=>({}))
const answer=String(payload?.choices?.[0]?.message?.content||'')
const success=response.ok&&answer.trim().length>0
const{error:fm}=await db.from('autonomous_model_metrics').insert({
 candidate_id:fallback.id,task_class:'AGENT_CONSULTATION',correlation_id:correlation,
 quality_score:success?1:null,latency_ms:Date.now()-startedFallback,success,cost:0,
 failure_code:success?null:String(payload?.error?.message||(response.ok?'EMPTY_MODEL_RESPONSE':('OpenRouter '+response.status))).slice(0,180)
})
if(fm)throw fm
if(!success)throw new Error('OPENROUTER_FALLBACK_FAILED')
const{data:rows,error:ve}=await db.from('autonomous_model_metrics').select('candidate_id,success,failure_code,cost').eq('correlation_id',correlation)
if(ve)throw ve
if(rows.length!==2||!rows.some(x=>x.candidate_id===primary.id&&x.success===false)||!rows.some(x=>x.candidate_id===fallback.id&&x.success===true))throw new Error('FAILOVER_METRICS_INCOMPLETE')
console.log(JSON.stringify({modelFallback:true,correlationId:correlation,primary:primary.model_id,fallback:fallback.model_id,cost:0}))
