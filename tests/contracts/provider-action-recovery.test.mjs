import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const source=fs.readFileSync(new URL('../../src/mvp/provider/providerData.tsx',import.meta.url),'utf8')
const service=fs.readFileSync(new URL('../../src/mvp/provider/providerService.ts',import.meta.url),'utf8')

test('generic provider actions still reload after ambiguous failure',()=>{
 assert.match(source,/const run=[\s\S]*catch\(e\)\{try\{await reload\(\)\}catch\{\}/)
})

test('lifecycle transitions treat persisted target or later state as success',()=>{
 assert.match(source,/LIFECYCLE_ORDER=\['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado'\]/)
 assert.match(source,/transitionPersisted=async\(serviceId:string,target:string\)/)
 assert.match(source,/if\(await transitionPersisted\(serviceId,state\)\)[\s\S]*return true/)
})

test('provider Sentinel verifies persistence before declaring lifecycle P0',()=>{
 assert.match(service,/persistedProviderTransition\(supabase:SupabaseClient,serviceId:string,target:ProviderTransitionState\):Promise<boolean\|null>/)
 assert.match(service,/const persisted=await persistedProviderTransition\(supabase,serviceId,state\)/)
 assert.match(service,/if\(persisted===true\)return/)
 assert.match(service,/if\(persisted===false\)\{[\s\S]*if\(!isExpectedProviderTransitionRejection\(transitionMessage\)\)[\s\S]*eventType:'provider_service_state_error'[\s\S]*severity:'P0'[\s\S]*action:'provider\.service\.advance'/)
 assert.match(service,/persisted===false[\s\S]*else\{[\s\S]*eventType:'provider_service_state_recovery_unverified'[\s\S]*severity:'P1'/)
})

test('scheduled-too-early rejection is treated as expected business validation, not Sentinel P0',()=>{
 assert.match(service,/isExpectedProviderTransitionRejection=.*programado para más adelante/)
 assert.match(service,/if\(!isExpectedProviderTransitionRejection\(transitionMessage\)\)void reportSentinelIncident/)
})

test('arrival location failure stays GPS-scoped and cannot fall through to generic lifecycle mutation',()=>{
 const helperStart=service.indexOf('async function markProviderArrived')
 const publishIndex=service.indexOf('await publishProviderLocation(supabase,serviceId)',helperStart)
 const arrivalRpcIndex=service.indexOf("supabase.rpc('marcar_llegada_proveedor'",helperStart)
 const advanceStart=service.indexOf('export async function advanceProviderService')
 const arrivalBranch=service.indexOf("if(state==='llegado')",advanceStart)
 const genericRpcIndex=service.indexOf("supabase.rpc('avanzar_servicio'",advanceStart)
 assert.ok(helperStart>=0&&publishIndex>helperStart&&arrivalRpcIndex>publishIndex)
 assert.ok(arrivalBranch>=0&&genericRpcIndex>arrivalBranch)
 const branchSection=service.slice(arrivalBranch,genericRpcIndex)
 assert.match(branchSection,/markProviderArrived\(supabase,serviceId\)/)
 assert.doesNotMatch(branchSection,/provider_service_state_error/)
 assert.match(service,/eventType:'provider_location_error'[\s\S]*severity:'P0'[\s\S]*action:'provider\.service\.location'/)
})

test('provider no longer confirms cash directly',()=>{
 assert.doesNotMatch(source,/confirmCash/)
 assert.doesNotMatch(source,/confirmar_pago_efectivo/)
})

test('provider completion hands cash close to the client',()=>{
 const completeService=source.slice(source.indexOf('const completeService'),source.indexOf('const cancelService'))
 assert.match(completeService,/advanceProviderService\(supabase,serviceId,'esperando_aprobacion'\)/)
 assert.match(completeService,/UGO avisó al cliente y sigue el cierre por detrás/)
 assert.doesNotMatch(completeService,/confirmar_pago_efectivo/)
})

test('provider still blocks departure until a valid payment method is persisted',()=>{
 assert.match(source,/service\.estado==='asignado'&&!funded&&!cashSelected/)
})
