import { createClient } from '@supabase/supabase-js'

const TEST_REF='tmossnqfwfwjrtzwcbmm'
const PROD_REF='trfsjuseqjxlhrxuvdsm'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''

const identities=[
 {role:'cliente',email:process.env.UGO_TEST_CLIENT_EMAIL,password:process.env.UGO_TEST_CLIENT_PASSWORD,fallbackEmail:'cliente.ugo.test@example.com'},
 {role:'proveedor',email:process.env.UGO_TEST_PROVIDER_EMAIL,password:process.env.UGO_TEST_PROVIDER_PASSWORD,fallbackEmail:'proveedor.ugo.test@example.com'},
 {role:'admin',email:process.env.UGO_TEST_ADMIN_EMAIL,password:process.env.UGO_TEST_ADMIN_PASSWORD,fallbackEmail:'admin.ugo.test@example.com'},
]

function fail(message){
 console.error('UGO TEST auth bootstrap:',message)
 process.exit(1)
}

if(!url.includes(TEST_REF)||url.includes(PROD_REF))fail('refusing any project other than designated UGO TEST')
if(!serviceKey)fail('UGO_TEST_SUPABASE_SERVICE_ROLE_KEY is required')
for(const identity of identities){
 if(!identity.email||!identity.password)fail('all six TEST human credential variables are required')
}

const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:list,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000})
if(listError)throw listError

const resolvedIds={}

for(const identity of identities){
 let user=list.users.find(candidate=>candidate.email?.toLowerCase()===identity.email.toLowerCase())
 let repairingEmail=false

 if(!user){
   user=list.users.find(candidate=>candidate.email?.toLowerCase()===identity.fallbackEmail)
   if(!user)fail(identity.role+' TEST identity does not exist')
   repairingEmail=true
 }

 const {data:profile,error:profileError}=await admin.from('usuarios').select('tipo,activo').eq('id',user.id).single()
 if(profileError)throw profileError
 const allowed=identity.role==='admin'?['admin','superadmin']:[identity.role]
 if(!allowed.includes(profile.tipo))fail(identity.role+' TEST identity has unexpected public.usuarios role')
 if(profile.activo!==true)fail(identity.role+' TEST identity is inactive')

 const updatePayload={
   password:identity.password,
   email_confirm:true,
 }
 if(repairingEmail)updatePayload.email=identity.email

 const {error:updateError}=await admin.auth.admin.updateUserById(user.id,updatePayload)
 if(updateError)throw updateError
 resolvedIds[identity.role]=user.id
 console.log('UGO TEST auth bootstrap OK role='+identity.role+(repairingEmail?' email=REPAIRED':''))
}

const {data:staleServices,error:staleServicesError}=await admin
 .from('servicios')
 .select('id')
 .eq('metadata->>integration_test','true')
 .in('estado',['borrador','buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion'])
 .or('cliente_id.eq.'+resolvedIds.cliente+',proveedor_id.eq.'+resolvedIds.proveedor)
if(staleServicesError)throw staleServicesError

if(staleServices?.length){
 const ids=staleServices.map(row=>row.id)
 const {error:cleanupError}=await admin
   .from('servicios')
   .update({estado:'cancelado',cancelado_at:new Date().toISOString()})
   .in('id',ids)
 if(cleanupError)throw cleanupError
 console.log('UGO TEST integration cleanup OK count='+ids.length)
}else{
 console.log('UGO TEST integration cleanup OK count=0')
}

console.log('UGO TEST auth bootstrap completed for 3 existing identities')
