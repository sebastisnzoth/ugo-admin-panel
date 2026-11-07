import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const fromRoot = async path => readFile(new URL('../../'+path,import.meta.url),'utf8')

test('Asaas Pix info is mounted in existing main payout panel without payment mutations',async()=>{
 const [panel,flags]=await Promise.all([
  fromRoot('src/mvp/ProviderPayoutPanel.tsx'),
  fromRoot('src/lib/featureFlags.ts'),
 ])
 assert.match(panel,/<ProviderAsaasRecebimentos locale=\{locale\}\/>/)
 assert.match(flags,/VITE_FLAG_ASAAS_RECEBIMENTOS_PREVIEW/)
 assert.match(flags,/env\.MODE === 'production' \|\| env\.PROD === true/)
 assert.match(panel,/ProviderMercadoPagoConnect/)
 assert.match(panel,/requestWithdrawal/)
})

test('Pix form is clearly nonfunctional and never stores keys in legacy payment fields',async()=>{
 const [screen,panel]=await Promise.all([
  fromRoot('src/mvp/ProviderAsaasRecebimentos.tsx'),
  fromRoot('src/mvp/ProviderPayoutPanel.tsx')
 ])
 assert.match(screen,/<fieldset disabled/)
 assert.match(screen,/<button type="button" disabled>/)
 assert.match(screen,/Nenhuma informação será salva/)
 assert.doesNotMatch(screen,/localStorage|sessionStorage|\.from\(|fetch\(|cuenta_pago_externa/)
 assert.match(panel,/cuenta_pago_externa/)
 assert.match(screen,/85%.*15%/)
})

test('Pix key selection covers all Asaas bank-transfer types without collecting API keys',async()=>{
 const screen=await fromRoot('src/mvp/ProviderAsaasRecebimentos.tsx')
 for (const type of ['CPF','CNPJ','EMAIL','PHONE','EVP'])
  assert.match(screen,new RegExp('value="'+type+'"'))
 assert.doesNotMatch(screen,/ASAAS_SANDBOX_API_KEY|service_role/)
})

test('Asaas receiving preview warns about parent CNPJ and still blocks Pix key registration',async()=>{
 const screen=await fromRoot('src/mvp/ProviderAsaasRecebimentos.tsx')
 assert.match(screen,/conta principal da plataforma precisa ter CNPJ/)
 assert.match(screen,/subcontas/)
 assert.match(screen,/<fieldset disabled/)
})
