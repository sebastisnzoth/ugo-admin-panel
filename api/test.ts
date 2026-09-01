import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://trfsjuseqjxlhrxuvdsm.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_bbCcM7ElzH-iGAQw8Qefzg_ZmO0sKH8'
const GEMINI_MODELS = Array.from(new Set([
  process.env.GEMINI_MODEL,
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
].filter(Boolean) as string[]))

function bearer(req: any) { const raw=String(req.headers?.authorization||''); return raw.startsWith('Bearer ')?raw.slice(7).trim():'' }
function extractJson(text:string){const cleaned=String(text||'').replace(/```json/gi,'').replace(/```/g,'').trim();try{return JSON.parse(cleaned)}catch{}const start=cleaned.indexOf('{'),end=cleaned.lastIndexOf('}');if(start>=0&&end>start){try{return JSON.parse(cleaned.slice(start,end+1))}catch{}}return null}

async function callGemini(geminiKey:string,body:any){let lastStatus=0,lastError='Gemini no respondió';for(const model of GEMINI_MODELS){const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':geminiKey},body:JSON.stringify(body)});const payload:any=await response.json().catch(()=>({}));if(response.ok)return{response,payload,model};lastStatus=response.status;lastError=payload?.error?.message||`Gemini respondió ${response.status}`;const retryable=response.status===404||response.status===429||response.status===503||/high demand|overloaded|temporar|no longer available|not found|new users/i.test(lastError);console.warn('Hugo Gemini fallback',{model,status:response.status,retryable,message:lastError});if(!retryable)break}throw Object.assign(new Error(lastError),{status:lastStatus||502})}
async function geminiHealth(res:any){const geminiKey=process.env.GEMINI_API_KEY?.trim();if(!geminiKey)return res.status(503).json({ok:false,keyConfigured:false,error:'GEMINI_API_KEY missing'});try{const{response,payload,model}=await callGemini(geminiKey,{contents:[{role:'user',parts:[{text:'Respondé únicamente OK.'}]}],generationConfig:{maxOutputTokens:40,temperature:0}});const text=payload?.candidates?.[0]?.content?.parts?.map((p:any)=>p?.text||'').join('').trim()||'';return res.status(response.ok&&text?200:502).json({ok:Boolean(response.ok&&text),keyConfigured:true,model,googleStatus:response.status,response:text||null})}catch(error){return res.status(502).json({ok:false,keyConfigured:true,error:error instanceof Error?error.message:'network error'})}}

export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');if(req.method==='OPTIONS')return res.status(200).end();if(req.method==='GET'&&String(req.query?.health||'')==='1')return geminiHealth(res);if(req.method!=='POST')return res.status(405).json({error:'Método no permitido'})
 try{
  const token=bearer(req);if(!token)return res.status(401).json({error:'Sesión requerida'});const geminiKey=process.env.GEMINI_API_KEY?.trim();if(!geminiKey)return res.status(503).json({error:'GEMINI_API_KEY no está configurada en Vercel'})
  const authClient=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});const{data:authData,error:authError}=await authClient.auth.getUser(token);if(authError||!authData.user)return res.status(401).json({error:'Sesión inválida'})
  const requestedRole=req.body?.role==='provider'?'provider':'client',expectedRole=requestedRole==='provider'?'proveedor':'cliente';const userClient=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});const{data:profile}=await userClient.from('usuarios').select('tipo').eq('id',authData.user.id).maybeSingle();if(!profile||profile.tipo!==expectedRole)return res.status(403).json({error:'El rol de la sesión no coincide con esta aplicación'})
  const message=String(req.body?.message||'').trim().slice(0,1200);if(!message)return res.status(400).json({error:'Mensaje requerido'});const context=String(req.body?.context||'').slice(0,2400);const history=Array.isArray(req.body?.history)?req.body.history.slice(-10):[];const roleText=requestedRole==='client'?'Cliente que busca contratar un servicio.':'Proveedor que recibe y ejecuta servicios.'
  const system=[
   'Sos Hugo, asistente operativo de U.G.O.',
   'Respondé en español rioplatense, breve y directo.',
   roleText,
   'MEMORIA: tratá el Contexto y la MEMORIA DEL PEDIDO como hechos ya confirmados por el usuario.',
   'NUNCA vuelvas a preguntar un dato que ya figure en la memoria del pedido o en el historial.',
   'Si el usuario corrige un dato, reemplazá el dato anterior por el nuevo.',
   'Preguntá únicamente el próximo dato realmente faltante para poder preparar el pedido.',
   'Si categoría, descripción, dirección y presupuesto ya están informados, no hagas más preguntas de relevamiento: confirmá o prepará la búsqueda.',
   'No inventes profesionales, precios, pagos ni estados.',
   'Detectá categoría y urgencia cuando corresponda.',
   'Devolvé SOLO JSON válido:',
   '{"reply":"máximo 22 palabras","action":"none|search_provider|prepare_request","category_hint":null,"urgent":false,"description":null}',
   `Contexto: ${context||'Sin servicio activo.'}`,
  ].join('\n')
  const contents=[...history.map((turn:any)=>({role:turn?.role==='assistant'?'model':'user',parts:[{text:String(turn?.content||'').slice(0,700)}]})),{role:'user',parts:[{text:message}]}]
  const{payload,model}=await callGemini(geminiKey,{system_instruction:{parts:[{text:system}]},contents,generationConfig:{responseMimeType:'application/json',maxOutputTokens:180,temperature:0.1}});const raw=payload?.candidates?.[0]?.content?.parts?.map((p:any)=>p?.text||'').join('')||'';const parsed=extractJson(raw);if(!parsed?.reply)return res.status(502).json({error:'Gemini no devolvió una respuesta válida'})
  return res.status(200).json({reply:String(parsed.reply).slice(0,300),action:['none','search_provider','prepare_request'].includes(parsed.action)?parsed.action:'none',category_hint:parsed.category_hint?String(parsed.category_hint).slice(0,80):null,urgent:Boolean(parsed.urgent),description:parsed.description?String(parsed.description).slice(0,500):null,model})
 }catch(error:any){console.error('Hugo Gemini endpoint failed',error);const status=Number(error?.status)||500;return res.status(status>=400&&status<600?status:500).json({error:error instanceof Error?error.message:'Error interno de Hugo'})}
}
