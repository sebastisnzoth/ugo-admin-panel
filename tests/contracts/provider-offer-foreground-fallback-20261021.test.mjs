import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8')
const center=read('src/mvp/NotificationCenter.tsx')
const root=read('src/mvp/provider/ProviderRoot.tsx')

test('Provider foreground alert recovers fresh pending offer without notification DB INSERT',()=>{
 assert.match(root,/providerOffers=\{data\.offers\}/)
 assert.match(center,/providerOffers\?:ReadonlyArray<ProviderOfferSnapshot>/)
 assert.match(center,/if\(role!=='provider'\|\|!attentionEnabled\|\|!providerOffers\?\.length/)
 assert.match(center,/item\.estado!=='pendiente'/)
 assert.match(center,/expires>now&&expires-now<=300_000&&expires-now>=210_000/)
 assert.match(center,/signalProviderAlert\(\{id:'offer:'\+offer\.id,tipo:'nueva_oferta'/)
 assert.match(center,/oferta_id:offer\.id,servicio_id:offer\.servicio_id,expira_at:offer\.expira_at/)
 assert.match(center,/\[attentionEnabled,providerOffers,role,signalProviderAlert\]/)
 assert.doesNotMatch(center,/providerOffers.*\.from\('notificaciones'\)/)
})

test('Recovery shares existing offer expiry de-duplication and authenticated provider attention controls',()=>{
 assert.match(center,/function providerAlertKey\(notice:UgoNotification\)/)
 assert.match(center,/const signalProviderAlert=useCallback/)
 assert.match(center,/providerAlertSeen\.current\.has\(alertKey\)/)
 assert.match(center,/PROVIDER_CALL_TYPES\.has\(notice\.tipo\)&&!attentionEnabled/)
 assert.match(center,/providerOfferNoticeActive\(notice\)/)
 assert.match(center,/freshLiveNotice\(notice\)/)
 assert.match(center,/navigator\.vibrate\?\./)
 assert.match(center,/playProviderTone\(\)/)
})
