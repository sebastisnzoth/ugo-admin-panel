#!/usr/bin/env node
// Vigilancia de Hive durante una ventana (24 h por defecto), en SÓLO lectura.
//
//   HIVE_READER_DATABASE_URL='postgresql://…' node scripts/hive/watch-24h.mjs \
//     --hours 24 --interval-seconds 300 --out docs/ugo-hive/evidence/hive-watch-24h.jsonl
//
// Registra una muestra por intervalo (cola, censo, emergencia, cuotas, circuitos) y evalúa
// alertas deterministas. Nunca escribe en la base, nunca imprime la URL y nunca interpreta
// una lectura fallida como "todo bien": la marca como ALERTA y la cuenta.

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { PsqlClient } from '../../hive/worker/db.mjs'
import { redact } from '../../hive/worker/config.mjs'

const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const index = argv.indexOf(`--${name}`)
  return index >= 0 ? argv[index + 1] : fallback
}

export const DEFAULT_THRESHOLDS = {
  maxStaleLeases: 0,
  maxQueued: 50,
  maxFailed: 0,
  maxConsecutiveFailures: 3,
}

const SAMPLE_SQL = `
  select jsonb_build_object(
    'queue', hive.queue_metrics(),
    'census', hive.agent_census(),
    'emergency_stop', coalesce((select (value #>> '{}')::boolean from hive.settings where key = 'emergency_stop'), false),
    'quotas', jsonb_build_object('openrouter', hive.quota_state('openrouter'), 'openclaw', hive.quota_state('openclaw')),
    'circuits', coalesce((select jsonb_agg(jsonb_build_object('provider', provider, 'blocked_until', blocked_until))
                          from hive.provider_circuits where blocked_until is not null and blocked_until > now()), '[]'::jsonb)
  )::text;
`

/** Evalúa una muestra. Determinista: mismas cifras → mismas alertas. */
export function evaluateSample(sample, { thresholds = DEFAULT_THRESHOLDS, previous = null, readError = null } = {}) {
  if (readError) return [{ severity: 'CRITICAL', code: 'READER_UNAVAILABLE', detail: readError }]
  const alerts = []
  const queue = sample.queue ?? {}
  const quotas = sample.quotas ?? {}
  if (sample.emergency_stop === true) alerts.push({ severity: 'CRITICAL', code: 'EMERGENCY_STOP' })
  if (Number(queue.stale_leases ?? 0) > thresholds.maxStaleLeases) {
    alerts.push({ severity: 'CRITICAL', code: 'STALE_LEASES', detail: String(queue.stale_leases) })
  }
  if (Number(queue.queued ?? 0) > thresholds.maxQueued) {
    alerts.push({ severity: 'WARNING', code: 'QUEUE_BACKLOG', detail: String(queue.queued) })
  }
  if (previous) {
    const failedGrowth = Number(queue.failed ?? 0) - Number(previous.queue?.failed ?? 0)
    if (failedGrowth > thresholds.maxFailed) {
      alerts.push({ severity: 'WARNING', code: 'FAILED_JOBS_INCREASED', detail: `+${failedGrowth}` })
    }
  }
  for (const [name, quota] of Object.entries(quotas)) {
    if (!quota) continue
    if (quota.level === 'SUSPENDED' || quota.level === 'BLOCKED' || quota.allow_new_secondary_tasks === false) {
      alerts.push({ severity: 'CRITICAL', code: 'QUOTA_BLOCKED', detail: `${name}:${quota.level} ${quota.percent_used}%` })
    }
  }
  if (Array.isArray(sample.circuits) && sample.circuits.length > 0) {
    alerts.push({ severity: 'CRITICAL', code: 'CIRCUIT_OPEN', detail: sample.circuits.map(c => c.provider).join(',') })
  }
  return alerts
}

