import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL=process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY=process.env.SUPABASE_SERVICE_KEY
const UBER_API_BASE=(process.env.UBER_DIRECT_API_BASE_URL||'https://api.uber.com/v1').replace(/\/$/,'')

type UberAction='test'|'quote'|'create_delivery'|'get_delivery'|'cancel_delivery'|'list_deliveries'
type JsonRecord=Record<string,unknown>

function bearer(req:VercelRequest){
 const raw=String(req.headers.authorization||'')
 return raw.startsWith('Bearer ')?raw.slice(7).trim():''
}

async function requireAdmin(req:VercelRequest){
 if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY)throw Object.assign(new Error('Backend Supabase no configurado.'),{status:503})
 const token=bearer(req)
 if(!token)throw Object.assign(new Error('Sesión Admin requerida.'),{status:401})
 const sb=createClient(SUPABASE_URL,SUPABASE_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
 const{data,error}=await sb.auth.getUser(token)
 if(error||!data.user)throw Object.assign(new Error('Sesión inválida o vencida.'),{status:401})
 const{data:profile,error:profileError}=await sb.from('usuarios').select('tipo,activo').eq('id',data.user.id).maybeSingle()
 if(profileError||!profile?.activo||!['admin','superadmin'].includes(String(profile.tipo)))throw Object.assign(new Error('Acceso Admin requerido.'),{status:403})
 return data.user
}

async function fetchWithTimeout(url:string,init:RequestInit={},timeout=15000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout)
 try{return await fetch(url,{...init,signal:controller.signal})}finally{clearTimeout(timer)}
}

function credentials(){
 const clientId=process.env.UBER_DIRECT_CLIENT_ID
 const clientSecret=process.env.UBER_DIRECT_CLIENT_SECRET
 const customerId=process.env.UBER_DIRECT_CUSTOMER_ID
 if(!clientId||!clientSecret||!customerId){
  const missing=[
   !clientId?'UBER_DIRECT_CLIENT_ID':'',
   !clientSecret?'UBER_DIRECT_CLIENT_SECRET':'',
   !customerId?'UBER_DIRECT_CUSTOMER_ID':''
  ].filter(Boolean)
  throw Object.assign(new Error(`Faltan credenciales Uber Direct: ${missing.join(', ')}.`),{status:503})
 }
 return{clientId,clientSecret,customerId}
}

async function oauthToken(){
 const{clientId,clientSecret}=credentials()
 const body=new URLSearchParams({
  client_id:clientId,
  client_secret:clientSecret,
  grant_type:'client_credentials',
  scope:'eats.deliveries'
 })
 const response=await fetchWithTimeout('https://auth.uber.com/oauth/v2/token',{
  method:'POST',
  headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body
 })
 const json=await response.json().catch(()=>({})) as JsonRecord
 if(!response.ok||typeof json.access_token!=='string'){
  const detail=typeof json.error==='string'?json.error:'OAuth rechazado'
  throw Object.assign(new Error(`Uber Direct: ${detail}.`),{status:response.status||502,upstream:json})
 }
 return{token:json.access_token,expiresIn:typeof json.expires_in==='number'?json.expires_in:null,scope:typeof json.scope==='string'?json.scope:'eats.deliveries'}
}

function safeDeliveryId(raw:unknown){
 const value=String(raw||'').trim()
 if(!/^[A-Za-z0-9_-]{1,200}$/.test(value))throw Object.assign(new Error('deliveryId inválido.'),{status:400})
 return value
}

function bodyObject(req:VercelRequest){
 if(req.body&&typeof req.body==='object'&&!Array.isArray(req.body))return req.body as JsonRecord
 if(typeof req.body==='string'){
  try{
   const parsed=JSON.parse(req.body)
   if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))return parsed as JsonRecord
  }catch{}
 }
 return{} as JsonRecord
}

