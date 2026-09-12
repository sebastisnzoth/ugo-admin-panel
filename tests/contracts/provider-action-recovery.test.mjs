import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const source=fs.readFileSync(new URL('../../src/mvp/provider/providerData.tsx',import.meta.url),'utf8')

test('generic provider actions reconcile persisted state after ambiguous failure',()=>{
 assert.match(source,/catch\(e\)\{try\{await reload\(\)\}catch\{\}/)
})

test('cash confirmation reconciles persisted payment before surfacing rpc failure',()=>{
 assert.match(source,/confirmar_pago_efectivo[\s\S]*if\(error\)\{await reload\(\);throw error\}/)
})

test('provider still blocks departure until a valid payment method is persisted',()=>{
 assert.match(source,/service\.estado==='asignado'&&!funded&&!cashSelected/)
})
