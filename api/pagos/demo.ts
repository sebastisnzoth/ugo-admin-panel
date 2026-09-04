import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL=process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY=process.env.SUPABASE_SERVICE_KEY
const DEMO_CLIENTS=new Set(['demo.cliente@ugo.test','cliente.demo@ugo.app'])
const DEMO_PROVIDERS=new Set(['demo.proveedor@ugo.test','proveedor.demo@ugo.app'])

export default async function handler(req:VercelRequest,res:VercelResponse){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
 if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY)return res.status(503).json({error:'Backend demo no configurado.'})
 const raw=String(req.headers.authorization||''),token=raw.startsWith('Bearer ')?raw.slice(7):''
 if(!token)return res.status(401).json({error:'Sesión requerida.'})
 const sb=createClient(SUPABASE_URL,SUPABASE_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
 try{
  const{data:authData,error:authError}=await sb.auth.getUser(token),user=authData.user
  if(authError||!user)return res.status(401).json({error:'Sesión inválida o vencida.'})
  if(!DEMO_CLIENTS.has(String(user.email||'').toLowerCase()))return res.status(403).json({error:'Pago demo disponible sólo para Cliente Demo.'})
  const servicioId=typeof req.body?.servicioId==='string'?req.body.servicioId:''
  if(!servicioId)return res.status(400).json({error:'Falta servicioId.'})
  const{data:s,error:se}=await sb.from('servicios').select('id,cliente_id,proveedor_id,tarifa,comision_ugo,ganancia_proveedor,moneda,estado,metadata').eq('id',servicioId).maybeSingle()
  if(se)throw se
  if(!s)return res.status(404).json({error:'Servicio no encontrado.'})
  if(s.cliente_id!==user.id)return res.status(403).json({error:'Servicio no autorizado.'})
  if(!Boolean(s.metadata?.demo))return res.status(409).json({error:'Este servicio no está marcado como demo.'})
  if(!s.proveedor_id)return res.status(409).json({error:'El proveedor demo todavía no aceptó.'})
  if(!['asignado','en_camino','llegado','en_progreso','esperando_aprobacion'].includes(String(s.estado)))return res.status(409).json({error:`Estado ${s.estado} no admite pago demo.`})
  const{data:providerAuth}=await sb.auth.admin.getUserById(s.proveedor_id)
  if(!DEMO_PROVIDERS.has(String(providerAuth.user?.email||'').toLowerCase()))return res.status(409).json({error:'El servicio no está asignado al Proveedor Demo.'})
  const total=Number(s.tarifa||0)
  if(!Number.isFinite(total)||total<=0)return res.status(409).json({error:'Tarifa demo inválida.'})
  const fee=Number(s.comision_ugo??Math.round(total*.15*100)/100),net=Number(s.ganancia_proveedor??Math.round((total-fee)*100)/100)
  const external=`DEMO-${servicioId}`
  const row={servicio_id:servicioId,cliente_id:user.id,proveedor_id:s.proveedor_id,procesador:'demo',metodo:'demo',modelo_pago:'custodia_ugo',pago_externo_id:external,monto_bruto:total,comision_ugo:fee,ganancia_proveedor:net,moneda:s.moneda||'BRL',estado:'retenido',mp_payment_id:external,mp_status:'approved_demo',autorizado_at:new Date().toISOString(),updated_at:new Date().toISOString()}
  const{data:existing}=await sb.from('pagos').select('id,estado').eq('servicio_id',servicioId).limit(1).maybeSingle()
  if(existing?.estado==='liberado')return res.status(200).json({success:true,demo:true,alreadyPaid:true,estado:'liberado',pagoId:existing.id})
  const q=existing?.id?sb.from('pagos').update(row).eq('id',existing.id):sb.from('pagos').insert(row)
  const{data:pago,error}=await q.select().single()
  if(error)throw error
  return res.status(200).json({success:true,demo:true,pagoId:pago.id,estado:pago.estado,montoTotal:total,comisionUgo:fee,gananciaProveedor:net})
 }catch(e){console.error('Demo payment error',e);return res.status(500).json({error:e instanceof Error?e.message:'No se pudo crear el pago demo.'})}
}
