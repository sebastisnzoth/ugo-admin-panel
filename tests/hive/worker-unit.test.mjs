import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { loadConfig, redact, describeConfig, jitter } from '../../hive/worker/config.mjs'
import { approvedOpenRouterRoute, resolveProvider, ProviderError } from '../../hive/worker/providers.mjs'
import { inspect } from '../../hive/worker/sentinel.mjs'
import { verdict } from '../../hive/worker/judge.mjs'
import { startMockProvider } from './fixtures/mock-provider.mjs'

// ── Configuración y secretos ────────────────────────────────────────────────────
const baseConfig = (overrides = {}) => ({
  ...loadConfig({}, []),
  ...overrides,
})

test('loadConfig: valores por defecto conservadores (un ciclo, un trabajo)', () => {
  const config = loadConfig({}, [])
  assert.equal(config.maxIterations, 1)
  assert.equal(config.maxJobs, 1)
  assert.equal(config.provider, 'none')
  assert.equal(config.dryRun, false)
  assert.equal(config.leaseSeconds, 120)
  assert.equal(config.databaseUrl, '')
})

test('loadConfig: los límites no se pueden saltar por entorno', () => {
  const config = loadConfig({ HIVE_WORKER_MAX_ITERATIONS: '99999', HIVE_WORKER_LEASE_SECONDS: '5' }, [])
  assert.equal(config.maxIterations, 1000)
  assert.equal(config.leaseSeconds, 30)
  assert.equal(loadConfig({ HIVE_WORKER_MAX_JOBS: '0' }, []).maxJobs, 1)
  assert.equal(loadConfig({}, ['--dry-run']).dryRun, true)
  assert.equal(loadConfig({}, ['--once']).once, true)
})

test('redact: ninguna credencial sobrevive a un log', () => {
  const dirty = [
    'postgresql://hive_app:s3cr3t@ep-x.neon.tech/hive?sslmode=require',
    'authorization: Bearer abcdefghijklmnop',
    'OPENROUTER_API_KEY=sk-or-v1-0123456789abcdef',
    'password=hunter2',
    'a'.repeat(40),
  ].join(' ')
  const clean = redact(dirty)
  for (const fragment of ['s3cr3t', 'Bearer abcdefghijklmnop', 'sk-or-v1', 'hunter2', 'a'.repeat(40)]) {
    assert.equal(clean.includes(fragment), false, `no debe filtrar ${fragment}`)
  }
  assert.ok(clean.includes('[redacted]'))
})

test('describeConfig: informa de la configuración sin exponer la URL', () => {
  const config = loadConfig({ HIVE_WORKER_DATABASE_URL: 'postgresql://u:p@h/db', HIVE_WORKER_PROVIDER: 'mock' }, [])
  const described = describeConfig(config)
  assert.equal(described.database_configured, true)
  assert.equal(JSON.stringify(described).includes('postgresql://'), false)
  assert.equal(JSON.stringify(described).includes('provider'), true)
})

test('jitter: siempre acotado y distinto entre llamadas', () => {
  const samples = new Set()
  for (let i = 0; i < 200; i++) {
    const value = jitter(1000, 0)
    assert.ok(value >= 500 && value <= 1000, `fuera de rango: ${value}`)
    samples.add(value)
  }
  assert.ok(samples.size > 10)
  assert.ok(jitter(1000, 10) <= 60000)
})

// ── Proveedores: fallo cerrado ──────────────────────────────────────────────────
test('proveedores: un nombre no declarado no se puede usar', () => {
  assert.throws(() => resolveProvider('gpt-libre'), error => {
    assert.ok(error instanceof ProviderError)
    assert.equal(error.code, 'PROVIDER_NOT_ALLOWED')
    return true
  })
})

test('providers: freellmapi está cerrado por política, no por falta de configuración', async () => {
  await assert.rejects(resolveProvider('freellmapi').complete({ config: baseConfig(), prompt: 'x' }),
    error => error.code === 'NO_VERIFIED_FREE_ROUTE')
})

test('providers: openrouter sin evidencia aprobada no arranca', async () => {
  const config = baseConfig({ provider: 'openrouter', openRouterModel: 'google/gemini-2.0-flash-exp:free', openRouterKey: 'k', openRouterApproval: '' })
  assert.equal(approvedOpenRouterRoute(config), null)
  await assert.rejects(resolveProvider('openrouter').complete({ config, prompt: 'x' }),
    error => error.code === 'NO_VERIFIED_FREE_ROUTE')
})

