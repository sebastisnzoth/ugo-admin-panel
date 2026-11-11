import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const file=new URL('../../src/mvp/ProviderPixAfterService.tsx',import.meta.url)
const src=readFileSync(file,'utf8')
test('provider Pix is displayed only after service completion and while unpaid',()=>{
 assert.match(src,/stage==='not_finished'/)
 assert.match(src,/stage==='awaiting_payment'\|\|stage==='confirming'/)
 assert.match(src,/stage==='received'/)
 assert.match(src,/Não apresente o QR novamente/)
 assert.match(src,/Aguardando o pagamento do cliente/)
})
test('QR is provider-facing and requires Asaas confirmation; no credentials or browser-side charges',()=>{
 assert.match(src,/data:image\/png;base64/)
 assert.match(src,/Copiar código Pix/)
 assert.match(src,/após confirmação verificada no Asaas/)
 assert.doesNotMatch(src,/fetch\(|localStorage|sessionStorage|ASAAS_SANDBOX_API_KEY/)
 assert.doesNotMatch(src,/\/sandbox\/payment\/.*\/confirm|\/v3\/payments/)
})
