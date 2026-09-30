import{createClient}from'@supabase/supabase-js'
import{decideHugoAuthority,normalizeHugoRequestedRole}from'./authority'
const MODEL=process.env.GEMINI_MODEL||'gemini-3.5-flash-lite'
const TTS_MODELS=Array.from(new Set([
 process.env.GEMINI_TTS_FAST_MODEL,
 process.env.GEMINI_TTS_MODEL,
 'gemini-3.1-flash-tts-preview',
 'gemini-2.5-flash-preview-tts',
].filter(Boolean)as string[]))
const TTS_VOICE=process.env.GEMINI_TTS_VOICE||'Puck'

type RequestLike={headers?:Record<string,string|undefined>;method?:string;body?:unknown}
const SUPABASE_URL=process.env.SUPABASE_URL
const SUPABASE_ANON_KEY=process.env.SUPABASE_ANON_KEY
function bearer(req:RequestLike){const raw=String(req.headers?.authorization||'');return raw.startsWith('Bearer ')?raw.slice(7).trim():''}
async function authorizeHugo(req:RequestLike,body:JsonRecord){
 const token=bearer(req)
 if(!token)throw Object.assign(new Error('Autenticación requerida para usar Hugo.'),{status:401,code:'AUTH_REQUIRED'})
 if(!SUPABASE_URL||!SUPABASE_ANON_KEY)throw Object.assign(new Error('Backend Supabase TEST no configurado.'),{status:503,code:'AUTH_BACKEND_UNAVAILABLE'})
 const authClient=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
 const{data,error}=await authClient.auth.getUser(token)
 if(error||!data.user)throw Object.assign(new Error('Sesión inválida o vencida.'),{status:401,code:'INVALID_SESSION'})
 const userClient=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
 const{data:profile,error:profileError}=await userClient.from('usuarios').select('tipo,activo').eq('id',data.user.id).maybeSingle()
 if(profileError)throw Object.assign(new Error('No se pudo verificar la autoridad de la sesión.'),{status:403,code:'PROFILE_LOOKUP_FAILED'})
 const requestedRole=normalizeHugoRequestedRole(body.role)
 const decision=decideHugoAuthority(requestedRole,String(profile?.tipo||''),Boolean(profile?.activo))
 if(!decision.allowed)throw Object.assign(new Error(decision.reason),{status:403,code:decision.code,authority:decision})
 return{user:data.user,profile,requestedRole,decision}
}
type ResponseLike={setHeader:(name:string,value:string)=>void;status:(code:number)=>ResponseLike;json:(body:unknown)=>unknown;end:()=>unknown}
type JsonRecord=Record<string,unknown>
const asRecord=(value:unknown):JsonRecord=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:{}
const nested=(value:unknown,...keys:string[]):unknown=>keys.reduce<unknown>((item,key)=>Array.isArray(item)?item[Number(key)]:asRecord(item)[key],value)
const parts=(value:unknown):JsonRecord[]=>Array.isArray(value)?value.map(asRecord):[]
function sameOrigin(req:RequestLike){try{const origin=String(req.headers?.origin||'');if(!origin)return true;return new URL(origin).host===String(req.headers?.host||'')}catch{return false}}
function clean(v:unknown,max=4000){return String(v??'').trim().slice(0,max)}
function sanitizeForModel(v:unknown,max=4000){
 let text=clean(v,max)
 text=text
  .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi,'Bearer [REDACTED]')
  .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,'[REDACTED_JWT]')
  .replace(/\b(?:sk|sb_secret|service_role|ghp|github_pat|AIza)[-_A-Za-z0-9]{12,}\b/g,'[REDACTED_SECRET]')
  .replace(/\b(api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password|passwd|authorization)\b\s*[:=]\s*["']?[^\s,"'}]{6,}["']?/gi,'$1=[REDACTED]')
  .replace(/data:[^;\s]+;base64,[A-Za-z0-9+/=]{80,}/gi,'[REDACTED_BLOB]')
  .replace(/[A-Za-z0-9+/]{800,}={0,2}/g,'[REDACTED_BLOB]')
 return text.slice(0,max)
}
function extractJson(text:string){try{return JSON.parse(text)}catch{/* Gemini may wrap JSON in prose. */}const a=text.indexOf('{'),b=text.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(text.slice(a,b+1))}catch{/* Return null for an invalid embedded object. */}}return null}
const NAV_TARGETS=new Set(['home','operations:overview','operations:map','operations:services','operations:alerts','operations:disputes','operations:scout','operations:history','operations:messages','people:users','people:verification','people:documents','people:kyc','people:import','finance:pix','finance:vault','finance:tariffs','settings:categories','settings:analytics','settings:notifications','settings:reports','settings:system','superadmin'])
function uiAction(value:unknown,role:'admin'|'superadmin'){
 if(!value||typeof value!=='object')return null
 const raw=asRecord(value)
 const type=clean(raw.type,30)
 if(type==='refresh')return{type:'refresh'}
 if(type==='navigate'){const target=clean(raw.target,80);if(!NAV_TARGETS.has(target)||target==='superadmin'&&role!=='superadmin')return null;return{type:'navigate',target}}
 if(type==='open_service'){const serviceId=clean(raw.service_id,80),number=Number(raw.service_number);if(serviceId&&!/^[0-9a-f-]{36}$/i.test(serviceId))return null;if(!serviceId&&!Number.isFinite(number))return null;return{type:'open_service',service_id:serviceId||undefined,service_number:Number.isFinite(number)?number:undefined}}
 if(type==='map_filter'){const status=['todos','online','offline','inactivo'].includes(String(raw.status))?String(raw.status):undefined,category=clean(raw.category,80)||null,zone=clean(raw.zone,120)||null,place=clean(raw.place,160)||null,radius=Number(raw.radius_m),showProviders=typeof raw.show_providers==='boolean'?raw.show_providers:null,showClients=typeof raw.show_clients==='boolean'?raw.show_clients:null;return{type:'map_filter',status,category,zone,place,radius_m:Number.isFinite(radius)?Math.max(0,Math.min(50000,radius)):null,show_providers:showProviders,show_clients:showClients}}
 return null
}
function geminiKey(){const key=process.env.GEMINI_API_KEY?.trim();if(!key)throw Object.assign(new Error('GEMINI_API_KEY no configurada'),{status:503});return key}


