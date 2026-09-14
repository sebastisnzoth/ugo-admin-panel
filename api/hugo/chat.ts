const MODEL=process.env.GEMINI_MODEL||'gemini-3.5-flash-lite'
const TTS_MODEL=process.env.GEMINI_TTS_MODEL||'gemini-3.1-flash-tts-preview'
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
 if(!response.ok)throw Object.assign(new Error(payload?.error?.message||`Gemini ${response.status}`),{status:502})
 const text=clean(payload?.candidates?.[0]?.content?.parts?.map((p:any)=>p?.text||'').join(''),5000)
 if(!text)throw Object.assign(new Error('Gemini no devolvió contenido'),{status:502})
 return{text,model:MODEL}
}

function sampleRateFromMime(mime:string){const match=String(mime||'').match(/rate=(\d+)/i);const value=Number(match?.[1]||24000);return Number.isFinite(value)&&value>0?value:24000}

async function askGeminiTts(text:string,locale:string){
 const key=geminiKey(),languageCode=locale==='pt-BR'?'pt-BR':'es-ES'
 const prompt=locale==='pt-BR'?`Fale de forma natural, próxima e resolutiva. Não acrescente nem retire informação. Diga apenas esta mensagem: ${text}`:`Hablá de forma natural, cercana y resolutiva. No agregues ni quites información. Decí solamente este mensaje: ${text}`
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(TTS_MODEL)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{languageCode,voiceConfig:{prebuiltVoiceConfig:{voiceName:TTS_VOICE}}}}}),signal:AbortSignal.timeout(18000)})
 const payload:any=await response.json().catch(()=>({}))
 if(!response.ok)throw Object.assign(new Error(payload?.error?.message||`Gemini TTS ${response.status}`),{status:502})
 const part=payload?.candidates?.[0]?.content?.parts?.find((item:any)=>item?.inlineData?.data),audioBase64=clean(part?.inlineData?.data,4_500_000),mimeType=clean(part?.inlineData?.mimeType||'audio/L16;codec=pcm;rate=24000',120)
 if(!audioBase64)throw Object.assign(new Error('Gemini TTS no devolvió audio'),{status:502})
 return{audio_base64:audioBase64,mime_type:mimeType,sample_rate:sampleRateFromMime(mimeType),model:TTS_MODEL,voice:TTS_VOICE}
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
   const text=clean(body.text||body.message,430)
   if(!text)return res.status(400).json({error:'Texto requerido para voz.'})
   const audio=await askGeminiTts(text,clean(body.locale,12)||'es-AR')
   return res.status(200).json(audio)
  }
  const message=clean(body.message,1800)
  const context=clean(body.context,5000)
  const history=Array.isArray(body.history)?body.history:[]
  if(!message)return res.status(400).json({hugo_mensaje:'Mensaje requerido.'})
  const clientMode=body.mode==='client_voice'
  const system=clientMode?[
   'Sos Hugo de U.G.O. Cliente.',
   'Respondé en español rioplatense o portugués de Brasil según el usuario, breve, cálido y operativo.',
   'No inventes profesionales, disponibilidad, reputación, precio, dirección, pagos ni estados.',
   'Si el contexto contiene profesionales reales, podés recomendar uno sólo usando esos datos y explicando brevemente el motivo.',
   'Si el contexto contiene un borrador de pedido, respetá todos sus datos ya confirmados.',
   'Nunca afirmes que el pedido fue creado, confirmado o enviado si el contexto no dice que ya ocurrió.',
   context?`CONTEXTO UGO REAL: ${context}`:'Sin contexto UGO adicional.'
  ].join('\n'):[
   'Sos Hugo Super Admin de U.G.O.',
   'Respondé en español rioplatense, breve, claro y ejecutivo.',
   'No inventes usuarios, servicios, pagos, métricas, estados ni acciones.',
   'Usá solamente el contexto operativo entregado por la aplicación.',
   'Si proponés una acción administrativa, no afirmes que fue ejecutada: devolvela al final como [ACCION: descripción].',
   context?`CONTEXTO OPERATIVO: ${context}`:'Sin contexto operativo adicional.'
  ].join('\n')
  const prompt=message==='__INICIO__'?'Saludá brevemente y preguntá qué necesita revisar.':message
  const result=await askGemini(prompt,history,system)
  const accion=clientMode?null:actionFrom(result.text)
  return res.status(200).json({hugo_mensaje:stripAction(result.text)||(clientMode?'Decime qué necesitás.':'Hola, ¿qué querés revisar?'),accion,ui_action:null,datos:null,model:result.model})
 }catch(error:any){
  console.error('Hugo chat failed',error)
  const status=Number(error?.status)||502
  return res.status(status>=400&&status<600?status:502).json({hugo_mensaje:'Hugo no pudo responder ahora. Probá nuevamente en unos segundos.',accion:null,ui_action:null,datos:null})
 }
}
