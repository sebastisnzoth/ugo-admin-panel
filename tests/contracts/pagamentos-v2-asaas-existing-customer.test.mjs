import test from 'node:test'
import assert from 'node:assert/strict'
import { AsaasCustomerSandbox } from '../../src/server/payments/asaasCustomerSandbox.mjs'

function adapter(payload, status=200) {
  const calls=[]
  const client=new AsaasCustomerSandbox({ apiKey:'sandbox-fixture-only', fetchImpl:async(url,options)=>{
    calls.push({url,options})
    return { ok:status===200, status, json:async()=>payload }
  }})
  return {client,calls}
}

test('recovers sole manually created Sandbox customer without writes',async()=>{
  const {client,calls}=adapter({ data:[{id:'cus_fixture123',name:'Private test person'}],hasMore:false })
  assert.deepEqual(await client.findSoleExistingCustomer(),{found:true,customerId:'cus_fixture123'})
  assert.equal(calls.length,1)
  assert.equal(calls[0].options.method,'GET')
  assert.equal(calls[0].url,'https://api-sandbox.asaas.com/v3/customers?limit=2&offset=0')
})

test('empty customer list safely reports not found',async()=>{
  const {client}=adapter({data:[],hasMore:false})
  assert.deepEqual(await client.findSoleExistingCustomer(),{found:false})
})

test('ambiguous and invalid records fail closed',async()=>{
  for(const payload of [
    {data:[{id:'cus_a'},{id:'cus_b'}],hasMore:false},
    {data:[{id:'cus_a'}],hasMore:true},
    {data:[{id:'invalid'}],hasMore:false},
    {data:[{id:'cus_a'}]},
  ]){
    const {client}=adapter(payload)
    await assert.rejects(client.findSoleExistingCustomer())
  }
  const {client}=adapter({data:[],hasMore:false},403)
  await assert.rejects(client.findSoleExistingCustomer(),/audit failed/)
})
