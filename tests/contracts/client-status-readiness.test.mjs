import './i18n-test-compat.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client professional tracking keeps the exact serviceId through the full canonical lifecycle',async()=>{
 const [tracking,detail,provider]=await Promise.all([
  read('src/features/client/order/ClientLiveTracking.tsx'),
  read('src/features/client/order/ClientServiceDetail.tsx'),
  read('src/lib/marketplace/lifecycle.ts'),
 ])
 assert.match(tracking,/serviceId\)query=query\.eq\('id',serviceId\)\.in\('estado',DETAIL_TRACKING_STATES\)/)
 for(const state of ['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado'])assert.ok(tracking.includes(`'${state}'`),`missing client lifecycle state ${state}`)
 for(const stage of ['assigned','accepted','route','arrived','working','finished'])assert.ok(tracking.includes(`key:'${stage}'`),`missing localized timeline stage ${stage}`)
 assert.match(tracking,/t\('clientTracking\.'\+step\.key\)/)
 assert.match(tracking,/data-service-state=\{state\}/)
 assert.match(tracking,/data-current-stage=\{TIMELINE\[current\]\.key\}/)
 assert.match(detail,/!disputeActive&&<SentinelErrorBoundary[^>]+client\.order\.tracking[\s\S]*<ClientLiveTracking serviceId=\{service\.id\} embedded\/>/)
 assert.match(provider,/PROVIDER_LIFECYCLE_ORDER = \[[\s\S]*'asignado'[\s\S]*'en_camino'[\s\S]*'llegado'[\s\S]*'en_progreso'[\s\S]*'esperando_aprobacion'[\s\S]*'completado'/)
})
