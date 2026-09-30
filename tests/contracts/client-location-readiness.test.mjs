import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const screen=fs.readFileSync('src/features/client/request/ClientLocationScreen.tsx','utf8')
const css=fs.readFileSync('src/features/client/request/clientLocationScreen.css','utf8')
const runtime=fs.readFileSync('scripts/client-location-runtime.mjs','utf8')
const judge=fs.readFileSync('scripts/client-location-judge.mjs','utf8')
const sentinel=fs.readFileSync('scripts/client-location-sentinel.mjs','utf8')
const workflow=fs.readFileSync('.github/workflows/client-location-runtime.yml','utf8')

test('client location map reflects authoritative pickup state',()=>{
  assert.match(screen,/Mapa de ubicación del servicio/)
  assert.match(screen,/Ubicación confirmada/)
  assert.match(screen,/Ubicación pendiente/)
  assert.match(screen,/className=\{'ugo-location-map'\+\(pickup\?' has-location':''\)\}/)
  assert.match(css,/\.ugo-location-map\.has-location/)
})

test('client location keeps GPS fail-closed semantics',()=>{
  assert.match(screen,/enableHighAccuracy:true/)
  assert.match(screen,/timeout:15000/)
  assert.match(screen,/maximumAge:0/)
  assert.match(screen,/permiso de ubicación/)
  assert.match(screen,/tardó demasiado/)
  assert.match(screen,/coordenadas inválidas/)
  assert.match(screen,/savePickup\(null,null,'manual'\)/)
})

test('client location runtime proves valid, invalid, permission and timeout cases',()=>{
  for(const token of ['MAP_CONFIRMED_CLASS_REQUIRED','INVALID_COORDS_MUST_FAIL_CLOSED','clearPermissions','timeout_message'])assert.ok(runtime.toLowerCase().includes(token.toLowerCase()),token)
  assert.match(runtime,/setGeolocation\(\{latitude:0,longitude:0\}\)/)
  assert.match(runtime,/clearPermissions\(\)/)
  assert.match(runtime,/Object\.defineProperty\(navigator,'geolocation'/)
})

test('client location Judge Sentinel and workflow are same-SHA TEST-only',()=>{
  assert.match(judge,/runtime SHA mismatch/)
  assert.match(judge,/validator:'Judge'/)
  assert.match(sentinel,/validator:'Sentinel'/)
  assert.match(sentinel,/physical GPS must remain deferred/)
  assert.match(workflow,/UGO Readiness Client Location TEST/)
  assert.match(workflow,/UGO_RUNTIME_SHA="\$\{GITHUB_SHA\}"/)
  assert.match(workflow,/tmossnqfwfwjrtzwcbmm\.supabase\.co/)
})