async function askGemini(message:string,history:unknown[],system:string,jsonMode=false){
 const key=geminiKey()
 const safeSystem=sanitizeForModel(system,12000)
 const safeHistory=history.slice(-8).map((item)=>{const m=asRecord(item);return{role:m.role==='assistant'?'model':'user',parts:[{text:sanitizeForModel(m.content,1200)}]}})
 const safeMessage=sanitizeForModel(message,1800)
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({system_instruction:{parts:[{text:safeSystem}]},contents:[...safeHistory,{role:'user',parts:[{text:safeMessage}]}],generationConfig:{temperature:.15,maxOutputTokens:900,...(jsonMode?{responseMimeType:'application/json'}:{})}}),signal:AbortSignal.timeout(12000)})
 const payload:unknown=await response.json().catch(()=>({}))
 if(!response.ok)throw Object.assign(new Error(clean(nested(payload,'error','message'))||`Gemini ${response.status}`),{status:response.status>=400&&response.status<600?response.status:502})
 const text=clean(parts(nested(payload,'candidates','0','content','parts')).map(p=>p.text||'').join(''),5000)
 if(!text)throw Object.assign(new Error('Gemini no devolvió contenido'),{status:502})
 return{text,model:MODEL}
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
 res.setHeader('Access-Control-Allow-Headers','content-type')
 const origin=String(req.headers?.origin||'')
 if(origin&&sameOrigin(req))res.setHeader('Access-Control-Allow-Origin',origin)
 if(req.method==='OPTIONS')return res.status(200).end()
 if(req.method!=='POST')return res.status(405).json({hugo_mensaje:'Método no permitido.'})
 if(!sameOrigin(req))return res.status(403).json({hugo_mensaje:'Origen no autorizado.'})
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
  const clientMode=body.mode==='client_voice'
  const requestedRole=authority.requestedRole
  const adminRole=requestedRole==='superadmin'?'superadmin':'admin'
  const surface=clean(body.surface,80)||'panel de control'
  const adminSystem=adminRole==='superadmin'?[
   'Sos Hugo Super Admin, el copiloto de gobierno global de U.G.O.',
   'Podés explicar y analizar la información visible del Command Center, métricas globales, servicios, usuarios, proveedores, pagos, retiros, disputas, documentos, auditoría, feature flags e integraciones cuando esos datos estén presentes en el contexto.',
   'Diferenciá siempre datos EN VIVO del contexto de explicaciones generales sobre cómo funciona U.G.O.',
   'No inventes usuarios, servicios, pagos, métricas, estados, permisos, integraciones ni acciones.',
   'No reveles secretos, tokens, credenciales ni valores sensibles de configuración.',
   'Si falta un dato concreto, decilo y sugerí en qué módulo puede verificarse.',
   'Podés ejecutar únicamente acciones de interfaz permitidas cuando el usuario lo pida explícitamente: navegar por módulos, abrir un servicio, actualizar datos o filtrar/abrir el mapa. No inventes una acción ni declares que cambiaste dinero, permisos, usuarios o estados.',
   'Para cambios sensibles, llevá al administrador al módulo correcto; la confirmación y autorización siguen en el control auditado del panel.',
   'Cuando el usuario pida ver, abrir, mostrar, ir, filtrar o actualizar algo del panel, devolvé SIEMPRE la ui_action correspondiente además de hablar. La pantalla debe moverse mientras continúa la conversación por voz.',
   'Cuando el usuario pida ver, abrir, mostrar, ir, filtrar o actualizar algo del panel, devolvé SIEMPRE la ui_action correspondiente además de hablar. La pantalla debe moverse mientras continúa la conversación por voz.',
   'Respondé SOLO JSON válido con {"reply":"respuesta breve","ui_action":null} o ui_action con uno de estos contratos: {"type":"navigate","target":"..."}, {"type":"open_service","service_id":null,"service_number":123}, {"type":"refresh"}, {"type":"map_filter","status":"online|offline|inactivo|todos","category":null,"zone":null,"place":null,"radius_m":null,"show_providers":true,"show_clients":false}.'
  ]:[
   'Sos Hugo Admin, el copiloto operativo del panel de administración de U.G.O.',
   'Podés explicar y analizar la información visible del panel Admin: operación, mapa, servicios, clientes, proveedores, documentos, pagos, retiros, deudas UGO, disputas, categorías, tarifas, notificaciones, reportes, mensajes, calificaciones, timeline y Scout cuando esos datos estén presentes en el contexto.',
   'No asumas permisos de Super Admin ni afirmes acceso a gobierno global, secretos o configuración crítica.',
   'Diferenciá siempre datos EN VIVO del contexto de explicaciones generales sobre cómo funciona U.G.O.',
   'No inventes usuarios, servicios, pagos, métricas, estados ni acciones.',
   'Si CONTEXTO OPERATIVO EN VIVO trae fuentes_no_disponibles, aclaralo cuando afecte la respuesta.',
   'Cuando te pregunten qué falta, qué está mal, bloqueos, errores o si UGO está listo, priorizá readiness e incidentes del contexto, separando P0 de P1 y distinguiendo implementado, validado y bloqueado.',
   'Podés ejecutar únicamente acciones de interfaz permitidas cuando el usuario lo pida explícitamente: navegar por módulos, abrir un servicio, actualizar datos o filtrar/abrir el mapa. No inventes una acción ni declares que cambiaste dinero, permisos, usuarios o estados.',
   'Para cambios sensibles, llevá al administrador al módulo correcto; la confirmación y autorización siguen en el control auditado del panel.',
   'Respondé SOLO JSON válido con {"reply":"respuesta breve","ui_action":null} o ui_action con uno de estos contratos: {"type":"navigate","target":"..."}, {"type":"open_service","service_id":null,"service_number":123}, {"type":"refresh"}, {"type":"map_filter","status":"online|offline|inactivo|todos","category":null,"zone":null,"place":null,"radius_m":null,"show_providers":true,"show_clients":false}.'
  ]
  const system=clientMode?[
   'Sos Hugo, el compañero de confianza del cliente dentro de U.G.O.',
   'Sé simpático, cálido, práctico y natural. Soná como un amigo que ayuda a resolver, no como un formulario.',
   'Respondé en español rioplatense o portugués de Brasil según el usuario, breve y conversacional.',
   'Ayudá a entender qué servicio puede resolver lo que la persona busca, incluso cuando no sabe el nombre del profesional.',
   'Si no alcanza la información, hacé una sola pregunta útil y concreta.',
   'No inventes profesionales, disponibilidad, reputación, precio, dirección, pagos ni estados.',
   'Si el contexto contiene profesionales reales, podés recomendar uno sólo usando esos datos y explicando brevemente el motivo.',
   'Si el contexto contiene un borrador de pedido, respetá todos sus datos ya confirmados.',
   'Nunca afirmes que el pedido fue creado, confirmado o enviado si el contexto no dice que ya ocurrió.',
   context?`CONTEXTO UGO REAL: ${context}`:'Sin contexto UGO adicional.'
  ].join('\n'):[
   ...adminSystem,
   'Respondé en español rioplatense, claro, ejecutivo y útil. Si hace falta, podés usar viñetas cortas.',
   `SUPERFICIE ACTUAL: ${surface}`,
   context?`CONTEXTO OPERATIVO EN VIVO: ${context}`:'Sin contexto operativo adicional.'
  ].join('\n')
  const prompt=message==='__INICIO__'?(`Saludá como Hugo ${adminRole==='superadmin'?'Super Admin':'Admin'} y preguntá qué necesita revisar.`):message,result=await askGemini(prompt,history,system,!clientMode),parsed=clientMode?null:extractJson(result.text),reply=clientMode?result.text:clean(asRecord(parsed).reply,1800),action=clientMode?null:uiAction(asRecord(parsed).ui_action,adminRole)
  return res.status(200).json({hugo_mensaje:reply||(clientMode?'Decime qué necesitás.':'Hola, ¿qué querés revisar?'),accion:null,ui_action:action,datos:null,model:result.model,authority:{role:authority.requestedRole,profile_role:String(authority.profile?.tipo||''),decision:'ALLOW'}})
 }catch(error:unknown){
  console.error('Hugo chat failed',error)
  const info=asRecord(error),status=Number(info.status)||502
  if(info.retryAfter)res.setHeader('Retry-After',String(info.retryAfter))
  const message=error instanceof Error?error.message:'Hugo no pudo responder ahora.'
  const nextStep=status===401?'Iniciá sesión nuevamente y reintentá.':status===403?'Revisá que tu cuenta tenga permiso para esta acción y reintentá.':status===429?'Esperá un momento y reintentá.':status===503||status===504?'Reintentá en unos instantes; el resto de UGO sigue disponible.':'Reintentá la acción. Si vuelve a fallar, seguí usando UGO sin voz y reportá el incidente.'
  return res.status(status>=400&&status<600?status:502).json({error:message,error_code:clean(info.code,80)||undefined,authority:info.authority||undefined,hugo_mensaje:`${message} ${nextStep}`,next_step:nextStep,accion:null,ui_action:null,datos:null})
 }
}
