#!/usr/bin/env node
// UGO Hive · worker de cola para Neon v2.2.0.
//
// Ciclo por trabajo, corto y auditable:
//   reserve → Sentinel → presupuesto/circuito → proveedor → Judge → complete o fail
// Cada paso es su propia transacción (el contrato prohíbe mantener abierta la transacción
// de reserva). El fencing token se reenvía en cada transición: si el lease se perdió, el
// servidor rechaza y el worker NO marca nada como hecho.
//
// Uso:
//   node hive/worker/worker.mjs --self-check      # entorno, identidad, permisos
//   node hive/worker/worker.mjs --once            # un ciclo como máximo
//   node hive/worker/worker.mjs --dry-run --once  # sólo lectura, sin reservar
//   HIVE_WORKER_MAX_ITERATIONS=10 node hive/worker/worker.mjs
//
// Nunca imprime la cadena de conexión ni claves. Todo lo sensible entra por entorno.

import { loadConfig, describeConfig, jitter, redact } from './config.mjs'
import { PsqlClient, connectionFacts } from './db.mjs'
import { resolveProvider, ProviderError } from './providers.mjs'
import { inspect, sentinelSummary } from './sentinel.mjs'
import { verdict as judgeVerdict } from './judge.mjs'
import { existsSync } from 'node:fs'

const startedAt = new Date().toISOString()

