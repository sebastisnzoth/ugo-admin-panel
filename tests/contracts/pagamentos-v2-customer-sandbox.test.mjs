import test from 'node:test'
import assert from 'node:assert/strict'
import { AsaasCustomerSandbox } from '../../src/server/payments/asaasCustomerSandbox.mjs'
const good={name:'Cliente Teste',cpfCnpj:'12345678901',externalReference:'ugo_test_client_1',mobilePhone:'48999999999'}
test('customer adapter targets sandbox with customer and externalReference',async()=>{
  const calls=[]
  const api=new AsaasCustomerSandbox({apiKey:'fake',fetchImpl:async(url,options)=>{
    calls.push([url,options])
    return {ok:true,json:async()=>({id:'cus_123'})}
  }})
  assert.equal((await api.createCustomer(good)).id,'cus_123')
  assert.equal(calls[0][0],'https://api-sandbox.asaas.com/v3/customers')
  assert.equal(calls[0][1].headers.access_token,'fake')
  assert.deepEqual(JSON.parse(calls[0][1].body),good)
  await api.getCustomer('cus_123')
  assert.equal(calls[1][0],'https://api-sandbox.asaas.com/v3/customers/cus_123')
})
test('customer lookup by reference is read only and URL escaped',async()=>{
  const calls=[]
  const api=new AsaasCustomerSandbox({apiKey:'fake',fetchImpl:async(url,init)=>{
    calls.push({url,method:init.method}); return {ok:true,json:async()=>({data:[]})}
  }})
  await api.findByExternalReference('ugo_test_client_1')
  assert.equal(calls[0].url,'https://api-sandbox.asaas.com/v3/customers?externalReference=ugo_test_client_1')
  assert.equal(calls[0].method,'GET')
})
test('invalid customer details or identifiers fail before reaching network',async()=>{
  let count=0
  const api=new AsaasCustomerSandbox({apiKey:'fake',fetchImpl:async()=>{count++;throw Error('unexpected')}})
  await assert.rejects(api.createCustomer({...good,cpfCnpj:'invalid'}))
  await assert.rejects(api.createCustomer({...good,externalReference:'../admin'}))
  await assert.rejects(api.createCustomer({...good,name:'x'}))
  await assert.rejects(api.getCustomer('../admin'))
  assert.equal(count,0)
})
test('processor errors never disclose response body or key',async()=>{
  const api=new AsaasCustomerSandbox({apiKey:'private_secret',fetchImpl:async()=>({ok:false,status:401,json:async()=>({secret:'private_secret'})})})
  await assert.rejects(api.getCustomer('cus_1'),e=>e.message==='Asaas sandbox customer request failed (401)')
})
