import test from 'node:test'
import assert from 'node:assert/strict'
import {parseAuthenticatedWallet,AsaasWalletReadOnlySandbox} from '../../src/server/payments/asaasWalletReadOnlySandbox.mjs'
import walletHandler from '../../payments-sandbox/api/wallets.js'
const wallet='c4125b7d-fb92-4232-923a-01ab389a84f7'
const fromAsaas={object:'list',hasMore:false,totalCount:1,data:[{object:'wallet',id:wallet}]}
function res(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(v){this.body=JSON.parse(v)}}}
test('authenticated GET /wallets parser accepts real Asaas shape using id',()=>{
 assert.deepEqual(parseAuthenticatedWallet(fromAsaas,wallet),{verified:true,environment:'sandbox',walletId:wallet})
})
test('authenticated wallet verifier rejects wrong wallet, multiple records and conflicting fields',()=>{
 assert.throws(()=>parseAuthenticatedWallet(fromAsaas,'064a4957-1eee-4d06-9c96-deaf8a17534d'),/differs/)
 assert.throws(()=>parseAuthenticatedWallet({...fromAsaas,data:[...fromAsaas.data,...fromAsaas.data]},wallet),/Ambiguous/)
 assert.throws(()=>parseAuthenticatedWallet({...fromAsaas,data:[{id:wallet,walletId:'064a4957-1eee-4d06-9c96-deaf8a17534d'}]},wallet),/Ambiguous/)
})
test('read-only authenticated Sandbox adapter verifies matching real wallet data',async()=>{
 const service=new AsaasWalletReadOnlySandbox({apiKey:'test-only',fetchImpl:async(url,init)=>{
  assert.equal(url,'https://api-sandbox.asaas.com/v3/wallets/')
  assert.equal(init.method,'GET')
  return {ok:true,json:async()=>fromAsaas}
 }})
 assert.equal((await service.verifyIssuerWallet(wallet)).verified,true)
})
test('isolated wallet handler verifies account without exposing secrets',async()=>{
 const names=['VERCEL_ENV','UGO_PAYMENTS_TEST_ONLY','UGO_TEST_OPERATOR_TOKEN','ASAAS_SANDBOX_API_KEY','UGO_ASAAS_ISSUER_WALLET_ID']
 const prev=Object.fromEntries(names.map(k=>[k,process.env[k]]))
 const oldFetch=globalThis.fetch
 try {
  Object.assign(process.env,{VERCEL_ENV:'preview',UGO_PAYMENTS_TEST_ONLY:'1',
   UGO_TEST_OPERATOR_TOKEN:'test-operator-token',ASAAS_SANDBOX_API_KEY:'test-only',UGO_ASAAS_ISSUER_WALLET_ID:wallet})
  globalThis.fetch=async(url,init)=>({ok:true,json:async()=>fromAsaas})
  const out=res()
  await walletHandler({method:'GET',headers:{authorization:'Bearer test-operator-token'},query:{account:'issuer'}},out)
  assert.equal(out.statusCode,200)
  assert.equal(out.body.walletId,wallet)
  assert.equal(out.body.verified,true)
  assert.equal(JSON.stringify(out.body).includes('test-only'),false)
 }finally{
  globalThis.fetch=oldFetch
  for(const [k,v] of Object.entries(prev)){if(v===undefined)delete process.env[k];else process.env[k]=v}
 }
})
