import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider Hugo executes declared operational tools through guarded provider actions',async()=>{
 const[bridge,live]=await Promise.all([read('src/mvp/provider/ProviderHugoBridge.tsx'),read('src/lib/browserVoiceBridge.ts')])
 for(const tool of ['provider_set_online','provider_set_offline','provider_list_opportunities','provider_accept_job','provider_reject_job','provider_update_service_status'])assert.match(bridge,new RegExp(tool))
 assert.match(bridge,/const\{actions\}=flow/)
 assert.match(bridge,/actions\.acceptOpportunity/)
 assert.match(bridge,/actions\.rejectOpportunity/)
 assert.match(bridge,/data\.advance/)
 assert.match(bridge,/data\.completeService/)
 assert.match(live,/PROVIDER_TOOLS/)
 assert.doesNotMatch(bridge,/SpeechRecognition|webkitSpeechRecognition|\/api\/hugo\/chat/)
})


test('provider Hugo requires explicit confirmation before accepting or rejecting opportunities',async()=>{
 const[provider,live]=await Promise.all([
  read('src/mvp/provider/ProviderHugoBridge.tsx'),
  read('src/lib/browserVoiceBridge.ts'),
 ])
 assert.match(live,/provider_accept_job[^\n]+confirmed/)
 assert.match(live,/provider_reject_job[^\n]+confirmed/)
 assert.match(live,/required:\['service_id','confirmed'\]/)
 assert.match(provider,/provider_accept_job'\)\{const requestedId=.*args\.confirmed!==true/)
 assert.match(provider,/provider_reject_job'\)\{const requestedId=.*args\.confirmed!==true/)
 assert.match(provider,/CONFIRMATION_REQUIRED/)
})

test('provider Hugo accepts either real service id or offer id for opportunity decisions',async()=>{
 const bridge=await read('src/mvp/provider/ProviderHugoBridge.tsx')
 assert.match(bridge,/String\(item\.id\)===requestedId\|\|String\(item\.serviceId\)===requestedId/)
 assert.match(bridge,/actions\.acceptOpportunity\(item\.id\)/)
 assert.match(bridge,/actions\.rejectOpportunity\(item\.id\)/)
 assert.match(bridge,/serviceId:item\.serviceId,opportunityId:item\.id/)
})


test('provider Hugo lifecycle Live tool is constrained to canonical states and documents GPS/evidence guards',async()=>{
 const live=await read('src/lib/browserVoiceBridge.ts')
 assert.match(live,/provider_update_service_status/)
 assert.match(live,/enum:\['en_camino','llegado','en_progreso','esperando_aprobacion'\]/)
 assert.match(live,/required:\['service_id','status','confirmed'\]/)
 assert.match(live,/instrucción explícita del proveedor/)
 assert.match(live,/GPS reciente, preciso y geofence válido/)
 assert.match(live,/barreras de evidencia/)
})

test('provider Hugo can resolve the active service before lifecycle voice actions',async()=>{
 const[provider,live]=await Promise.all([
  read('src/mvp/provider/ProviderHugoBridge.tsx'),
  read('src/lib/browserVoiceBridge.ts'),
 ])
 assert.match(live,/provider_get_active_service/)
 assert.match(live,/Usala antes de cambiar estado cuando el usuario no conoce el service_id/)
 assert.match(live,/usá provider_get_active_service antes de provider_update_service_status/)
 assert.match(provider,/if\(name==='provider_get_active_service'\)/)
 assert.match(provider,/serviceId:data\.service\.id/)
 assert.match(provider,/state:data\.service\.estado/)
 assert.match(provider,/No tenés un trabajo activo en este momento/)
})


test('provider Hugo lifecycle mutations reject missing explicit confirmation',async()=>{
 const provider=await read('src/mvp/provider/ProviderHugoBridge.tsx')
 assert.match(provider,/provider_update_service_status'\)\{const serviceId=.*args\.confirmed!==true/)
 assert.match(provider,/CONFIRMATION_REQUIRED/)
 assert.match(provider,/confirmes explícitamente el cambio de estado/)
})


test('provider Hugo availability mutations require explicit confirmation',async()=>{
 const[provider,live]=await Promise.all([
  read('src/mvp/provider/ProviderHugoBridge.tsx'),
  read('src/lib/browserVoiceBridge.ts'),
 ])
 assert.match(live,/provider_set_online[^\n]+required:\['confirmed'\]/)
 assert.match(live,/provider_set_offline[^\n]+required:\['confirmed'\]/)
 assert.match(provider,/provider_set_online'\)\{if\(args\.confirmed!==true\)/)
 assert.match(provider,/provider_set_offline'\)\{if\(args\.confirmed!==true\)/)
 assert.match(provider,/CONFIRMATION_REQUIRED/)
})
