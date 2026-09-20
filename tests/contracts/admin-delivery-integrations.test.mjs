import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const status=fs.readFileSync('api/admin/integrations-status.ts','utf8')
const api=fs.readFileSync('api/admin/integrations-status.ts','utf8')
const ui=fs.readFileSync('src/mvp/AdminDeliveryIntegrations.tsx','utf8')
const settings=fs.readFileSync('src/mvp/AdminSystemSettings.tsx','utf8')

test('runtime status exposes Uber iFood and Rappi without exposing secrets',()=>{
 assert.match(status,/id:'uber_direct'/)
 assert.match(status,/id:'ifood'/)
 assert.match(status,/id:'rappi'/)
 assert.match(status,/UBER_DIRECT_CLIENT_ID/)
 assert.match(status,/IFOOD_CLIENT_ID/)
 assert.match(status,/RAPPI_ACCESS_TOKEN/)
 assert.doesNotMatch(status,/client_secret:\s*process\.env/)
})

test('Uber Direct uses official OAuth client credentials flow',()=>{
 assert.match(api,/https:\/\/auth\.uber\.com\/oauth\/v2\/token/)
 assert.match(api,/grant_type:'client_credentials'/)
 assert.match(api,/scope:'eats\.deliveries'/)
})

test('iFood uses official merchant OAuth and verifies merchant permissions',()=>{
 assert.match(api,/merchant-api\.ifood\.com\.br\/authentication\/v1\.0\/oauth\/token/)
 assert.match(api,/grantType:'client_credentials'/)
 assert.match(api,/merchant-api\.ifood\.com\.br\/merchant\/v1\.0\/merchants/)
 assert.match(api,/authenticated_waiting_permissions/)
})

test('Rappi connector stays configurable instead of inventing a private endpoint',()=>{
 assert.match(api,/RAPPI_TEST_URL/)
 assert.match(api,/RAPPI_ACCESS_TOKEN/)
 assert.match(api,/RAPPI_API_KEY/)
 assert.doesNotMatch(api,/rappi\.com\/.*oauth/)
})

test('Admin integrations retry an expired Supabase session once',()=>{
 assert.match(settings,/supabase\.auth\.refreshSession\(\)/)
 assert.match(ui,/response\.status===401/)
 assert.match(ui,/supabase\.auth\.refreshSession\(\)/)
})

test('Admin UI provides connector cards and server-side tests',()=>{
 assert.match(settings,/AdminDeliveryIntegrations/)
 assert.match(ui,/Uber · iFood · Rappi/)
 assert.match(ui,/\/api\/admin\/integrations-status/)
 assert.match(ui,/Testar conexão/)
 assert.match(ui,/Documentação oficial/)
})
