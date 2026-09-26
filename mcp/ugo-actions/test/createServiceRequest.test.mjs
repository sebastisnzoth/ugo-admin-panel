import test from'node:test'
import assert from'node:assert/strict'
import{validateCreateRequestInput}from'../src/createServiceRequest.js'

const base={userId:'11111111-1111-4111-8111-111111111111',role:'client',categoryId:'22222222-2222-4222-8222-222222222222',description:'Pérdida de agua bajo la pileta',address:'Rua teste 123',latitude:-27.59,longitude:-48.55,paymentMethod:'cash',confirmed:true}

test('requires explicit confirmation',()=>assert.throws(()=>validateCreateRequestInput({...base,confirmed:false}),/confirmación/i))
test('rejects Null Island',()=>assert.throws(()=>validateCreateRequestInput({...base,latitude:0,longitude:0}),/0,0/))
test('maps cash to persisted efectivo without changing external voice contract',()=>assert.equal(validateCreateRequestInput(base).paymentMethod,'efectivo'))
test('rejects provider role',()=>assert.throws(()=>validateCreateRequestInput({...base,role:'provider'}),/client/))
