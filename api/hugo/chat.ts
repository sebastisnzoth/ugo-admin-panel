const MODEL=process.env.GEMINI_MODEL||'gemini-3.5-flash-lite'
const TTS_MODELS=Array.from(new Set([
 process.env.GEMINI_TTS_FAST_MODEL,
 'gemini-2.5-flash-preview-tts',
 process.env.GEMINI_TTS_MODEL,
 'gemini-3.1-flash-tts-preview',
].filter(Boolean)as string[]))
const TTS_VOICE=process.env.GEMINI_TTS_VOICE||'Puck'

function sameOrigin(req:any){try{const origin=String(req.headers?.origin||'');if(!origin)return true;return new URL(origin).host===String(req.headers?.host||'')}catch{return false}}
function clean(v:any,max=4000){return String(v??'').trim().slice(0,max)}
function actionFrom(text:string){return text.match(/\[ACCION:\s*([^\]]+)\]/i)?.[1]?.trim()||null}
function stripAction(text:string){return text.replace(/\[ACCION:[^\]]+\]/gi,'').trim()}
function geminiKey(){const key=process.env.GEMINI_API_KEY?.trim();if(!key)throw Object.assign(new Error('GEMINI_API_KEY no configurada'),{status:503});return key}

async function askGemini(message:string,history:any[],system:string){
 const key=geminiKey()
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({system_instruction:{parts:[{text:system}]},contents:[...history.slice(-8).map((m:any)=>({role:m?.role==='assistant'?'model':'user',parts:[{text:clean(m?.content,1200)}]})),{role:'user',parts:[{text:message}]}],generationConfig:{temperature:.2,maxOutputTokens:700}}),signal:AbortSignal.timeout(12000)})
 const payload:any=await response.json().catch(()=>({}))
 if(!response.ok)throw Object.assign(new Error(payload?.error?.message||`Gemini ${response.status}`),{status:response.status>=400&&response.status<600?response.status:502})
 const text=clean(payload?.candidates?.[0]?.content?.parts?.map((p:any)=>p?.text||'').join(''),5000)
 if(!text)throw Object.assign(new Error('Gemini no devolvió contenido'),{status:502})
 return{text,model:MODEL}
}

function sampleRateFromMime(mime:string){const match=String(mime||'').match(/rate=(\d+)/i),value=Number(match?.[1]||24000);return Number.isFinite(value)&&value>0?value:24000}

async function askGeminiTts(text:string,locale:string){
 const key=geminiKey(),languageCode=locale==='pt-BR'?'pt-BR':'es-ES',prompt=locale==='pt-BR'?`Fale como Hugo: simpático, próximo, acolhedor e ágil, como um amigo confiável ajudando a resolver algo. Não acrescente nem retire informação. Diga apenas: ${text}`:`Hablá como Hugo: simpático, cercano, cálido y ágil, como un amigo confiable que ayuda a resolver algo. No agregues ni quites información. Decí solamente: ${text}`
 let lastStatus=502,lastError='Gemini TTS no respondió',lastRetryAfter=''
 for(const model of TTS_MODELS){
  const started=Date.now()
  try{
   const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{languageCode,voiceConfig:{prebuiltVoiceConfig:{voiceName:TTS_VOICE}}}}}),signal:AbortSignal.timeout(6500)})
   const payload:any=await response.json().catch(()=>({})),elapsed=Date.now()-started
   console.info('Hugo TTS timing',{model,ms:elapsed,status:response.status})
   if(response.ok){const part=payload?.candidates?.[0]?.content?.parts?.find((item:any)=>item?.inlineData?.data),audioBase64=clean(part?.inlineData?.data,4_500_000),mimeType=clean(part?.inlineData?.mimeType||'audio/L16;codec=pcm;rate=24000',120);if(audioBase64)return{audio_base64:audioBase64,mime_type:mimeType,sample_rate:sampleRateFromMime(mimeType),model,voice:TTS_VOICE};lastError='Gemini TTS no devolvió audio';lastStatus=502;continue}
   lastStatus=response.status;lastError=payload?.error?.message||`Gemini TTS ${response.status}`;lastRetryAfter=String(response.headers.get('retry-after')||'')
   const retryable=[404,429,500,502,503].includes(response.status)||/quota|overloaded|temporar|not found|unavailable/i.test(lastError)
   if(!retryable)break
  }catch(error:any){const elapsed=Date.now()-started;console.warn('Hugo TTS timing',{model,ms:elapsed,status:'transport',message:error instanceof Error?error.message:String(error)});lastError=error instanceof Error?error.message:'Gemini TTS no disponible';lastStatus=504}
 }
 throw Object.assign(new Error(lastError),{status:lastStatus,retryAfter:lastRetryAfter})
}

