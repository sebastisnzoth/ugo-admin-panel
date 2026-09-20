import{createClient}from'@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const clean=(value:unknown,max=5000)=>String(value??'').trim().slice(0,max)
const model=()=>process.env.GEMINI_DISPUTE_MODEL||process.env.GEMINI_MODEL||'gemini-3.5-flash-lite'
const adminClient=()=>{const key=clean(process.env.SUPABASE_SERVICE_ROLE_KEY);if(!key)throw Object.assign(new Error('SUPABASE_SERVICE_ROLE_KEY no configurada.'),{status:503});return createClient(clean(process.env.VITE_SUPABASE_URL)||TEST_URL,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function requireAdmin(req:any,admin:any){const token=clean(req.headers?.authorization).replace(/^Bearer\s+/i,'');if(!token)throw Object.assign(new Error('Autenticación requerida.'),{status:401});const{data,error}=await admin.auth.getUser(token);if(error||!data.user)throw Object.assign(new Error('Sesión inválida.'),{status:401});const{data:row}=await admin.from('usuarios').select('tipo').eq('id',data.user.id).maybeSingle();if(!['admin','superadmin'].includes(String(row?.tipo||'')))throw Object.assign(new Error('Solo Admin puede analizar disputas.'),{status:403});return data.user.id}
const attachmentPaths=(value:unknown)=>Array.isArray(value)?value.map(item=>item&&typeof item==='object'?String((item as Record<string,unknown>).path||''):'').filter(Boolean):[]
const mimeFrom=(path:string)=>/\.png$/i.test(path)?'image/png':/\.webp$/i.test(path)?'image/webp':/\.(jpe?g)$/i.test(path)?'image/jpeg':null
async function inlineImage(admin:any,bucket:string,path:string){const mime=mimeFrom(path);if(!mime)return null;const{data,error}=await admin.storage.from(bucket).createSignedUrl(path,180);if(error||!data?.signedUrl)return null;const response=await fetch(data.signedUrl,{signal:AbortSignal.timeout(7000)});if(!response.ok)return null;const bytes=await response.arrayBuffer();if(bytes.byteLength>4*1024*1024)return null;return{inlineData:{mimeType:mime,data:Buffer.from(bytes).toString('base64')}}}
function parseResult(text:string,forcedHuman:boolean){let raw:any;try{raw=JSON.parse(text.replace(/^\s*\x60\x60\x60(?:json)?/i,'').replace(/\x60\x60\x60\s*$/,'').trim())}catch{raw={summary:text,rationale:'La respuesta del modelo no llegó como JSON estructurado.',requires_human:true,recommendation:'evidencia_insuficiente'}}
 const list=(v:unknown)=>Array.isArray(v)?v.slice(0,12).map(x=>clean(x,500)).filter(Boolean):[]
 const allowed=new Set(['favor_cliente','favor_proveedor','acuerdo','evidencia_insuficiente','retrabajo'])
 const recommendation=allowed.has(String(raw.recommendation||''))?String(raw.recommendation):'evidencia_insuficiente'
 const confidence=Math.max(0,Math.min(1,Number(raw.confidence)||0))
 return{summary:clean(raw.summary,1800),observedFacts:list(raw.observed_facts),imageObservations:list(raw.image_observations),inconsistencies:list(raw.inconsistencies),missingEvidence:list(raw.missing_evidence),riskLevel:['bajo','medio','alto'].includes(String(raw.risk_level))?String(raw.risk_level):'medio',requiresHuman:forcedHuman||Boolean(raw.requires_human),recommendation,confidence,rationale:clean(raw.rationale,1800)}
}

export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='POST')return res.status(405).json({error:'Método no permitido.'})
 try{
  const key=clean(process.env.GEMINI_API_KEY);if(!key)throw Object.assign(new Error('GEMINI_API_KEY no configurada para análisis de disputas.'),{status:503})
  const admin=adminClient();await requireAdmin(req,admin);const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{}),disputeId=clean(body.disputeId,80);if(!disputeId)throw Object.assign(new Error('disputeId requerido.'),{status:400})
  const{data:dispute,error:de}=await admin.from('disputas').select('id,servicio_id,motivo,motivo_codigo,evidencias,snapshot,nivel_revision,requiere_humano,monto_disputado,created_at').eq('id',disputeId).maybeSingle();if(de||!dispute)throw Object.assign(new Error(de?.message||'Disputa no encontrada.'),{status:404})
  const[{data:messages},{data:serviceEvidence},{data:rule}]=await Promise.all([
   admin.from('disputa_mensajes').select('autor_rol,mensaje,evidencias,created_at').eq('disputa_id',disputeId).order('created_at'),
   admin.from('evidencias_servicio').select('tipo,storage_path,descripcion,created_at').eq('servicio_id',dispute.servicio_id).order('created_at'),
   admin.from('reglas_motivos_disputa').select('codigo,etiqueta,severidad,requiere_humano,ventana_horas,evidencia_sugerida').eq('codigo',dispute.motivo_codigo||'otro').maybeSingle()
  ])
  const parts:any[]=[{text:[
   'Analizá esta disputa UGO como asistente de evidencia para un administrador.',
   'No tomes la decisión final ni ordenes un pago. No uses reputación o estrellas como prueba.',
   'Separá hechos observables de alegaciones. En imágenes describí únicamente lo visible: nunca atribuyas quién causó un daño si no está demostrado.',
   'Si falta evidencia, indicarlo. Casos de daño, fraude, seguridad/conducta o incertidumbre material requieren humano.',
   'Devolvé SOLO JSON con: summary, observed_facts[], image_observations[], inconsistencies[], missing_evidence[], risk_level(bajo|medio|alto), requires_human(boolean), recommendation(favor_cliente|favor_proveedor|acuerdo|evidencia_insuficiente|retrabajo), confidence(0..1), rationale.',
   'REGLA: '+JSON.stringify(rule||{}),
   'DISPUTA: '+JSON.stringify({motivo:dispute.motivo,motivo_codigo:dispute.motivo_codigo,monto:dispute.monto_disputado,created_at:dispute.created_at,nivel_revision:dispute.nivel_revision}),
   'SNAPSHOT CONGELADO: '+JSON.stringify(dispute.snapshot||{}),
   'MENSAJES DEL CASO: '+JSON.stringify((messages||[]).map((m:any)=>({rol:m.autor_rol,mensaje:m.mensaje,at:m.created_at})))
  ].join('\n')}]
  const paths:{bucket:string;path:string}[]=[];(serviceEvidence||[]).forEach((e:any)=>paths.push({bucket:'service-evidence',path:String(e.storage_path||'')}));attachmentPaths(dispute.evidencias).forEach(path=>paths.push({bucket:'dispute-evidence',path}));(messages||[]).forEach((m:any)=>attachmentPaths(m.evidencias).forEach(path=>paths.push({bucket:'dispute-evidence',path})))
  for(const item of paths.filter(x=>x.path).slice(0,6)){const image=await inlineImage(admin,item.bucket,item.path);if(image)parts.push(image)}
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model())+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{role:'user',parts}],generationConfig:{temperature:.1,maxOutputTokens:1600,responseMimeType:'application/json'}}),signal:AbortSignal.timeout(20000)})
  const payload:any=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error(payload?.error?.message||'Gemini no pudo analizar la disputa.'),{status:response.status>=400&&response.status<600?response.status:502})
  const output=clean(payload?.candidates?.[0]?.content?.parts?.map((p:any)=>p?.text||'').join(''),12000);if(!output)throw Object.assign(new Error('Gemini no devolvió análisis.'),{status:502})
  const result=parseResult(output,Boolean(dispute.requiere_humano||rule?.requiere_humano))
  const{error:saveError}=await admin.from('disputa_ai_analisis').upsert({disputa_id:disputeId,modelo:model(),resultado:result,updated_at:new Date().toISOString()},{onConflict:'disputa_id'});if(saveError)throw saveError
  return res.status(200).json({analysis:result,model:model(),imagesAnalyzed:parts.filter(part=>part.inlineData).length})
 }catch(error:any){console.error('UGO dispute analysis failed',error);const status=Number(error?.status)||500;return res.status(status>=400&&status<600?status:500).json({error:error instanceof Error?error.message:'No se pudo analizar la disputa.'})}
}
