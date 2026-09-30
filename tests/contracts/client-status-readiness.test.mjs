import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client professional tracking keeps the exact serviceId through the full canonical lifecycle',async()=>{
 const [tracking,detail,provider]=await Promise.all([
  read('src/features/client/order/ClientLiveTracking.tsx'),
  read('src/features/client/order/ClientServiceDetail.tsx'),
  read('src/mvp/provider/providerService.ts'),
 ])
 assert.match(tracking,/serviceId\)query=query\.eq\('id',serviceId\)\.in\('estado',DETAIL_TRACKING_STATES\)/)
 for(const state of ['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado'])assert.ok(tracking.includes(`'${state}'`),`missing client lifecycle state ${state}`)
 for(const label of ['Asignado','Aceptado','En camino','Llegó','Trabajando','Finalizado'])assert.ok(tracking.includes(`label:'${label}'`),`missing visible timeline label ${label}`)
 assert.match(tracking,/data-service-state=\{state\}/)
 assert.match(tracking,/data-current-stage=\{TIMELINE\[current\]\.key\}/)
 assert.match(detail,/!disputeActive&&<SentinelErrorBoundary[^>]+client\.order\.tracking[\s\S]*<ClientLiveTracking serviceId=\{service\.id\} embedded\/>/)
 assert.match(provider,/LIFECYCLE_ORDER=\['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado'\]/)
})
