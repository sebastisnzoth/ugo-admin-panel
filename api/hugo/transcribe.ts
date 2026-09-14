const MODEL=process.env.GEMINI_VOICE_MODEL?.trim()||'gemini-3.8-flash'
const MAX_BASE64_CHARS=3_600_000

function sameOrigin(req:any){try{const origin=String(req.headers?.origin||'');if(!origin)return true;return new URL(origin).host===String(req.headers?.host||'')}catch{return false}}
function clean(value:unknown,max=500){return String(value??'').trim().slice(0,max)}
function normalizeMime(value:unknown){const raw=clean(value,100).toLowerCase().split(';')[0].trim();if(raw==='audio/mp4'||raw==='audio/x-m4a')return'audio/m4a';const allowed=new Set(['audio/wav','audio/mp3','audio/aiff','audio/aac','audio/ogg','audio/flac','audio/mpeg','audio/m4a','audio/l16','audio/opus','audio/alaw','audio/mulaw','audio/webm']);return allowed.has(raw)?raw:'audio/webm'}
function validBase64(value:string){return value.length>40&&value.length<=MAX_BASE64_CHARS&&/^[a-z0-9+/=\s]+$/i.test(value)}

async function transcribeWithGemini(audio:string,mimeType:string,locale:string){
 const key=process.env.GEMINI_API_KEY?.trim()
 if(!key)throw Object.assign(new Error('GEMINI_API_KEY no configurada'),{status:503})
 const language=/^pt/i.test(locale)?'portugués de Brasil':/^es/i.test(locale)?'español rioplatense':'el idioma detectado'
 const prompt=`Transcribí exactamente la voz de esta grabación en ${language}. Devolvé solamente lo que dijo la persona, sin comillas, explicaciones, etiquetas ni timestamps. Si no hay habla inteligible, devolvé una cadena vacía. Palabras de contexto posibles: UGO, Hugo, electricista, electricidad, plomero, plomería, limpieza, jardinero, Canasvieiras, Florianópolis.`
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,{
  method:'POST',
  headers:{'Content-Type':'application/json','x-goog-api-key':key},
  body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt},{inlineData:{mimeType,data:audio}}]}],generationConfig:{temperature:0,maxOutputTokens:180}}),
  signal:AbortSignal.timeout(18000),
 })
 const payload:any=await response.json().catch(()=>({}))
 if(!response.ok)throw Object.assign(new Error(payload?.error?.message||`Gemini voice ${response.status}`),{status:502})
 const text=clean(payload?.candidates?.[0]?.content?.parts?.map((part:any)=>part?.text||'').join(' '),1200).replace(/^['"“”]+|['"“”]+$/g,'').trim()
 return text
}

export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store')
 res.setHeader('Access-Control-Allow-Headers','content-type')
 const origin=String(req.headers?.origin||'')
 if(origin&&sameOrigin(req))res.setHeader('Access-Control-Allow-Origin',origin)
 if(req.method==='OPTIONS')return res.status(200).end()
 if(req.method!=='POST')return res.status(405).json({error:'Método no permitido.'})
 if(!sameOrigin(req))return res.status(403).json({error:'Origen no autorizado.'})
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{})
  const audio=clean(body.audio,MAX_BASE64_CHARS+1).replace(/\s+/g,'')
  if(!validBase64(audio))return res.status(400).json({error:'Audio inválido o demasiado grande.'})
  const mimeType=normalizeMime(body.mimeType),locale=clean(body.locale,20)||'es-AR'
  const text=await transcribeWithGemini(audio,mimeType,locale)
  return res.status(200).json({text,model:MODEL})
 }catch(error:any){
  console.error('Hugo voice transcription failed',error)
  const status=Number(error?.status)||502
  return res.status(status>=400&&status<600?status:502).json({error:'No pude transcribir el audio ahora.'})
 }
}
