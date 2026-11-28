import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { watch } from '../../scripts/hive/watch-24h.mjs'
import { startPostgres, postgresAvailable, migrationFiles } from '../../scripts/hive/pg-harness.mjs'
import { PsqlClient } from '../../hive/worker/db.mjs'
import { readSnapshot, readerFacts } from '../../hive/console-api/snapshot.mjs'
import { createHiveConsoleApi } from '../../hive/console-api/server.mjs'

// El endpoint se prueba contra PostgreSQL real con la réplica del esquema de Neon y un
// login de SÓLO lectura: si el rol pudiera escribir, el servidor no podría ni arrancar.
const REPLICA = 'tests/hive/fixtures/neon_existing_schema.sql'
const LOGIN = 'hive_console_ro'
const PASSWORD = 'lectura-local-harness-0123456789abcdef'
const required = process.env.HIVE_REQUIRE_REAL_POSTGRES === '1'

let server = null
let client = null
let loginReport = ''

const unavailable = () => (postgresAvailable() ? false : 'PostgreSQL real no disponible (pip install pgserver o POSTGRES_BIN)')

before(async () => {
  if (!postgresAvailable()) return
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
  const login = server.psqlFile('hive/reader/sql/reader_login.sql', { psqlVars: {
    hive_confirm: 'APLICAR', hive_password: PASSWORD, hive_login: LOGIN,
  } })
  if (!login.ok) throw new Error(`READER_LOGIN_FAILED: ${login.stderr}`)
  loginReport = login.stdout
  client = new PsqlClient({
    databaseUrl: `postgresql://${LOGIN}:${encodeURIComponent(PASSWORD)}@127.0.0.1:${server.port}/hive?sslmode=disable`,
    bin: `${server.bin}/psql`,
  })
})

after(async () => { if (server) await server.stop() })

const checkRows = () => loginReport.split('\n')
  .map(line => line.split('|').map(part => part.trim()))
  .filter(parts => parts.length === 2 && (parts[1] === 't' || parts[1] === 'f'))

test('el login de lectura cumple sus 11 comprobaciones', { skip: unavailable(), timeout: 120000 }, () => {
  const rows = checkRows()
  assert.equal(rows.length, 11)
  assert.deepEqual(rows.filter(([, ok]) => ok !== 't'), [])
  assert.deepEqual(rows.map(([name]) => name), [
    'reader_member', 'not_superuser', 'read_only_transactions',
    'no_insert_jobs', 'no_update_jobs', 'no_delete_jobs', 'can_select_jobs',
    'cannot_reserve', 'cannot_complete', 'can_read_metrics', 'can_read_census',
  ])
})

test('el endpoint reconoce el rol como sólo lectura', { skip: unavailable(), timeout: 60000 }, () => {
  const facts = readerFacts(client)
  assert.equal(facts.ok, true, JSON.stringify(facts.violations))
  assert.equal(facts.is_superuser, false)
  assert.equal(facts.is_reader_member, true)
  assert.equal(facts.can_insert_jobs, false)
  assert.equal(facts.can_reserve, false)
  assert.equal(facts.can_select_jobs, true)
})

test('el rol de lectura no puede escribir ni ejecutar la cola', { skip: unavailable(), timeout: 60000 }, () => {
  assert.throws(() => client.run(`insert into hive.jobs (idempotency_key, prompt) values ('ro-1', 'x')`), /PSQL_FAILED/)
  assert.throws(() => client.run(`update hive.jobs set state = 'QUEUED'`), /PSQL_FAILED/)
  assert.throws(() => client.run(`delete from hive.jobs`), /PSQL_FAILED/)
  assert.throws(() => client.run(`create table hive.ro_intruso (id int)`), /PSQL_FAILED/)
  assert.throws(() => client.run(`select hive.reserve_job('ro', 60)`), /PSQL_FAILED/)
  assert.throws(() => client.run(`select hive.complete_job(gen_random_uuid(), 'ro', 1)`), /PSQL_FAILED/)
  // …pero sí leer lo que la consola necesita.
  assert.equal(client.run(`select hive.queue_metrics() ->> 'queued'`).length > 0, true)
})

test('la instantánea refleja el estado real de la cola', { skip: unavailable(), timeout: 120000 }, () => {
  const empty = readSnapshot(client)
  assert.equal(empty.environment, 'TEST')
  assert.equal(empty.read_only, true)
  assert.equal(empty.census.total, 127)
  assert.equal(empty.census.operative, 0)
  assert.equal(empty.emergency.stop, false)
  assert.equal(empty.schema_version, '2.2.0')

  server.psql(`select hive.enqueue_job('console-read-1'::text, 1::int, null::text, 100::smallint,
     '{}'::jsonb, now(), 1::int, '¿Estado de la cola?'::text)`)
  const withJob = readSnapshot(client)
  assert.equal(withJob.queue.queued, empty.queue.queued + 1)
  assert.ok(withJob.recent_events.some(event => event.event === 'ENQUEUED'))
  assert.equal(withJob.quotas.openrouter.monthly_quota, 'UNKNOWN')
})

test('HTTP: un superadmin recibe datos reales; un usuario normal, 403', { skip: unavailable(), timeout: 120000 }, async () => {
  const handler = createHiveConsoleApi({
    reader: { readSnapshot: () => readSnapshot(client) },
    verifyToken: async tokenValue => (tokenValue === 'superadmin-token-0123456789'
      ? { userId: 'u-super', superadmin: true, active: true }
      : { userId: 'u-normal', superadmin: false, active: true }),
  })
  const httpServer = createServer((req, res) => handler(req, res))
  await new Promise(resolve => httpServer.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${httpServer.address().port}`
  try {
    const denied = await fetch(`${base}/api/hive/snapshot`, { headers: { authorization: 'Bearer usuario-normal-0123456789' } })
    assert.equal(denied.status, 403)

    const ok = await fetch(`${base}/api/hive/snapshot`, { headers: { authorization: 'Bearer superadmin-token-0123456789' } })
    assert.equal(ok.status, 200)
    const body = await ok.json()
    assert.equal(body.source, 'hive_reader')
    assert.equal(body.census.total, 127)
    assert.equal(body.read_only, true)
    assert.equal(typeof body.queue.queued, 'number')
  } finally {
    await new Promise(resolve => httpServer.close(resolve))
  }
})

test('vigilancia: una ventana corta contra la base real no escribe nada', { skip: unavailable(), timeout: 120000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ugo-watch-db-'))
  const out = join(dir, 'watch.jsonl')
  try {
    const before = Number(server.psql('select count(*) from hive.job_events'))
    const result = await watch({ client, hours: 0.001, intervalSeconds: 0, out, maxSamples: 2, sleep: async () => {} })
    assert.equal(result.summary.samples, 2)
    assert.equal(result.summary.read_failures, 0)
    assert.equal(result.summary.critical, 0)
    assert.equal(result.summary.last_sample.census.total, 127)
    assert.equal(readFileSync(out, 'utf8').trim().split('\n').length, 2)
    assert.equal(Number(server.psql('select count(*) from hive.job_events')), before)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('la tarea histórica sigue DONE y el rol de lectura no la ha tocado', { skip: unavailable(), timeout: 60000 }, () => {
  assert.equal(server.psql(`select state || '/' || status from hive.jobs where idempotency_key = 'legacy-task-0001'`), 'SUCCEEDED/DONE')
  assert.equal(server.psql(`select value from hive.meta where key = 'schema_version'`), '2.2.0')
  void required
})
