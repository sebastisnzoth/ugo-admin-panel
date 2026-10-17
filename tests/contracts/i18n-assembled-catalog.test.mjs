import test from 'node:test'
import assert from 'node:assert/strict'
import {loadCatalogs} from '../../scripts/lib/i18n-catalog.mjs'
const catalogs=loadCatalogs()
test('assembled runtime catalogs have complete locale parity, content and interpolation',()=>{
 const keys=[...new Set(Object.values(catalogs).flatMap(m=>Object.keys(m)))].sort()
 const params=s=>[...s.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)].map(m=>m[1]).sort()
 for(const key of keys)for(const locale of ['pt-BR','es','en']){
  const value=catalogs[locale][key]
  assert.ok(typeof value==='string'&&value.trim()&&value!==key,locale+' missing '+key)
  assert.deepEqual(params(value),params(catalogs['pt-BR'][key]),locale+' interpolation '+key)
 }
})
test('client cards, payment tracking, request summary and timeline have runtime translations',()=>{
 const keys=['clientRoot.skip','clientAssigned.label','clientAssigned.status','clientAssigned.homeServices','clientAssigned.reputation','clientAssigned.unrated','clientAssigned.projectAlt','clientAssigned.openTracking','clientTracking.timeline','clientTracking.service','clientSummary.photosOne','clientSummary.photosMany','clientSummary.rateTitle','clientSummary.referenceFrom','clientSummary.perHour','clientSummary.service','clientHistory.backHome','clientBoundary.openFailed',...['cash','paid','waiting','assigned'].flatMap(s=>['clientTracking.title.'+s,'clientTracking.text.'+s]),...['assigned','accepted','route','arrived','working','finished'].map(s=>'clientTracking.'+s)]
 for(const locale of ['pt-BR','es','en'])for(const key of keys)assert.ok(catalogs[locale][key],locale+' missing '+key)
})

test('dynamic client announcements and onboarding document states are translated',()=>{
 for(const locale of ['pt-BR','es','en'])for(const key of [...['home','request','history','profile'].map(s=>'clientRoot.announce.'+s),...['pendiente','aprobado','rechazado','en_revision'].map(s=>'status.'+s)])assert.ok(catalogs[locale][key],locale+' missing '+key)
})
