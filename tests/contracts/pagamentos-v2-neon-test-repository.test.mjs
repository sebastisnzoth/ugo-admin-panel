import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { NeonPixTestRepository } from '../../src/server/payments/neonPixTestRepository.mjs'
import { issueSandboxPixQr } from '../../src/server/payments/asaasPixCheckoutFlow.mjs'
const sql=async name=>readFile(new URL('../../docs/sql/'+name,import.meta.url),'utf8')
const issuer='b7f0bd20-06ee-4ce3-857c-c7868e8d071b'
const wallet='ab5b5a59-f2eb-40eb-8b8b-bb7314685a33'
const svc='00000000-0000-4000-8000-000000009981'
const client='00000000-0000-4000-8000-000000009982'
const provider='00000000-0000-4000-8000-000000009983'
async function setup(){
 const db=new PGlite()
 await db.exec(await sql('ugo_pagamentos_v2_isolated_test_schema.sql'))
 await db.exec(await sql('ugo_pagamentos_v2_reserve_pix_test.sql'))
 await db.exec(await sql('ugo_pagamentos_v2_test_services.sql'))
 await db.query(`insert into ugo_payments_v2.test_services
   (id,cliente_id,proveedor_id,estado,tarifa_cents)
   values ($1,$2,$3,'completado',10000)`,[svc,client,provider])
 await db.query(`insert into ugo_payments_v2.customer_links
   (ugo_client_id,environment,asaas_customer_id)
   values ($1,'sandbox','cus_synthetic')`,[client])
 await db.query(`insert into ugo_payments_v2.provider_accounts
   (ugo_provider_id,environment,asaas_account_id,asaas_wallet_id,verified_at,kyc_approved_at)
   values ($1,'sandbox','acc_synthetic',$2,now(),now())`,[provider,wallet])
 const walletVerifier={verifyIssuerWallet:async()=>({walletId:issuer,verified:true,environment:'sandbox'})}
 const repo=new NeonPixTestRepository({db,issuerWalletId:issuer,walletVerifier})
 return {db,repo}
}
test('isolated Neon adapter loads only synthetic TEST service and verified wallets',async()=>{
 const {db,repo}=await setup()
 try{
  const c=await repo.loadContext(svc)
  assert.equal(c.service.tarifa,100)
  assert.equal(c.serviceReference,'ugo_test_'+svc.replace(/-/g,''))
  assert.equal(c.customerLink.asaasCustomerId,'cus_synthetic')
  assert.equal(c.providerAccount.verified,true)
  assert.equal(c.issuerWalletVerified,true)
  await assert.rejects(repo.loadContext('00000000-0000-4000-8000-000000009999'),/not found/)
 }finally{await db.close()}
})
test('real SQL reserve enforces one payment per service, then records processor ID',async()=>{
 const {db,repo}=await setup()
 try{
  const first=await repo.reservePix({serviceId:svc,providerId:provider,amountBRL:100})
  assert.equal(first.mode,'reserved')
  const again=await repo.reservePix({serviceId:svc,providerId:provider,amountBRL:100})
  assert.equal(again.mode,'reconcile')
  await assert.rejects(repo.reservePix({serviceId:svc,providerId:client,amountBRL:100}),/owner/)
  await repo.recordProcessorCharge({reservationId:first.reservationId,paymentId:'pay_synthetic'})
  const row=await db.query('select status,asaas_payment_id from ugo_payments_v2.payment_intents')
  assert.equal(row.rows[0].asaas_payment_id,'pay_synthetic')
  assert.equal(row.rows[0].status,'pending')
  await assert.rejects(repo.recordProcessorCharge({reservationId:first.reservationId,paymentId:'pay_other'}),/persistence conflict/)
  await repo.markUncertain({reservationId:first.reservationId})
  const last=await db.query('select status from ugo_payments_v2.payment_intents')
  assert.equal(last.rows[0].status,'unknown_processor_result')
 }finally{await db.close()}
})
test('mock Pix E2E: verified issuer and provider -> atomic reservation -> QR without marking paid',async()=>{
 const {db,repo}=await setup()
 try{
  const calls=[]
  const asaas={
   createChargeWithSplit:async arg=>{calls.push(['create',arg]);return {id:'pay_synthetic'}},
   getQr:async()=>({copyPasteCode:'000201TEST',qrCodeImageBase64:'BASE64'}),
  }
  const result=await issueSandboxPixQr({
   serviceId:svc,authenticatedProviderId:provider,repo,asaas,dueDate:'2026-11-10',
  })
  assert.equal(result.state,'awaiting_payment')
  assert.equal(result.paymentId,'pay_synthetic')
  assert.equal(result.qr.copyPasteCode,'000201TEST')
  assert.equal(calls[0][1].providerWalletId,wallet)
  assert.equal(calls[0][1].serviceReference,'ugo_test_'+svc.replace(/-/g,''))
  const state=await db.query('select status from ugo_payments_v2.payment_intents')
  assert.equal(state.rows[0].status,'pending')
 }finally{await db.close()}
})
test('failed wallet identity is rejected before recording or reserving a Pix',async()=>{
 const {db}=await setup()
 try{
  const bad=new NeonPixTestRepository({db,issuerWalletId:issuer,walletVerifier:{
   verifyIssuerWallet:async()=>({walletId:'bad',verified:true,environment:'sandbox'}),
  }})
  await assert.rejects(bad.loadContext(svc),/authentication failed/)
  const n=await db.query('select count(*)::int as count from ugo_payments_v2.payment_intents')
  assert.equal(n.rows[0].count,0)
 }finally{await db.close()}
})
