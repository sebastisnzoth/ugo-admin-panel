import test from'node:test'
import assert from'node:assert/strict'
import{readFileSync}from'node:fs'
const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8')

test('sandbox click demo isolated from Arena, real money and production',()=>{
 const src=read('payments-sandbox/api/demo-checkout.js')
 assert.match(src,/process\.env\.VERCEL_ENV==='preview'/)
 assert.match(src,/process\.env\.UGO_PAYMENTS_TEST_ONLY==='1'/)
 assert.match(src,/process\.env\.UGO_PIX_DEMO_ENABLED==='1'/)
 assert.match(src,/host\.startsWith\('ugo-pagamentos-v2-sandbox-'/)
 assert.match(src,/process\.env\.UGO_NEON_TEST_WRITE_URL/)
 assert.match(src,/sandboxChargeSpec/)
 assert.match(src,/issueProviderPix/)
 assert.doesNotMatch(src,/api\.asaas\.com\/v3[^\n]*[^-]sandbox/)
 assert.doesNotMatch(src,/supabase\.from\(|SUPABASE_SERVICE_ROLE_KEY|service_role/)
})

test('sandbox only issues one canonical test charge and requires signed same-origin action',()=>{
 const src=read('payments-sandbox/api/demo-checkout.js')
 assert.match(src,/if\(old\)return readStatus\(db\)/)
 assert.match(src,/authenticate\(req,res\)/)
 assert.match(src,/originOk\(req\)/)
 assert.match(src,/SameSite=Strict/)
 assert.match(src,/HttpOnly/)
 assert.match(src,/timingSafeEqual/)
 assert.match(src,/existing_intent_requires_reconciliation/)
})

test('Pix Sandbox test UI supports QR display, copy and explicit simulated confirmation',()=>{
 const html=read('payments-sandbox/demo.html')
 assert.match(html,/Gerar QR Pix Sandbox/)
 assert.match(html,/Copiar código Pix/)
 assert.match(html,/Simular pagamento no Asaas Sandbox/)
 assert.match(html,/fetch\('\/api\/demo-checkout'/)
 assert.match(html,/data:image\/png;base64,/)
 assert.match(html,/Nenhum split ou pagamento/)
 const build=read('payments-sandbox/build.mjs')
 assert.match(build,/copyFileSync\('demo.html','dist\/demo.html'\)/)
})

test('simulation is only on the Asaas Sandbox endpoint and never releases a split',()=>{
 const src=read('payments-sandbox/api/demo-checkout.js')
 assert.match(src,/\/sandbox\/payment\//)
 assert.match(src,/payment_intents set status='unknown_processor_result'/)
 assert.match(src,/splitSettled:false/)
 assert.match(src,/providerPaid:false/)
 assert.doesNotMatch(src,/\/transfers|\/split|\/wallets\/transfer/)
})