const log = (level, event, extra = {}) => {
  process.stdout.write(`${redact(JSON.stringify({ ts: new Date().toISOString(), level, event, ...extra }))}\n`)
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export function createWorker({ config, client, fetchImpl = fetch, logger = log, clock = () => Date.now() }) {
  const state = { stopping: false, jobsDone: 0, jobsFailed: 0, iterations: 0 }
  const facts = () => connectionFacts(client)

  const readEmergency = () => {
    try {
      return client.json(`select jsonb_build_object(
        'flag', coalesce((select (value #>> '{}')::boolean from hive.settings where key = 'emergency_stop'), false),
        'code', (select value #>> '{}' from hive.settings where key = 'emergency_stop_code')
      )::text;`)
    } catch {
      return { flag: false, code: null }
    }
  }

  const quota = provider => client.json(`select hive.quota_state(:'provider')::text`, { provider })
  const circuit = provider => client.json(
    `select to_jsonb(c)::text from (select provider, failures, blocked_until from hive.provider_circuits where provider = :'provider') c`,
    { provider })

  const reserve = () => client.json(
    `select hive.reserve_job(:'worker', :'lease'::int, :'agent')::text`,
    { worker: config.workerId, lease: String(config.leaseSeconds), agent: config.agent ?? '' })

  // El estado del lease lo dicta el SERVIDOR: memoria local no vale como prueba.
  const leaseState = ({ id, token }) => client.run(
    `select hive.lease_state(:'job'::uuid, :'worker', :'token'::bigint)`,
    { job: id, worker: config.workerId, token: String(token) })

  async function runOnce() {
    state.iterations += 1
    const emergency = readEmergency()
    if (config.emergencyFile && existsSync(config.emergencyFile)) {
      logger('warn', 'EMERGENCY_STOP', { source: 'file', path: config.emergencyFile })
      return { action: 'STOPPED', reason: 'EMERGENCY_STOP_FILE' }
    }
    if (emergency?.flag) {
      logger('warn', 'EMERGENCY_STOP', { source: 'database', code: emergency.code })
      return { action: 'STOPPED', reason: 'EMERGENCY_STOP' }
    }

    if (config.dryRun) {
      const snapshot = client.json(`select jsonb_build_object(
        'queue', hive.queue_metrics(),
        'census', hive.agent_census(),
        'emergency', coalesce((select (value #>> '{}')::boolean from hive.settings where key='emergency_stop'), false)
      )::text;`)
      logger('info', 'DRY_RUN', { snapshot })
      return { action: 'DRY_RUN', snapshot }
    }

    const reservation = reserve()
    if (!reservation?.leased) {
      logger('info', 'NO_JOB', { code: reservation?.code ?? 'UNKNOWN', skipped_unauthorized: reservation?.skipped_unauthorized ?? 0 })
      return { action: 'IDLE', code: reservation?.code ?? 'UNKNOWN' }
    }

    const job = reservation.job
    const token = reservation.lease_token
    // `reserve_job` no devuelve la clave de idempotencia; se lee aparte (el worker tiene
    // SELECT sobre hive.jobs) porque es la base de la clave de efecto idempotente.
    job.idempotency_key = client.run(`select idempotency_key from hive.jobs where id = :'job'::uuid`,
      { job: job.id })
    logger('info', 'LEASED', { job: job.id, attempt: job.attempt, agent: job.agent_key, lease_token: token })

    // ── Sentinel ────────────────────────────────────────────────────────────────
    const preQuota = quota(config.provider)
    const preCircuit = circuit(config.provider)
    const sentinel = inspect({
      config: { ...config, emergencyActive: emergency?.flag === true },
      job,
      leaseState: leaseState({ id: job.id, token }),
      connection: facts(),
      quota: preQuota,
      circuit: preCircuit,
    })
    if (!sentinel.ok) {
      const code = sentinel.violations[0].code
      logger('warn', 'SENTINEL_REJECTED', { job: job.id, violations: sentinel.violations })
      client.json(`select hive.fail_job(:'job'::uuid, :'worker', :'token'::bigint, :'error', :'backoff'::int)::text`,
        { job: job.id, worker: config.workerId, token: String(token), error: `SENTINEL:${sentinelSummary(sentinel)}`, backoff: '30' })
      state.jobsFailed += 1
      return { action: 'REJECTED', code, violations: sentinel.violations }
    }

    // ── Proveedor + Judge ───────────────────────────────────────────────────────
    const hbTimer = setInterval(() => {
      try {
        const beat = client.json(`select hive.heartbeat_job(:'job'::uuid, :'worker', :'token'::bigint, :'lease'::int)::text`,
          { job: job.id, worker: config.workerId, token: String(token), lease: String(config.leaseSeconds) })
        if (!beat?.ok) logger('warn', 'HEARTBEAT_REJECTED', { job: job.id, code: beat?.code })
      } catch (error) {
        logger('warn', 'HEARTBEAT_FAILED', { job: job.id, error: String(error.message).slice(0, 200) })
      }
    }, Math.round((config.leaseSeconds * 1000) / config.heartbeatRatio))
    hbTimer.unref?.()

    const t0 = clock()
    let result = null
    let failure = null
    try {
      const adapter = resolveProvider(config.provider)
      result = await adapter.complete({ config, prompt: job.prompt, fetchImpl })
      if (adapter.requiresBudget) {
        const after = client.json(`select hive.record_provider_call(:'provider', :'calls'::int, :'tokens'::bigint)::text`,
          { provider: config.provider, calls: '1', tokens: String((result.usage?.prompt_tokens ?? 0) + (result.usage?.completion_tokens ?? 0)) })
        logger('info', 'BUDGET_RECORDED', { provider: config.provider, level: after?.level, percent_used: after?.percent_used })
      }
    } catch (error) {
      failure = error instanceof ProviderError ? error : new ProviderError('PROVIDER_UNEXPECTED', String(error?.message ?? error))
      logger('warn', 'PROVIDER_FAILED', { job: job.id, code: failure.code })
    } finally {
      clearInterval(hbTimer)
    }

    if (failure) {
      const failed = client.json(`select hive.fail_job(:'job'::uuid, :'worker', :'token'::bigint, :'error', :'backoff'::int)::text`,
        { job: job.id, worker: config.workerId, token: String(token), error: failure.code, backoff: '30' })
      state.jobsFailed += 1
      logger('warn', 'JOB_FAILED', { job: job.id, code: failure.code, server: failed?.code })
      return { action: 'FAILED', code: failure.code, server: failed?.code }
    }

    const latencyMs = clock() - t0
    const judged = judgeVerdict({ result, job, config, latencyMs, budget: quota(config.provider) })
    const effectKey = `job:${job.idempotency_key}:complete`

    if (judged.verdict !== 'PASS') {
      client.json(`select hive.fail_job(:'job'::uuid, :'worker', :'token'::bigint, :'error', :'backoff'::int)::text`,
        { job: job.id, worker: config.workerId, token: String(token), error: `JUDGE_REJECTED:${judged.reasons.map(r => r.code).join(',')}`, backoff: '60' })
      state.jobsFailed += 1
      logger('warn', 'JUDGE_REJECTED', { job: job.id, reasons: judged.reasons })
      return { action: 'REJECTED', code: 'JUDGE_REJECTED', reasons: judged.reasons }
    }

    const completed = client.json(
      `select hive.complete_job(:'job'::uuid, :'worker', :'token'::bigint, :'result'::jsonb, :'effect')::text`,
      { job: job.id, worker: config.workerId, token: String(token), result: JSON.stringify({ text: result.text, model: result.model, provider: result.provider, usage: result.usage, judge: judged.evidence }), effect: effectKey })
    // El servidor tiene la última palabra: si el lease se perdió, `ok=false` y NO se cuenta
    // como hecho (antes se registraba JOB_DONE aunque el servidor lo hubiera rechazado).
    if (!completed?.ok) {
      state.jobsFailed += 1
      logger('warn', 'JOB_COMPLETE_REJECTED', { job: job.id, code: completed?.code ?? 'COMPLETE_REJECTED' })
      return { action: 'FAILED', code: completed?.code ?? 'COMPLETE_REJECTED' }
    }
    state.jobsDone += 1
    logger('info', 'JOB_DONE', { job: job.id, server: completed.code, effect_applied: completed.effect_applied, judge: judged.evidence })
    return { action: 'DONE', code: completed.code, effect_applied: completed.effect_applied, evidence: judged.evidence }
  }

  async function run() {
    const jittered = attempt => jitter(config.backoffBaseMs, attempt)
    let idleStreak = 0
    for (let i = 0; i < config.maxIterations && !state.stopping; i++) {
      const outcome = await runOnce()
      if (outcome.action === 'STOPPED') break
      if (outcome.action === 'DONE' || outcome.action === 'FAILED' || outcome.action === 'REJECTED') {
        idleStreak = 0
        if (state.jobsDone + state.jobsFailed >= config.maxJobs) break
        continue
      }
      // Sin trabajo o sin plaza: espera acotada con jitter, sin sondeo agresivo.
      idleStreak += 1
      const wait = Math.min(config.idleSleepMs * 2 ** Math.min(idleStreak - 1, 4), 60000)
      if (config.once) break
      await sleep(Math.max(wait, jittered(idleStreak)))
    }
    return { ...state }
  }

  return { run, runOnce, facts, readEmergency, state }
}

async function main() {
  const config = loadConfig(process.env, process.argv.slice(2))
  if (config.help) {
    process.stdout.write('Uso: node hive/worker/worker.mjs [--once] [--dry-run] [--self-check] [--help]\n')
    return
  }
  if (!config.databaseUrl) {
    log('error', 'CONFIG_ERROR', { reason: 'falta HIVE_WORKER_DATABASE_URL' })
    process.exit(2)
  }
  const client = new PsqlClient({ databaseUrl: config.databaseUrl })
  log('info', 'WORKER_START', { started_at: startedAt, config: describeConfig(config) })

  if (config.selfCheck) {
    try {
      const facts = connectionFacts(client)
      const emergency = client.json(`select jsonb_build_object(
        'flag', coalesce((select (value #>> '{}')::boolean from hive.settings where key='emergency_stop'), false),
        'queue', hive.queue_metrics(), 'census', hive.agent_census())::text;`)
      log('info', 'SELF_CHECK', { connection: facts, database: emergency })
      const privileged = facts?.is_superuser && !config.allowUnprivileged
      const notWorker = !facts?.is_worker_member && !config.allowUnprivileged
      if (privileged || notWorker) {
        log('error', 'SELF_CHECK_FAILED', {
          reason: privileged ? 'conexión superusuario' : 'sin rol hive_worker',
          hint: 'usar HIVE_WORKER_DATABASE_URL con un login miembro de hive_worker',
        })
        process.exit(3)
      }
      log('info', 'SELF_CHECK_OK', {})
      return
    } catch (error) {
      log('error', 'SELF_CHECK_FAILED', { error: error.message })
      process.exit(3)
    }
  }

  const worker = createWorker({ config, client })
  const stop = signal => {
    if (worker.state.stopping) return
    worker.state.stopping = true
    log('warn', 'SHUTDOWN_REQUESTED', { signal, jobs_done: worker.state.jobsDone, jobs_failed: worker.state.jobsFailed })
  }
  process.on('SIGTERM', () => stop('SIGTERM'))
  process.on('SIGINT', () => stop('SIGINT'))

  let health = null
  if (config.healthPort) {
    const { createServer } = await import('node:http')
    health = createServer((req, res) => {
      if (req.url !== '/healthz') { res.writeHead(404).end('{}'); return }
      const body = JSON.stringify({ worker: config.workerId, state: worker.state, started_at: startedAt })
      res.writeHead(200, { 'content-type': 'application/json' }).end(body)
    })
    health.listen(config.healthPort, '0.0.0.0', () => log('info', 'HEALTH_LISTENING', { port: config.healthPort }))
  }

  const summary = await worker.run()
  log('info', 'WORKER_STOP', { ...summary, finished_at: new Date().toISOString() })
  if (health) health.close()
  if (config.emergencyFile) {
    // Nunca se activa solo: sólo se recuerda dónde está el interruptor manual.
    log('info', 'EMERGENCY_SWITCH_AVAILABLE', { file: config.emergencyFile, how: `touch ${config.emergencyFile}` })
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    log('error', 'WORKER_CRASH', { error: redact(String(error?.message ?? error)) })
    process.exit(1)
  })
}
