// UGO Hive · Sentinel · guardas deterministas ANTES de ejecutar nada.
//
// No decide "si la respuesta es buena" (eso es Judge): decide si el worker tiene derecho a
// ejecutar este trabajo ahora mismo. Cada guarda devuelve una violación con código estable,
// y el worker falla el trabajo con ese código en lugar de improvisar.

import { existsSync } from 'node:fs'
import { MAX_PROMPT_CHARS, knownProviders } from './providers.mjs'

export const SENTINEL_LIMITS = {
  maxPromptChars: MAX_PROMPT_CHARS,
  maxPayloadBytes: 8192,
  maxLeaseSeconds: 600,
  minLeaseSeconds: 30,
}

/**
 * @param {object} input
 * @param {object} input.config        configuración del worker
 * @param {object} input.job           trabajo con lease concedido
 * @param {object} input.leaseState    valor de hive.lease_state(...)
 * @param {object} input.connection    hechos de la conexión (usuario, superusuario, rol)
 * @param {object} input.quota         hive.quota_state(provider)
 * @param {object|null} input.circuit  circuito del proveedor
 * @param {object} [input.env]         entorno (para el interruptor local)
 */
export function inspect({ config, job, leaseState, connection, quota, circuit, env = process.env }) {
  const violations = []
  const push = (code, detail) => violations.push({ code, detail })

  // 1 · Identidad de la conexión: nunca superusuario, y miembro del rol de ejecución.
  if (connection?.is_superuser && !config.allowUnprivileged) {
    push('SENTINEL_PRIVILEGED_CONNECTION',
      `la conexión usa ${connection.current_user} (superusuario); usar el rol hive_worker`)
  }
  if (!connection?.is_worker_member && !config.allowUnprivileged) {
    push('SENTINEL_NOT_WORKER_ROLE', `${connection?.current_user} no es miembro de hive_worker`)
  }

  // 2 · Interruptor de emergencia: archivo local y ajuste en base.
  if (config.emergencyFile && existsSync(config.emergencyFile)) push('EMERGENCY_STOP', 'archivo local de emergencia presente')
  if (config.emergencyActive) push('EMERGENCY_STOP', 'hive.settings.emergency_stop = true')

  // 3 · El lease debe ser válido y vigente en el servidor, no en la memoria del worker.
  if (leaseState !== 'OK') push(leaseState || 'LEASE_STATE_UNKNOWN', 'el lease ya no es válido')

  // 4 · Forma del trabajo.
  if (!job || typeof job.id !== 'string') push('SENTINEL_JOB_INVALID', 'trabajo sin id')
  const prompt = typeof job?.prompt === 'string' ? job.prompt.trim() : ''
  if (!prompt) push('SENTINEL_PROMPT_MISSING', 'la tarea real exige prompt no vacío')
  if (prompt.length > SENTINEL_LIMITS.maxPromptChars) {
    push('SENTINEL_PROMPT_TOO_LONG', `${prompt.length} > ${SENTINEL_LIMITS.maxPromptChars}`)
  }
  const payloadBytes = Buffer.byteLength(JSON.stringify(job?.payload ?? {}), 'utf8')
  if (payloadBytes > SENTINEL_LIMITS.maxPayloadBytes) push('SENTINEL_PAYLOAD_TOO_LARGE', `${payloadBytes} bytes`)

  // 5 · Proveedor permitido y presupuesto disponible.
  if (!knownProviders().includes(config.provider)) push('PROVIDER_NOT_ALLOWED', config.provider)
  if (quota && quota.allow_new_secondary_tasks === false) {
    push('QUOTA_BLOCKED', `${quota.level} · ${quota.percent_used}% · ${quota.action}`)
  }
  if (circuit?.blocked_until && new Date(circuit.blocked_until).getTime() > Date.now()) {
    push('CIRCUIT_OPEN', `hasta ${circuit.blocked_until}`)
  }

  // 6 · Lease dentro de los límites operativos del paquete.
  if (config.leaseSeconds < SENTINEL_LIMITS.minLeaseSeconds || config.leaseSeconds > SENTINEL_LIMITS.maxLeaseSeconds) {
    push('SENTINEL_LEASE_OUT_OF_RANGE', `${config.leaseSeconds}s`)
  }

  return { ok: violations.length === 0, violations }
}

export const sentinelSummary = verdict =>
  verdict.ok ? 'PASS' : verdict.violations.map(v => v.code).join(',')
