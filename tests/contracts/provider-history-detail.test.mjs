import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const source=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('provider history can reopen a completed job with photos and timeline',async()=>{
 const[history,detail]=await Promise.all([source('src/mvp/ServiceHistoryPanel.tsx'),source('src/mvp/ProviderHistoryDetail.tsx')])
 assert.match(history,/role==='provider'.*Abrir trabajo/)
 assert.match(history,/ProviderHistoryDetail/)
 assert.match(history,/completado_at,direccion_cliente/)
 assert.match(detail,/evidencias_servicio/)
 assert.match(detail,/service-evidence/)
 assert.match(detail,/evidencias_solicitud/)
 assert.match(detail,/request-evidence/)
 assert.match(detail,/servicio_estado_eventos/)
 assert.match(detail,/Cómo se hizo/)
 assert.match(detail,/Resultado final/)
 assert.match(detail,/role="dialog"/)
})
