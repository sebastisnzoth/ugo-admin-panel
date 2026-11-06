import test from 'node:test'
import assert from 'node:assert/strict'
import { AsaasCustomerSandbox, buildAsaasCustomer, shouldCreateAsaasCustomer } from '../../src/server/payments/asaasCustomerSandbox.mjs'
const payer = { name: 'Cliente Teste', cpfCnpj: '12345678901', externalReference: 'ugo_test_client_1', mobilePhone: '48999999999' }
test('build Asaas payer with UGO reference, without leaking sandbox transport to browser', () => {
  assert.deepEqual(buildAsaasCustomer(payer), { ...payer, notificationDisabled: true })
})
test('customer registration pins sandbox endpoint, uses secret header and returns ID only', async () => {
  const urls = []
  const api = new AsaasCustomerSandbox({ apiKey: 'test_only', fetchImpl: async (url, init) => {
    urls.push(url)
    assert.equal(init.headers.access_token, 'test_only')
    assert.equal(JSON.parse(init.body).externalReference, payer.externalReference)
    return { ok: true, json: async () => ({ id: 'cus_123', cpfCnpj: payer.cpfCnpj }) }
  } })
  assert.deepEqual(await api.createCustomer(payer), { customerId: 'cus_123' })
  assert.deepEqual(urls, ['https://api-sandbox.asaas.com/v3/customers'])
})
test('existing sandbox payer is reused; malformed or cross-environment linkage is refused', () => {
  assert.equal(shouldCreateAsaasCustomer(null), true)
  assert.equal(shouldCreateAsaasCustomer({ environment: 'sandbox', asaasCustomerId: 'cus_123' }), false)
  assert.throws(() => shouldCreateAsaasCustomer({ environment: 'production', asaasCustomerId: 'cus_123' }))
  assert.throws(() => shouldCreateAsaasCustomer({ environment: 'sandbox', asaasCustomerId: '../admin' }))
})
test('invalid payer payload is rejected before network call', async () => {
  let called = false
  const api = new AsaasCustomerSandbox({ apiKey: 'test_only', fetchImpl: async () => { called = true; throw Error('Must not call') } })
  await assert.rejects(api.createCustomer({ ...payer, cpfCnpj: 'abc' }), /document format/)
  await assert.rejects(api.createCustomer({ ...payer, externalReference: '../admin' }), /reference/)
  assert.equal(called, false)
})
test('processor errors never echo personal data', async () => {
  const api = new AsaasCustomerSandbox({ apiKey: 'private', fetchImpl: async () => ({ ok: false, status: 409, json: async () => ({ cpfCnpj: payer.cpfCnpj }) }) })
  await assert.rejects(api.createCustomer(payer), e => e.message === 'Asaas sandbox customer request failed (409)' && !e.message.includes(payer.cpfCnpj))
})

test('customer lookup is GET-only and links by UGO externalReference',async()=>{
  const reference='ugo_test_client_1'
  const calls=[]
  const api=new AsaasCustomerSandbox({apiKey:'fake',fetchImpl:async(url,opts)=>{
    calls.push([url,opts])
    return {ok:true,json:async()=>({data:[{id:'cus_123',externalReference:reference}],hasMore:false})}
  }})
  assert.deepEqual(await api.findCustomerByReference(reference),{found:true,customerId:'cus_123'})
  assert.equal(calls[0][0],'https://api-sandbox.asaas.com/v3/customers?externalReference=ugo_test_client_1&limit=100')
  assert.equal(calls[0][1].method,'GET')
  assert.equal(calls[0][1].body,undefined)
})
test('fail closed for duplicates, pagination and mismatched payer',async()=>{
  for(const response of [
    {data:[{id:'cus_1',externalReference:'ugo_1'},{id:'cus_2',externalReference:'ugo_1'}],hasMore:false},
    {data:[],hasMore:true},
    {data:[{id:'cus_1',externalReference:'someone_else'}],hasMore:false},
    {data:[{id:'cus_1'}],hasMore:false},
    {},
  ]) {
    const api=new AsaasCustomerSandbox({apiKey:'fake',fetchImpl:async()=>({ok:true,json:async()=>response})})
    await assert.rejects(api.findCustomerByReference('ugo_1'))
  }
})
test('empty lookup yields not-found; invalid IDs never reach the network',async()=>{
  const api=new AsaasCustomerSandbox({apiKey:'fake',fetchImpl:async()=>({ok:true,json:async()=>({data:[],hasMore:false})})})
  assert.deepEqual(await api.findCustomerByReference('ugo_test_1'),{found:false})
  let called=false
  const blocked=new AsaasCustomerSandbox({apiKey:'fake',fetchImpl:async()=>{called=true;throw Error('unexpected')}})
  await assert.rejects(blocked.findCustomerByReference('../customer'))
  assert.equal(called,false)
})
