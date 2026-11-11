import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import walletHandler from '../../payments-sandbox/api/wallets.js'

const src=async p=>readFile(new URL('../../payments-sandbox/'+p,import.meta.url),'utf8')
function makeResponse() {
 return {statusCode:200,headers:{},body:null,
  setHeader(k,v){this.headers[k]=v},
  end(data){this.body=JSON.parse(data)}}
}
async function withEnv(env,callback) {
 const keys=['VERCEL_ENV','UGO_PAYMENTS_TEST_ONLY','UGO_TEST_OPERATOR_TOKEN',
  'ASAAS_SANDBOX_API_KEY','ASAAS_PROVIDER_SANDBOX_API_KEY','UGO_ASAAS_ISSUER_WALLET_ID']
 const backup=Object.fromEntries(keys.map(k=>[k,process.env[k]]))
 try{
  for(const k of keys)delete process.env[k]
  for(const [k,v] of Object.entries(env))process.env[k]=v
  return await callback()
 }finally{for(const [k,v] of Object.entries(backup)){
   if(v===undefined)delete process.env[k];else process.env[k]=v
 }}
}
const makeRequest=(method='GET',token='')=>({
 method,headers:{authorization:token?('Bearer '+token):''},query:{account:'issuer'}
})

test('separate sandbox API has no charges, confirmation, payouts or Arena imports',async()=>{
 const [health,wallets,manifest]=await Promise.all([
  src('api/health.js'),src('api/wallets.js'),src('package.json')
 ])
 assert.match(health,/VERCEL_ENV!=='preview'/)
 assert.match(wallets,/VERCEL_ENV!=='preview'/)
 assert.match(health,/UGO_NEON_TEST_READONLY_URL/)
 assert.match(wallets,/https:\/\/api-sandbox\.asaas\.com\/v3\/wallets\//)
 assert.match(wallets,/timingSafeEqual/)
 assert.doesNotMatch(health+wallets,/supabase|service_role|api\.asaas\.com\/v3|createCharge|confirmSyntheticPayment|\/payments\b/i)
 assert.ok(JSON.parse(manifest).private)
})
test('wallet verification endpoint refuses production and unauthorized calls',async()=>{
 await withEnv({VERCEL_ENV:'production',UGO_PAYMENTS_TEST_ONLY:'1',UGO_TEST_OPERATOR_TOKEN:'secret'},async()=>{
  const res=makeResponse()
  await walletHandler(makeRequest('GET','secret'),res)
  assert.equal(res.statusCode,503)
  assert.equal(res.body.error,'sandbox_disabled')
 })
 await withEnv({VERCEL_ENV:'preview',UGO_PAYMENTS_TEST_ONLY:'1',UGO_TEST_OPERATOR_TOKEN:'secret'},async()=>{
  const res=makeResponse()
  await walletHandler(makeRequest('GET','incorrect'),res)
  assert.equal(res.statusCode,401)
  const correct=makeResponse()
  await walletHandler(makeRequest('GET','secret'),correct)
  assert.equal(correct.statusCode,503)
  assert.equal(correct.body.error,'sandbox_wallet_credentials_missing')
 })
})
test('wallet endpoint rejects non-GET operations even with valid operator token',async()=>{
 await withEnv({VERCEL_ENV:'preview',UGO_PAYMENTS_TEST_ONLY:'1',UGO_TEST_OPERATOR_TOKEN:'secret'},async()=>{
  const res=makeResponse()
  await walletHandler(makeRequest('POST','secret'),res)
  assert.equal(res.statusCode,405)
 })
})
