import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const file=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8')
const client=file('src/features/client/payments/ClientPaymentChoice.tsx')
const provider=file('src/mvp/provider/providerData.tsx')
const flags=file('src/lib/featureFlags.ts')
const sql=file('supabase/migrations/20260930190000_variable_price_lifecycle_payment_gate.sql')
test('Pix pay-after-service is locked out of production and defaults disabled',()=>{
 assert.match(flags,/isPixPayAfterServicePreviewEnabled/)
 assert.match(flags,/env.VITE_VERCEL_ENV === 'preview'/)
 assert.match(flags,/VITE_FLAG_PIX_PAY_AFTER_SERVICE_PREVIEW/)
})
test('client Preview Pix choice saves the preference but does not issue the charge',()=>{
 assert.match(client,/const preference=await persistPreference\('pix'\)/)
 assert.match(client,/if\(isPixPayAfterServicePreviewEnabled\(\)\)\{setMessage\(/)
 const choice=client.split('async function choosePix(){')[1].split('async function copyPix(){')[0]
 const preference=choice.indexOf("await persistPreference('pix')")
 const guard=choice.indexOf('if(isPixPayAfterServicePreviewEnabled())')
 const charge=choice.indexOf("fetch('/api/pagos/crear'")
 assert.ok(preference>=0&&guard>preference&&charge>guard)
 assert.match(choice.slice(guard,charge),/await load\(\);return/)
})
test('existing production Pix flow remains unchanged until coordinated backend upgrade',()=>{
 assert.match(client,/fetch\('\/api\/pagos\/crear'/)
 assert.match(provider,/effectivePaymentMethod==='pix'&&!funded/)
 assert.match(sql,/v_has_ready_payment/)
 assert.match(sql,/La forma de pago todavía no está confirmada para empezar el trabajo/)
})
