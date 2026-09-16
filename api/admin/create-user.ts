import type { VercelRequest,VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL=process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY=process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY
const VALID_ROLES=new Set(['cliente','proveedor','admin','superadmin','arbitro'])
const PRIVILEGED_ROLES=new Set(['admin','superadmin','arbitro'])

function bearer(req:VercelRequest){const raw=String(req.headers.authorization||'');return raw.startsWith('Bearer ')?raw.slice(7).trim():''}
function clean(value:unknown,max=160){return String(value??'').trim().slice(0,max)}
function validEmail(email:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}

export default async function handler(req:VercelRequest,res:VercelResponse){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
 if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY)return res.status(503).json({error:'Backend Supabase no configurado.'})
 const token=bearer(req);if(!token)return res.status(401).json({error:'Sesión Admin requerida.'})
 const sb=createClient(SUPABASE_URL,SUPABASE_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
 const{data:authData,error:authError}=await sb.auth.getUser(token);const actor=authData.user
 if(authError||!actor)return res.status(401).json({error:'Sesión inválida o vencida.'})
 const{data:actorProfile,error:actorError}=await sb.from('usuarios').select('tipo,activo').eq('id',actor.id).maybeSingle()
 if(actorError||!actorProfile?.activo||!['admin','superadmin'].includes(String(actorProfile.tipo)))return res.status(403).json({error:'Acceso Admin requerido.'})

 const body=req.body&&typeof req.body==='object'?req.body:{}
 const nombre=clean(body.nombre,80),apellido=clean(body.apellido,80),email=clean(body.email,254).toLowerCase(),password=String(body.password??''),role=clean(body.role,30),demo=Boolean(body.demo),providerVerified=Boolean(body.providerVerified)
 if(!nombre)return res.status(400).json({error:'Nombre requerido.'})
 if(!validEmail(email))return res.status(400).json({error:'Email inválido.'})
 if(password.length<8||password.length>128)return res.status(400).json({error:'La contraseña debe tener entre 8 y 128 caracteres.'})
 if(!VALID_ROLES.has(role))return res.status(400).json({error:'Rol inválido.'})
 const actorRole=String(actorProfile.tipo)
 if(PRIVILEGED_ROLES.has(role)&&actorRole!=='superadmin')return res.status(403).json({error:'Solo Super Admin puede crear cuentas administrativas.'})

 let createdId:string|null=null
 try{
  const{data:created,error:createError}=await sb.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nombre,apellido:apellido||null,tipo:role,es_demo:demo}})
  if(createError||!created.user)throw createError||new Error('Auth no devolvió el usuario creado.')
  createdId=created.user.id
  const{error:userError}=await sb.from('usuarios').upsert({id:createdId,nombre,apellido:apellido||null,email,tipo:role,activo:true,es_demo:demo,updated_at:new Date().toISOString()},{onConflict:'id'})
  if(userError)throw userError
  if(role==='cliente'){
   const{error:clientError}=await sb.from('perfiles_cliente').upsert({usuario_id:createdId},{onConflict:'usuario_id'})
   if(clientError)throw clientError
  }
  if(role==='proveedor'){
   const verified=demo&&providerVerified
   const{error:providerError}=await sb.from('perfiles_proveedor').upsert({usuario_id:createdId,estado_verificacion:verified?'verificado':'registrado',online:verified,disponible:verified},{onConflict:'usuario_id'})
   if(providerError)throw providerError
  }
  const{error:auditError}=await sb.from('audit_log').insert({evento:'admin_usuario_creado',actor_id:actor.id,entidad_tipo:'usuario',entidad_id:createdId,detalles:{email,role,demo,providerVerified:role==='proveedor'?providerVerified:false}})
  if(auditError)throw auditError
  return res.status(201).json({id:createdId,email,role})
 }catch(error){
  if(createdId){try{await sb.auth.admin.deleteUser(createdId)}catch{/* best effort rollback */}}
  const message=error instanceof Error?error.message:'No se pudo crear el usuario.'
  const duplicate=/already|registered|duplicate/i.test(message)
  return res.status(duplicate?409:500).json({error:duplicate?'El email ya está registrado.':'No se pudo crear el usuario.'})
 }
}
