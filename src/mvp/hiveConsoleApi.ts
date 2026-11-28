// Cliente del endpoint autenticado de Hive TEST (lectura real de la cola).
//
// El endpoint entrega una instantánea ya validada por el servidor con un rol de SÓLO
// lectura. Este módulo no confía en la forma recibida: la vuelve a validar y, si algo no
// encaja, devuelve null en lugar de pintar números dudosos.

export type HiveQueueMetrics = {
  queued: number
  leased: number
  succeeded: number
  failed: number
  cancelled: number
  stale_leases: number
  effects_applied: number
}

export type HiveCensus = {
  total: number
  operative: number
  connected: number
  registered: number
  disabled: number
  max_operative_agents: number
}

export type HiveQuotaView = {
  provider: string
  calls: number | null
  tokens: number | null
  percent_used: number | null
  level: string
  allow_new_secondary_tasks: boolean
  monthly_quota: string
}

export type HiveSnapshot = {
  environment: 'TEST'
  read_only: true
  source: 'hive_reader'
  schema_version: string
  generated_at: string | null
  queue: HiveQueueMetrics
  census: HiveCensus
  emergency: { stop: boolean; code: string | null }
  quotas: { openrouter: HiveQuotaView; openclaw: HiveQuotaView }
  circuits: Array<{ provider: string; failures: number; blocked_until: string | null }>
  recent_events: Array<{ job_id: string; event: string; actor: string | null; created_at: string }>
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0

const numberOrNull = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)

function quota(value: unknown): HiveQuotaView | null {
  if (!isObject(value)) return null
  return {
    provider: typeof value.provider === 'string' ? value.provider : 'UNKNOWN',
    calls: numberOrNull(value.calls),
    tokens: numberOrNull(value.tokens),
    percent_used: numberOrNull(value.percent_used),
    level: typeof value.level === 'string' ? value.level : 'UNKNOWN',
    allow_new_secondary_tasks: value.allow_new_secondary_tasks === true,
    monthly_quota: typeof value.monthly_quota === 'string' ? value.monthly_quota : 'UNKNOWN',
  }
}

/** Valida la instantánea recibida. Devuelve null si falta cualquier campo obligatorio. */
export function parseHiveSnapshot(payload: unknown): HiveSnapshot | null {
  if (!isObject(payload)) return null
  if (payload.environment !== 'TEST' || payload.read_only !== true || payload.source !== 'hive_reader') return null
  const queue = payload.queue
  const census = payload.census
  if (!isObject(queue) || !isObject(census)) return null
  for (const key of ['queued', 'leased', 'succeeded', 'failed', 'cancelled', 'stale_leases', 'effects_applied'] as const) {
    if (!isCount(queue[key])) return null
  }
  for (const key of ['total', 'operative', 'connected', 'registered', 'disabled', 'max_operative_agents'] as const) {
    if (!isCount(census[key])) return null
  }
  const emergency = payload.emergency
  if (!isObject(emergency) || typeof emergency.stop !== 'boolean') return null
  const quotas = payload.quotas
  if (!isObject(quotas)) return null
  const openrouter = quota(quotas.openrouter)
  const openclaw = quota(quotas.openclaw)
  if (!openrouter || !openclaw) return null
  return {
    environment: 'TEST',
    read_only: true,
    source: 'hive_reader',
    schema_version: typeof payload.schema_version === 'string' ? payload.schema_version : 'UNKNOWN',
    generated_at: typeof payload.generated_at === 'string' ? payload.generated_at : null,
    queue: {
      queued: queue.queued as number,
      leased: queue.leased as number,
      succeeded: queue.succeeded as number,
      failed: queue.failed as number,
      cancelled: queue.cancelled as number,
      stale_leases: queue.stale_leases as number,
      effects_applied: queue.effects_applied as number,
    },
    census: {
      total: census.total as number,
      operative: census.operative as number,
      connected: census.connected as number,
      registered: census.registered as number,
      disabled: census.disabled as number,
      max_operative_agents: census.max_operative_agents as number,
    },
    emergency: { stop: emergency.stop, code: typeof emergency.code === 'string' ? emergency.code : null },
    quotas: { openrouter, openclaw },
    circuits: Array.isArray(payload.circuits)
      ? payload.circuits.filter(isObject).map(item => ({
          provider: typeof item.provider === 'string' ? item.provider : 'UNKNOWN',
          failures: isCount(item.failures) ? item.failures : 0,
          blocked_until: typeof item.blocked_until === 'string' ? item.blocked_until : null,
        }))
      : [],
    recent_events: Array.isArray(payload.recent_events)
      ? payload.recent_events.filter(isObject).map(item => ({
          job_id: typeof item.job_id === 'string' ? item.job_id : '',
          event: typeof item.event === 'string' ? item.event : 'UNKNOWN',
          actor: typeof item.actor === 'string' ? item.actor : null,
          created_at: typeof item.created_at === 'string' ? item.created_at : '',
        }))
      : [],
  }
}

export const HIVE_CONSOLE_ENDPOINT = String(
  (import.meta.env?.VITE_HIVE_CONSOLE_API as string | undefined) ?? '',
).trim().replace(/\/$/, '')

export type HiveSnapshotError = 'NOT_CONFIGURED' | 'AUTH_REQUIRED' | 'FORBIDDEN' | 'TIMEOUT' | 'UNAVAILABLE' | 'INVALID'

/**
 * Una sola lectura, acotada por AbortSignal. Sin reintentos ni sondeo: si falla, la consola
 * lo dice; nunca rellena con datos de ejemplo.
 */
export async function loadHiveSnapshot(options: {
  endpoint?: string
  token: string
  signal?: AbortSignal
  fetchImpl?: typeof fetch
  timeoutMs?: number
}): Promise<HiveSnapshot> {
  const endpoint = (options.endpoint ?? HIVE_CONSOLE_ENDPOINT).replace(/\/$/, '')
  if (!endpoint) throw Object.assign(new Error('NOT_CONFIGURED'), { code: 'NOT_CONFIGURED' as const })
  const call = options.fetchImpl ?? fetch
  // Doble cota: la del llamador y la propia (8 s por defecto). Nunca una petición abierta.
  const caller = options.signal ?? new AbortController().signal
  const signal = AbortSignal.any([caller, AbortSignal.timeout(options.timeoutMs ?? 8000)])
  let response: Response
  try {
    response = await call(`${endpoint}/api/hive/snapshot`, {
      method: 'GET',
      headers: { authorization: `Bearer ${options.token}`, accept: 'application/json' },
      signal,
      cache: 'no-store',
      redirect: 'error',
    })
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')
    throw Object.assign(new Error(timedOut ? 'TIMEOUT' : 'UNAVAILABLE'), { code: timedOut ? 'TIMEOUT' : 'UNAVAILABLE' })
  }
  if (response.status === 401) throw Object.assign(new Error('AUTH_REQUIRED'), { code: 'AUTH_REQUIRED' as const })
  if (response.status === 403) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' as const })
  if (!response.ok) throw Object.assign(new Error('UNAVAILABLE'), { code: 'UNAVAILABLE' as const })
  const snapshot = parseHiveSnapshot(await response.json())
  if (!snapshot) throw Object.assign(new Error('INVALID'), { code: 'INVALID' as const })
  return snapshot
}
