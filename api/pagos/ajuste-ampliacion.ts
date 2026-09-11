import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL=process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY=process.env.SUPABASE_SERVICE_KEY
const MP_ACCESS_TOKEN=process.env.MERCADO_PAGO_ACCESS_TOKEN

function baseUrl(req:VercelRequest){
 if(process.env.APP_URL)return process.env.APP_URL.replace(/\/$/,'')
 if(process.env.VERCEL_URL)return `https://${process.env.VERCEL_URL}`
 const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0]
 const host=req.headers['x-forwarded-host']||req.headers.host
 return host?`${proto}://${host}`:''
}

export default async function handler(req:VercelRequest,res:VercelResponse){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
 if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY||!MP_ACCESS_TOKEN)return res.status(503).json({error:'Backend de pagos electrónicos no configurado.'})
 const authHeader=req.headers.authorization||''
 const accessToken=authHeader.startsWith('Bearer ')?authHeader.slice(7):''
 if(!accessToken)return res.status(401).json({error:'Sesión requerida.'})
 const expansionId=typeof req.body?.ampliacionId==='string'?req.body.ampliacionId:''
 if(!expansionId)return res.status(400).json({error:'Falta ampliacionId.'})

 const sb=createClient(SUPABASE_URL,SUPABASE_SERVICE_KEY)
 try{
  const{data:authData,error:authError}=await sb.auth.getUser(accessToken)
  const user=authData.user
  if(authError||!user)return res.status(401).json({error:'Sesión inválida o vencida.'})

  const{data:expansion,error:expansionError}=await sb.from('ampliaciones_servicio').select('id,servicio_id,cliente_id,proveedor_id,descripcion,monto_extra,estado,pago_estado,ajuste_estado,ajuste_preference_id,ajuste_init_point,ajuste_monto,ajuste_moneda').eq('id',expansionId).maybeSingle()
  if(expansionError)throw expansionError
  if(!expansion)return res.status(404).json({error:'Ampliación no encontrada.'})
  if(expansion.cliente_id!==user.id)return res.status(403).json({error:'Sólo el cliente del servicio puede financiar esta ampliación.'})
  if(expansion.estado!=='pendiente')return res.status(409).json({error:'La ampliación ya fue resuelta.'})
  const amount=Number(expansion.monto_extra||0)
  if(!Number.isFinite(amount)||amount<=0)return res.status(409).json({error:'La ampliación no tiene un monto adicional válido.'})

  const{data:service,error:serviceError}=await sb.from('servicios').select('id,numero,cliente_id,proveedor_id,moneda,estado').eq('id',expansion.servicio_id).maybeSingle()
  if(serviceError)throw serviceError
  if(!service)return res.status(404).json({error:'Servicio no encontrado.'})
  if(service.cliente_id!==user.id||service.proveedor_id!==expansion.proveedor_id)return res.status(409).json({error:'La ampliación no coincide con el servicio activo.'})
  if(!['asignado','en_camino','llegado','en_progreso'].includes(service.estado))return res.status(409).json({error:`El servicio no admite ampliaciones en estado ${service.estado}.`})

  const{data:basePayment,error:paymentError}=await sb.from('pagos').select('metodo,procesador,modelo_pago,estado').eq('servicio_id',service.id).maybeSingle()
  if(paymentError)throw paymentError
  if(!basePayment)return res.status(409).json({error:'El servicio todavía no tiene una forma de pago base.'})
  const cash=basePayment.metodo==='efectivo'&&basePayment.procesador==='efectivo'&&basePayment.modelo_pago==='presencial'
  if(cash)return res.status(409).json({error:'El efectivo se ajusta dentro del cobro presencial y no necesita checkout separado.'})
  if(['fallido','reembolsado'].includes(basePayment.estado))return res.status(409).json({error:'El pago base no está activo. Primero debe recuperarse el pago del servicio.'})

  if(expansion.ajuste_estado==='pendiente'&&expansion.ajuste_preference_id&&expansion.ajuste_init_point){
   return res.status(200).json({success:true,reused:true,ampliacionId:expansion.id,preferenceId:expansion.ajuste_preference_id,initPoint:expansion.ajuste_init_point,monto:amount,moneda:expansion.ajuste_moneda||service.moneda||'BRL'})
  }

  const moneda=service.moneda||'BRL'
  const origin=baseUrl(req)
  const preference={
   items:[{id:expansion.id,title:`U.G.O. · Ampliación servicio #${service.numero||service.id.slice(0,8)}`,description:expansion.descripcion||'Trabajo adicional U.G.O.',quantity:1,currency_id:moneda,unit_price:amount}],
   payer:user.email?{email:user.email}:undefined,
   payment_methods:{excluded_payment_types:[{id:'atm'}]},
   back_urls:origin?{success:`${origin}/?app=client&ajuste=confirmado&svc=${service.id}`,failure:`${origin}/?app=client&ajuste=fallido&svc=${service.id}`,pending:`${origin}/?app=client&ajuste=pendiente&svc=${service.id}`}:undefined,
   notification_url:origin?`${origin}/api/pagos/webhook?svc=${service.id}&exp=${expansion.id}`:undefined,
   auto_return:origin?'approved':undefined,
   external_reference:`exp:${expansion.id}`,
   metadata:{servicio_id:service.id,ampliacion_id:expansion.id,cliente_id:user.id,proveedor_id:service.proveedor_id,tipo:'ampliacion'}
  }
  const mpResponse=await fetch('https://api.mercadopago.com/checkout/preferences',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${MP_ACCESS_TOKEN}`,'X-Idempotency-Key':`ugo-exp-${expansion.id}`},body:JSON.stringify(preference)})
  if(!mpResponse.ok)return res.status(502).json({error:'Mercado Pago rechazó el checkout del trabajo adicional.',details:await mpResponse.json().catch(()=>null)})
  const mpData=await mpResponse.json()
  const{error:updateError}=await sb.from('ampliaciones_servicio').update({pago_estado:'pendiente_ajuste',ajuste_estado:'pendiente',ajuste_procesador:'mercadopago',ajuste_metodo:'mercadopago',ajuste_preference_id:String(mpData.id||''),ajuste_init_point:String(mpData.init_point||''),ajuste_monto:amount,ajuste_moneda:moneda,ajuste_actualizado_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',expansion.id)
  if(updateError)throw updateError
  return res.status(200).json({success:true,ampliacionId:expansion.id,preferenceId:mpData.id,initPoint:mpData.init_point,monto:amount,moneda})
 }catch(error){
  console.error('Error creando ajuste de ampliación:',error)
  return res.status(500).json({error:error instanceof Error?error.message:'No se pudo iniciar el pago adicional.'})
 }
}
