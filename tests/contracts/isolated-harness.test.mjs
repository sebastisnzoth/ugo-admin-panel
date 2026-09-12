import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const harnessUrl = new URL('../integration/client-provider-rpc-rls.test.mjs', import.meta.url)
const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

function runGuard(projectRef, required = true) {
  const env = { ...process.env, UGO_REQUIRE_ISOLATED_INTEGRATION: required ? '1' : '0' }
  delete env.NODE_TEST_CONTEXT
  for (const name of Object.keys(env)) {
    if (name.startsWith('UGO_TEST_')) delete env[name]
  }
  if (projectRef) {
    Object.assign(env, {
      UGO_TEST_SUPABASE_URL: `https://${projectRef}.supabase.co`,
      UGO_TEST_SUPABASE_ANON_KEY: 'test-key',
      UGO_TEST_CLIENT_EMAIL: 'client@example.invalid',
      UGO_TEST_CLIENT_PASSWORD: 'test-password',
      UGO_TEST_PROVIDER_EMAIL: 'provider@example.invalid',
      UGO_TEST_PROVIDER_PASSWORD: 'test-password',
    })
  }
  const blockNetwork = 'globalThis.fetch = async () => { throw new Error("NETWORK_ATTEMPT_FORBIDDEN") }'
  const result = spawnSync(process.execPath, [
    '--import', `data:text/javascript,${encodeURIComponent(blockNetwork)}`,
    '--test', fileURLToPath(harnessUrl),
  ], { env, encoding: 'utf8', timeout: 10000 })
  assert.ifError(result.error)
  const output = result.stdout + result.stderr
  assert.doesNotMatch(output, /NETWORK_ATTEMPT_FORBIDDEN/)
  return { status: result.status, output }
}

for (const [projectRef, label] of [
  ['trfsjuseqjxlhrxuvdsm', 'producción'],
  ['tmossnqfwfwjrtzwcbmm', 'UGO Arena'],
]) {
  test(`isolated harness rejects ${label} before any network request`, () => {
    const result = runGuard(projectRef)
    assert.equal(result.status, 1)
    assert.ok(result.output.includes(`se niega a ejecutar contra ${label}`))
  })
}

test('required isolated gate fails without credentials while regular tests skip safely', () => {
  const required = runGuard(null)
  assert.equal(required.status, 1)
  assert.match(required.output, /P0 isolated RPC\/RLS requerido pero faltan/)
  const optional = runGuard(null, false)
  assert.equal(optional.status, 0)
  assert.match(optional.output, /SKIP isolated RPC\/RLS/)
})

test('unpaid departure is tested after assignment and before selecting payment', async () => {
  const source = await readFile(harnessUrl, 'utf8')
  assert.match(source, /const accepted = [\s\S]*assert.equal\(service.estado, 'asignado'\)[\s\S]*const beforePay = [\s\S]*expectDomainError\(beforePay, \/forma de pago habilitada\/\)[\s\S]*const payment =/)
  assert.match(source, /assert.equal\(result.error\?\.code, 'P0001'/)
  assert.match(source, /if \(privacyError\) throw privacyError/)
})

test('acceptance retries verify persisted identity and amounts instead of requiring rejection', async () => {
  const [source, sql] = await Promise.all([
    readFile(harnessUrl, 'utf8'),
    read('supabase/migrations/20260911213500_payment_ready_offer_tariff.sql'),
  ])
  assert.match(sql, /v_oferta.estado = 'aceptada'[\s\S]*return v_servicio/)
  assert.match(source, /if \(duplicateAccept.error\) throw duplicateAccept.error/)
  assert.match(source, /assert.deepEqual\(await getService\(c, serviceId\), assignedService/)
  assert.doesNotMatch(source, /assert.ok\(duplicateAccept.error/)
})

test('cash confirmation opens review and repeated receipt preserves the same payment', async () => {
  const [source, sql] = await Promise.all([
    readFile(harnessUrl, 'utf8'),
    read('supabase/migrations/20260911200500_cash_close_ordering_guard.sql'),
  ])
  assert.match(sql, /v_pago.estado = 'liberado'[\s\S]*return v_pago/)
  assert.match(source, /const review = [\s\S]*expectDomainError\(review, \/recepción del efectivo\/\)[\s\S]*const cash = [\s\S]*estado, 'esperando_aprobacion'/)
  assert.match(source, /assert.deepEqual\(duplicateCash.data, cash.data/)
  assert.match(source, /assert.deepEqual\(await getPayment\(c, serviceId\), confirmedPayment\)/)
  assert.doesNotMatch(source, /assert.ok\(duplicateCash.error/)
})

test('expansion and final closure assertions compare persisted money and both roles', async () => {
  const source = await readFile(harnessUrl, 'utf8')
  assert.match(source, /assert.equal\(Number\(expandedPayment.monto_bruto\), Number\(expandedService.tarifa\)\)/)
  assert.match(source, /assert.deepEqual\(await getPayment\(c, serviceId\), expandedPayment\)/)
  assert.match(source, /assert.deepEqual\(await getService\(c, serviceId\), completedService\)/)
  assert.match(source, /assert.deepEqual\(await getService\(p, serviceId\), service/)
})
