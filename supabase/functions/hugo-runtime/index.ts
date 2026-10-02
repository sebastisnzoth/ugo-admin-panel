import { createClient } from 'npm:@supabase/supabase-js@2.108.1'

type JsonRecord=Record<string,unknown>
const rec=(v:unknown):JsonRecord=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as JsonRecord:{}
const clean=(v:unknown,max=5000)=>String(v??'').trim().slice(0,max)
const json=(body:unknown,status=200,origin='')=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origin?{'Access-Control-Allow-Origin':origin}:{})}})
const allowedOrigins=new Set(['https://sebastisnzoth.github.io','https://ugo-admin-panel.vercel.app','https://ugo-admin-panel-netlify.netlify.app','https://zingy-youtiao-c00ece.netlify.app','http://localhost:5173','http://127.0.0.1:5173','http://localhost:4173','http://127.0.0.1:4173'])
const corsOrigin=(req:Request)=>{const origin=req.headers.get('origin')||'';return allowedOrigins.has(origin)?origin:''}
const corsHeaders=(origin:string)=>({'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'})
const supabaseUrl=Deno.env.get('SUPABASE_URL')||''
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''
const geminiKey=()=>clean(Deno.env.get('GEMINI_API_KEY'),300)
const openRouterKey=()=>clean(Deno.env.get('OPENROUTER_API_KEY')||Deno.env.get('UGO_OPENROUTER_API_KEY'),300)
const geminiModel=()=>clean(Deno.env.get('GEMINI_MODEL')||'gemini-3.5-flash-lite',120)
const liveModel=()=>clean(Deno.env.get('GEMINI_LIVE_VOICE_MODEL')||Deno.env.get('GEMINI_LIVE_MODEL')||'gemini-3.8-live',120).replace(/^models\//,'')
const openRouterModel=()=>clean(Deno.env.get('UGO_OPENROUTER_MODEL')||'openrouter/free',160)

function sanitize(value:unknown,max=6000){
 return clean(value,max)
  .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi,'Bearer [REDACTED]')
  .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,'[REDACTED_JWT]')
  .replace(/\b(?:sk|sb_secret|service_role|ghp|github_pat|AIza)[-_A-Za-z0-9]{12,}\b/g,'[REDACTED_SECRET]')
}

async function authorize(req:Request,role:string){
 const header=req.headers.get('authorization')||'',token=header.startsWith('Bearer ')?header.slice(7).trim():''
 if(!token)throw Object.assign(new Error('Autenticación requerida.'),{status:401,code:'AUTH_REQUIRED'})
 if(!supabaseUrl||!serviceKey)throw Object.assign(new Error('Backend Supabase TEST no configurado.'),{status:503,code:'AUTH_BACKEND_UNAVAILABLE'})
 const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
 const{data,error}=await admin.auth.getUser(token)
 if(error||!data.user)throw Object.assign(new Error('Sesión inválida o vencida.'),{status:401,code:'INVALID_SESSION'})
 const{data:profile,error:profileError}=await admin.from('usuarios').select('tipo,activo').eq('id',data.user.id).maybeSingle()
 if(profileError||!profile?.activo)throw Object.assign(new Error('Acceso no autorizado.'),{status:403,code:'PROFILE_DENIED'})
 const profileRole=clean(profile.tipo,40).toLowerCase(),requested=clean(role||'client',20).toLowerCase()
 const allowed=requested==='superadmin'?profileRole==='superadmin':requested==='admin'?['admin','superadmin'].includes(profileRole):requested==='provider'?profileRole==='proveedor':requested==='client'?profileRole==='cliente':false
 if(!allowed)throw Object.assign(new Error('El rol de la sesión no coincide con esta aplicación.'),{status:403,code:'ROLE_MISMATCH'})
 return{user:data.user,profileRole,requestedRole:requested}
}

