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
 assert.match(service,/if\(persisted===false\)\{[\s\S]*eventType:'provider_service_state_error'[\s\S]*severity:'P0'[\s\S]*action:'provider\.service\.advance'/)
 assert.match(service,/persisted===false[\s\S]*else\{[\s\S]*eventType:'provider_service_state_recovery_unverified'[\s\S]*severity:'P1'/)
})

test('arrival location failure stays location-scoped instead of becoming lifecycle P0',()=>{
 const locationIndex=service.indexOf("if(state==='llegado')await publishProviderLocation(supabase,serviceId)")
 const rpcIndex=service.indexOf("const{error}=await supabase.rpc('avanzar_servicio'")
 assert.ok(locationIndex>=0&&rpcIndex>locationIndex)
 const transitionSection=service.slice(locationIndex,rpcIndex)
 assert.doesNotMatch(transitionSection,/provider_service_state_error/)
 assert.match(service,/eventType:'provider_location_error'[\s\S]*severity:'P1'[\s\S]*action:'provider\.service\.location'/)
})

test('cash confirmation treats persisted released cash payment as success',()=>{
 assert.match(source,/releasedCashPersisted=async\(serviceId:string\):Promise<boolean\|null>/)
 assert.match(source,/confirmar_pago_efectivo[\s\S]*const persisted=await releasedCashPersisted\(serviceId\)/)
 assert.match(source,/if\(persisted===true\)\{[\s\S]*Efectivo recibido y registrado[\s\S]*return true/)
})

test('provider cash Sentinel declares P0 only after confirmed persistence failure',()=>{
 assert.match(source,/const confirmed=persisted===false/)
 assert.match(source,/severity:confirmed\?'P0':'P1'/)
 assert.match(source,/action:confirmed\?'provider\.payment\.cash_confirm':'provider\.payment\.cash_confirm\.recovery'/)
 assert.match(source,/checklistCode:confirmed\?'PAYMENT-CLOSE':undefined/)
})

test('complete service reuses cash persistence recovery before failing close',()=>{
 assert.match(source,/completeService=async\(\)=>[\s\S]*confirmar_pago_efectivo[\s\S]*releasedCashPersisted\(serviceId\)[\s\S]*if\(persisted!==true\)\{reportCashFailure/)
})

test('provider still blocks departure until a valid payment method is persisted',()=>{
 assert.match(source,/service\.estado==='asignado'&&!funded&&!cashSelected/)
})
