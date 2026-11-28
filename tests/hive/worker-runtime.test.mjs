import test, { after, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startPostgres, postgresAvailable, migrationFiles } from '../../scripts/hive/pg-harness.mjs'
import { PsqlClient, connectionFacts } from '../../hive/worker/db.mjs'
import { loadConfig } from '../../hive/worker/config.mjs'
import { createWorker } from '../../hive/worker/worker.mjs'
import { startMockProvider } from './fixtures/mock-provider.mjs'

// Ciclo del worker contra PostgreSQL REAL y la réplica exacta del esquema de Neon:
// el login es un miembro de hive_worker (nunca el de migraciones), de modo que si el
// worker necesitara un privilegio que no tiene, la prueba fallaría aquí y no en Neon.
const REPLICA = 'tests/hive/fixtures/neon_existing_schema.sql'
const LOGIN = 'hive_app'
const PASSWORD = 'prueba-local-solo-para-el-harness-0123456789'
const AGENT = 'Hugo Orchestrator'
const required = process.env.HIVE_REQUIRE_REAL_POSTGRES === '1'

let server = null
let mock = null
let client = null
let deptId = null
let stopDir = null

const unavailable = () => (postgresAvailable() ? false : 'PostgreSQL real no disponible (pip install pgserver o POSTGRES_BIN)')

async function boot() {
  if (server) return
  server = await startPostgres()
  const replica = server.psqlFile(REPLICA)
  if (!replica.ok) throw new Error(`REPLICA_FAILED: ${replica.stderr}`)
  for (const file of migrationFiles(process.cwd())) {
    const applied = server.psqlFile(file, { vars: {
      'hive.target_project': 'dry-heart-24391962',
      'hive.target_database': 'hive',
      'hive.confirm_first_apply': 'APLICAR',
    } })
    if (!applied.ok) throw new Error(`MIGRATION_FAILED ${file}: ${applied.stderr}`)
  }
  // Login real, con el script de operador guardado (las mismas guardas que en Neon).
  const login = server.psqlFile('hive/worker/sql/worker_login.sql', { psqlVars: {
    hive_confirm: 'APLICAR', hive_password: PASSWORD, hive_login: LOGIN,
  } })
  if (!login.ok) throw new Error(`WORKER_LOGIN_FAILED: ${login.stderr}`)
  if (/\|\s*f\s*$/m.test(login.stdout)) throw new Error(`WORKER_LOGIN_PRIVILEGE_CHECK_FAILED:\n${login.stdout}`)

  client = new PsqlClient({
    databaseUrl: `postgresql://${LOGIN}:${encodeURIComponent(PASSWORD)}@127.0.0.1:${server.port}/hive?sslmode=disable`,
    bin: join(server.bin, 'psql'),
  })
  mock = await startMockProvider()
  stopDir = mkdtempSync(join(tmpdir(), 'ugo-hive-worker-'))
  deptId = Number(server.psql('select min(id) from hive.departments'))
  // Un solo agente operativo, como exige la misión.
  server.psql(`select hive.activate_agent('${AGENT}', true)`)
}

before(async () => {
  if (!postgresAvailable()) return
  await boot()
})

// Aislamiento: cada prueba parte de una cola sin trabajo vivo, así quien reserva es
// siempre el trabajo que la prueba acaba de encolar (y no un resto de la anterior).
beforeEach(() => {
  if (!server) return
  server.psql(`update hive.jobs set state = 'CANCELLED', lease_owner = null, lease_expires_at = null,
                      heartbeat_at = null
                where state in ('QUEUED','LEASED')`)
})

after(async () => {
  if (mock) await mock.close()
  if (server) await server.stop()
  if (stopDir) rmSync(stopDir, { recursive: true, force: true })
})

const config = (overrides = {}) => ({
  ...loadConfig({}, []),
  provider: 'mock',
  testMode: true,
  mockProviderUrl: mock?.url ?? '',
  agent: AGENT,
  workerId: 'hive-worker-test',
  leaseSeconds: 120,
  ...overrides,
})

function enqueue(key, { prompt = 'Resume el estado de la cola de UGO.', maxAttempts = 3 } = {}) {
  return server.psql(`select hive.enqueue_job(
    '${key}'::text, ${deptId}::int, '${AGENT}'::text, 100::smallint, '{}'::jsonb, now(),
    ${maxAttempts}::int, '${prompt}'::text)`)
}