async function uberRequest(path:string,token:string,init:RequestInit={}){
 const response=await fetchWithTimeout(`${UBER_API_BASE}${path}`,{
  ...init,
  headers:{
   Accept:'application/json',
   Authorization:`Bearer ${token}`,
   ...(init.body?{'Content-Type':'application/json'}:{}),
   ...(init.headers||{})
  }
 })
 const text=await response.text()
 let data:unknown={}
 try{data=text?JSON.parse(text):{}}catch{data={message:text}}
 if(!response.ok){
  const upstream=data&&typeof data==='object'?data:{message:'Uber Direct respondió con error.'}
  const message=typeof (upstream as JsonRecord).message==='string'
   ?String((upstream as JsonRecord).message)
   :`Uber Direct respondió HTTP ${response.status}.`
  throw Object.assign(new Error(message),{status:response.status,upstream})
 }
 return data
}

export default async function handler(req:VercelRequest,res:VercelResponse){
 try{
  await requireAdmin(req)
  if(req.method!=='GET'&&req.method!=='POST')return res.status(405).json({error:'Method not allowed'})

  const input=bodyObject(req)
  const action=String((req.method==='GET'?req.query.action:input.action)||'test') as UberAction
  const allowed:UberAction[]=['test','quote','create_delivery','get_delivery','cancel_delivery','list_deliveries']
  if(!allowed.includes(action))return res.status(400).json({error:'Acción Uber Direct inválida.'})

  const{customerId}=credentials()
  const auth=await oauthToken()

  if(action==='test'){
   return res.status(200).json({
    ok:true,
    provider:'uber_direct',
    state:'authenticated',
    customerIdConfigured:true,
    expiresIn:auth.expiresIn,
    scope:auth.scope,
    testedAt:new Date().toISOString()
   })
  }

  const payload=(input.payload&&typeof input.payload==='object'&&!Array.isArray(input.payload)?input.payload:{}) as JsonRecord

  if(action==='quote'){
   const data=await uberRequest(`/customers/${encodeURIComponent(customerId)}/delivery_quotes`,auth.token,{
    method:'POST',
    body:JSON.stringify(payload)
   })
   return res.status(200).json({ok:true,action,data})
  }

  if(action==='create_delivery'){
   const data=await uberRequest(`/customers/${encodeURIComponent(customerId)}/deliveries`,auth.token,{
    method:'POST',
    body:JSON.stringify(payload)
   })
   return res.status(200).json({ok:true,action,data})
  }

  if(action==='list_deliveries'){
   const query=req.method==='GET'?req.query:input
   const params=new URLSearchParams()
   const filter=String(query.filter||'').trim()
   const limit=String(query.limit||'').trim()
   const offset=String(query.offset||'').trim()
   if(filter)params.set('filter',filter)
   if(limit)params.set('limit',limit)
   if(offset)params.set('offset',offset)
   const suffix=params.toString()?`?${params.toString()}`:''
   const data=await uberRequest(`/customers/${encodeURIComponent(customerId)}/deliveries${suffix}`,auth.token)
   return res.status(200).json({ok:true,action,data})
  }

  const deliveryId=safeDeliveryId(req.method==='GET'?req.query.deliveryId:input.deliveryId)

  if(action==='get_delivery'){
   const data=await uberRequest(`/customers/${encodeURIComponent(customerId)}/deliveries/${encodeURIComponent(deliveryId)}`,auth.token)
   return res.status(200).json({ok:true,action,deliveryId,data})
  }

  const data=await uberRequest(`/customers/${encodeURIComponent(customerId)}/deliveries/${encodeURIComponent(deliveryId)}/cancel`,auth.token,{
   method:'POST',
   body:JSON.stringify(payload)
  })
  return res.status(200).json({ok:true,action:'cancel_delivery',deliveryId,data})
 }catch(error:unknown){
  const err=error instanceof Error?error:null
  const status=typeof error==='object'&&error!==null&&'status'in error?Number((error as{status?:unknown}).status||500):500
  const upstream=typeof error==='object'&&error!==null&&'upstream'in error?(error as{upstream?:unknown}).upstream:undefined
  return res.status(status>=400&&status<600?status:500).json({
   error:err?.name==='AbortError'?'Tiempo de espera agotado al conectar con Uber Direct.':err?.message||'Error de integración Uber Direct.',
   ...(upstream?{upstream}: {})
  })
 }
}
