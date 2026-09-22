import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider root delegates routing decisions to feature navigation',async()=>{const[root,nav]=await Promise.all([read('src/mvp/provider/ProviderRoot.tsx'),read('src/features/provider/navigation/providerNavigation.ts')]);assert.match(root,/providerAcceptedDestination/);assert.match(root,/providerNoticeDestination/);assert.doesNotMatch(root,/ACTIONABLE_SCHEDULE_LEAD_MS/);assert.match(nav,/60\*60\*1000/);for(const type of ['nueva_oferta','trabajo_asignado','pago_liberado','pago_efectivo_confirmado','servicio_completado','servicio_cancelado'])assert.match(nav,new RegExp(type));assert.match(nav,/notice\.tipo\.includes\('disputa'\)/)})
