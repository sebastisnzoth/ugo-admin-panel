import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider notification pipeline covers offer assignment lifecycle and chat',async()=>{
 const[center,dispatch]=await Promise.all([
  read('src/mvp/NotificationCenter.tsx'),
  read('supabase/functions/push-dispatch/index.ts'),
 ])
 for(const type of ['nueva_oferta','trabajo_asignado','chat_mensaje','servicio_completado','servicio_cancelado','servicio_disputado']){
  assert.match(center,new RegExp("'"+type+"'"))
 }
 for(const type of ['nueva_oferta','trabajo_asignado','chat_mensaje']){
  assert.match(dispatch,new RegExp("'"+type+"'"))
 }
 assert.match(center,/playProviderTone\(\)/)
 assert.match(center,/navigator\.vibrate/)
})

test('provider notification push routes exact offer and service identifiers into provider app',async()=>{
 const[sw,root]=await Promise.all([
  read('public/sw.js'),
  read('src/mvp/provider/ProviderRoot.tsx'),
 ])
 assert.match(sw,/offerId=\$\{encodeURIComponent\(offerId\)\}/)
 assert.match(sw,/serviceId=\$\{encodeURIComponent\(serviceId\)\}/)
 assert.match(sw,/app=provider/)
 assert.match(root,/offerId=params\.get\('offerId'\)/)
 assert.match(root,/serviceId=params\.get\('serviceId'\)/)
})

test('provider notification pipeline rejects stale lifecycle and expired offer alerts',async()=>{
 const[center,dispatch,sw]=await Promise.all([
  read('src/mvp/NotificationCenter.tsx'),
  read('supabase/functions/push-dispatch/index.ts'),
  read('public/sw.js'),
 ])
 assert.match(center,/providerOfferNoticeActive/)
 assert.match(center,/SERVICE_NOTICE_EXPECTED_STATE/)
 assert.match(dispatch,/service notification stale/)
 assert.match(dispatch,/offer expired/)
 assert.match(sw,/payload\.type==='nueva_oferta'/)
 assert.match(sw,/expiry<=Date\.now\(\)/)
})