export async function watch({ client, hours = 24, intervalSeconds = 300, out, thresholds = DEFAULT_THRESHOLDS,
  clock = () => Date.now(), sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  maxSamples = Infinity, onSample = () => {} }) {
  const deadline = clock() + hours * 3600 * 1000
  const samples = []
  const alerts = []
  let consecutiveErrors = 0
  if (out) mkdirSync(dirname(resolve(out)), { recursive: true })

  for (let index = 1; index <= maxSamples; index++) {
    const at = new Date(clock()).toISOString()
    let sample = null
    let readError = null
    try {
      sample = client.json(SAMPLE_SQL)
    } catch (error) {
      // El mensaje de PostgreSQL puede contener la cadena de conexión: se redacta.
      readError = String(error?.code ?? 'READ_FAILED')
      consecutiveErrors += 1
    }
    if (!readError) consecutiveErrors = 0
    const previous = samples.length ? samples[samples.length - 1].sample : null
    const sampleAlerts = evaluateSample(sample, { thresholds, previous, readError })
    if (consecutiveErrors >= thresholds.maxConsecutiveFailures) {
      sampleAlerts.push({ severity: 'CRITICAL', code: 'READER_DOWN', detail: `${consecutiveErrors} lecturas seguidas` })
    }
    const record = { at, index, read_error: readError, sample, alerts: sampleAlerts }
    samples.push(record)
    alerts.push(...sampleAlerts.map(alert => ({ ...alert, at })))
    if (out) appendFileSync(out, `${JSON.stringify(record)}\n`)
    onSample(record)

    if (clock() + intervalSeconds * 1000 > deadline) break
    await sleep(intervalSeconds * 1000)
  }

  const summary = {
    window_hours: hours,
    interval_seconds: intervalSeconds,
    samples: samples.length,
    first_at: samples[0]?.at ?? null,
    last_at: samples[samples.length - 1]?.at ?? null,
    read_failures: samples.filter(record => record.read_error).length,
    alerts: alerts.length,
    critical: alerts.filter(alert => alert.severity === 'CRITICAL').length,
    verdict: alerts.some(alert => alert.severity === 'CRITICAL') ? 'ATTENTION_REQUIRED' : 'HEALTHY',
    last_sample: samples[samples.length - 1]?.sample ?? null,
  }
  if (out) writeFileSync(out.replace(/\.jsonl$/, '.summary.json'), `${JSON.stringify({ summary, alerts }, null, 2)}\n`)
  return { summary, alerts, samples }
}

async function main() {
  const databaseUrl = process.env.HIVE_READER_DATABASE_URL || ''
  if (!databaseUrl) {
    console.error(JSON.stringify({ code: 'READER_URL_REQUIRED', hint: 'exporta HIVE_READER_DATABASE_URL (rol de lectura)' }))
    process.exit(2)
  }
  const hours = Number(arg('hours', 24))
  const intervalSeconds = Number(arg('interval-seconds', 300))
  const out = arg('out', 'docs/ugo-hive/evidence/hive-watch-24h.jsonl')
  const maxSamples = Number(arg('max-samples', Number.POSITIVE_INFINITY))
  const client = new PsqlClient({ databaseUrl })

  console.log(JSON.stringify({ event: 'WATCH_START', hours, interval_seconds: intervalSeconds, out, samples_max: maxSamples }))
  const result = await watch({
    client, hours, intervalSeconds, out, maxSamples,
    onSample: record => console.log(redact(JSON.stringify({
      event: 'SAMPLE', at: record.at, index: record.index,
      queued: record.sample?.queue?.queued ?? null,
      stale_leases: record.sample?.queue?.stale_leases ?? null,
      alerts: record.alerts.map(alert => alert.code),
    }))),
  })
  console.log(JSON.stringify({ event: 'WATCH_END', ...result.summary }))
  process.exit(result.summary.critical > 0 ? 1 : 0)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(JSON.stringify({ event: 'WATCH_CRASH', error: redact(String(error?.message ?? error)) }))
    process.exit(1)
  })
}