test('providers: openrouter exige modelo :free incluso con aprobación bien formada', () => {
  const approval = {
    terms_approved: true,
    billing_evidence: 'console:free-tier',
    checked_at: new Date().toISOString(),
    valid_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    pricing: { prompt: 0, completion: 0, request: 0 },
  }
  const paid = baseConfig({ openRouterModel: 'openai/gpt-4o', openRouterApproval: JSON.stringify(approval) })
  const free = baseConfig({ openRouterModel: 'meta-llama/llama-3.1-8b-instruct:free', openRouterApproval: JSON.stringify(approval) })
  assert.equal(approvedOpenRouterRoute(paid), null)
  assert.equal(approvedOpenRouterRoute(free)?.model, 'meta-llama/llama-3.1-8b-instruct:free')
})

test('providers: la aprobación caduca (una evidencia vieja no sirve para siempre)', () => {
  const stale = {
    terms_approved: true,
    billing_evidence: 'console:free-tier',
    checked_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    valid_until: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    pricing: { prompt: 0, completion: 0, request: 0 },
  }
  const config = baseConfig({ openRouterModel: 'x:free', openRouterApproval: JSON.stringify(stale) })
  assert.equal(approvedOpenRouterRoute(config), null)
})

// ── Sentinel ────────────────────────────────────────────────────────────────────
const job = { id: '11111111-1111-1111-1111-111111111111', prompt: 'Resume el estado de la cola.', payload: {}, idempotency_key: 'k-123456789' }
const clean = {
  config: baseConfig({ provider: 'mock', leaseSeconds: 120 }),
  job,
  leaseState: 'OK',
  connection: { current_user: 'hive_app', is_superuser: false, is_worker_member: true },
  quota: { allow_new_secondary_tasks: true, level: 'NORMAL', percent_used: 3 },
  circuit: null,
}
const codes = verdictInput => inspect(verdictInput).violations.map(v => v.code)

test('Sentinel: el camino limpio pasa', () => {
  const result = inspect(clean)
  assert.equal(result.ok, true, JSON.stringify(result.violations))
})

test('Sentinel: nunca con superusuario ni fuera del rol de ejecución', () => {
  assert.deepEqual(codes({ ...clean, connection: { current_user: 'neondb_owner', is_superuser: true, is_worker_member: false } }),
    ['SENTINEL_PRIVILEGED_CONNECTION', 'SENTINEL_NOT_WORKER_ROLE'])
  assert.deepEqual(codes({ ...clean, connection: { current_user: 'x', is_superuser: false, is_worker_member: false } }),
    ['SENTINEL_NOT_WORKER_ROLE'])
})

test('Sentinel: lease perdido, prompt ausente o desmesurado se rechazan', () => {
  assert.ok(codes({ ...clean, leaseState: 'LEASE_LOST' }).includes('LEASE_LOST'))
  assert.ok(codes({ ...clean, job: { ...job, prompt: '   ' } }).includes('SENTINEL_PROMPT_MISSING'))
  assert.ok(codes({ ...clean, job: { ...job, prompt: 'x'.repeat(8001) } }).includes('SENTINEL_PROMPT_TOO_LONG'))
})

test('Sentinel: presupuesto agotado y circuito abierto detienen la ejecución', () => {
  const quota = { allow_new_secondary_tasks: false, level: 'SUSPENDED', percent_used: 90 }
  assert.ok(codes({ ...clean, quota }).includes('QUOTA_BLOCKED'))
  assert.ok(codes({ ...clean, circuit: { blocked_until: new Date(Date.now() + 60000).toISOString() } }).includes('CIRCUIT_OPEN'))
  assert.equal(codes({ ...clean, circuit: { blocked_until: new Date(Date.now() - 60000).toISOString() } }).includes('CIRCUIT_OPEN'), false)
})

test('Sentinel: interruptor de emergencia (base) y proveedor desconocido', () => {
  assert.ok(codes({ ...clean, config: { ...clean.config, emergencyActive: true } }).includes('EMERGENCY_STOP'))
  assert.ok(codes({ ...clean, config: { ...clean.config, provider: 'desconocido' } }).includes('PROVIDER_NOT_ALLOWED'))
})

