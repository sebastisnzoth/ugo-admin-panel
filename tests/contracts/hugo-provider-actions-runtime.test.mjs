import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider Hugo runtime uses guarded real provider actions',async()=>{const bridge=await read('src/mvp/provider/ProviderHugoBridge.tsx');for(const token of["provider_set_online","provider_set_offline","provider_get_active_service","provider_accept_job","provider_reject_job","provider_update_service_status","CONFIRMATION_REQUIRED","INVALID_TRANSITION","data.advance","data.completeService","data.toggleOnline(true)","data.toggleOnline(false)"])assert.ok(bridge.includes(token),token)})
test('provider Hugo lifecycle remains constrained by GPS and evidence aware flow',async()=>{const live=await read('src/lib/browserVoiceBridge.ts');assert.match(live,/GPS reciente, preciso y geofence válido/);assert.match(live,/barreras de evidencia/);assert.match(live,/enum:\['en_camino','llegado','en_progreso','esperando_aprobacion'\]/)})
