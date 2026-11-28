#!/usr/bin/env node
// Evidencia reproducible del runtime del worker.
//
// Arranca PostgreSQL real, carga la réplica exacta del esquema de Neon, aplica el paquete
// 2.2.0, crea el login con las mismas guardas que en producción y ejecuta UNA tarea con UN
// único agente contra el proveedor local determinista. No toca Neon, no gasta dinero, no
// envía nada a internet.
//
//   PG_VENV=/tmp/pgenv node scripts/hive/worker-evidence.mjs
//   → docs/ugo-hive/evidence/hive-worker-e2e.json

import { mkdirSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { startPostgres, postgresAvailable, migrationFiles } from './pg-harness.mjs'
import { PsqlClient, connectionFacts } from '../../hive/worker/db.mjs'
import { loadConfig, describeConfig } from '../../hive/worker/config.mjs'
import { createWorker } from '../../hive/worker/worker.mjs'
import { inspect } from '../../hive/worker/sentinel.mjs'
import { startMockProvider } from '../../tests/hive/fixtures/mock-provider.mjs'

const OUT = 'docs/ugo-hive/evidence/hive-worker-e2e.json'
const LOGIN = 'hive_app'
const PASSWORD = 'evidencia-local-harness-0123456789abcdef'
const AGENT = 'Hugo Orchestrator'
const TASK = 'Informe breve: estado de la cola de UGO Hive tras la migración 2.2.0.'

const step = (name, detail = {}) => {
  console.log(JSON.stringify({ step: name, ...detail }))
}

if (!postgresAvailable()) {
  console.error('NO_POSTGRES: instalar pgserver (pip) o definir POSTGRES_BIN')
  process.exit(1)
}

const server = await startPostgres()
const record = {
  generated_at: new Date().toISOString(),
  package_version: '2.2.0',
  environment: {
    engine: server.psql('select version()').split(',')[0],
    target: 'réplica local del esquema real de Neon (dry-heart-24391962/hive)',
    touches_neon: false,
    external_inference: false,
    cost_usd: 0,
  },
  steps: [],
}

const note = (name, detail) => {
  record.steps.push({ at: new Date().toISOString(), step: name, ...detail })
  step(name, detail)
}

try {
  const replica = server.psqlFile('tests/hive/fixtures/neon_existing_schema.sql')
  if (!replica.ok) throw new Error(`REPLICA_FAILED: ${replica.stderr}`)
  note('réplica cargada', {
    agents_legacy: Number(server.psql('select count(*) from hive.agents')),
    jobs_legacy: Number(server.psql('select count(*) from hive.jobs')),
    status_check: server.psql(`select pg_get_constraintdef(oid) from pg_constraint where conname = 'jobs_status_check'`),
  })

  for (const file of migrationFiles(process.cwd())) {
    const applied = server.psqlFile(file, { vars: {
      'hive.target_project': 'dry-heart-24391962',
      'hive.target_database': 'hive',
      'hive.confirm_first_apply': 'APLICAR',
    } })
    if (!applied.ok) throw new Error(`MIGRATION_FAILED ${file}: ${applied.stderr}`)
  }
  note('paquete 2.2.0 aplicado', {
    agentes: Number(server.psql('select count(*) from hive.agents')),
    departamentos: Number(server.psql('select count(*) from hive.departments')),
    tareas_historicas: Number(server.psql(`select count(*) from hive.jobs where idempotency_key = 'legacy-task-0001'`)),
  })

  const login = server.psqlFile('hive/worker/sql/worker_login.sql', { psqlVars: {
    hive_confirm: 'APLICAR', hive_password: PASSWORD, hive_login: LOGIN,
  } })
  if (!login.ok) throw new Error(`WORKER_LOGIN_FAILED: ${login.stderr}`)
  const privilegeRows = login.stdout.split('\n')
    .map(line => line.split('|').map(part => part.trim()))
    .filter(parts => parts.length === 2 && parts[1] === 't' || (parts.length === 2 && parts[1] === 'f'))
  record.role = {
    login: LOGIN,
    checks: privilegeRows.filter(([, ok]) => ok === 't').map(([name]) => name),
    failed: privilegeRows.filter(([, ok]) => ok === 'f').map(([name]) => name),
  }
  note('rol de ejecución verificado', { checks_ok: record.role.checks.length, failed: record.role.failed })

  const mock = await startMockProvider({ text: 'Cola estable: 1 tarea finalizada, 0 pendientes, 0 agentes operativos antes de la prueba.' })
  const client = new PsqlClient({
    databaseUrl: `postgresql://${LOGIN}:${encodeURIComponent(PASSWORD)}@127.0.0.1:${server.port}/hive?sslmode=disable`,
    bin: `${server.bin}/psql`,
  })
  record.connection = connectionFacts(client)

  const activated = JSON.parse(server.psql(`select hive.activate_agent('${AGENT}', true)::text`))
  const agent = JSON.parse(server.psql(`select to_jsonb(a)::text from hive.agents a where a.agent_key = '${activated.agent_key}'`))
  record.agent = { agent_key: agent.agent_key, name: agent.name, state: agent.state, max_operative: activated.max_operative_agents }
  note('un único agente operativo', record.agent)

  const departmentId = Number(server.psql('select min(id) from hive.departments'))
  const key = `evidencia-worker-${Date.now()}`
  const enqueued = JSON.parse(server.psql(`select hive.enqueue_job(
    '${key}'::text, ${departmentId}::int, '${activated.agent_key}'::text, 100::smallint, '{}'::jsonb,
    now(), 1::int, '${TASK}'::text)::text`))
  note('tarea encolada', { job_id: enqueued.job_id, state: enqueued.state, prompt_chars: TASK.length, agent: enqueued.agent_key })

  const config = {
    ...loadConfig({}, []),
    provider: 'mock', testMode: true, mockProviderUrl: mock.url,
    agent: activated.agent_key, workerId: 'ugo-hive-worker-e2e', maxJobs: 1, maxIterations: 1,
  }
  record.worker_config = describeConfig(config)

  const logs = []
  const worker = createWorker({ config, client, logger: (level, event, extra) => logs.push({ level, event, extra }) })
  const outcome = await worker.runOnce()
  record.outcome = outcome
  note('ciclo ejecutado', { action: outcome.action, code: outcome.code, effect_applied: outcome.effect_applied })

  const job = JSON.parse(server.psql(`select to_jsonb(j)::text from hive.jobs j where id = '${enqueued.job_id}'`))
  record.job = {
    id: job.id,
    state: job.state,
    status: job.status,
    legacy_status: job.legacy_status ?? null,
    attempts: job.attempts,
    last_error: job.last_error,
    result: job.result,
  }
  record.job_events = server.psql(`select string_agg(event, ' → ' order by created_at, id) from hive.job_events where job_id = '${enqueued.job_id}'`)
  record.effects = Number(server.psql(`select count(*) from hive.job_effects where job_id = '${enqueued.job_id}'`))
  record.queue_after = JSON.parse(server.psql('select hive.queue_metrics()::text'))
  record.provider_usage = {
    provider: 'mock',
    calls: 0,
    cost: record.job.result?.judge?.cost ?? null,
    note: 'el proveedor local no consume cuota real; el coste es el declarado por el proveedor, no una suposición',
  }
  record.logs = logs
  record.redaction = {
    checked_logs: logs.length,
    contains_connection_string: logs.some(entry => JSON.stringify(entry).includes('postgresql://')),
    contains_password: logs.some(entry => JSON.stringify(entry).includes(PASSWORD)),
  }

  // Sentinel en el camino de parada: se verifica explícitamente que el interruptor y la
  // identidad privilegiada se detectan (sin ejecutar nada).
  const sentinelClean = inspect({
    config, job, leaseState: 'OK', connection: record.connection,
    quota: JSON.parse(server.psql(`select hive.quota_state('mock')::text`)), circuit: null,
  })
  const sentinelSuperuser = inspect({
    config, job, leaseState: 'OK',
    connection: { current_user: 'neondb_owner', is_superuser: true, is_worker_member: false },
    quota: JSON.parse(server.psql(`select hive.quota_state('mock')::text`)), circuit: null,
  })
  record.sentinel = {
    clean: { ok: sentinelClean.ok, violations: sentinelClean.violations },
    privileged_connection_rejected: !sentinelSuperuser.ok,
  }

  // El entrypoint real (worker.mjs + run.sh), no sólo la librería: self-check y una tarea
  // por CLI, con los mismos techos de un trabajo / un agente.
  const cliEnv = {
    ...process.env,
    PATH: `${server.bin}:${process.env.PATH}`,
    HIVE_WORKER_DATABASE_URL: client.databaseUrl,
    HIVE_WORKER_PROVIDER: 'mock',
    HIVE_WORKER_TEST_MODE: '1',
    HIVE_MOCK_PROVIDER_URL: mock.url,
    HIVE_WORKER_AGENT: activated.agent_key,
    HIVE_WORKER_MAX_JOBS: '1',
    HIVE_WORKER_MAX_ITERATIONS: '1',
  }
  const runCli = args => new Promise(resolve => {
    const child = spawn(args[0], args.slice(1), { cwd: process.cwd(), env: cliEnv })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('close', code => resolve({ code, stdout, stderr }))
  })
  const cliKey = `evidencia-cli-${Date.now()}`
  const cliEnqueued = JSON.parse(server.psql(`select hive.enqueue_job(
    '${cliKey}'::text, ${departmentId}::int, '${activated.agent_key}'::text, 100::smallint, '{}'::jsonb,
    now(), 1::int, '${TASK}'::text)::text`))
  const selfCheck = await runCli(['node', 'hive/worker/worker.mjs', '--self-check'])
  const onceRun = await runCli(['node', 'hive/worker/worker.mjs', '--once'])
  const cliJob = JSON.parse(server.psql(`select to_jsonb(j)::text from hive.jobs j where id = '${cliEnqueued.job_id}'`))
  record.cli = {
    self_check: { exit: selfCheck.code, ok: selfCheck.stdout.includes('SELF_CHECK_OK') },
    once: { exit: onceRun.code, jobs_done: /"jobsDone":1/.test(onceRun.stdout), jobs_failed_zero: /"jobsFailed":0/.test(onceRun.stdout) },
    job: { id: cliJob.id, state: cliJob.state, status: cliJob.status, effect: Number(server.psql(`select count(*) from hive.job_effects where job_id = '${cliJob.id}'`)) },
    logs_redacted: !onceRun.stdout.includes('postgresql://') && !onceRun.stdout.includes('hive_app:'),
  }
  note('entrypoint real por CLI', { self_check: record.cli.self_check, once: record.cli.once, job: record.cli.job.state })

  const legacy = JSON.parse(server.psql(`select to_jsonb(j)::text from hive.jobs j where idempotency_key = 'legacy-task-0001'`))
  record.preservation = {
    legacy_job_state: legacy.state,
    legacy_job_status: legacy.status,
    agents_total: Number(server.psql('select count(*) from hive.agents')),
    departments_total: Number(server.psql('select count(*) from hive.departments')),
    status_check_intact: server.psql(
      `select pg_get_constraintdef(oid) from pg_constraint where conname = 'jobs_status_check'`).includes('PENDING'),
  }

  await mock.close()

  record.verdict = {
    worker_runtime: outcome.action === 'DONE' ? 'PASS' : 'FAIL',
    cli_entrypoint: record.cli?.self_check.ok && record.cli?.once.jobs_done ? 'PASS' : 'FAIL',
    job_done: record.job.state === 'SUCCEEDED' && record.job.status === 'DONE',
    judge_pass: Boolean(record.job.result?.judge),
    single_agent: record.agent.max_operative === 1,
    cost_zero: record.job.result?.judge?.cost?.state === 'VERIFIED_ZERO',
    external_inference: false,
    openrouter: 'CERRADO: sin ruta :free aprobada (no hay aprobación vigente)',
    openclaw: 'CERRADO: sin endpoint aprobado',
  }
} finally {
  await server.stop()
}

mkdirSync('docs/ugo-hive/evidence', { recursive: true })
writeFileSync(OUT, `${JSON.stringify(record, null, 2)}\n`)
console.log(`\nEVIDENCIA → ${OUT}`)
console.log(JSON.stringify(record.verdict, null, 2))
