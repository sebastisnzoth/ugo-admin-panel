import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const providerData=fs.readFileSync('src/mvp/provider/providerData.tsx','utf8')
const providerHome=fs.readFileSync('src/mvp/provider/ProviderHome.tsx','utf8')
const tracker=fs.readFileSync('src/mvp/ProviderLocationTracker.tsx','utf8')
const pages=fs.readFileSync('.github/workflows/github-pages.yml','utf8')
const sw=fs.readFileSync('public/sw.js','utf8')
const migration=fs.readFileSync('supabase/migrations/20261003004651_repair_provider_matching_runtime_grants_and_gps_window.sql','utf8')
const readiness=JSON.parse(fs.readFileSync('docs/UGO_FUNCTIONAL_READINESS.json','utf8'))

test('provider UI never equates persisted Online with matching readiness',()=>{
  assert.match(providerData,/MATCHING_GPS_FRESH_MS=90_000/)
  assert.match(providerData,/matchingReady:boolean/)
  assert.match(providerHome,/Online, pero todavía fuera del radar/)
  assert.match(providerHome,/Actualizar ubicación/)
})

test('matching GPS window tolerates browser jitter while arrival remains strict',()=>{
  assert.match(migration,/interval ''90 seconds''/)
  assert.match(tracker,/MATCHING_POSITION_AGE_MS=90_000/)
  assert.match(tracker,/MAX_POSITION_AGE_MS=30_000/)
  assert.doesNotMatch(migration,/marcar_llegada_proveedor/)
})

test('GitHub Pages publishes every main SHA and push stays inside its scope',()=>{
  const pushBlock=pages.slice(pages.indexOf('  push:'),pages.indexOf('  workflow_dispatch:'))
  assert.doesNotMatch(pushBlock,/\n\s+paths:/)
  assert.match(sw,/self\.registration\.scope/)
  assert.match(sw,/new URL\(\`\?app=provider/)
  assert.doesNotMatch(sw,/role==='provider'\?\`\/\?app=provider/)
})

test('failed physical provider chain is not reported VERIFIED',()=>{
  const map=new Map()
  for(const group of readiness.groups||[]) for(const item of group.items||[]) map.set(item.id,item.status)
  for(const id of ['provider-offers','provider-alerts','provider-gps','provider-notifications','provider-realtime-location','proximity-matching','provider-proximity-alert']){
    assert.notEqual(map.get(id),'VERIFIED',id)
  }
  for(const id of ['provider-arrival','provider-evidence','provider-workflow','client-provider-lifecycle']){
    assert.equal(map.get(id),'BLOCKED',id)
  }
})