const jobState = id => server.psql(`select state || '/' || coalesce(status,'-') from hive.jobs where id = '${id}'`)
const eventsOf = id => server.psql(`select string_agg(event, ',' order by created_at, id) from hive.job_events where job_id = '${id}'`)

test('el worker arranca contra la réplica real con el rol de ejecución', { skip: unavailable(), timeout: 180000 }, async () => {
  const facts = connectionFacts(client)
  assert.equal(facts.is_superuser, false)
  assert.equal(facts.is_worker_member, true)
  assert.equal(facts.current_user, LOGIN)
})

test('el login del worker no puede escribir tablas ni hacer DDL', { skip: unavailable(), timeout: 60000 }, () => {
  assert.throws(() => client.run(`insert into hive.jobs (idempotency_key, prompt) values ('x-escritura-directa', 'no')`),
    /PSQL_FAILED/)
  assert.throws(() => client.run(`delete from hive.jobs`), /PSQL_FAILED/)
  assert.throws(() => client.run(`create table hive.intruso (id int)`), /PSQL_FAILED/)
  assert.throws(() => client.run(`update hive.jobs set state = 'QUEUED'`), /PSQL_FAILED/)
  // Pero sí puede operar la cola por funciones.
  assert.equal(client.run(`select hive.queue_metrics() ->> 'queued'`).length > 0, true)
})

test('ciclo completo: una tarea, un agente, resultado verificado y efecto idempotente', { skip: unavailable(), timeout: 180000 }, async () => {
  const key = `worker-e2e-${Date.now()}`
  const enqueued = JSON.parse(enqueue(key))
  const id = enqueued.job_id
  const history = []
  const worker = createWorker({ config: config(), client, logger: (...args) => history.push(args) })

  const outcome = await worker.runOnce()
  assert.equal(outcome.action, 'DONE', JSON.stringify(outcome))
  assert.equal(outcome.effect_applied, true)
  assert.equal(await jobState(id), 'SUCCEEDED/DONE')
  assert.equal(await eventsOf(id), 'ENQUEUED,LEASED,SUCCEEDED')

  const stored = JSON.parse(server.psql(`select result::text from hive.jobs where id = '${id}'`))
  assert.match(stored.text, /^eco: /)
  assert.equal(stored.judge.cost_usd, 0)
  assert.equal(stored.provider, 'mock')
  assert.equal(Number(server.psql(`select count(*) from hive.job_effects where job_id = '${id}'`)), 1)

  // Segunda pasada: la cola está vacía y no se inventa trabajo.
  const second = await worker.runOnce()
  assert.equal(second.action, 'IDLE')
  assert.equal(second.code, 'QUEUE_EMPTY')

  // Ningún log puede contener la cadena de conexión ni la contraseña.
  const logs = history.map(args => JSON.stringify(args)).join('\n')
  assert.equal(logs.includes('postgresql://'), false)
  assert.equal(logs.includes(PASSWORD), false)
  assert.match(logs, /JOB_DONE/)
})

test('--dry-run observa sin reservar nada', { skip: unavailable(), timeout: 120000 }, async () => {
  const key = `worker-dry-${Date.now()}`
  const enqueued = JSON.parse(await enqueue(key))
  const worker = createWorker({ config: config({ dryRun: true }), client, logger: () => {} })
  const outcome = await worker.runOnce()
  assert.equal(outcome.action, 'DRY_RUN')
  assert.equal(await jobState(enqueued.job_id), 'QUEUED/PENDING')
  assert.equal(Number(outcome.snapshot.queue.queued) >= 1, true)
})

test('el interruptor de emergencia detiene ANTES de reservar', { skip: unavailable(), timeout: 120000 }, async () => {
  const key = `worker-stop-${Date.now()}`
  const enqueued = JSON.parse(await enqueue(key))
  const file = join(stopDir, 'EMERGENCY-STOP')
  writeFileSync(file, 'parada de prueba\n')
  try {
    const worker = createWorker({ config: config({ emergencyFile: file }), client, logger: () => {} })
    const outcome = await worker.runOnce()
    assert.equal(outcome.action, 'STOPPED')
    assert.equal(outcome.reason, 'EMERGENCY_STOP_FILE')
    assert.equal(await jobState(enqueued.job_id), 'QUEUED/PENDING')
  } finally {
    rmSync(file, { force: true })
  }
  // Retirado el interruptor, el mismo trabajo se ejecuta.
  const worker = createWorker({ config: config(), client, logger: () => {} })
  const resumed = await worker.runOnce()
  assert.equal(resumed.action, 'DONE')
})

