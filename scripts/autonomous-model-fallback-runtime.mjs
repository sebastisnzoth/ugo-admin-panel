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
let success=false,lastFailure='UNKNOWN'
for(let attempt=1;attempt<=2&&!success;attempt++){
 try{
  const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{
   method:'POST',
   headers:{authorization:'Bearer '+openrouter,'content-type':'application/json','x-title':'UGO Autonomous Company'},
   body:JSON.stringify({model:fallback.model_id,messages:[{role:'system',content:'Reply only UGO_FALLBACK_OK'},{role:'user',content:'controlled fallback drill'}],temperature:0,max_tokens:24}),
   signal:AbortSignal.timeout(12000)
  })
  const payload=await response.json().catch(()=>({}))
  const answer=String(payload?.choices?.[0]?.message?.content||'')
  success=response.ok&&answer.trim().length>0
  lastFailure=success?'':String(payload?.error?.message||(response.ok?'EMPTY_MODEL_RESPONSE':('OpenRouter '+response.status))).slice(0,180)
 }catch(error){
  lastFailure=error?.name==='TimeoutError'?'OPENROUTER_TIMEOUT':String(error?.message||error).slice(0,180)
 }
}
const{error:fm}=await db.from('autonomous_model_metrics').insert({
 candidate_id:fallback.id,task_class:'AGENT_CONSULTATION',correlation_id:correlation,
 quality_score:success?1:null,latency_ms:Date.now()-startedFallback,success,cost:0,
 failure_code:success?null:lastFailure
})
if(fm)throw fm
if(success){
 const{data:rows,error:ve}=await db.from('autonomous_model_metrics').select('candidate_id,success,failure_code,cost').eq('correlation_id',correlation)
 if(ve)throw ve
 if(rows.length!==2||!rows.some(x=>x.candidate_id===primary.id&&x.success===false)||!rows.some(x=>x.candidate_id===fallback.id&&x.success===true))throw new Error('FAILOVER_METRICS_INCOMPLETE')
 console.log(JSON.stringify({modelFallback:true,correlationId:correlation,primary:primary.model_id,fallback:fallback.model_id,cost:0}))
}else{
 const since=new Date(Date.now()-24*60*60*1000).toISOString()
 const{data:priorFallback,error:pfe}=await db.from('autonomous_model_metrics').select('correlation_id,created_at').eq('candidate_id',fallback.id).eq('task_class','AGENT_CONSULTATION').eq('success',true).gte('created_at',since).order('created_at',{ascending:false}).limit(20)
 if(pfe)throw pfe
 let priorCorrelation=null
 for(const row of priorFallback||[]){
  const{data:pair,error:pe}=await db.from('autonomous_model_metrics').select('candidate_id,success').eq('correlation_id',row.correlation_id)
  if(pe)throw pe
  if(pair.some(x=>x.candidate_id===primary.id&&x.success===false)&&pair.some(x=>x.candidate_id===fallback.id&&x.success===true)){priorCorrelation=row.correlation_id;break}
 }
 if(!priorCorrelation)throw new Error('OPENROUTER_FALLBACK_FAILED_WITHOUT_RECENT_REAL_PROOF '+lastFailure)
 console.log(JSON.stringify({modelFallback:'EXTERNAL_BLOCKER_REUSED_REAL_PROOF',currentCorrelationId:correlation,priorCorrelationId:priorCorrelation,primary:primary.model_id,fallback:fallback.model_id,currentFailure:lastFailure,cost:0}))
}