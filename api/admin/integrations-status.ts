import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL=process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY=process.env.SUPABASE_SERVICE_KEY

type Provider='uber'|'ifood'|'rappi'
type Integration={
 id:string
 label:string
 category:'core'|'payments'|'ai'|'messaging'|'maps'|'deploy'|'delivery'
 configured:boolean
 enabled:boolean
 environment:string
 runtimeSource:string
 note:string
}

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
async function fetchWithTimeout(url:string,init:RequestInit,timeout=12000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout)
 try{return await fetch(url,{...init,signal:controller.signal})}finally{clearTimeout(timer)}
}
function deliveryProviders(){
 return[
  {id:'uber',label:'Uber Direct',configured:Boolean(process.env.UBER_DIRECT_CLIENT_ID&&process.env.UBER_DIRECT_CLIENT_SECRET),docs:'https://developer.uber.com/docs/deliveries',required:['UBER_DIRECT_CLIENT_ID','UBER_DIRECT_CLIENT_SECRET'],capabilities:['OAuth 2.0','cotización/entrega','tracking/webhooks'],note:'API oficial Uber Direct. Puede requerir aprobación escrita de Uber.'},
  {id:'ifood',label:'iFood',configured:Boolean(process.env.IFOOD_CLIENT_ID&&process.env.IFOOD_CLIENT_SECRET),docs:'https://developer.ifood.com.br/pt-BR/',required:['IFOOD_CLIENT_ID','IFOOD_CLIENT_SECRET'],capabilities:['OAuth 2.0','Merchant','Orders','Shipping','Events'],note:'Producción requiere homologación y permisos del merchant.'},
  {id:'rappi',label:'Rappi / Rappi Cargo',configured:Boolean((process.env.RAPPI_ACCESS_TOKEN||process.env.RAPPI_API_KEY)&&process.env.RAPPI_TEST_URL),docs:'https://merchants.rappi.com/pt-br/o-que-ofrecemos/sistema-pos',required:['RAPPI_ACCESS_TOKEN (ou RAPPI_API_KEY)','RAPPI_TEST_URL'],capabilities:['Open Orders / POS','Cargo','tracking'],note:'El endpoint exacto depende del producto Rappi habilitado para la cuenta.'}
 ]
}
async function testUber(){
 const clientId=process.env.UBER_DIRECT_CLIENT_ID,secret=process.env.UBER_DIRECT_CLIENT_SECRET
 if(!clientId||!secret)return{ok:false,configured:false,state:'missing_credentials',message:'Faltan credenciales de Uber Direct.'}
 const body=new URLSearchParams({client_id:clientId,client_secret:secret,grant_type:'client_credentials',scope:'eats.deliveries'})
 const response=await fetchWithTimeout('https://auth.uber.com/oauth/v2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body})
 const json=await response.json().catch(()=>({}))
 if(!response.ok||!json?.access_token)return{ok:false,configured:true,state:'auth_failed',message:'Uber rechazó la autenticación.',status:response.status}
 return{ok:true,configured:true,state:'authenticated',message:'OAuth Uber Direct válido.',expiresIn:json.expires_in??null,scope:json.scope??'eats.deliveries'}
}
async function testIfood(){
 const clientId=process.env.IFOOD_CLIENT_ID,secret=process.env.IFOOD_CLIENT_SECRET
 if(!clientId||!secret)return{ok:false,configured:false,state:'missing_credentials',message:'Faltan credenciales de iFood.'}
 const body=new URLSearchParams({grantType:'client_credentials',clientId,clientSecret:secret})
 const tokenResponse=await fetchWithTimeout('https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',accept:'application/json'},body})
 const tokenJson=await tokenResponse.json().catch(()=>({})),accessToken=tokenJson?.accessToken
 if(!tokenResponse.ok||!accessToken)return{ok:false,configured:true,state:'auth_failed',message:'iFood rechazó la autenticación.',status:tokenResponse.status}
 const merchants=await fetchWithTimeout('https://merchant-api.ifood.com.br/merchant/v1.0/merchants',{headers:{Authorization:`Bearer ${accessToken}`,accept:'application/json'}})
 if(merchants.ok){const rows=await merchants.json().catch(()=>[]);return{ok:true,configured:true,state:'operational',message:'OAuth iFood válido y merchants accesibles.',merchants:Array.isArray(rows)?rows.length:null,expiresIn:tokenJson?.expiresIn??null}}
 if(merchants.status===403)return{ok:true,configured:true,state:'authenticated_waiting_permissions',message:'OAuth iFood válido; faltan permisos de merchant/homologación.',status:403,expiresIn:tokenJson?.expiresIn??null}
 return{ok:true,configured:true,state:'authenticated',message:'OAuth iFood válido; no se pudo confirmar Merchant API.',status:merchants.status,expiresIn:tokenJson?.expiresIn??null}
}
async function testRappi(){
 const token=process.env.RAPPI_ACCESS_TOKEN||process.env.RAPPI_API_KEY,url=process.env.RAPPI_TEST_URL
 if(!token||!url)return{ok:false,configured:false,state:'missing_credentials',message:'Faltan RAPPI_ACCESS_TOKEN/RAPPI_API_KEY o RAPPI_TEST_URL.'}
 const headers:Record<string,string>={accept:'application/json'}
 if(process.env.RAPPI_ACCESS_TOKEN)headers.Authorization=`Bearer ${process.env.RAPPI_ACCESS_TOKEN}`
 if(process.env.RAPPI_API_KEY)headers['x-api-key']=process.env.RAPPI_API_KEY
 const response=await fetchWithTimeout(url,{headers})
 if(!response.ok)return{ok:false,configured:true,state:'test_failed',message:'Rappi respondió con error al endpoint configurado.',status:response.status}
 return{ok:true,configured:true,state:'reachable',message:'Endpoint Rappi accesible con las credenciales configuradas.',status:response.status}
}