async function createLiveToken(){
 const key=geminiKey()
 if(!key)throw Object.assign(new Error('GEMINI_API_KEY no configurada.'),{status:503,code:'GEMINI_NOT_CONFIGURED'})
 const now=Date.now(),expireTime=new Date(now+8*60*1000).toISOString(),newSessionExpireTime=new Date(now+45*1000).toISOString()
 const response=await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({uses:1,expireTime,newSessionExpireTime,liveConnectConstraints:{model:`models/${liveModel()}`,config:{responseModalities:['AUDIO']}}}),signal:AbortSignal.timeout(8000)})
 const payload=await response.json().catch(()=>({})) as JsonRecord
 if(!response.ok)throw Object.assign(new Error(clean(rec(payload.error).message)||'Gemini Live no pudo emitir token temporal.'),{status:response.status||502,code:`GEMINI_LIVE_TOKEN_${response.status}`})
 const token=clean(payload.name,500)
 if(!token)throw Object.assign(new Error('Gemini Live devolvió un token vacío.'),{status:502,code:'GEMINI_LIVE_TOKEN_EMPTY'})
 return{token,model:liveModel(),expires_at:expireTime}
}

function systemFor(role:string,context:string){
 const common=['Sos Hugo, asistente operativo de UGO.','Respondé breve, natural y en español rioplatense o portugués de Brasil según la persona.','No inventes servicios, usuarios, pagos, ubicaciones, disponibilidad ni acciones.','No reveles secretos, tokens ni credenciales.']
 if(role==='client')return[...common,'Ayudá al cliente a resolver y contratar servicios. Si falta un dato, hacé una sola pregunta concreta.','No afirmes que un pedido fue creado si el contexto no lo confirma.',context?`CONTEXTO CLIENTE REAL: ${context}`:'Sin contexto cliente adicional.'].join('\n')
 if(role==='provider')return[...common,'Sos el copiloto operativo del proveedor. Entendé referencias de contexto como ese pedido, el anterior, ahora, después, cuál conviene o qué hago y conectalas con la conversación reciente.','Usá el contexto real para explicar trabajo activo, oportunidades, distancia, valor, agenda, ganancias, efectivo, deuda UGO y la pantalla actual. Compará opciones cuando existan datos suficientes y explicá el criterio sin inventar datos.','Si el proveedor pregunta qué hacer, indicá el próximo paso permitido por el estado actual. Si falta un dato imprescindible, hacé una sola pregunta concreta.','No repitas el contexto como una lista salvo que te lo pidan. Hablá como un asistente natural, breve y útil.','Para una acción real, emití provider_action únicamente cuando el proveedor la pidió de forma explícita y no ambigua. Nunca inventes un service_id: usá solamente IDs presentes en el contexto.','Respondé SOLO JSON válido: {"reply":"respuesta breve","provider_action":null}. provider_action puede ser {"type":"navigate","target":"home|demand|opportunities|agenda|earnings|profile|history|dispute|active-job"}, {"type":"set_online"}, {"type":"set_offline"}, {"type":"accept_job","service_id":"..."}, {"type":"reject_job","service_id":"..."} o {"type":"update_service_status","service_id":"...","status":"en_camino|llegado|en_progreso|esperando_aprobacion"}.','Nunca afirmes que una acción se ejecutó: tu reply debe describir la intención o el próximo paso. La app confirmará el efecto real.',context?`CONTEXTO PROVEEDOR REAL Y ACTUAL: ${context}`:'Sin contexto proveedor adicional.'].join('\n')
 return[...common,role==='superadmin'?'Sos Hugo Super Admin.':'Sos Hugo Admin.','Explicá únicamente información presente en el contexto. Para acciones de interfaz podés proponer sólo navegar, abrir servicio, refrescar o filtrar mapa.','Respondé SOLO JSON válido: {"reply":"respuesta breve","ui_action":null}. Si corresponde una acción de interfaz, ui_action puede ser {"type":"navigate","target":"..."}, {"type":"open_service","service_id":"..."}, {"type":"refresh"} o {"type":"map_filter","status":"todos|online|offline|inactivo","category":null,"zone":null,"place":null,"radius_m":null,"show_providers":true,"show_clients":false}.',context?`CONTEXTO OPERATIVO REAL: ${context}`:'Sin contexto operativo adicional.'].join('\n')
}

