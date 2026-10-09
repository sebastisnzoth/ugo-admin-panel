import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const bridge = fs.readFileSync('src/features/client/payments/DemoSebastianPaymentBridge.tsx', 'utf8')
const root = fs.readFileSync('src/features/client/ClientRoot.tsx', 'utf8')

test('DemoSebastianPaymentBridge never intercepts real checkout', () => {
  // Hard guard inside bridge: only in UGO TEST + ?demo
  assert.match(bridge, /UGO_ENVIRONMENT\s*!==?\s*['"]test['"]/)
  assert.match(bridge, /location\.search\.includes\(['"]demo['"]\)/)
  assert.match(bridge, /UGO_ENVIRONMENT/)
  assert.match(bridge, /from['"].*supabaseProject['"]/)
})

test('ClientRoot mounts DemoBridge only behind demo flag', () => {
  assert.match(root, /demo&&<DemoSebastianPaymentBridge/)
  assert.doesNotMatch(root, /<DemoSebastianPaymentBridge\/>.*demo&&/s)
  // Ensure not unconditional: file must NOT contain bare <DemoSebastianPaymentBridge/> without demo&& guard
  const bare = root.match(/<DemoSebastianPaymentBridge/g) || []
  const guarded = root.match(/demo&&<DemoSebastianPaymentBridge/g) || []
  assert.equal(bare.length, guarded.length)
})

test('cash-select/confirm remains canonical in api/operations.ts', () => {
  const ops = fs.readFileSync('api/operations.ts', 'utf8')
  assert.match(ops, /seleccionar_pago_efectivo/)
  assert.match(ops, /confirmar_pago_efectivo/)
  assert.match(ops, /case 'cash-select'/)
  assert.match(ops, /case 'cash-confirm'/)
})