export default async function handler(req:VercelRequest,res:VercelResponse){
 try{
  await requireAdmin(req)
  if(req.method==='POST'){
   const provider=String(req.body?.provider||'') as Provider
   if(!['uber','ifood','rappi'].includes(provider))return res.status(400).json({error:'Proveedor inválido.'})
   const result=provider==='uber'?await testUber():provider==='ifood'?await testIfood():await testRappi()
   return res.status(result.ok?200:result.configured?502:409).json({provider,...result,testedAt:new Date().toISOString()})
  }
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'})

  const openPixConfigured=Boolean(process.env.OPENPIX_SANDBOX_APP_ID)
  const openPixEnabled=process.env.PAYMENTS_OPENPIX_ENABLED==='true'&&openPixConfigured
  const mpBrConfigured=Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN)
  const pixDirectConfigured=Boolean(process.env.UGO_PIX_KEY)
  const whatsappConfigured=Boolean((process.env.WHATSAPP_ACCESS_TOKEN||process.env.META_WHATSAPP_ACCESS_TOKEN)&&(process.env.WHATSAPP_PHONE_NUMBER_ID||process.env.META_WHATSAPP_PHONE_NUMBER_ID))
  const openAiConfigured=Boolean(process.env.OPENAI_API_KEY)
  const argentinaFlag=process.env.PAYMENTS_ARGENTINA_ENABLED==='true'
  const uberDirectConfigured=Boolean(process.env.UBER_DIRECT_CLIENT_ID&&process.env.UBER_DIRECT_CLIENT_SECRET)
  const ifoodConfigured=Boolean(process.env.IFOOD_CLIENT_ID&&process.env.IFOOD_CLIENT_SECRET)
  const rappiConfigured=Boolean((process.env.RAPPI_ACCESS_TOKEN||process.env.RAPPI_API_KEY)&&process.env.RAPPI_TEST_URL)

  const integrations:Integration[]=[
   {id:'supabase',label:'Supabase',category:'core',configured:true,enabled:true,environment:'production',runtimeSource:'server env',note:'Auth, PostgreSQL, Realtime y Storage del proyecto UGO.'},
   {id:'mercadopago_br',label:'Mercado Pago Brasil',category:'payments',configured:mpBrConfigured,enabled:mpBrConfigured,environment:'production',runtimeSource:'MERCADO_PAGO_ACCESS_TOKEN',note:'Runtime actual de Pix y checkout electrónico BR.'},
   {id:'pix_direto',label:'Pix direto UGO',category:'payments',configured:pixDirectConfigured,enabled:pixDirectConfigured,environment:'production',runtimeSource:'UGO_PIX_KEY',note:'Generación EMV propia; requiere conciliación antes de considerar pago protegido.'},
   {id:'openpix',label:'OpenPix / Woovi',category:'payments',configured:openPixConfigured,enabled:openPixEnabled,environment:'sandbox',runtimeSource:'OPENPIX_SANDBOX_APP_ID + PAYMENTS_OPENPIX_ENABLED',note:'Sandbox solamente; el webhook no libera fondos reales.'},
   {id:'mercadopago_ar',label:'Mercado Pago Argentina',category:'payments',configured:false,enabled:false,environment:'disabled',runtimeSource:'router',note:argentinaFlag?'Feature flag solicitado, pero el router todavía bloquea Argentina.':'Declarado pero no activado en esta fase.'},
   {id:'openai_hugo',label:'OpenAI · Hugo Voice',category:'ai',configured:openAiConfigured,enabled:openAiConfigured,environment:process.env.VERCEL_ENV||'server',runtimeSource:'OPENAI_API_KEY',note:`Modelo: ${process.env.OPENAI_REALTIME_MODEL||'default del servidor'}.`},
   {id:'whatsapp',label:'WhatsApp Cloud API',category:'messaging',configured:whatsappConfigured,enabled:whatsappConfigured,environment:'production',runtimeSource:'WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID',note:'Bandeja Admin y envío server-side. Gemini es apoyo opcional para extracción.'},
   {id:'uber_direct',label:'Uber Direct',category:'delivery',configured:uberDirectConfigured,enabled:uberDirectConfigured,environment:'server',runtimeSource:'UBER_DIRECT_CLIENT_ID + UBER_DIRECT_CLIENT_SECRET',note:'Conector OAuth 2.0 para entregas Uber Direct. Requiere cuenta/credenciales habilitadas por Uber.'},
   {id:'ifood',label:'iFood Developer',category:'delivery',configured:ifoodConfigured,enabled:ifoodConfigured,environment:'server',runtimeSource:'IFOOD_CLIENT_ID + IFOOD_CLIENT_SECRET',note:'Conector OAuth 2.0 para Merchant/Orders/Shipping. Producción requiere homologación y permisos de tienda.'},
   {id:'rappi',label:'Rappi / Rappi Cargo',category:'delivery',configured:rappiConfigured,enabled:rappiConfigured,environment:'server',runtimeSource:'RAPPI_ACCESS_TOKEN + RAPPI_TEST_URL',note:'Conector preparado para API pública/Open Orders/Cargo. El endpoint de validación depende de la cuenta Rappi habilitada.'},
   {id:'maps',label:'Mapas y rutas',category:'maps',configured:true,enabled:true,environment:'client',runtimeSource:'OpenStreetMap + MapLibre; routing configurable',note:'Mapa base no requiere clave. Routing usa VITE_ROUTING_ENGINE (haversine por defecto / OSRM opcional).'},
   {id:'vercel',label:'Vercel',category:'deploy',configured:Boolean(process.env.VERCEL),enabled:Boolean(process.env.VERCEL),environment:process.env.VERCEL_ENV||'unknown',runtimeSource:'Vercel runtime',note:`Commit runtime: ${(process.env.VERCEL_GIT_COMMIT_SHA||'desconocido').slice(0,8)}.`}
  ]
  return res.status(200).json({
   generatedAt:new Date().toISOString(),
   deployment:{environment:process.env.VERCEL_ENV||'unknown',commit:process.env.VERCEL_GIT_COMMIT_SHA||null},
   integrations,
   deliveryProviders:deliveryProviders(),
   warning:'Configurado indica presencia de configuración en el runtime actual; no equivale a transacción E2E validada.'
  })
 }catch(error:unknown){
  const err=error instanceof Error?error:null
  const status=typeof error==='object'&&error!==null&&'status' in error
   ?Number((error as {status?:unknown}).status||500)
   :500
  return res.status(status).json({error:err?.name==='AbortError'?'Tiempo de espera agotado al verificar la integración.':err?.message||'No se pudo verificar la integración.'})
 }
}
