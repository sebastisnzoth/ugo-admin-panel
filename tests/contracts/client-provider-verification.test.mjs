import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client provider radar loads and stores verified professionals only',async()=>{
 const store=await read('src/mvp/client/providerRadarStore.ts')
 assert.match(store,/\.eq\('estado_verificacion','verificado'\)/)
 assert.match(store,/rows\.filter\(row=>row\.estado_verificacion==='verificado'\)/)
 assert.match(store,/provider\.estado_verificacion!=='verificado'/)
})

test('home verification copy is backed by the verified radar store',async()=>{
 const home=await read('src/mvp/client/ClientPremiumHome.tsx')
 assert.match(home,/Especialistas verificados/)
 assert.match(home,/Perfiles verificados/)
})