test('si el Judge rechaza, la tarea NO se marca como hecha', { skip: unavailable(), timeout: 120000 }, async () => {
  mock.setMode('secretleak')
  try {
    const key = `worker-judge-${Date.now()}`
    const enqueued = JSON.parse(await enqueue(key, { maxAttempts: 1 }))
    const worker = createWorker({ config: config(), client, logger: () => {} })
    const outcome = await worker.runOnce()
    assert.equal(outcome.action, 'REJECTED')
    assert.equal(outcome.code, 'JUDGE_REJECTED')
    assert.ok(outcome.reasons.some(reason => reason.code === 'SECRET_LEAK'))
    assert.equal(await jobState(enqueued.job_id), 'FAILED/FAILED')
    const stored = server.psql(`select coalesce(result::text, 'null') from hive.jobs where id = '${enqueued.job_id}'`)
    assert.equal(stored, 'null')
    assert.match(await eventsOf(enqueued.job_id), /FAILED/)
  } finally {
    mock.setMode('ok')
  }
})

test('fencing: si el lease se pierde durante la llamada, el worker no completa', { skip: unavailable(), timeout: 120000 }, async () => {
  const key = `worker-fence-${Date.now()}`
  const enqueued = JSON.parse(await enqueue(key))
  // Proveedor instrumentado: roba el lease (sube lease_token) justo mientras "piensa".
  const stealingFetch = async (...args) => {
    const response = await fetch(...args)
    server.psql(`update hive.jobs set lease_token = lease_token + 1 where id = '${enqueued.job_id}'`)
    return response
  }
  const worker = createWorker({ config: config(), client, fetchImpl: stealingFetch, logger: () => {} })
  const outcome = await worker.runOnce()
  assert.equal(outcome.action, 'FAILED')
  assert.equal(outcome.code, 'LEASE_LOST')
  assert.equal(await jobState(enqueued.job_id), 'LEASED/RUNNING')
  assert.equal(server.psql(`select coalesce(result::text, 'null') from hive.jobs where id = '${enqueued.job_id}'`), 'null')
  assert.equal(worker.state.jobsDone, 0)
})

test('un proveedor caído no deja la tarea colgada: se reprograma con backoff', { skip: unavailable(), timeout: 120000 }, async () => {
  mock.setMode('error')
  try {
    const key = `worker-provider-error-${Date.now()}`
    const enqueued = JSON.parse(await enqueue(key, { maxAttempts: 3 }))
    const worker = createWorker({ config: config(), client, logger: () => {} })
    const outcome = await worker.runOnce()
    assert.equal(outcome.action, 'FAILED')
    assert.equal(outcome.code, 'PROVIDER_HTTP_ERROR')
    assert.equal(await jobState(enqueued.job_id), 'QUEUED/PENDING')
    assert.match(await eventsOf(enqueued.job_id), /RETRY_SCHEDULED/)
    assert.match(server.psql(`select last_error from hive.jobs where id = '${enqueued.job_id}'`), /PROVIDER_HTTP_ERROR/)
  } finally {
    mock.setMode('ok')
  }
})

test('maxJobs acota la ejecución aunque haya más trabajo en cola', { skip: unavailable(), timeout: 180000 }, async () => {
  const stamp = Date.now()
  await enqueue(`worker-cap-a-${stamp}`)
  await enqueue(`worker-cap-b-${stamp}`)
  const worker = createWorker({ config: config({ maxJobs: 1, maxIterations: 5 }), client, logger: () => {} })
  const summary = await worker.run()
  assert.equal(summary.jobsDone, 1)
  assert.equal(summary.jobsFailed, 0)
})

test('SIGTERM lógico: state.stopping evita seguir tomando trabajo', { skip: unavailable(), timeout: 120000 }, async () => {
  await enqueue(`worker-sigterm-${Date.now()}`)
  const worker = createWorker({ config: config({ maxIterations: 10 }), client, logger: () => {} })
  worker.state.stopping = true
  const summary = await worker.run()
  assert.equal(summary.iterations, 0)
  assert.equal(summary.jobsDone, 0)
})

test('los trabajos de caminos felices preservan la tarea histórica DONE', { skip: unavailable(), timeout: 60000 }, () => {
  assert.equal(server.psql(`select status from hive.jobs where idempotency_key = 'legacy-task-0001'`), 'DONE')
  assert.equal(server.psql(`select state from hive.jobs where idempotency_key = 'legacy-task-0001'`), 'SUCCEEDED')
})
