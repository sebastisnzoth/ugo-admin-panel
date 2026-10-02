import{authorizeHugo}from'../../server/hugo/auth'
import{allowedHugoOrigin,isAllowedHugoRequestOrigin}from'../../server/hugo/cors'
import{askHugoModel}from'../../server/hugo/modelRouter'
import{buildHugoPrompt}from'../../server/hugo/promptBuilder'
import{clean,sanitizeForModel}from'../../server/hugo/security'
import{parseHugoUiAction}from'../../server/hugo/uiAction'
const MODEL=process.env.GEMINI_MODEL||'gemini-3.5-flash-lite'
const TTS_MODELS=Array.from(new Set([
 process.env.GEMINI_TTS_FAST_MODEL,
 process.env.GEMINI_TTS_MODEL,
 'gemini-3.1-flash-tts-preview',
 'gemini-2.5-flash-preview-tts',
].filter(Boolean)as string[]))
const TTS_VOICE=process.env.GEMINI_TTS_VOICE||'Puck'

type RequestLike={headers?:Record<string,string|undefined>;method?:string;body?:unknown}
type ResponseLike={setHeader:(name:string,value:string)=>void;status:(code:number)=>ResponseLike;json:(body:unknown)=>unknown;end:()=>unknown}
type JsonRecord=Record<string,unknown>
const asRecord=(value:unknown):JsonRecord=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:{}
const nested=(value:unknown,...keys:string[]):unknown=>keys.reduce<unknown>((item,key)=>Array.isArray(item)?item[Number(key)]:asRecord(item)[key],value)
const parts=(value:unknown):JsonRecord[]=>Array.isArray(value)?value.map(asRecord):[]
function geminiKey(){const key=process.env.GEMINI_API_KEY?.trim();if(!key)throw Object.assign(new Error('GEMINI_API_KEY no configurada'),{status:503});return key}


async function askGemini(message:string,history:unknown[],system:string,jsonMode=false){
 const safeSystem=sanitizeForModel(system,12000)
 const safeHistory=history.slice(-8).map((item)=>{const m=asRecord(item);return{role:m.role==='assistant'?'assistant':'user',content:sanitizeForModel(m.content,1200)}})
 const safeMessage=sanitizeForModel(message,1800)
 return askHugoModel(safeMessage,safeHistory,safeSystem,jsonMode,MODEL)
}

function sampleRateFromMime(mime:string){const match=String(mime||'').match(/rate=(\d+)/i),value=Number(match?.[1]||24000);return Number.isFinite(value)&&value>0?value:24000}

async function askGeminiTts(text:string,locale:string){
 const key=geminiKey(),languageCode=locale==='pt-BR'?'pt-BR':'es-ES',safeText=sanitizeForModel(text,360),prompt=locale==='pt-BR'?`Fale como Hugo: simpático, próximo, acolhedor e ágil, como um amigo confiável ajudando a resolver algo. Não acrescente nem retire informação. Diga apenas: ${safeText}`:`Hablá como Hugo: simpático, cercano, cálido y ágil, como un amigo confiable que ayuda a resolver algo. No agregues ni quites informação. Decí solamente: ${safeText}`
 let lastStatus=502,lastError='Gemini TTS no respondió',lastRetryAfter=''
 for(const model of TTS_MODELS){
  const started=Date.now()
  try{
   const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{languageCode,voiceConfig:{prebuiltVoiceConfig:{voiceName:TTS_VOICE}}}}}),signal:AbortSignal.timeout(6500)})
   const payload:unknown=await response.json().catch(()=>({})),elapsed=Date.now()-started
   console.info('Hugo TTS timing',{model,ms:elapsed,status:response.status})
   if(response.ok){const part=parts(nested(payload,'candidates','0','content','parts')).find(item=>nested(item,'inlineData','data')),audioBase64=clean(nested(part,'inlineData','data'),4_500_000),mimeType=clean(nested(part,'inlineData','mimeType')||'audio/L16;codec=pcm;rate=24000',120);if(audioBase64)return{audio_base64:audioBase64,mime_type:mimeType,sample_rate:sampleRateFromMime(mimeType),model,voice:TTS_VOICE};lastError='Gemini TTS no devolvió audio';lastStatus=502;continue}
   lastStatus=response.status;lastError=clean(nested(payload,'error','message'))||`Gemini TTS ${response.status}`;lastRetryAfter=String(response.headers.get('retry-after')||'')
   if(response.status===429)break
   const retryable=[404,500,502,503].includes(response.status)||/overloaded|temporar|not found|unavailable/i.test(String(lastError))
   if(!retryable)break
  }catch(error:unknown){const elapsed=Date.now()-started;console.warn('Hugo TTS timing',{model,ms:elapsed,status:'transport',message:error instanceof Error?error.message:String(error)});lastError=error instanceof Error?error.message:'Gemini TTS no disponible';lastStatus=504}
 }
 throw Object.assign(new Error(lastError),{status:lastStatus,retryAfter:lastRetryAfter})
}

