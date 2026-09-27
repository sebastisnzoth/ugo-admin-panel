import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('client completed history exposes service-scoped evidence on demand',async()=>{
 const history=await read('src/mvp/ServiceHistoryPanel.tsx')
 assert.match(history,/ClientEvidenceGallery/)
 assert.match(history,/clientEvidenceServiceId/)
 assert.match(history,/r\.estado==='completado'/)
 assert.match(history,/Ver fotos/)
 assert.match(history,/Ocultar fotos/)
 assert.match(history,/ClientEvidenceGallery serviceId=\{r\.id\} compact hideWhenEmpty/)
})

test('client history does not eagerly mount evidence galleries for every row',async()=>{
 const history=await read('src/mvp/ServiceHistoryPanel.tsx')
 assert.match(history,/clientEvidenceServiceId===r\.id/)
 assert.doesNotMatch(history,/visible\.map\([^)]*<ClientEvidenceGallery/)
})
