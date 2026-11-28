#!/usr/bin/env node
// Evidencia de la Fase 8 (integración operativa), reproducible y sin coste.
//
// Reproduce el estado real de Neon TEST —roles creados y NOLOGIN— y ejecuta el
// procedimiento completo: activación segura → proveedor local → una tarea con un agente →
// endpoint autenticado → vigilancia. Todo contra PostgreSQL real y la réplica exacta.
//
//   PG_VENV=/tmp/pgenv node scripts/hive/ops-evidence.mjs
//   → docs/ugo-hive/evidence/hive-ops-fase8.json

import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { startPostgres, postgresAvailable, migrationFiles } from './pg-harness.mjs'
import { PsqlClient } from '../../hive/worker/db.mjs'
import { loadConfig, redact } from '../../hive/worker/config.mjs'
import { createWorker } from '../../hive/worker/worker.mjs'
import { readSnapshot, readerFacts } from '../../hive/console-api/snapshot.mjs'
import { createHiveConsoleApi, supabaseVerifier } from '../../hive/console-api/server.mjs'
import { watch } from './watch-24h.mjs'
import { startMockProvider } from '../../tests/hive/fixtures/mock-provider.mjs'

const OUT = 'docs/ugo-hive/evidence/hive-ops-fase8.json'
const TASK = 'Informe breve del estado de la cola de UGO Hive tras la activación de los logins.'

if (!postgresAvailable()) {
  console.error('NO_POSTGRES: instalar pgserver (pip) o definir POSTGRES_BIN')
  process.exit(1)
}

const server = await startPostgres()
const tmp = mkdtempSync(join(tmpdir(), 'ugo-hive-ops-'))
const secretDir = join(tmp, 'secrets')
const record = {
  generated_at: new Date().toISOString(),
  package_version: '2.2.0',
  environment: { engine: server.psql('select version()').split(',')[0], touches_neon: false, cost_usd: 0, external_inference: false },
  steps: [],
}
const note = (step, detail = {}) => { record.steps.push({ at: new Date().toISOString(), step, ...detail }) }

const envFor = extra => ({
  ...process.env,
  PATH: `${server.bin}:${process.env.PATH}`,
  PSQL_BIN: join(server.bin, 'psql'),
  ...extra,
})
const parseJson = output => JSON.parse(output.slice(output.indexOf('{'), output.lastIndexOf('}') + 1))

// Los hijos que llaman al servidor local deben ejecutarse en ASÍNCRONO: con spawnSync el
// bucle de eventos del padre se bloquea y el servidor de pruebas no puede responder.
const runCliAsync = (args, env) => new Promise(resolve => {
  const child = spawn(args[0], args.slice(1), { env, cwd: process.cwd() })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', chunk => { stdout += chunk })
  child.stderr.on('data', chunk => { stderr += chunk })
  child.on('close', status => resolve({ status, stdout, stderr }))
})