export default async function handler(req:RequestLike,res:ResponseLike){
 res.setHeader('Cache-Control','no-store')
 res.setHeader('Vary','Origin')
 res.setHeader('Access-Control-Allow-Headers','authorization, content-type')
 res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS')
 const origin=String(req.headers?.origin||'').trim(),corsOrigin=allowedHugoOrigin(req)
 if(corsOrigin)res.setHeader('Access-Control-Allow-Origin',corsOrigin)
 if(req.method==='OPTIONS')return origin&&!corsOrigin?res.status(403).end():res.status(200).end()
 if(req.method!=='POST')return res.status(405).json({hugo_mensaje:'Método no permitido.'})
 if(!isAllowedHugoRequestOrigin(req))return res.status(403).json({hugo_mensaje:'Origen no autorizado.'})
 try{
  const body=asRecord(typeof req.body==='string'?JSON.parse(req.body):req.body)
  const authority=await authorizeHugo(req,body)
  if(body.tts===true){
   const text=clean(body.text||body.message,360)
   if(!text)return res.status(400).json({error:'Texto requerido para voz.'})
   const started=Date.now(),audio=await askGeminiTts(text,clean(body.locale,12)||'es-AR'),elapsed=Date.now()-started
   res.setHeader('Server-Timing',`gemini-tts;dur=${elapsed}`)
   return res.status(200).json({...audio,timing_ms:elapsed})
  }
  const message=clean(body.message,1800),context=clean(body.context,60000),history=Array.isArray(body.history)?body.history:[]
  if(!message)return res.status(400).json({hugo_mensaje:'Mensaje requerido.'})
  const requestedRole=authority.requestedRole
  const surface=clean(body.surface,80)||'panel de control'
  const{clientMode,providerMode,adminRole,system,prompt,jsonMode}=buildHugoPrompt({requestedRole,context,surface,message})
  const result=await askGemini(prompt,history,system,jsonMode),parsed=clientMode||providerMode?null:extractJson(result.text),reply=clientMode||providerMode?result.text:clean(asRecord(parsed).reply,1800),action=clientMode||providerMode?null:parseHugoUiAction(asRecord(parsed).ui_action,adminRole)
  return res.status(200).json({hugo_mensaje:reply||(clientMode?'Decime qué necesitás.':providerMode?'Decime en qué te ayudo con tu trabajo.':'Hola, ¿qué querés revisar?'),accion:null,ui_action:action,datos:null,model:result.model,model_provider:result.provider,fallback_used:result.fallback_used,correlation_id:result.correlation_id,model_timing_ms:result.timing_ms,authority:{role:authority.requestedRole,profile_role:String(authority.profile?.tipo||''),decision:'ALLOW'}})
 }catch(error:unknown){
  console.error('Hugo chat failed',error)
  const info=asRecord(error),status=Number(info.status)||502
  if(info.retryAfter)res.setHeader('Retry-After',String(info.retryAfter))
  const message=error instanceof Error?error.message:'Hugo no pudo responder ahora.'
  const nextStep=status===401?'Iniciá sesión nuevamente y reintentá.':status===403?'Revisá que tu cuenta tenga permiso para esta acción y reintentá.':status===429?'Esperá un momento y reintentá.':status===503||status===504?'Reintentá en unos instantes; el resto de UGO sigue disponible.':'Reintentá la acción. Si vuelve a fallar, seguí usando UGO sin voz y reportá el incidente.'
  return res.status(status>=400&&status<600?status:502).json({error:message,error_code:clean(info.code,80)||undefined,correlation_id:clean(info.correlation_id,80)||undefined,authority:info.authority||undefined,hugo_mensaje:`${message} ${nextStep}`,next_step:nextStep,accion:null,ui_action:null,datos:null})
 }
}
