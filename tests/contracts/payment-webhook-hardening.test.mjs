import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const src = fs.readFileSync('api/pagos/webhook.ts', 'utf8')

test('webhook only accepts POST — GET widens crawl/CSRF + log leakage', () => {
  assert.match(src, /if\s*\(\s*req\.method\s*!==\s*['"]POST['"]\s*\)\s*return\s+res\.status\(\s*405\s*\)/)
  assert.doesNotMatch(src, /req\.method\s*!==\s*['"]GET['"]\s*&&\s*req\.method\s*!==\s*['"]POST['"]/)
})

test('webhook validates x-signature when secret is provisioned', () => {
  assert.match(src, /MERCADO_PAGO_WEBHOOK_SECRET|MP_WEBHOOK_SECRET/)
  assert.match(src, /x-signature/i)
  assert.match(src, /x-request-id/i)
  assert.match(src, /createHmac\s*\(\s*['"]sha256['"]/)
  assert.match(src, /timingSafeEqual/)
  assert.match(src, /verifyMpWebhookSignature/)
  assert.match(src, /status\(401\)/)
})

test('webhook never leaks mismatch/ignored discriminants (uniform 200)', () => {
  // Responses must be {received:true} without {mismatch:true} or {ignored:true}
  // to prevent enumeration of servicioId/ampliacionId via response diff.
  assert.doesNotMatch(src, /mismatch:\s*true/)
  assert.doesNotMatch(src, /ignored:\s*true/)
  // Uniform path still exists
  assert.match(src, /\{\s*received:\s*true\s*\}/)
})

test('webhook uses constant-time comparison for HMAC (timingSafeEqual)', () => {
  assert.match(src, /timingSafeEqual/)
  assert.doesNotMatch(src, /expected\s*===\s*parsed/)
})

test('webhook env guard documents empty-secret bootstrap mode', () => {
  const envExample = fs.readFileSync('.env.example', 'utf8')
  assert.match(envExample, /MERCADO_PAGO_WEBHOOK_SECRET/)
  assert.match(envExample, /x-signature/)
})
