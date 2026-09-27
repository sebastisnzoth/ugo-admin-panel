import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider offer push click preserves offerId and opens opportunity detail',async()=>{
 const[sw,root]=await Promise.all([
  read('public/sw.js'),
  read('src/mvp/provider/ProviderRoot.tsx'),
 ])
 assert.match(sw,/const offerId=payload\?\.data\?\.oferta_id/)
 assert.match(sw,/payload\.type==='nueva_oferta'/)
 assert.match(sw,/offerId=\$\{encodeURIComponent\(offerId\)\}/)
 assert.match(sw,/offerSuffix\|\|serviceSuffix/)
 assert.match(root,/offerId=params\.get\('offerId'\)/)
 assert.match(root,/else if\(offerId\)flow\.navigate\('opportunity-detail',offerId\)/)
})

test('provider push route still keeps serviceId fallback for assigned/history notices',async()=>{
 const sw=await read('public/sw.js')
 const root=await read('src/mvp/provider/ProviderRoot.tsx')
 assert.match(sw,/serviceId=\$\{encodeURIComponent\(serviceId\)\}/)
 assert.match(root,/else if\(serviceId\)flow\.navigate\('agenda',serviceId\)/)
})
