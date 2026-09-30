import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider active job keeps a visible dispute entry before final approval',async()=>{
 const source=await read('src/mvp/provider/ProviderActiveJob.tsx')
 assert.match(source,/provider-dispute-entry/)
 assert.match(source,/openDispute\(s\.id\)/)
 assert.match(source,/!\['esperando_aprobacion','disputado','completado'\]\.includes\(s\.estado\)/)
})

test('provider dispute participant supports active service states',async()=>{
 const source=await read('src/hooks/useDisputes.ts')
 for(const state of ['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado'])assert.match(source,new RegExp("'"+state+"'"))
})
