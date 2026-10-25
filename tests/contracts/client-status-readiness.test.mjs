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
 assert.match(tracking,/setInterval\(\(\)=>\{if\(document\.visibilityState==='visible'&&navigator\.onLine\)resync\(\)\},10000\)/)
 assert.match(tracking,/clearInterval\(fallbackTimer\)/)
 assert.match(detail,/setInterval\(\(\)=>\{if\(document\.visibilityState==='visible'&&navigator\.onLine\)resync\(\)\},10000\)/)
 assert.match(detail,/load\(\{silent:true\}\)/)
 assert.match(detail,/clearInterval\(fallbackTimer\)/)
 assert.match(detail,/!disputeActive&&<SentinelErrorBoundary[^>]+client\.order\.tracking[\s\S]*<ClientLiveTracking serviceId=\{service\.id\} embedded\/>/)
 assert.match(provider,/PROVIDER_LIFECYCLE_ORDER = \[[\s\S]*'asignado'[\s\S]*'en_camino'[\s\S]*'llegado'[\s\S]*'en_progreso'[\s\S]*'esperando_aprobacion'[\s\S]*'completado'/)
})

test('client status runtime uses supported Chromium runner and does not write to main before validators',async()=>{
 const workflow=await read('.github/workflows/client-status-runtime.yml')
 assert.match(workflow,/runs-on: ubuntu-24\.04/)
 assert.match(workflow,/pull_request:/)
 assert.match(workflow,/UGO_TESTED_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/)
 assert.match(workflow,/if: github\.event_name != 'pull_request'/)
 assert.match(workflow,/npx playwright install --with-deps chromium/)
 const start=workflow.split('      - name: Persist client-status workflow start marker')[1]?.split('      - uses: actions\/setup-node@v4')[0]
 assert.ok(start,'missing start marker')
 assert.match(start,/artifacts\/client-status-workflow-start\.json/)
 assert.doesNotMatch(start,/git (push|checkout|pull|commit|fetch)/)
 assert.match(workflow,/      - name: Judge[\s\S]*      - name: Sentinel[\s\S]*      - name: Persist authoritative readiness closure/)
})

test('client status disposable fixture respects TEST GPS and cash/Pix business gates',async()=>{
 const runtime=await read('scripts/client-status-runtime.mjs')
 assert.match(runtime,/estado:'borrador'/)
 assert.match(runtime,/guardar_ubicacion_servicio_cliente/)
 assert.match(runtime,/activar_disponibilidad_proveedor/)
 assert.match(runtime,/TEST_PROVIDER_TRUSTED_GPS_REQUIRED/)
 assert.match(runtime,/CLIENT_STATUS_ASSIGNMENT_REQUIRED/)
 assert.match(runtime,/requested_payment_method/)
 assert.match(runtime,/AUTO_CASH_PAYMENT_REQUIRED/)
 assert.match(runtime,/UNEXPECTED_PREEXISTING_PIX_PAYMENT/)
 assert.match(runtime,/DISPOSABLE_TEST_FIXTURE_CLEANUP_REQUIRED/)
 assert.doesNotMatch(runtime,/estado:'asignado',\s*programado_para/)
})