export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store')
 res.setHeader('Access-Control-Allow-Headers','content-type')
 const origin=String(req.headers?.origin||'')
 if(origin&&sameOrigin(req))res.setHeader('Access-Control-Allow-Origin',origin)
 if(req.method==='OPTIONS')return res.status(200).end()
 if(req.method!=='POST')return res.status(405).json({hugo_mensaje:'Método no permitido.'})
 if(!sameOrigin(req))return res.status(403).json({hugo_mensaje:'Origen no autorizado.'})
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{})
  if(body.tts===true){
   const text=clean(body.text||body.message,360)
   if(!text)return res.status(400).json({error:'Texto requerido para voz.'})
   const started=Date.now(),audio=await askGeminiTts(text,clean(body.locale,12)||'es-AR'),elapsed=Date.now()-started
   res.setHeader('Server-Timing',`gemini-tts;dur=${elapsed}`)
   return res.status(200).json({...audio,timing_ms:elapsed})
  }
  const message=clean(body.message,1800),context=clean(body.context,30000),history=Array.isArray(body.history)?body.history:[]
  if(!message)return res.status(400).json({hugo_mensaje:'Mensaje requerido.'})
  const clientMode=body.mode==='client_voice'
  const requestedRole=clean(body.role,20).toLowerCase()
  const adminRole=requestedRole==='superadmin'?'superadmin':'admin'
  const surface=clean(body.surface,80)||'panel de control'
  const adminSystem=adminRole==='superadmin'?[
   'Sos Hugo Super Admin, el copiloto de gobierno global de U.G.O.',
   'Podés explicar y analizar la información visible del Command Center, métricas globales, servicios, usuarios, proveedores, pagos, retiros, disputas, documentos, auditoría, feature flags e integraciones cuando esos datos estén presentes en el contexto.',
   'Diferenciá siempre datos EN VIVO del contexto de explicaciones generales sobre cómo funciona U.G.O.',
   'No inventes usuarios, servicios, pagos, métricas, estados, permisos, integraciones ni acciones.',
   'No reveles secretos, tokens, credenciales ni valores sensibles de configuración.',
   'Si falta un dato concreto, decilo y sugerí en qué módulo puede verificarse.',
   'Si proponés una acción administrativa, no afirmes que fue ejecutada: devolvela al final como [ACCION: descripción].'
  ]:[
   'Sos Hugo Admin, el copiloto operativo del panel de administración de U.G.O.',
   'Podés explicar y analizar la información visible del panel Admin: operación, servicios, clientes, proveedores, documentos, pagos, retiros, disputas, categorías, tarifas, notificaciones, reportes, Scout y métricas cuando esos datos estén presentes en el contexto.',
   'No asumas permisos de Super Admin ni afirmes acceso a gobierno global, secretos o configuración crítica.',
   'Diferenciá siempre datos EN VIVO del contexto de explicaciones generales sobre cómo funciona U.G.O.',
   'No inventes usuarios, servicios, pagos, métricas, estados ni acciones.',
   'Si falta un dato concreto, decilo y sugerí en qué módulo puede verificarse.',
   'Si proponés una acción administrativa, no afirmes que fue ejecutada: devolvela al final como [ACCION: descripción].'
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
  const prompt=message==='__INICIO__'?(`Saludá como Hugo ${adminRole==='superadmin'?'Super Admin':'Admin'} y preguntá qué necesita revisar.`):message,result=await askGemini(prompt,history,system),accion=clientMode?null:actionFrom(result.text)
  return res.status(200).json({hugo_mensaje:stripAction(result.text)||(clientMode?'Decime qué necesitás.':'Hola, ¿qué querés revisar?'),accion,ui_action:null,datos:null,model:result.model})
 }catch(error:any){
  console.error('Hugo chat failed',error)
  const status=Number(error?.status)||502
  if(error?.retryAfter)res.setHeader('Retry-After',String(error.retryAfter))
  return res.status(status>=400&&status<600?status:502).json({error:error instanceof Error?error.message:'Hugo no pudo responder ahora.',hugo_mensaje:'Hugo no pudo responder ahora. Podés seguir usando el texto.',accion:null,ui_action:null,datos:null})
 }
}
