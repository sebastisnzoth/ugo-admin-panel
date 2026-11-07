import test from 'node:test'
import assert from 'node:assert/strict'
import { AsaasCustomerSandbox, buildAsaasCustomer, shouldCreateAsaasCustomer } from '../../src/server/payments/asaasCustomerSandbox.mjs'
const good={name:'Cliente Teste',cpfCnpj:'12345678901',externalReference:'ugo_test_client_1',mobilePhone:'48999999999'}

test('customer adapter creates customer only in Asaas Sandbox and returns customer ID',async()=>{
  const calls=[]
  const api=new AsaasCustomerSandbox({apiKey:'fake',fetchImpl:async(url,options)=>{
    calls.push([url,options])
    return {ok:true,json:async()=>({id:'cus_123',cpfCnpj:'12345678901'})}
  }})
  assert.deepEqual(await api.createCustomer(good),{customerId:'cus_123'})
  assert.equal(calls[0][0],'https://api-sandbox.asaas.com/v3/customers')
  assert.equal(calls[0][1].headers.access_token,'fake')
  assert.deepEqual(JSON.parse(calls[0][1].body),{...good,notificationDisabled:true})
})

test('mapping must reuse existing Asaas customer, not create per charge',()=>{
  assert.equal(shouldCreateAsaasCustomer(null),true)
  assert.equal(shouldCreateAsaasCustomer({environment:'sandbox',asaasCustomerId:'cus_123'}),false)
  assert.throws(()=>shouldCreateAsaasCustomer({environment:'production',asaasCustomerId:'cus_123'}))
})

test('invalid input fails without external requests',async()=>{
  let called=false
  const api=new AsaasCustomerSandbox({apiKey:'fake',fetchImpl:async()=>{called=true;throw Error('network')}})
  await assert.rejects(api.createCustomer({...good,cpfCnpj:'notdocument'}))
  await assert.rejects(api.createCustomer({...good,externalReference:'../admin'}))
  await assert.rejects(api.createCustomer({...good,name:'x'}))
  assert.equal(called,false)
})

test('Asaas errors are sanitized and never expose PII or secrets',async()=>{
  const api=new AsaasCustomerSandbox({apiKey:'private_secret',fetchImpl:async()=>({ok:false,status:401,json:async()=>({secret:'private_secret'})})})
  await assert.rejects(api.createCustomer(good),e=>e.message==='Asaas sandbox customer request failed (401)')
})

test('customer builder validates and disables duplicate processor notifications by default',()=>{
  assert.equal(buildAsaasCustomer(good).notificationDisabled,true)
  assert.equal(buildAsaasCustomer(good).externalReference,'ugo_test_client_1')
})
