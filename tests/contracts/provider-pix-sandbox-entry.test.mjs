import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8')

test('provider Pix modal renders authenticated service-specific Sandbox flow instead of fixed R$100 demo',()=>{
 const screen=read('src/mvp/ProviderPostServiceCollection.tsx')
 const job=read('src/mvp/provider/ProviderActiveJob.tsx')
 const checkout=read('src/mvp/ProviderDeferredPixStatus.tsx')
 assert.match(screen,/previewPix\?<ProviderDeferredPixStatus serviceId=\{serviceId\}/)
 assert.match(screen,/amountBRL=\{amount\}/)
 assert.match(job,/previewPix=\{deferredPixPreview\?/)
 assert.match(checkout,/Authorization:'Bearer '\+accessToken/)
 assert.match(checkout,/Math\.abs\(Number\(payload\.amountBRL\)-amountBRL\)>0\.009/)
 assert.doesNotMatch(screen,/PIX_SANDBOX_DEMO_URL|demo\.html|href=\{PIX_SANDBOX_DEMO_URL\}/)
})

test('provider Pix modal keeps real production issue disabled and never falsely confirms payment',()=>{
 const screen=read('src/mvp/ProviderPostServiceCollection.tsx')
 const flags=read('src/lib/featureFlags.ts')
 assert.match(screen,/row\.procesador==='asaas'/)
 assert.match(screen,/row\.estado==='pendiente'/)
 assert.match(flags,/env\.VITE_VERCEL_ENV==='preview'/)
 assert.match(flags,/VITE_FLAG_PIX_PROVIDER_ISSUE_PREVIEW/)
 assert.doesNotMatch(screen,/\/api\/pagos\/crear/)
})
