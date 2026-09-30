import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('client history loads payment and bilateral rating summaries',async()=>{
 const source=await read('src/mvp/ServiceHistoryPanel.tsx')
 assert.match(source,/pago:pagos\(estado,metodo,monto_bruto\)/)
 assert.match(source,/resenas\(puntuacion,comentario,autor_tipo\)/)
 assert.match(source,/PAGO/)
 assert.match(source,/Sin pago registrado/)
 assert.match(source,/TU CALIFICACIÓN/)
 assert.match(source,/CALIFICACIÓN RECIBIDA/)
 assert.match(source,/autor_tipo==='cliente'/)
 assert.match(source,/autor_tipo==='proveedor'/)
})

test('client completed history keeps authorized evidence gallery',async()=>{
 const source=await read('src/mvp/ServiceHistoryPanel.tsx')
 assert.match(source,/ClientEvidenceGallery/)
 assert.match(source,/r\.estado==='completado'/)
 assert.match(source,/Ver fotos/)
 assert.match(source,/ClientEvidenceGallery serviceId=\{r\.id\} compact hideWhenEmpty/)
})
