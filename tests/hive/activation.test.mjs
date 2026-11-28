import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { startPostgres, postgresAvailable, migrationFiles } from '../../scripts/hive/pg-harness.mjs'
import { PsqlClient } from '../../hive/worker/db.mjs'
import { withCredentials } from '../../scripts/hive/activate-logins.mjs'

// Activación de los DOS logins ya creados, en el orden real: primero existen NOLOGIN (como
// los dejó ChatGPT en Neon), después se activan. El script no crea roles ni migra nada.
const REPLICA = 'tests/hive/fixtures/neon_existing_schema.sql'
const required = process.env.HIVE_REQUIRE_REAL_POSTGRES === '1'

let server = null
let secretDir = null
let adminUrl = ''

const unavailable = () => (postgresAvailable() ? false : 'PostgreSQL real no disponible (pip install pgserver o POSTGRES_BIN)')

before(async () => {
  if (!postgresAvailable()) return
  server = await startPostgres()
  const replica = server.psqlFile(REPLICA)
  if (!replica.ok) throw new Error(`REPLICA_FAILED: ${replica.stderr}`)
  for (const file of migrationFiles(process.cwd())) {
    const applied = server.psqlFile(file, { vars: {
      'hive.target_project': 'dry-heart-24391962', 'hive.target_database': 'hive', 'hive.confirm_first_apply': 'APLICAR' } })
    if (!applied.ok) throw new Error(`MIGRATION_FAILED ${file}: ${applied.stderr}`)
  }
  // Estado de partida idéntico al de Neon: los dos roles existen, NOLOGIN.
  server.psql(`
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'hive_app') then
        create role hive_app nologin; grant hive_worker to hive_app;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'hive_console_ro') then
        create role hive_console_ro nologin; grant hive_reader to hive_console_ro;
      end if;
    end $$;`)
  adminUrl = `postgresql://postgres@127.0.0.1:${server.port}/hive?sslmode=disable`
  secretDir = mkdtempSync(join(tmpdir(), 'ugo-hive-secrets-'))
})

after(async () => {
  if (server) await server.stop()
  if (secretDir) rmSync(secretDir, { recursive: true, force: true })
})

const run = (args, env = {}) => spawnSync('node', ['scripts/hive/activate-logins.mjs', ...args], {
  encoding: 'utf8',
  env: {
    ...process.env,
    PATH: `${server?.bin}:${process.env.PATH}`,
    PSQL_BIN: server ? join(server.bin, 'psql') : 'psql',
    HIVE_MIGRATOR_DATABASE_URL: adminUrl,
    ...env,
  },
})

test('activación: la simulación no cambia nada', { skip: unavailable(), timeout: 120000 }, () => {
  const before = server.psql(`select string_agg(rolname || ':' || rolcanlogin, ',' order by rolname) from pg_roles
                               where rolname in ('hive_app','hive_console_ro')`)
  const dry = run([], { HIVE_CONFIRM_ACTIVATION: '' })
  assert.equal(dry.status, 0, dry.stderr)
  const report = JSON.parse(dry.stdout.slice(0, dry.stdout.lastIndexOf('}') + 1))
  assert.equal(report.mode, 'DRY_RUN')
  assert.equal(report.checks.would_activate, true)
  const afterRun = server.psql(`select string_agg(rolname || ':' || rolcanlogin, ',' order by rolname) from pg_roles
                                 where rolname in ('hive_app','hive_console_ro')`)
  assert.equal(afterRun, before)
})

test('activación: sin confirmación explícita se rechaza', { skip: unavailable(), timeout: 60000 }, () => {
  const refused = run(['--apply'], { HIVE_CONFIRM_ACTIVATION: '' })
  assert.equal(refused.status, 2)
  assert.match(refused.stderr, /CONFIRMATION_REQUIRED/)
})

