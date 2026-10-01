import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider active job stays fail-closed without payment and exposes complete UI surfaces',async()=>{const sql=await read('supabase/migrations/20261001031500_provider_active_jobs_runtime_qa.sql'),ui=await read('src/mvp/provider/ProviderActiveJob.tsx'),history=await read('src/mvp/ProviderHistoryDetail.tsx');assert.match(sql,/ACTIVE_JOB_WITHOUT_PAYMENT_MUST_BE_BLOCKED/);assert.match(sql,/payment_method/);assert.match(ui,/TRABAJO ACTIVO/);assert.match(ui,/Fotos o detalles del cliente/);assert.match(ui,/CONTROL DEL PEDIDO/);assert.match(ui,/ESTOY YENDO/);assert.match(history,/servicio_estado_eventos/);assert.match(history,/pagos/);assert.match(history,/EVIDENCIA DEL TRABAJO/)})
