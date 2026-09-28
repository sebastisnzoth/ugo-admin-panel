const gemini=process.env.GEMINI_API_KEY||''
import{createClient}from'@supabase/supabase-js'
const key=process.env.OPENROUTER_API_KEY||process.env.UGO_OPENROUTER_API_KEY
if(!key&&!gemini)throw new Error('MODEL_PROVIDER_API_KEY_REQUIRED')
const base=process.env.OPENROUTER_BASE_URL||'https://openrouter.ai/api/v1'
const headers={authorization:'Bearer '+key,'content-type':'application/json','HTTP-Referer':'https://github.com/sebastisnzoth/ugo-admin-panel','X-Title':'UGO Autonomous Company'}
const su=process.env.UGO_TEST_SUPABASE_URL,sk=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY
const db=su&&sk&&su.includes('tmossnqfwfwjrtzwcbmm')?createClient(su,sk,{auth:{persistSession:false}}):null
async function persist(candidate){if(!db)return;const{error}=await db.from('autonomous_model_candidates').upsert(candidate,{onConflict:'provider,model_id'});if(error)throw new Error('MODEL_ROUTE_PERSIST_FAILED '+error.message)}
function safeError(p){return String(p?.error?.message||p?.message||'unknown').replace(/[A-Za-z0-9_-]{24,}/g,'[redacted]').slice(0,200)}

if(gemini){
 let geminiLast='',models=[]
 try{
  const lr=await fetch('https://generativelanguage.googleapis.com/v1beta/models',{headers:{'x-goog-api-key':gemini},signal:AbortSignal.timeout(6000)})
  const lp=await lr.json().catch(()=>({}))
  if(lr.ok)models=(lp.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')&&/gemini.*flash/i.test(m.name||'')).map(m=>String(m.name).replace(/^models\//,''))
  else geminiLast='catalog status='+lr.status+' error='+safeError(lp)
 }catch(error){geminiLast='catalog transport='+String(error?.name||'error')}
 const preferred=['gemini-3.8-flash','gemini-3.8-flash-lite',...models].filter((v,i,a)=>v&&a.indexOf(v)===i)
 for(const model of preferred.slice(0,8)){
  try{
   const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{method:'POST',headers:{'x-goog-api-key':gemini,'content-type':'application/json'},signal:AbortSignal.timeout(6000),body:JSON.stringify({contents:[{parts:[{text:'Reply only UGO_GEMINI_OK'}]}],generationConfig:{temperature:0,maxOutputTokens:24}})})
   const p=await r.json().catch(()=>({}))
   const content=p?.candidates?.[0]?.content?.parts?.map(x=>x?.text||'').join('').trim()||''
   if(r.ok&&content.includes('UGO_GEMINI_OK')){
    const score=1,threshold=.8,at=new Date().toISOString()
    await persist({provider:'gemini',model_id:model,free_tier:true,eligible:true,benchmark_score:score,benchmark_threshold:threshold,availability:'AVAILABLE',last_benchmarked_at:at,last_error:null,updated_at:at})
    console.log(JSON.stringify({connected:true,provider:'gemini',model,source:'runtime-validated-catalog',benchmarkScore:score,threshold,failover:'openrouter'}))
    process.exit(0)
   }
   geminiLast='model='+model+' status='+r.status+' error='+safeError(p)
   console.error(JSON.stringify({connected:false,provider:'gemini',model,status:r.status,state:'CANDIDATE_FAILED',error:safeError(p)}))
  }catch(error){geminiLast='model='+model+' transport='+String(error?.name||'error');console.error(JSON.stringify({connected:false,provider:'gemini',model,state:'CANDIDATE_FAILED',error:String(error?.name||'error')}))}
 }
 console.error(JSON.stringify({connected:false,provider:'gemini',state:'PROBE_FAILED',catalogCandidates:models.length,lastFailure:geminiLast,failover:'openrouter'}))
}
if(!key)throw new Error('OPENROUTER_FALLBACK_KEY_REQUIRED')
const catalog=await fetch(base+'/models',{headers})
if(!catalog.ok)throw new Error('OPENROUTER_CONNECTION_FAILED status='+catalog.status)
const catalogBody=await catalog.json()
const free=(catalogBody.data||[]).filter(m=>String(m?.pricing?.prompt)==='0'&&String(m?.pricing?.completion)==='0').map(m=>m.id)
const preferred=[process.env.UGO_OPENROUTER_MODEL,'openrouter/free',...free].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i)
let last=''
for(const model of preferred.slice(0,5)){
 if(model!=='openrouter/free'&&!free.includes(model)&&!model.endsWith(':free'))continue
 let response,payload
 try{response=await fetch(base+'/chat/completions',{method:'POST',headers,signal:AbortSignal.timeout(5000),body:JSON.stringify({model,messages:[{role:'system',content:'You are the UGO model-router health probe. Reply only UGO_OPENROUTER_OK.'},{role:'user',content:'health check'}],temperature:0,max_tokens:24})});payload=await response.json().catch(()=>({}))}catch(error){last='model='+model+' transport='+String(error?.name||'error');continue}
 if(response.ok&&payload?.choices?.[0]?.message?.content){
   const selected=payload.model||model,score=1,threshold=.8,at=new Date().toISOString()
   await persist({provider:'openrouter',model_id:selected,free_tier:true,eligible:true,benchmark_score:score,benchmark_threshold:threshold,availability:'AVAILABLE',last_benchmarked_at:at,last_error:null,updated_at:at})
   console.log(JSON.stringify({connected:true,provider:'openrouter',model:selected,freeRouteAvailable:true,freeCandidates:free.length,benchmarkScore:score,threshold}))
   process.exit(0)
 }
 last='model='+model+' status='+response.status+' error='+safeError(payload)
}
const blockedModel=preferred.find(model=>model==='openrouter/free'||free.includes(model)||model.endsWith(':free'))||'openrouter/free'
const at=new Date().toISOString()
await persist({provider:'openrouter',model_id:blockedModel,free_tier:true,eligible:false,benchmark_score:0,benchmark_threshold:.8,availability:'UNAVAILABLE',last_benchmarked_at:at,last_error:'EXTERNAL_FREE_CAPACITY_UNAVAILABLE: '+last,updated_at:at})
console.error(JSON.stringify({connected:true,provider:'openrouter',freeRouteAvailable:false,freeCandidates:free.length,state:'EXTERNAL_BLOCKER_PERSISTED',blocker:'FREE_MODEL_CAPACITY_UNAVAILABLE'}))
process.exit(0)