test('activación: nunca escribe secretos dentro del repositorio', { skip: unavailable(), timeout: 60000 }, () => {
  const inside = run(['--apply', '--secret-dir', join(process.cwd(), 'tmp-secrets')], { HIVE_CONFIRM_ACTIVATION: 'APLICAR' })
  assert.equal(inside.status, 1)
  assert.match(inside.stderr, /SECRET_DIR_INSIDE_REPO/)
})

test('activación: los dos logins pasan de NOLOGIN a LOGIN con sus límites', { skip: unavailable(), timeout: 180000 }, () => {
  const applied = run(['--apply', '--secret-dir', secretDir], { HIVE_CONFIRM_ACTIVATION: 'APLICAR' })
  assert.equal(applied.status, 0, applied.stderr)
  const report = JSON.parse(applied.stdout.slice(0, applied.stdout.lastIndexOf('}') + 1))

  assert.equal(report.ok, true)
  assert.deepEqual(Object.entries(report.checks).filter(([, ok]) => !ok), [])
  assert.equal(report.roles.worker.role, 'hive_app')
  assert.equal(report.roles.worker.connection_limit, 5)
  assert.equal(report.roles.reader.connection_limit, 3)
  assert.equal(report.connection_checks.worker.worker_member, true)
  assert.equal(report.connection_checks.worker.is_superuser, false)
  assert.equal(report.connection_checks.reader.read_only, true)
  assert.equal(report.connection_checks.reader.can_insert, false)

  // Ninguna contraseña en la salida.
  assert.equal(/postgresql:\/\//.test(applied.stdout), false)
  assert.equal(/postgresql:\/\//.test(applied.stderr), false)

  const roles = server.psql(`select string_agg(rolname || ':' || rolcanlogin || ':' || rolconnlimit, ',' order by rolname)
                              from pg_roles where rolname in ('hive_app','hive_console_ro')`)
  assert.equal(roles, 'hive_app:true:5,hive_console_ro:true:3')

  const timeouts = JSON.parse(server.psql(`select jsonb_build_object(
      'worker', (select rolconfig::text from pg_roles where rolname = 'hive_app'),
      'reader', (select rolconfig::text from pg_roles where rolname = 'hive_console_ro'))::text`))
  assert.match(timeouts.worker, /statement_timeout=30s/)
  assert.match(timeouts.reader, /default_transaction_read_only=on/)
})

test('activación: los secretos quedan en archivos 600 y sirven para conectar', { skip: unavailable(), timeout: 120000 }, () => {
  const workerFile = join(secretDir, 'hive-worker-database-url.url')
  const readerFile = join(secretDir, 'hive-reader-database-url.url')
  assert.equal(statSync(workerFile).mode & 0o777, 0o600)
  assert.equal(statSync(readerFile).mode & 0o777, 0o600)

  const workerUrl = readFileSync(workerFile, 'utf8').trim()
  const readerUrl = readFileSync(readerFile, 'utf8').trim()
  const worker = new PsqlClient({ databaseUrl: workerUrl, bin: join(server.bin, 'psql') })
  const reader = new PsqlClient({ databaseUrl: readerUrl, bin: join(server.bin, 'psql') })

  assert.equal(worker.run('select current_user'), 'hive_app')
  assert.throws(() => worker.run(`insert into hive.jobs (idempotency_key, prompt) values ('x', 'x')`), /PSQL_FAILED/)
  assert.equal(reader.run('select current_user'), 'hive_console_ro')
  assert.throws(() => reader.run('select hive.reserve_job(\'ro\', 60)'), /PSQL_FAILED/)
})

test('activación: el reemplazo de credenciales conserva host y base', () => {
  const derived = withCredentials('postgresql://u:p@ep-x.neon.tech/hive?sslmode=require', 'hive_app', 'nueva-clave')
  const url = new URL(derived)
  assert.equal(url.hostname, 'ep-x.neon.tech')
  assert.equal(url.pathname, '/hive')
  assert.equal(url.username, 'hive_app')
  assert.equal(url.searchParams.get('sslmode'), 'require')
  assert.equal(derived.includes('nueva-clave'), true)
  void required
})
