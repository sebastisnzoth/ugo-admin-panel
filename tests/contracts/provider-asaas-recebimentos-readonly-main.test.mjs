import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const src=async p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('main provider payout contains Asaas informational screen without replacing existing providers',async()=>{
 const [panel,screen]=await Promise.all([src('src/mvp/ProviderPayoutPanel.tsx'),src('src/mvp/ProviderAsaasRecebimentos.tsx')])
 assert.match(panel,/<ProviderAsaasRecebimentos locale=\{locale\}\/>/)
 assert.match(panel,/ProviderMercadoPagoConnect/)
 assert.match(panel,/requestWithdrawal/)
 assert.match(screen,/Meus recebimentos · Asaas Pix/)
})
test('no Pix key or Asaas account writes can occur from this main screen',async()=>{
 const screen=await src('src/mvp/ProviderAsaasRecebimentos.tsx')
 assert.match(screen,/<fieldset disabled/)
 assert.match(screen,/<button type="button" disabled>/)
 assert.doesNotMatch(screen,/localStorage|sessionStorage|\.from\(|fetch\(|cuenta_pago_externa/)
 assert.match(screen,/Nenhuma informação será salva/)
})
test('all Pix key types visible and amounts only illustrative',async()=>{
 const screen=await src('src/mvp/ProviderAsaasRecebimentos.tsx')
 for(const t of ['CPF','CNPJ','EMAIL','PHONE','EVP']) assert.match(screen,new RegExp('value="'+t+'"'))
 assert.match(screen,/85%.*15%/)
 assert.doesNotMatch(screen,/ASAAS_SANDBOX_API_KEY|service_role/)
})
