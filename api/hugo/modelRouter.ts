type JsonRecord=Record<string,unknown>
export type HugoModelResult={text:string;model:string;provider:'gemini'|'openrouter';fallback_used:boolean;correlation_id:string;timing_ms:number}
const rec=(v:unknown):JsonRecord=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as JsonRecord:{}
const clean=(v:unknown,max=5000)=>String(v??'').trim().slice(0,max)
const parts=(v:unknown):JsonRecord[]=>Array.isArray(v)?v.map(rec):[]
const nested=(v:unknown,...keys:string[]):unknown=>keys.reduce<unknown>((item,key)=>Array.isArray(item)?item[Number(key)]:rec(item)[key],v)
const clampTimeout=(raw:unknown,fallback:number,max:number)=>{const n=Number(raw);return Number.isFinite(n)?Math.max(100,Math.min(max,n)):fallback}
const GEMINI_TIMEOUT_MS=clampTimeout(process.env.HUGO_GEMINI_TIMEOUT_MS,12000,12000)
const OPENROUTER_TIMEOUT_MS=clampTimeout(process.env.HUGO_OPENROUTER_TIMEOUT_MS,8000,8000)
const GEMINI_BASE=(process.env.GEMINI_BASE_URL||'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/,'')
const OPENROUTER_BASE=(process.env.OPENROUTER_BASE_URL||'https://openrouter.ai/api/v1').replace(/\/$/,'')
const OPENROUTER_MODEL=process.env.UGO_OPENROUTER_MODEL||'openrouter/free'
const retryableStatus=(status:number)=>status===408||status===409||status===425||status===429||status>=500
const codeFor=(error:unknown)=>{const e=rec(error);return clean(e.code,80)||clean(e.name,80)||'MODEL_PROVIDER_ERROR'}
function statusFor(error:unknown){const e=rec(error),n=Number(e.status);return Number.isFinite(n)&&n>=400&&n<600?n:502}
function telemetry(event:JsonRecord){console.info('Hugo model router',event)}
function providerError(provider:'gemini'|'openrouter',status:number,message:string,code?:string){return Object.assign(new Error(message),{status,code:code||`${provider.toUpperCase()}_ERROR`,provider})}
function geminiKey(){const key=process.env.GEMINI_API_KEY?.trim();if(!key)throw providerError('gemini',503,'GEMINI_API_KEY no configurada','GEMINI_NOT_CONFIGURED');return key}
function openRouterKey(){return(process.env.OPENROUTER_API_KEY||process.env.UGO_OPENROUTER_API_KEY||'').trim()}
async function callGemini(message:string,history:unknown[],system:string,jsonMode:boolean,model:string){
 const key=geminiKey(),started=Date.now()
 try{
  const safeHistory=history.slice(-8).map(item=>{const m=rec(item);return{role:m.role==='assistant'?'model':'user',parts:[{text:clean(m.content,1200)}]}})
  const response=await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({system_instruction:{parts:[{text:system}]},contents:[...safeHistory,{role:'user',parts:[{text:message}]}],generationConfig:{temperature:.15,maxOutputTokens:900,...(jsonMode?{responseMimeType:'application/json'}:{})}}),signal:AbortSignal.timeout(GEMINI_TIMEOUT_MS)})
  const payload:unknown=await response.json().catch(()=>({}))
  if(!response.ok)throw providerError('gemini',response.status,clean(nested(payload,'error','message'))||`Gemini ${response.status}`,`GEMINI_HTTP_${response.status}`)
  const text=clean(parts(nested(payload,'candidates','0','content','parts')).map(p=>p.text||'').join(''),5000)
  if(!text)throw providerError('gemini',502,'Gemini no devolvió contenido','GEMINI_EMPTY')
  return{text,model,provider:'gemini' as const,ms:Date.now()-started}
 }catch(error:unknown){
  if(error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError'))throw providerError('gemini',504,'Gemini demoró demasiado en responder.','GEMINI_TIMEOUT')
  throw error
 }
}
async function callOpenRouter(message:string,history:unknown[],system:string,jsonMode:boolean){
 const key=openRouterKey()
 if(!key)throw providerError('openrouter',503,'OpenRouter fallback no configurado.','OPENROUTER_NOT_CONFIGURED')
 const started=Date.now()
 try{
  const messages=[{role:'system',content:system},...history.slice(-8).map(item=>{const m=rec(item);return{role:m.role==='assistant'?'assistant':'user',content:clean(m.content,1200)}}),{role:'user',content:message}]
  const response=await fetch(`${OPENROUTER_BASE}/chat/completions`,{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json','HTTP-Referer':'https://github.com/sebastisnzoth/ugo-admin-panel','X-Title':'UGO Hugo'},body:JSON.stringify({model:OPENROUTER_MODEL,messages,temperature:.15,max_tokens:900,...(jsonMode?{response_format:{type:'json_object'}}:{})}),signal:AbortSignal.timeout(OPENROUTER_TIMEOUT_MS)})
  const payload:unknown=await response.json().catch(()=>({}))
  if(!response.ok)throw providerError('openrouter',response.status,clean(nested(payload,'error','message'))||`OpenRouter ${response.status}`,`OPENROUTER_HTTP_${response.status}`)
  const text=clean(nested(payload,'choices','0','message','content'),5000)
  if(!text)throw providerError('openrouter',502,'OpenRouter no devolvió contenido','OPENROUTER_EMPTY')
  return{text,model:clean(rec(payload).model,120)||OPENROUTER_MODEL,provider:'openrouter' as const,ms:Date.now()-started}
 }catch(error:unknown){
  if(error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError'))throw providerError('openrouter',504,'OpenRouter demoró demasiado en responder.','OPENROUTER_TIMEOUT')
  throw error
 }
}
export async function askHugoModel(message:string,history:unknown[],system:string,jsonMode=false,model=process.env.GEMINI_MODEL||'gemini-3.5-flash-lite'):Promise<HugoModelResult>{
 const correlation_id=crypto.randomUUID(),started=Date.now()
 try{
  const primary=await callGemini(message,history,system,jsonMode,model)
  telemetry({event:'hugo_model_route',correlation_id,route:'primary',provider:'gemini',model:primary.model,status:'success',duration_ms:primary.ms,fallback_used:false})
  return{text:primary.text,model:primary.model,provider:'gemini',fallback_used:false,correlation_id,timing_ms:Date.now()-started}
 }catch(primaryError:unknown){
  const primaryStatus=statusFor(primaryError),primaryCode=codeFor(primaryError),canFallback=retryableStatus(primaryStatus)||primaryCode==='GEMINI_TIMEOUT'||primaryCode==='GEMINI_NOT_CONFIGURED'
  telemetry({event:'hugo_model_route',correlation_id,route:'primary',provider:'gemini',status:'failed',http_status:primaryStatus,error_code:primaryCode,fallback_eligible:canFallback})
  if(!canFallback)throw primaryError
  try{
   const fallback=await callOpenRouter(message,history,system,jsonMode)
   telemetry({event:'hugo_model_route',correlation_id,route:'fallback',provider:'openrouter',model:fallback.model,status:'success',duration_ms:fallback.ms,fallback_used:true,primary_error_code:primaryCode})
   return{text:fallback.text,model:fallback.model,provider:'openrouter',fallback_used:true,correlation_id,timing_ms:Date.now()-started}
  }catch(fallbackError:unknown){
   const fallbackStatus=statusFor(fallbackError),fallbackCode=codeFor(fallbackError)
   telemetry({event:'hugo_model_route',correlation_id,route:'fallback',provider:'openrouter',status:'failed',http_status:fallbackStatus,error_code:fallbackCode,fallback_used:true,primary_error_code:primaryCode})
   const status=primaryStatus===429&&fallbackStatus===429?429:Math.max(primaryStatus===504?504:502,fallbackStatus===504?504:502)
   throw Object.assign(new Error('Hugo no pudo obtener respuesta del modelo primario ni del fallback.'),{status,code:'HUGO_MODEL_FALLBACK_EXHAUSTED',correlation_id,primary_error_code:primaryCode,fallback_error_code:fallbackCode})
  }
 }
}
