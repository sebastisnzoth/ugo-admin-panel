import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { evaluateSample, watch, DEFAULT_THRESHOLDS } from '../../scripts/hive/watch-24h.mjs'
import { inspectDatabaseUrl, readSecret } from '../../scripts/hive/secret-setup.mjs'

// ── Vigilancia: reglas deterministas ────────────────────────────────────────────
const healthy = {
  queue: { queued: 0, leased: 0, succeeded: 3, failed: 0, cancelled: 0, stale_leases: 0, effects_applied: 3 },
  census: { total: 127, operative: 0, connected: 0, registered: 124, disabled: 3, max_operative_agents: 1 },
  emergency_stop: false,
  quotas: {
    openrouter: { level: 'NORMAL', percent_used: 0, allow_new_secondary_tasks: true },
    openclaw: { level: 'NORMAL', percent_used: 0, allow_new_secondary_tasks: true },
  },
  circuits: [],
}

test('watch: estado sano no genera alertas', () => {
  assert.deepEqual(evaluateSample(healthy), [])
})

test('watch: lease vencido, emergencia, cuota suspendida y circuito abierto son críticos', () => {
  const stale = evaluateSample({ ...healthy, queue: { ...healthy.queue, stale_leases: 1 } })
  assert.deepEqual(stale.map(a => [a.severity, a.code]), [['CRITICAL', 'STALE_LEASES']])

  const emergency = evaluateSample({ ...healthy, emergency_stop: true })
  assert.ok(emergency.some(a => a.code === 'EMERGENCY_STOP'))

  const quota = evaluateSample({ ...healthy, quotas: { ...healthy.quotas, openrouter: { level: 'SUSPENDED', percent_used: 88, allow_new_secondary_tasks: false } } })
  assert.ok(quota.some(a => a.code === 'QUOTA_BLOCKED'))

  const circuit = evaluateSample({ ...healthy, circuits: [{ provider: 'openrouter', blocked_until: '2026-11-28T00:10:00Z' }] })
  assert.ok(circuit.some(a => a.code === 'CIRCUIT_OPEN'))
})

test('watch: backlog y fallos crecientes son avisos, no se confunden con éxito', () => {
  const backlog = evaluateSample({ ...healthy, queue: { ...healthy.queue, queued: DEFAULT_THRESHOLDS.maxQueued + 1 } })
  assert.deepEqual(backlog.map(a => [a.severity, a.code]), [['WARNING', 'QUEUE_BACKLOG']])

  const growth = evaluateSample({ ...healthy, queue: { ...healthy.queue, failed: 2 } }, { previous: healthy })
  assert.ok(growth.some(a => a.code === 'FAILED_JOBS_INCREASED'))

  const same = evaluateSample(healthy, { previous: healthy })
  assert.deepEqual(same, [])
})

test('watch: una lectura fallida es alerta crítica, nunca "todo bien"', () => {
  assert.deepEqual(evaluateSample(null, { readError: 'PSQL_FAILED' }),
    [{ severity: 'CRITICAL', code: 'READER_UNAVAILABLE', detail: 'PSQL_FAILED' }])
})

test('watch: la ventana acotada escribe muestras y resumen sin exponer la URL', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ugo-watch-'))
  const out = join(dir, 'watch.jsonl')
  const fake = { json: () => healthy }
  try {
    const result = await watch({
      client: fake, hours: 1, intervalSeconds: 0, out, maxSamples: 3,
      clock: () => Date.now(), sleep: async () => {},
    })
    assert.equal(result.summary.samples, 3)
    assert.equal(result.summary.verdict, 'HEALTHY')
    assert.equal(result.summary.critical, 0)
    const lines = readFileSync(out, 'utf8').trim().split('\n')
    assert.equal(lines.length, 3)
    assert.equal(lines[0].includes('postgresql://'), false)
    const summary = JSON.parse(readFileSync(out.replace(/\.jsonl$/, '.summary.json'), 'utf8'))
    assert.equal(summary.summary.samples, 3)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('watch: si la base deja de responder, la ventana lo declara como CRÍTICO', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ugo-watch-down-'))
  const out = join(dir, 'watch.jsonl')
  const failing = { json: () => { throw Object.assign(new Error('down'), { code: 'PSQL_FAILED' }) } }
  try {
    const result = await watch({ client: failing, hours: 1, intervalSeconds: 0, out, maxSamples: 3, sleep: async () => {} })
    assert.equal(result.summary.read_failures, 3)
    assert.equal(result.summary.verdict, 'ATTENTION_REQUIRED')
    assert.ok(result.alerts.some(alert => alert.code === 'READER_DOWN'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// ── Configuración segura de secretos ────────────────────────────────────────────
const validWorkerUrl = 'postgresql://hive_app:s3cr3t-passw0rd@ep-cool-1.eu-central-1.aws.neon.tech/hive?sslmode=require'

test('secret-setup: acepta la forma correcta y no repite la contraseña', () => {
  const report = inspectDatabaseUrl(validWorkerUrl)
  assert.equal(report.ok, true)
  assert.equal(report.shape.host_kind, 'neon')
  assert.equal(report.shape.user_kind, 'worker-login')
  assert.equal(report.shape.sslmode, 'require')
  assert.equal(JSON.stringify(report).includes('s3cr3t-passw0rd'), false)
})

test('secret-setup: rechaza Supabase, hosts ajenos, sin SSL y usuarios privilegiados', () => {
  const rejects = url => inspectDatabaseUrl(url).problems.join(' | ')
  assert.match(rejects('postgresql://u:p@db.tmossnqfwfwjrtzwcbmm.supabase.co:5432/postgres'), /Supabase/)
  assert.match(rejects('postgresql://u:p@db.example.com/hive?sslmode=require'), /no es de Neon/)
  assert.match(rejects('postgresql://hive_app:p@ep-x.neon.tech/hive'), /sslmode=require/)
  assert.match(rejects('postgresql://neondb_owner:p@ep-x.neon.tech/hive?sslmode=require'), /privilegiado/)
  assert.match(rejects('mysql://u:p@ep-x.neon.tech/hive'), /esquema/)
  assert.equal(inspectDatabaseUrl('').code, 'MISSING')
  assert.equal(inspectDatabaseUrl('no-es-una-url').code, 'INVALID_URL')
})

test('secret-setup: un archivo 600 se lee igual que el entorno, sin imprimirlo', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ugo-secret-'))
  const file = join(dir, 'worker.url')
  const { writeFileSync } = await import('node:fs')
  writeFileSync(file, `${validWorkerUrl}\n`, { mode: 0o600 })
  try {
    assert.equal(readSecret('HIVE_WORKER_DATABASE_URL', { HIVE_WORKER_DATABASE_URL_FILE: file }), validWorkerUrl)
    assert.equal(readSecret('HIVE_WORKER_DATABASE_URL', { HIVE_WORKER_DATABASE_URL: validWorkerUrl }), validWorkerUrl)
    assert.equal(readSecret('HIVE_WORKER_DATABASE_URL', {}), '')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
