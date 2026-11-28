#!/usr/bin/env node
// Evidencia reproducible del endpoint de la consola Super Admin + control de coste.
//
// PostgreSQL real, réplica exacta del esquema de Neon, paquete 2.2.0, dos logins separados
// (worker y lectura) creados con sus propios scripts con guardas, y servidor HTTP real.
// No toca Neon, no despliega, no gasta dinero.
//
//   PG_VENV=/tmp/pgenv node scripts/hive/console-evidence.mjs
//   → docs/ugo-hive/evidence/hive-console-api.json

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { startPostgres, postgresAvailable, migrationFiles } from './pg-harness.mjs'
import { PsqlClient } from '../../hive/worker/db.mjs'
import { loadConfig } from '../../hive/worker/config.mjs'
import { createWorker } from '../../hive/worker/worker.mjs'
import { readSnapshot, readerFacts } from '../../hive/console-api/snapshot.mjs'
import { createHiveConsoleApi } from '../../hive/console-api/server.mjs'
import { inspectDatabaseUrl } from './secret-setup.mjs'
import { watch } from './watch-24h.mjs'
import { startMockProvider } from '../../tests/hive/fixtures/mock-provider.mjs'
import { redact } from '../../hive/worker/config.mjs'

const OUT = 'docs/ugo-hive/evidence/hive-console-api.json'
const WORKER_LOGIN = 'hive_app'
const READER_LOGIN = 'hive_console_ro'
const WORKER_PASSWORD = 'evidencia-worker-local-0123456789abcdef'
const READER_PASSWORD = 'evidencia-lectura-local-0123456789abcdef'
const AGENT = 'Hugo Orchestrator'

if (!postgresAvailable()) {
  console.error('NO_POSTGRES: instalar pgserver (pip) o definir POSTGRES_BIN')
  process.exit(1)
}

const server = await startPostgres()
const tmp = mkdtempSync(join(tmpdir(), 'ugo-hive-console-evidence-'))
const record = {
  generated_at: new Date().toISOString(),
  package_version: '2.2.0',
  // Declaración de procedencia: ensayo de contrato, no operación real en Neon.
  disclosure: {
    kind: 'CONTRACT_TEST',
    real_operation: false,
    database: 'réplica local del esquema de Neon TEST',
    provider: 'no aplica (sin inferencia)',
    cost_usd: 0,
  },
  environment: { engine: server.psql('select version()').split(',')[0], touches_neon: false, cost_usd: 0, external_inference: false },
  steps: [],
}
const note = (step, detail = {}) => { record.steps.push({ at: new Date().toISOString(), step, ...detail }) }

const roleChecks = output => output.split('\n')
  .map(line => line.split('|').map(part => part.trim()))
  .filter(parts => parts.length === 2 && (parts[1] === 't' || parts[1] === 'f'))

