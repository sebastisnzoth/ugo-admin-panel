#!/usr/bin/env node
// Una única tarea, un único agente, con verificación posterior del resultado.
//
//   HIVE_WORKER_DATABASE_URL='postgresql://…' HIVE_CONFIRM_SINGLE_TASK=APLICAR \
//   node scripts/hive/run-single-task.mjs --agent hugo-orchestrator --department 1 \
//        --prompt "Informe breve del estado de la cola" --out docs/ugo-hive/evidence/single-task.json
//
// Sin confirmación imprime el plan y no ejecuta nada. Antes de ejecutar exige:
//   · el agente existe en el catálogo real y está OPERATIVE;
//   · hay exactamente un agente operativo (la misión pide uno);
//   · la cola está vacía (no se mezcla con trabajo ajeno).
// Después comprueba el resultado en la base: exactamente una tarea SUCCEEDED, un efecto y
// el veredicto del Judge con el coste declarado por el proveedor.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { PsqlClient } from '../../hive/worker/db.mjs'
import { loadConfig, redact } from '../../hive/worker/config.mjs'
import { createWorker } from '../../hive/worker/worker.mjs'

const argv = process.argv.slice(2)
const value = (name, fallback) => {
  const index = argv.indexOf(`--${name}`)
  return index >= 0 ? argv[index + 1] : fallback
}

const config = loadConfig(process.env, [])
const databaseUrl = config.databaseUrl
const agent = value('agent', config.agent)
const department = value('department')
const prompt = value('prompt')
const out = value('out')
const confirmed = process.env.HIVE_CONFIRM_SINGLE_TASK === 'APLICAR'

const fail = (code, detail = {}, exitCode = 3) => {
  console.error(redact(JSON.stringify({ ok: false, code, ...detail }, null, 2)))
  process.exit(exitCode)
}

if (!databaseUrl) fail('DATABASE_URL_REQUIRED', { hint: 'exporta HIVE_WORKER_DATABASE_URL (rol hive_app)' })
if (!agent) fail('AGENT_REQUIRED', { hint: '--agent <agent_key>' })
if (!prompt) fail('PROMPT_REQUIRED', { hint: '--prompt "…"' }, 2)

const client = new PsqlClient({ databaseUrl, bin: process.env.PSQL_BIN || 'psql' })

// ── Preflight ───────────────────────────────────────────────────────────────────
const census = client.json('select hive.agent_census()::text')
const agentRow = client.json(`select to_jsonb(a)::text from (
    select a.agent_key, a.name, a.state, a.department_id from hive.agents a
     where a.agent_key = :'agent' or a.name = :'agent') a`, { agent })
if (!agentRow) fail('AGENT_NOT_REGISTERED', { agent, census })
if (agentRow.state !== 'OPERATIVE') fail('AGENT_NOT_OPERATIVE', { agent: agentRow.agent_key, state: agentRow.state })
if (Number(census.operative) !== 1) fail('NOT_EXACTLY_ONE_OPERATIVE_AGENT', { operative: census.operative })

const queue = client.json('select hive.queue_metrics()::text')
if (Number(queue.queued) > 0 || Number(queue.leased) > 0) {
  fail('QUEUE_NOT_EMPTY', { queued: queue.queued, leased: queue.leased })
}

const departmentId = department ?? String(agentRow.department_id ?? 1)
const plan = {
  ok: true,
  mode: confirmed ? 'EXECUTE' : 'PLAN',
  agent: { agent_key: agentRow.agent_key, state: agentRow.state, department_id: agentRow.department_id },
  department_id: Number(departmentId),
  provider: config.provider,
  max_jobs: config.maxJobs,
  max_iterations: config.maxIterations,
  queue_before: { queued: queue.queued, leased: queue.leased },
  census_before: census,
}
if (!confirmed) {
  console.log(redact(JSON.stringify({ ...plan, hint: 'exporta HIVE_CONFIRM_SINGLE_TASK=APLICAR para ejecutar' }, null, 2)))
  process.exit(0)
}

// ── Ejecución ───────────────────────────────────────────────────────────────────
const key = `single-task-${Date.now()}`
const enqueued = client.json(`select hive.enqueue_job(
    :'key'::text, :'department'::int, :'agent'::text, 100::smallint, '{}'::jsonb, now(), 1::int, :'prompt'::text)::text`,
  { key, department: String(departmentId), agent: agentRow.agent_key, prompt })

const pending = Number(client.json('select hive.queue_metrics()::text').queued)
if (pending !== 1) fail('UNEXPECTED_QUEUE_STATE', { queued: pending }, 4)

const logs = []
const worker = createWorker({ config: { ...config, agent: agentRow.agent_key, maxJobs: 1, maxIterations: 1 },
  client, logger: (level, event, extra) => logs.push({ level, event, extra }) })
const outcome = await worker.runOnce()

const job = client.json(`select to_jsonb(j)::text from hive.jobs j where id = :'job'::uuid`, { job: enqueued.job_id })
const events = client.run(`select string_agg(event, ' → ' order by created_at, id) from hive.job_events where job_id = :'job'::uuid`,
  { job: enqueued.job_id })
const effects = Number(client.run(`select count(*) from hive.job_effects where job_id = :'job'::uuid`, { job: enqueued.job_id }))
const queueAfter = client.json('select hive.queue_metrics()::text')

const report = {
  ok: job.state === 'SUCCEEDED' && effects === 1 && outcome.action === 'DONE',
  mode: 'EXECUTE',
  agent: plan.agent,
  job: {
    id: job.id,
    state: job.state,
    status: job.status,
    attempts: job.attempts,
    events,
    effects,
    judge: job.result?.judge ?? null,
    provider: job.result?.provider ?? null,
    last_error: job.last_error ?? null,
  },
  worker_outcome: { action: outcome.action, code: outcome.code ?? null, effect_applied: outcome.effect_applied ?? null },
  queue_before: plan.queue_before,
  queue_after: { queued: queueAfter.queued, leased: queueAfter.leased, succeeded: queueAfter.succeeded, failed: queueAfter.failed },
  cost: job.result?.judge?.cost ?? null,
  log_events: logs.map(entry => entry.event),
  secrets_exposed: logs.some(entry => JSON.stringify(entry).includes('postgresql://')),
}

if (out) {
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`)
}
console.log(redact(JSON.stringify(report, null, 2)))
process.exit(report.ok && report.cost?.state === 'VERIFIED_ZERO' && !report.secrets_exposed ? 0 : 5)
