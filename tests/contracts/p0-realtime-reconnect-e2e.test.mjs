import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source=readFileSync(new URL('../../scripts/p0-client-provider-e2e.mjs',import.meta.url),'utf8')

test('P0 browser proof forces offline/online recovery before the live offer',()=>{
 assert.match(source,/await context\.setOffline\(true\)/)
 assert.match(source,/await context\.setOffline\(false\)/)
 assert.match(source,/item\?\.origin==='realtime'&&item\?\.reason==='channel_ready'&&item\.at>previous/)
 assert.match(source,/P0_PROVIDER_SENT_BACK_TO_AUTH_AFTER_RECONNECT/)
 const recovery=source.indexOf('realtimeRecovery=await proveProviderRealtimeRecovery(ui)')
 const arm=source.indexOf('await armProviderLiveOfferProbe(ui.page)')
 const live=source.indexOf('if(ui)await assertProviderLiveOffer(ui,offerId,serviceId)')
 assert.ok(recovery>=0&&arm>recovery&&live>arm,'recovery must precede the offer delivered on the same page')
})

test('P0 matching rejects duplicate offers and proves acceptance replay idempotency',()=>{
 assert.match(source,/assert\.equal\(providerOffers\.length,1,'P0_DUPLICATE_PROVIDER_OFFERS'\)/)
 assert.match(source,/provider\.rpc\('aceptar_oferta',\{p_oferta_id:offerId\}\),'idempotent offer acceptance replay'/)
 assert.match(source,/P0_ACCEPT_REPLAY_CHANGED_ASSIGNMENT/)
 assert.match(source,/assert\.deepEqual\(serviceAfterReplay\.data,servicesAfter\.data,'P0_ACCEPT_REPLAY_CHANGED_SERVICE'\)/)
 assert.match(source,/assert\.deepEqual\(offersAfterReplay,offersAfter,'P0_ACCEPT_REPLAY_CHANGED_OFFERS'\)/)
})

test('P0 evidence records reconnection and idempotent acceptance without credentials',()=>{
 assert.match(source,/realtime_recovery:realtimeRecovery,accept_replay_idempotent:true,duplicate_provider_offers:false/)
 const recovery=source.slice(source.indexOf('async function proveProviderRealtimeRecovery'),source.indexOf('async function armProviderLiveOfferProbe'))
 assert.doesNotMatch(recovery,/access_token|refresh_token|serviceRole|password/)
})