async function callGemini(message:string,history:unknown[],system:string,jsonMode:boolean){
 const key=geminiKey();if(!key)throw Object.assign(new Error('GEMINI_API_KEY no configurada.'),{status:503,code:'GEMINI_NOT_CONFIGURED'})
 const contents=[...history.slice(-8).map(item=>{const m=rec(item);return{role:m.role==='assistant'?'model':'user',parts:[{text:sanitize(m.content,1200)}]}}),{role:'user',parts:[{text:sanitize(message,1800)}]}]
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel())}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({system_instruction:{parts:[{text:system}]},contents,generationConfig:{temperature:.15,maxOutputTokens:900,...(jsonMode?{responseMimeType:'application/json'}:{})}}),signal:AbortSignal.timeout(12000)})
 const payload=await response.json().catch(()=>({})) as JsonRecord
 if(!response.ok)throw Object.assign(new Error(clean(rec(payload.error).message)||`Gemini ${response.status}`),{status:response.status,code:`GEMINI_HTTP_${response.status}`})
 const candidates=Array.isArray(payload.candidates)?payload.candidates:[],parts=Array.isArray(rec(rec(candidates[0]).content).parts)?rec(rec(candidates[0]).content).parts as unknown[]:[]
 const text=clean(parts.map(p=>clean(rec(p).text,5000)).join(''),5000)
 if(!text)throw Object.assign(new Error('Gemini no devolvió contenido.'),{status:502,code:'GEMINI_EMPTY'})
 return{text,model:geminiModel(),provider:'gemini',fallback_used:false}
}

async function callOpenRouter(message:string,history:unknown[],system:string,jsonMode:boolean){
 const key=openRouterKey();if(!key)throw Object.assign(new Error('OpenRouter fallback no configurado.'),{status:503,code:'OPENROUTER_NOT_CONFIGURED'})
 const messages=[{role:'system',content:system},...history.slice(-8).map(item=>{const m=rec(item);return{role:m.role==='assistant'?'assistant':'user',content:sanitize(m.content,1200)}}),{role:'user',content:sanitize(message,1800)}]
 const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','HTTP-Referer':'https://sebastisnzoth.github.io/ugo-admin-panel/','X-Title':'UGO Hugo'},body:JSON.stringify({model:openRouterModel(),messages,temperature:.15,max_tokens:900,...(jsonMode?{response_format:{type:'json_object'}}:{})}),signal:AbortSignal.timeout(8000)})
 const payload=await response.json().catch(()=>({})) as JsonRecord
 if(!response.ok)throw Object.assign(new Error(clean(rec(payload.error).message)||`OpenRouter ${response.status}`),{status:response.status,code:`OPENROUTER_HTTP_${response.status}`})
 const choices=Array.isArray(payload.choices)?payload.choices:[],text=clean(rec(rec(choices[0]).message).content,5000)
 if(!text)throw Object.assign(new Error('OpenRouter no devolvió contenido.'),{status:502,code:'OPENROUTER_EMPTY'})
 return{text,model:clean(payload.model,160)||openRouterModel(),provider:'openrouter',fallback_used:true}
}

async function askModel(message:string,history:unknown[],system:string,jsonMode:boolean){
 try{return await callGemini(message,history,system,jsonMode)}
 catch(error){console.warn('Hugo Gemini fallback',{message:error instanceof Error?error.message:String(error)});return await callOpenRouter(message,history,system,jsonMode)}
}

