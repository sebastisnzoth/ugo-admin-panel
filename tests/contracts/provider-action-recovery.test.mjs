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

test('arrival location failure stays location-scoped instead of becoming lifecycle P0',()=>{
 const locationIndex=service.indexOf("if(state==='llegado')await publishProviderLocation(supabase,serviceId)")
 const rpcIndex=service.indexOf("const{error}=await supabase.rpc('avanzar_servicio'")
 assert.ok(locationIndex>=0&&rpcIndex>locationIndex)
 const transitionSection=service.slice(locationIndex,rpcIndex)
 assert.doesNotMatch(transitionSection,/provider_service_state_error/)
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