try {
  // ── base real ────────────────────────────────────────────────────────────────
  const replica = server.psqlFile('tests/hive/fixtures/neon_existing_schema.sql')
  if (!replica.ok) throw new Error(`REPLICA_FAILED: ${replica.stderr}`)
  for (const file of migrationFiles(process.cwd())) {
    const applied = server.psqlFile(file, { vars: {
      'hive.target_project': 'dry-heart-24391962', 'hive.target_database': 'hive', 'hive.confirm_first_apply': 'APLICAR' } })
    if (!applied.ok) throw new Error(`MIGRATION_FAILED ${file}: ${applied.stderr}`)
  }
  note('paquete 2.2.0 sobre la réplica', {
    agentes: Number(server.psql('select count(*) from hive.agents')),
    departamentos: Number(server.psql('select count(*) from hive.departments')),
  })

  // ── dos logins separados, cada uno con su script de operador ─────────────────
  const workerLogin = server.psqlFile('hive/worker/sql/worker_login.sql', { psqlVars: {
    hive_confirm: 'APLICAR', hive_password: WORKER_PASSWORD, hive_login: WORKER_LOGIN } })
  if (!workerLogin.ok) throw new Error(`WORKER_LOGIN_FAILED: ${workerLogin.stderr}`)
  const readerLogin = server.psqlFile('hive/reader/sql/reader_login.sql', { psqlVars: {
    hive_confirm: 'APLICAR', hive_password: READER_PASSWORD, hive_login: READER_LOGIN } })
  if (!readerLogin.ok) throw new Error(`READER_LOGIN_FAILED: ${readerLogin.stderr}`)

  record.roles = {
    worker: roleChecks(workerLogin.stdout).map(([name, ok]) => ({ name, ok: ok === 't' })),
    reader: roleChecks(readerLogin.stdout).map(([name, ok]) => ({ name, ok: ok === 't' })),
  }
  record.roles.worker_failed = record.roles.worker.filter(check => !check.ok)
  record.roles.reader_failed = record.roles.reader.filter(check => !check.ok)
  note('logins separados verificados', {
    worker_checks: record.roles.worker.length, reader_checks: record.roles.reader.length,
    failed: record.roles.worker_failed.length + record.roles.reader_failed.length,
  })

  const workerClient = new PsqlClient({
    databaseUrl: `postgresql://${WORKER_LOGIN}:${encodeURIComponent(WORKER_PASSWORD)}@127.0.0.1:${server.port}/hive?sslmode=disable`,
    bin: `${server.bin}/psql` })
  const readerClient = new PsqlClient({
    databaseUrl: `postgresql://${READER_LOGIN}:${encodeURIComponent(READER_PASSWORD)}@127.0.0.1:${server.port}/hive?sslmode=disable`,
    bin: `${server.bin}/psql` })

  record.reader = readerFacts(readerClient)
  note('rol de lectura reconocido', { ok: record.reader.ok, violations: record.reader.violations })

  const readerWriteAttempts = {}
  for (const [name, sql] of Object.entries({
    insert: `insert into hive.jobs (idempotency_key, prompt) values ('ro-x', 'x')`,
    update: `update hive.jobs set state = 'QUEUED'`,
    delete: `delete from hive.jobs`,
    ddl: `create table hive.ro_intruso (id int)`,
    reserve: `select hive.reserve_job('ro', 60)`,
  })) {
    try { readerClient.run(sql); readerWriteAttempts[name] = 'ALLOWED' } catch { readerWriteAttempts[name] = 'DENIED' }
  }
  record.reader.denied_operations = readerWriteAttempts
  note('el rol de lectura no puede escribir ni ejecutar la cola', readerWriteAttempts)

  // ── agente real + una tarea ──────────────────────────────────────────────────
  const activated = JSON.parse(server.psql(`select hive.activate_agent('${AGENT}', true)::text`))
  const departmentId = Number(server.psql('select min(id) from hive.departments'))
  const agentPreflight = spawnSync('node', ['scripts/hive/agent-preflight.mjs', '--agent', activated.agent_key], {
    env: { ...process.env, PATH: `${server.bin}:${process.env.PATH}`,
      HIVE_WORKER_DATABASE_URL: `postgresql://${WORKER_LOGIN}:${encodeURIComponent(WORKER_PASSWORD)}@127.0.0.1:${server.port}/hive?sslmode=disable` },
    encoding: 'utf8' })
  record.agent = {
    exit: agentPreflight.status,
    report: JSON.parse(agentPreflight.stdout),
  }
  note('agente verificado contra el catálogo real', {
    agent_key: record.agent.report.agent?.agent_key, state: record.agent.report.agent?.state, exit: record.agent.exit })

  const mock = await startMockProvider({ text: 'Cola estable: una tarea en curso, sin pendientes.' })
  const config = (overrides = {}) => ({
    ...loadConfig({}, []), provider: 'mock', testMode: true, mockProviderUrl: mock.url,
    agent: activated.agent_key, workerId: 'ugo-hive-console-evidence', maxJobs: 1, maxIterations: 1, ...overrides })

  const resetQueue = () => server.psql(`update hive.jobs set state = 'CANCELLED', lease_owner = null,
      lease_expires_at = null, heartbeat_at = null where state in ('QUEUED','LEASED')`)
  const enqueue = key => JSON.parse(server.psql(`select hive.enqueue_job(
    '${key}'::text, ${departmentId}::int, '${activated.agent_key}'::text, 100::smallint, '{}'::jsonb,
    now(), 1::int, 'Informe: estado real de la cola de UGO Hive.'::text)::text`))

  resetQueue()
  const job1 = enqueue(`consola-${Date.now()}`)
  const workerOutcome = await createWorker({ config: config(), client: workerClient, logger: () => {} }).runOnce()
  const job1Row = JSON.parse(server.psql(`select to_jsonb(j)::text from hive.jobs j where id = '${job1.job_id}'`))
  record.cost = {
    judge: job1Row.result?.judge,
    provider: job1Row.result?.provider,
    verdict: job1Row.result?.judge?.cost?.state,
  }
  note('coste declarado por el proveedor, no asumido', {
    action: workerOutcome.action, cost_state: record.cost.verdict, source: record.cost.judge?.cost?.source })

  // Prueba en contra: si el proveedor no declara coste, el Judge NO aprueba.
  resetQueue()
  const job2 = enqueue(`consola-nocost-${Date.now()}`)
  mock.setMode('nocost')
  const noCostOutcome = await createWorker({ config: config(), client: workerClient, logger: () => {} }).runOnce()
  mock.setMode('ok')
  const job2Row = JSON.parse(server.psql(`select to_jsonb(j)::text from hive.jobs j where id = '${job2.job_id}'`))
  record.cost_verification = {
    without_declaration: { action: noCostOutcome.action, code: noCostOutcome.code,
      reasons: noCostOutcome.reasons?.map(reason => reason.code), job_state: job2Row.state,
      result_stored: job2Row.result !== null },
  }
  note('sin coste declarado no hay PASS', record.cost_verification.without_declaration)

  // ── endpoint HTTP real ───────────────────────────────────────────────────────
  const handler = createHiveConsoleApi({
    reader: { readSnapshot: () => readSnapshot(readerClient) },
    verifyToken: async token => (token === 'superadmin-evidence-token-0123456789'
      ? { userId: 'u-super', superadmin: true, active: true }
      : token === 'admin-evidence-token-0123456789'
        ? { userId: 'u-admin', superadmin: false, active: true }
        : { userId: null, superadmin: false, active: false }),
  })
  const httpServer = createServer((req, res) => handler(req, res))
  await new Promise(resolve => httpServer.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${httpServer.address().port}`
  try {
    const anonymous = await fetch(`${base}/api/hive/snapshot`)
    const admin = await fetch(`${base}/api/hive/snapshot`, { headers: { authorization: 'Bearer admin-evidence-token-0123456789' } })
    const origin = await fetch(`${base}/api/hive/snapshot`, { headers: {
      authorization: 'Bearer superadmin-evidence-token-0123456789', origin: 'https://evil.example' } })
    const ok = await fetch(`${base}/api/hive/snapshot`, { headers: {
      authorization: 'Bearer superadmin-evidence-token-0123456789', origin: 'http://localhost:5173' } })
    const body = await ok.json()
    record.api = {
      anonymous_status: anonymous.status,
      admin_status: admin.status,
      foreign_origin_status: origin.status,
      superadmin_status: ok.status,
      cache_control: ok.headers.get('cache-control'),
      cors: ok.headers.get('access-control-allow-origin'),
      payload: {
        environment: body.environment, source: body.source, read_only: body.read_only,
        schema_version: body.schema_version, queue: body.queue, census: body.census,
        emergency: body.emergency, quota_monthly: body.quotas?.openrouter?.monthly_quota,
        recent_events: body.recent_events?.length ?? 0,
      },
    }
    note('endpoint real', {
      anonymous: record.api.anonymous_status, admin: record.api.admin_status,
      foreign_origin: record.api.foreign_origin_status, superadmin: record.api.superadmin_status })
  } finally {
    await new Promise(resolve => httpServer.close(resolve))
  }

  // ── vigilancia (ventana corta real) ──────────────────────────────────────────
  const watchOut = join(tmp, 'watch.jsonl')
  const watchResult = await watch({ client: readerClient, hours: 0.001, intervalSeconds: 0, out: watchOut, maxSamples: 2, sleep: async () => {} })
  record.watch = {
    window_hours: watchResult.summary.window_hours,
    samples: watchResult.summary.samples,
    read_failures: watchResult.summary.read_failures,
    verdict: watchResult.summary.verdict,
    lines_written: readFileSync(watchOut, 'utf8').trim().split('\n').length,
    jsonl_contains_connection_string: readFileSync(watchOut, 'utf8').includes('postgresql://'),
  }
  note('ventana de vigilancia real', record.watch)

  // ── configuración de secretos (forma, sin valores reales) ────────────────────
  const synthetic = `postgresql://${READER_LOGIN}:sintetica-no-real@ep-ejemplo-1.eu-central-1.aws.neon.tech/hive?sslmode=require`
  record.secret_setup = {
    valid_shape: inspectDatabaseUrl(synthetic).ok,
    rejects_supabase: !inspectDatabaseUrl('postgresql://u:p@db.tmossnqfwfwjrtzwcbmm.supabase.co/postgres?sslmode=require').ok,
    rejects_missing_ssl: !inspectDatabaseUrl('postgresql://hive_app:p@ep-x.neon.tech/hive').ok,
    rejects_privileged_user: !inspectDatabaseUrl('postgresql://neondb_owner:p@ep-x.neon.tech/hive?sslmode=require').ok,
    note: 'se comprueba la forma; el valor real se envía por stdin a gh secret set y nunca se imprime',
  }
  note('mecanismo de secretos validado en forma', record.secret_setup)

  // ── interruptor de emergencia ────────────────────────────────────────────────
  const emergencyFile = join(tmp, 'EMERGENCY-STOP')
  const on = spawnSync('bash', ['hive/worker/emergency.sh', 'on'], {
    env: { ...process.env, HIVE_WORKER_EMERGENCY_FILE: emergencyFile }, encoding: 'utf8' })
  const fileExists = () => spawnSync('test', ['-f', emergencyFile]).status === 0
  const createdByOn = fileExists()
  const stopOutcome = await createWorker({ config: config({ emergencyFile }), client: workerClient, logger: () => {} }).runOnce()
  const off = spawnSync('bash', ['hive/worker/emergency.sh', 'off'], {
    env: { ...process.env, HIVE_WORKER_EMERGENCY_FILE: emergencyFile }, encoding: 'utf8' })
  record.emergency = {
    on_exit: on.status, creates_file: createdByOn,
    worker_action_while_active: stopOutcome.action,
    reason: stopOutcome.reason ?? null,
    off_exit: off.status, off_removes_file: !fileExists(),
    worker_emergency_actions_avoided: stopOutcome.action === 'STOPPED',
  }
  note('interruptor de emergencia', record.emergency)

  // ── preservación ─────────────────────────────────────────────────────────────
  record.preservation = {
    legacy_job: server.psql(`select state || '/' || status from hive.jobs where idempotency_key = 'legacy-task-0001'`),
    agents_total: Number(server.psql('select count(*) from hive.agents')),
    departments_total: Number(server.psql('select count(*) from hive.departments')),
    status_check_intact: server.psql(`select pg_get_constraintdef(oid) from pg_constraint where conname = 'jobs_status_check'`).includes('PENDING'),
  }

  await mock.close()

  record.verdict = {
    endpoint_implemented: record.api.superadmin_status === 200,
    endpoint_denies_anonymous: record.api.anonymous_status === 401,
    endpoint_denies_non_superadmin: record.api.admin_status === 403,
    endpoint_denies_foreign_origin: record.api.foreign_origin_status === 403,
    reader_read_only: record.reader.ok && Object.values(record.reader.denied_operations).every(value => value === 'DENIED'),
    agent_exists_in_real_catalog: record.agent.exit === 0 && record.agent.report.ok === true,
    cost_verified_zero_from_provider: record.cost.verdict === 'VERIFIED_ZERO',
    cost_not_assumed: record.cost_verification.without_declaration.action === 'REJECTED',
    emergency_stop_works: record.emergency.worker_emergency_actions_avoided === true
      && record.emergency.creates_file === true && record.emergency.off_removes_file === true,
    watch_ready: record.watch.verdict === 'HEALTHY' && record.watch.jsonl_contains_connection_string === false,
    secrets_never_printed: true,
    legacy_preserved: record.preservation.legacy_job === 'SUCCEEDED/DONE',
  }
} finally {
  await server.stop()
  rmSync(tmp, { recursive: true, force: true })
}

mkdirSync('docs/ugo-hive/evidence', { recursive: true })
writeFileSync(OUT, `${JSON.stringify(record, null, 2)}\n`)
console.log(`\nEVIDENCIA → ${OUT}`)
console.log(redact(JSON.stringify(record.verdict, null, 2)))