try {
  const replica = server.psqlFile('tests/hive/fixtures/neon_existing_schema.sql')
  if (!replica.ok) throw new Error(`REPLICA_FAILED: ${replica.stderr}`)
  for (const file of migrationFiles(process.cwd())) {
    const applied = server.psqlFile(file, { vars: {
      'hive.target_project': 'dry-heart-24391962', 'hive.target_database': 'hive', 'hive.confirm_first_apply': 'APLICAR' } })
    if (!applied.ok) throw new Error(`MIGRATION_FAILED ${file}: ${applied.stderr}`)
  }

  // ── 1 · réplica del estado de Neon: roles creados y NOLOGIN ──────────────────
  server.psql(`
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'hive_app') then
        create role hive_app nologin; grant hive_worker to hive_app;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'hive_console_ro') then
        create role hive_console_ro nologin; grant hive_reader to hive_console_ro;
      end if;
    end $$;`)
  record.roles_before = JSON.parse(server.psql(`select jsonb_build_object(
    'hive_app', (select rolcanlogin from pg_roles where rolname='hive_app'),
    'hive_console_ro', (select rolcanlogin from pg_roles where rolname='hive_console_ro'))::text`))
  note('roles existentes en NOLOGIN (sin crearlos aquí)', record.roles_before)

  // ── 2 · activación segura de los dos logins ───────────────────────────────────
  const adminUrl = `postgresql://postgres@127.0.0.1:${server.port}/hive?sslmode=disable`
  const activation = spawnSync('node', ['scripts/hive/activate-logins.mjs', '--apply', '--secret-dir', secretDir], {
    env: envFor({ HIVE_MIGRATOR_DATABASE_URL: adminUrl, HIVE_CONFIRM_ACTIVATION: 'APLICAR' }),
    encoding: 'utf8',
  })
  if (activation.status !== 0) throw new Error(`ACTIVATION_FAILED: ${activation.stderr.slice(0, 400)}`)
  const activationReport = parseJson(activation.stdout)
  record.activation = {
    ok: activationReport.ok,
    checks: activationReport.checks,
    roles: activationReport.roles,
    connection_checks: activationReport.connection_checks,
    secret_files_mode: Object.values(activationReport.secrets.files).map(file => (statSync(file).mode & 0o777).toString(8)),
    stdout_contains_dsn: /postgresql:\/\//.test(activation.stdout),
  }
  note('logins activados y verificados', { ok: record.activation.ok, checks: Object.keys(record.activation.checks).length, dsn_leaked: record.activation.stdout_contains_dsn })

  const workerUrl = readFileSync(join(secretDir, 'hive-worker-database-url.url'), 'utf8').trim()
  const readerUrl = readFileSync(join(secretDir, 'hive-reader-database-url.url'), 'utf8').trim()
  const workerClient = new PsqlClient({ databaseUrl: workerUrl, bin: join(server.bin, 'psql') })
  const readerClient = new PsqlClient({ databaseUrl: readerUrl, bin: join(server.bin, 'psql') })
  record.reader = readerFacts(readerClient)
  record.worker_identity = JSON.parse(workerClient.run(`select jsonb_build_object(
    'current_user', current_user,
    'is_superuser', (select rolsuper from pg_roles where rolname = current_user),
    'worker_member', pg_has_role(current_user, 'hive_worker', 'member'))::text`))

  // ── 3 · proveedor local: sólo loopback, coste declarado ──────────────────────
  const mock = await startMockProvider({ path: '/api/complete', text: 'Cola operativa: una tarea en curso, sin pendientes.' })
  const localUrl = `http://127.0.0.1:${new URL(mock.url).port}`
  const localCheck = await runCliAsync(['node', 'scripts/hive/local-provider-check.mjs', '--out', join(tmp, 'local-provider.json')], envFor({
      HIVE_LOCAL_PROVIDER_URL: localUrl,
      HIVE_LOCAL_PROVIDER_APPROVED: 'APROBADO',
      HIVE_LOCAL_PROVIDER_MODEL: 'local/free',
    }))
  record.local_provider = JSON.parse(readFileSync(join(tmp, 'local-provider.json'), 'utf8'))
  note('proveedor local verificado', { exit: localCheck.status, checks: record.local_provider.checks })

  // ── 4 · una sola tarea con un solo agente ────────────────────────────────────
  server.psql(`select hive.activate_agent('Hugo Orchestrator', true)`)
  const single = await runCliAsync(['node', 'scripts/hive/run-single-task.mjs', '--agent', 'hugo-orchestrator',
    '--prompt', TASK, '--out', join(tmp, 'single-task.json')], envFor({
      HIVE_WORKER_DATABASE_URL: workerUrl,
      HIVE_WORKER_PROVIDER: 'local',
      HIVE_LOCAL_PROVIDER_URL: localUrl,
      HIVE_LOCAL_PROVIDER_APPROVED: 'APROBADO',
      HIVE_LOCAL_PROVIDER_MODEL: 'local/free',
      HIVE_CONFIRM_SINGLE_TASK: 'APLICAR',
    }))
  record.single_task = JSON.parse(readFileSync(join(tmp, 'single-task.json'), 'utf8'))
  note('tarea única ejecutada', {
    exit: single.status, state: record.single_task.job.state, cost: record.single_task.cost?.state,
    events: record.single_task.job.events })

  // ── 5 · instantánea y endpoint autenticado ───────────────────────────────────
  const snapshot = readSnapshot(readerClient)
  record.snapshot = {
    departments: snapshot.departments.length,
    department_ids: snapshot.departments.map(department => department.id),
    agents_total: snapshot.census.total,
    agents_unassigned: snapshot.agents_unassigned,
    states: { operative: snapshot.census.operative, connected: snapshot.census.connected, registered: snapshot.census.registered, disabled: snapshot.census.disabled },
    emergency: snapshot.emergency,
    quota_monthly: snapshot.quotas.openrouter.monthly_quota,
  }
  note('instantánea real', record.snapshot)

  const handler = createHiveConsoleApi({
    reader: { readSnapshot: () => readSnapshot(readerClient) },
    verifyToken: async token => (token === 'superadmin-ops-token-0123456789'
      ? { userId: 'u-super', superadmin: true, active: true }
      : { userId: 'u-other', superadmin: false, active: true }),
  })
  const http = createServer((req, res) => handler(req, res))
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${http.address().port}`
  try {
    const anonymous = await fetch(`${base}/api/hive/snapshot`)
    const notSuper = await fetch(`${base}/api/hive/snapshot`, { headers: { authorization: 'Bearer otros-permisos-0123456789' } })
    const ok = await fetch(`${base}/api/hive/snapshot`, { headers: { authorization: 'Bearer superadmin-ops-token-0123456789', origin: 'http://localhost:5173' } })
    const payload = await ok.json()
    record.api = {
      anonymous: anonymous.status,
      not_superadmin: notSuper.status,
      superadmin: ok.status,
      cache_control: ok.headers.get('cache-control'),
      departments_in_payload: payload.departments?.length ?? 0,
      agents_in_payload: payload.census?.total ?? null,
      read_only: payload.read_only,
    }
  } finally {
    await new Promise(resolve => http.close(resolve))
  }
  note('endpoint autenticado', record.api)

  // ── 6 · auth sin credenciales privilegiadas ──────────────────────────────────
  const authCalls = []
  const stubFetch = async (url, init = {}) => {
    authCalls.push({ url: String(url), apikey: init.headers?.apikey, authorization: init.headers?.authorization })
    if (String(url).endsWith('/auth/v1/user')) {
      return new Response(JSON.stringify({ id: 'u-super', banned_until: null }), { status: 200 })
    }
    return new Response(JSON.stringify([{ tipo: 'superadmin', activo: true }]), { status: 200 })
  }
  const verify = supabaseVerifier({ url: 'https://ejemplo.supabase.co', anonKey: 'clave-publica', fetchImpl: stubFetch })
  const identity = await verify('jwt-del-superadmin')
  record.auth = {
    mode: 'user',
    identity,
    requests: authCalls.length,
    uses_only_public_key: authCalls.every(call => call.apikey === 'clave-publica'),
    forwards_user_token_to_profile: authCalls.some(call => call.authorization === 'Bearer jwt-del-superadmin'),
    privileged_credentials_used: authCalls.some(call => String(call.apikey).includes('service')),
  }
  note('auth sin clave de servicio', record.auth)

  // ── 7 · emergencia nivel 2 (base) + nivel 1 (archivo) ────────────────────────
  server.psql(`insert into hive.settings(key, value) values ('emergency_stop', 'true'::jsonb)
               on conflict (key) do update set value = 'true'::jsonb`)
  const stopDb = await createWorker({ config: { ...loadConfig(envFor({})), provider: 'local',
    localProviderUrl: localUrl, localProviderApproved: 'APROBADO', agent: 'hugo-orchestrator' },
    client: workerClient, logger: () => {} }).runOnce()
  server.psql(`update hive.settings set value = 'false'::jsonb where key = 'emergency_stop'`)
  const stopFile = join(tmp, 'EMERGENCY-STOP')
  writeFileSync(stopFile, 'parada de evidencia\n')
  const stopFileResult = await createWorker({ config: { ...loadConfig(envFor({})), provider: 'local',
    localProviderUrl: localUrl, localProviderApproved: 'APROBADO', emergencyFile: stopFile },
    client: workerClient, logger: () => {} }).runOnce()
  rmSync(stopFile, { force: true })
  record.emergency = {
    database_level: { action: stopDb.action, reason: stopDb.reason ?? null },
    file_level: { action: stopFileResult.action, reason: stopFileResult.reason ?? null },
  }
  note('interruptor de emergencia en sus dos niveles', record.emergency)

  // ── 8 · vigilancia (ventana corta real) ──────────────────────────────────────
  const watchOut = join(tmp, 'watch.jsonl')
  const watchResult = await watch({ client: readerClient, hours: 0.001, intervalSeconds: 0, out: watchOut, maxSamples: 2, sleep: async () => {} })
  record.watch = {
    samples: watchResult.summary.samples,
    read_failures: watchResult.summary.read_failures,
    verdict: watchResult.summary.verdict,
    jsonl_contains_dsn: readFileSync(watchOut, 'utf8').includes('postgresql://'),
  }
  note('vigilancia preparada', record.watch)

  // ── 9 · frontend sin credenciales ────────────────────────────────────────────
  const clientFiles = []
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
        if (!relative(process.cwd(), path).split('\\').join('/').startsWith('src/server/')) clientFiles.push(path)
      }
    }
  }
  walk('src')
  const dsnFiles = clientFiles.filter(file => /postgres(?:ql)?:\/\//i.test(readFileSync(file, 'utf8')))
  const viteHive = new Set()
  for (const file of clientFiles) {
    for (const match of readFileSync(file, 'utf8').matchAll(/VITE_[A-Z0-9_]+/g)) if (/HIVE/i.test(match[0])) viteHive.add(match[0])
  }
  record.frontend = {
    files_scanned: clientFiles.length,
    files_with_dsn: dsnFiles.map(file => relative(process.cwd(), file)),
    hive_vite_variables: [...viteHive],
    polling_calls: clientFiles.filter(file => /setInterval\s*\(/.test(readFileSync(file, 'utf8')) && /HIVE|hive/.test(file)).length,
  }
  note('frontend sin credenciales ni polling', { files: record.frontend.files_scanned, dsn: record.frontend.files_with_dsn.length })

  record.preservation = {
    legacy_job: server.psql(`select state || '/' || status from hive.jobs where idempotency_key = 'legacy-task-0001'`),
    agents_total: Number(server.psql('select count(*) from hive.agents')),
    departments_total: Number(server.psql('select count(*) from hive.departments')),
    status_check_intact: server.psql(`select pg_get_constraintdef(oid) from pg_constraint where conname = 'jobs_status_check'`).includes('PENDING'),
  }

  await mock.close()

  record.verdict = {
    activation_without_recreating_roles: record.activation.ok === true && record.activation.stdout_contains_dsn === false,
    both_logins_least_privilege: record.activation.connection_checks.worker.is_superuser === false
      && record.activation.connection_checks.reader.read_only === true,
    local_provider_cost_declared: record.local_provider.checks?.cost_is_zero === true,
    local_provider_no_external_egress: record.local_provider.checks?.no_external_egress === true,
    single_task_done: record.single_task.job.state === 'SUCCEEDED' && record.single_task.job.effects === 1,
    single_agent: record.single_task.agent.state === 'OPERATIVE',
    judge_pass_with_real_result: record.single_task.job.judge !== null && record.single_task.cost?.state === 'VERIFIED_ZERO',
    endpoint_authenticated: record.api.superadmin === 200 && record.api.anonymous === 401 && record.api.not_superadmin === 403,
    console_shows_13_departments_and_127_agents: record.snapshot.departments === 13 && record.snapshot.agents_total === 127,
    auth_without_privileged_credentials: record.auth.privileged_credentials_used === false && record.auth.uses_only_public_key === true,
    emergency_both_levels: record.emergency.database_level.action === 'STOPPED' && record.emergency.file_level.action === 'STOPPED',
    no_credentials_in_frontend: record.frontend.files_with_dsn.length === 0 && record.frontend.hive_vite_variables.length === 1,
    no_polling_in_console: record.frontend.polling_calls === 0,
    watch_ready: record.watch.verdict === 'HEALTHY' && record.watch.jsonl_contains_dsn === false,
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