function parseJson(text:string){try{return JSON.parse(text)}catch{}const a=text.indexOf('{'),b=text.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(text.slice(a,b+1))}catch{}}return null}
const navTargets=new Set(['home','operations:overview','operations:map','operations:services','operations:alerts','operations:disputes','operations:scout','operations:history','operations:messages','people:users','people:verification','people:documents','people:kyc','people:import','finance:pix','finance:vault','finance:tariffs','settings:categories','settings:analytics','settings:notifications','settings:reports','settings:system','superadmin'])
const providerNavTargets=new Set(['home','demand','opportunities','agenda','earnings','profile','history','dispute','active-job'])
function safeProviderAction(v:unknown){const x=rec(v),type=clean(x.type,40);if(type==='navigate'){const target=clean(x.target,40);return providerNavTargets.has(target)?{type,target}:null}if(type==='set_online'||type==='set_offline')return{type};if(type==='accept_job'||type==='reject_job'){const serviceId=clean(x.service_id,80);return/^[0-9a-f-]{36}$/i.test(serviceId)?{type,service_id:serviceId}:null}if(type==='update_service_status'){const serviceId=clean(x.service_id,80),status=clean(x.status,40);return/^[0-9a-f-]{36}$/i.test(serviceId)&&['en_camino','llegado','en_progreso','esperando_aprobacion'].includes(status)?{type,service_id:serviceId,status}:null}return null}
function safeAction(v:unknown,role:string){const x=rec(v),type=clean(x.type,30);if(type==='refresh')return{type:'refresh'};if(type==='navigate'){const target=clean(x.target,80);if(!navTargets.has(target)||target==='superadmin'&&role!=='superadmin')return null;return{type,target}};if(type==='open_service'){const serviceId=clean(x.service_id,80);if(!/^[0-9a-f-]{36}$/i.test(serviceId))return null;return{type,service_id:serviceId}};if(type==='map_filter')return{type,status:['todos','online','offline','inactivo'].includes(String(x.status))?String(x.status):'todos',category:clean(x.category,80)||null,zone:clean(x.zone,120)||null,place:clean(x.place,160)||null,radius_m:Number.isFinite(Number(x.radius_m))?Math.max(0,Math.min(50000,Number(x.radius_m))):null,show_providers:typeof x.show_providers==='boolean'?x.show_providers:true,show_clients:typeof x.show_clients==='boolean'?x.show_clients:false};return null}

Deno.serve(async(req:Request)=>{
 const origin=corsOrigin(req)
 if(req.method==='OPTIONS')return origin?new Response('ok',{headers:corsHeaders(origin)}):new Response('Forbidden',{status:403})
 if(req.method!=='POST')return json({error:'Método no permitido.'},405,origin)
 if((req.headers.get('origin')||'')&&!origin)return json({error:'Origen no autorizado.'},403,'')
 try{
  const body=rec(await req.json().catch(()=>({}))),role=clean(body.role||'client',20).toLowerCase()
  const auth=await authorize(req,role)
  if(body.voice_live_token===true||body.action==='live-token')return json(await createLiveToken(),200,origin)
  const message=clean(body.message,1800)
  if(!message)return json({hugo_mensaje:'Mensaje requerido.'},400,origin)
  const context=sanitize(body.context,60000),history=Array.isArray(body.history)?body.history:[],adminMode=role==='admin'||role==='superadmin',providerMode=role==='provider',structuredMode=adminMode||providerMode,system=systemFor(role,context)
  const result=await askModel(message,history,system,structuredMode),parsed=structuredMode?parseJson(result.text):null,reply=structuredMode?clean(rec(parsed).reply,1800):result.text,uiAction=adminMode?safeAction(rec(parsed).ui_action,role):null,providerAction=providerMode?safeProviderAction(rec(parsed).provider_action):null
  return json({hugo_mensaje:reply||'Decime qué necesitás.',ui_action:uiAction,provider_action:providerAction,accion:null,model:result.model,model_provider:result.provider,fallback_used:result.fallback_used,authority:{role:auth.requestedRole,profile_role:auth.profileRole,decision:'ALLOW'}},200,origin)
 }catch(error){
  const e=error as Error&{status?:number;code?:string},status=Number(e.status)||502
  console.error('Hugo Edge failed',{status,code:e.code||'',message:e.message})
  return json({error:e.message||'Hugo no pudo responder ahora.',error_code:e.code||undefined,hugo_mensaje:e.message||'Hugo no pudo responder ahora.'},status>=400&&status<600?status:502,origin)
 }
})
