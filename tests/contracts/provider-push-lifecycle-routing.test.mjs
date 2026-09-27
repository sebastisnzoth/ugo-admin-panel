import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider push routes lifecycle notices to their canonical destinations',async()=>{
 const[sw,root]=await Promise.all([
  read('public/sw.js'),
  read('src/mvp/provider/ProviderRoot.tsx'),
 ])
 assert.match(sw,/providerHistoryTypes=new Set\(\['pago_efectivo_confirmado','servicio_completado','servicio_cancelado'\]\)/)
 assert.match(sw,/historyServiceId=\$\{encodeURIComponent\(serviceId\)\}/)
 assert.match(sw,/providerScreen=earnings/)
 assert.match(root,/historyServiceId=params\.get\('historyServiceId'\)/)
 assert.match(root,/providerScreen=params\.get\('providerScreen'\)/)
 assert.match(root,/flow\.navigate\('history',historyServiceId\)/)
 assert.match(root,/providerScreen==='earnings'\)flow\.navigate\('earnings'\)/)
})

test('provider push keeps precedence offer then history then earnings then active service',async()=>{
 const sw=await read('public/sw.js')
 assert.match(sw,/offerSuffix\|\|providerHistorySuffix\|\|providerScreenSuffix\|\|serviceSuffix/)
})
