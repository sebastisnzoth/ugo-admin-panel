import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider offer reactivation creates a fresh alert cycle with expiry metadata',async()=>{
 const migration=await read('supabase/migrations/20260925165000_provider_offer_alert_reactivation.sql')
 assert.match(migration,/after insert or update of estado,expira_at on public\.ofertas_servicio/)
 assert.match(migration,/old\.estado::text='pendiente'/)
 assert.match(migration,/'expira_at',new\.expira_at/)
 assert.match(migration,/'oferta:'\|\|new\.id::text\|\|':'\|\|v_cycle_key/)
})

test('expired provider offers cannot ring again in app, edge push, or service worker',async()=>{
 const[center,dispatch,sw]=await Promise.all([read('src/mvp/NotificationCenter.tsx'),read('supabase/functions/push-dispatch/index.ts'),read('public/sw.js')])
 assert.match(center,/providerOfferNoticeActive/)
 assert.match(center,/rawExpiry=notice\.datos\.expira_at/)
 assert.match(center,/!providerOfferNoticeActive\(notice\)/)
 assert.match(dispatch,/offerExpiryMs\(notice\.datos\)/)
 assert.match(dispatch,/Oferta expirada antes del envío/)
 assert.match(dispatch,/TTL:pushTtl/)
 assert.match(sw,/payload\.type==='nueva_oferta'/)
 assert.match(sw,/expiry<=Date\.now\(\)/)
})

test('automatic arrival reuses the GPS fix already published by the live tracker',async()=>{
 const[service,root,tracker]=await Promise.all([read('src/mvp/provider/providerService.ts'),read('src/mvp/provider/ProviderRoot.tsx'),read('src/mvp/ProviderLocationTracker.tsx')])
 assert.match(tracker,/rpc\.rpc\('publicar_ubicacion_proveedor'/)
 assert.match(root,/data\.advance\('llegado',\{locationAlreadyPublished:true\}\)/)
 assert.match(service,/if\(!options\.locationAlreadyPublished\)await publishProviderLocation/)
 assert.match(service,/markProviderArrived\(supabase,serviceId,options\)/)
})
