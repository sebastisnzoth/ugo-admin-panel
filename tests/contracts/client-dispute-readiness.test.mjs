import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

test('client exposes exact dispute entry at approval and active dispute state',async()=>{
 const completion=await readFile('src/features/client/order/ClientCompletionReview.tsx','utf8')
 const detail=await readFile('src/features/client/order/ClientServiceDetail.tsx','utf8')
 assert.match(completion,/ABRIR DISPUTA/)
 assert.match(detail,/DisputeDock role="client" serviceId={service\.id}/)
 assert.match(detail,/VER DISPUTA/)
 assert.match(detail,/UGO pausó el cierre normal de este servicio mientras revisa el caso/)
 const dock=await readFile('src/mvp/DisputeDock.tsx','utf8')
 assert.match(dock,/Próximo paso:/)
 assert.match(dock,/tiempo de respuesta depende del motivo y de si requiere revisión humana/)
 assert.match(dock,/mostrará aquí cualquier plazo aplicable cuando esté configurado/)
})