// ── Judge ───────────────────────────────────────────────────────────────────────
const config = baseConfig({ provider: 'mock' })
const goodResult = {
  text: 'He revisado la cola: una tarea completada, ninguna pendiente.',
  model: 'mock/free',
  provider: 'mock',
  usage: { prompt_tokens: 12, completion_tokens: 8 },
  billed_usd: 0,
}

test('Judge: un resultado limpio pasa y deja evidencia', () => {
  const result = verdict({ result: goodResult, job, config, latencyMs: 42, budget: { allow_new_secondary_tasks: true } })
  assert.equal(result.verdict, 'PASS')
  assert.equal(result.evidence.total_tokens, 20)
  assert.equal(result.evidence.cost_usd, 0)
})

test('Judge: texto vacío, fuga de secreto y coste no cero se rechazan', () => {
  const empty = verdict({ result: { ...goodResult, text: '  ' }, job, config, latencyMs: 10 })
  assert.equal(empty.code, 'JUDGE_REJECTED')
  assert.deepEqual(empty.reasons.map(r => r.code), ['EMPTY_TEXT'])

  const leak = verdict({ result: { ...goodResult, text: 'usa postgresql://u:p@h/db' }, job, config, latencyMs: 10 })
  assert.ok(leak.reasons.some(r => r.code === 'SECRET_LEAK'))

  const cost = verdict({ result: { ...goodResult, billed_usd: 0.002 }, job, config, latencyMs: 10 })
  assert.ok(cost.reasons.some(r => r.code === 'COST_NOT_ZERO'))
})

test('Judge: el proveedor declarado no puede sustituir al configurado', () => {
  const result = verdict({ result: { ...goodResult, provider: 'openai' }, job, config, latencyMs: 10 })
  assert.ok(result.reasons.some(r => r.code === 'PROVIDER_NOT_ALLOWED'))
  const mismatch = verdict({ result: { ...goodResult, provider: 'openrouter' }, job, config, latencyMs: 10 })
  assert.ok(mismatch.reasons.some(r => r.code === 'PROVIDER_MISMATCH'))
})

test('Judge: presupuesto cerrado o trabajo no trazable impiden el PASS', () => {
  const budget = verdict({ result: goodResult, job, config, latencyMs: 10, budget: { allow_new_secondary_tasks: false, level: 'BLOCKED' } })
  assert.ok(budget.reasons.some(r => r.code === 'BUDGET_EXCEEDED'))
  const untraceable = verdict({ result: goodResult, job: { id: job.id }, config, latencyMs: 10 })
  assert.ok(untraceable.reasons.some(r => r.code === 'JOB_NOT_TRACEABLE'))
})

// ── Proveedor mock (HTTP real, sin red externa) ─────────────────────────────────
let mock = null
after(async () => { if (mock) await mock.close() })

test('mock: sólo existe en modo prueba y habla HTTP de verdad', async () => {
  mock = await startMockProvider()
  const disabled = baseConfig({ provider: 'mock', testMode: false, mockProviderUrl: mock.url })
  await assert.rejects(resolveProvider('mock').complete({ config: disabled, prompt: 'x' }),
    error => error.code === 'MOCK_PROVIDER_DISABLED')

  const enabled = baseConfig({ provider: 'mock', testMode: true, mockProviderUrl: mock.url })
  const result = await resolveProvider('mock').complete({ config: enabled, prompt: 'estado de la cola' })
  assert.match(result.text, /^eco: estado de la cola$/)
  assert.equal(result.billed_usd, 0)
  assert.equal(mock.requests.length, 1)
})

test('mock: los errores del proveedor se clasifican, no se silencian', async () => {
  const config = baseConfig({ provider: 'mock', testMode: true, mockProviderUrl: mock.url })
  mock.setMode('ratelimit')
  await assert.rejects(resolveProvider('mock').complete({ config, prompt: 'x' }), error => error.code === 'PROVIDER_RATE_LIMITED')
  mock.setMode('invalid')
  await assert.rejects(resolveProvider('mock').complete({ config, prompt: 'x' }), error => error.code === 'PROVIDER_INVALID_JSON')
  mock.setMode('error')
  await assert.rejects(resolveProvider('mock').complete({ config, prompt: 'x' }), error => error.code === 'PROVIDER_HTTP_ERROR')
  mock.setMode('ok')
})
