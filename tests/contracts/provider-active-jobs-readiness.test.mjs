import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider active job stays fail-closed without payment and exposes localized UI surfaces',async()=>{const sql=await read('supabase/migrations/20261001031500_provider_active_jobs_runtime_qa.sql'),ui=await read('src/mvp/provider/ProviderActiveJob.tsx'),history=await read('src/mvp/ProviderHistoryDetail.tsx');assert.match(sql,/ACTIVE_JOB_WITHOUT_PAYMENT_MUST_BE_BLOCKED/);assert.match(sql,/payment_method/);assert.match(ui,/t\('providerJob\.activeEyebrow'\)/);assert.match(ui,/t\('screen\.active\.11'\)/);assert.match(ui,/t\('providerJob\.control'\)/);assert.match(ui,/t\('screen\.active\.12'\)/);assert.match(history,/servicio_estado_eventos/);assert.match(history,/pagos/);assert.match(history,/t\('screen\.provider_history\.14'\)/)})
test('runtime proof targets the active-job status, not the sidebar navigation item, and keeps every step',async()=>{
 const runtime=await read('scripts/provider-active-jobs-runtime.mjs'),sidebar=await read('src/mvp/provider/ProviderStudioSidebar.tsx')
 // While a job is active the sidebar renders a "Trabajo activo" button; a case-insensitive
 // substring locator would match it too and fail Playwright strict mode.
 assert.match(sidebar,/t\('nav\.active'\)/)
 assert.match(runtime,/locator\('span\.ugo-ui-status'\)\.filter\(\{hasText:'TRABAJO ACTIVO'\}\)\.waitFor\(\{state:'visible',timeout:30000\}\)/)
 assert.doesNotMatch(runtime,/getByText\('TRABAJO ACTIVO'\)/)
 for(const step of["getByRole('button',{name:'Continuar trabajo'}).click()","getByRole('heading',{name:'Listo para salir'})","getByText('Arreglar canilla de cocina')","getByText(/Rua UGO TEST 100/)","getByRole('button',{name:'ESTOY YENDO'})","assert.equal(await going.isDisabled(),false)","getByText('Fotos o detalles del cliente')"])assert.ok(runtime.includes(step),step)
})
