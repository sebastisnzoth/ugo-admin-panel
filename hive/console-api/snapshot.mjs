// UGO Hive · consola Super Admin · lectura real de la cola.
//
// Una sola consulta, de sólo lectura, con el rol `hive_reader` (nunca el del worker). La
// forma de la respuesta se valida aquí: si la base devuelve algo distinto de lo esperado,
// la API responde error en vez de servir números dudosos.

export const SNAPSHOT_SQL = `
  select jsonb_build_object(
    'schema_version', (select value from hive.meta where key = 'schema_version'),
    'destination_fingerprint_algo', (select value from hive.meta where key = 'destination_fingerprint_algo'),
    'queue', hive.queue_metrics(),
    'census', hive.agent_census(),
    'emergency_stop', coalesce((select (value #>> '{}')::boolean from hive.settings where key = 'emergency_stop'), false),
    'emergency_code', (select value #>> '{}' from hive.settings where key = 'emergency_stop_code'),
    'quotas', jsonb_build_object(
      'openrouter', hive.quota_state('openrouter'),
      'openclaw',   hive.quota_state('openclaw')),
    'circuits', coalesce((select jsonb_agg(jsonb_build_object(
        'provider', provider, 'failures', failures, 'blocked_until', blocked_until))
      from hive.provider_circuits), '[]'::jsonb),
    'recent_events', coalesce((select jsonb_agg(jsonb_build_object(
        'job_id', job_id, 'event', event, 'actor', actor, 'created_at', created_at) order by created_at desc)
      from (select job_id, event, actor, created_at from hive.job_events
            order by created_at desc, id desc limit 10) latest), '[]'::jsonb),
    'generated_at', now()
  )::text;
`

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const isCount = value => Number.isInteger(value) && value >= 0

const REQUIRED_QUEUE_KEYS = ['queued', 'leased', 'succeeded', 'failed', 'cancelled', 'stale_leases', 'effects_applied']
const REQUIRED_CENSUS_KEYS = ['total', 'operative', 'connected', 'registered', 'disabled', 'max_operative_agents']

export class SnapshotError extends Error {
  constructor(code, detail = '') {
    super(detail ? `${code}: ${detail}` : code)
    this.code = code
  }
}

/** Valida y normaliza la respuesta de la base. Lanza SnapshotError si no encaja. */
export function normalizeSnapshot(raw) {
  if (!isObject(raw)) throw new SnapshotError('SNAPSHOT_INVALID', 'no es un objeto')
  const { queue, census } = raw
  if (!isObject(queue)) throw new SnapshotError('SNAPSHOT_INVALID', 'falta queue')
  if (!isObject(census)) throw new SnapshotError('SNAPSHOT_INVALID', 'falta census')
  for (const key of REQUIRED_QUEUE_KEYS) {
    if (!isCount(queue[key])) throw new SnapshotError('SNAPSHOT_INVALID', `queue.${key}`)
  }
  for (const key of REQUIRED_CENSUS_KEYS) {
    if (!isCount(census[key])) throw new SnapshotError('SNAPSHOT_INVALID', `census.${key}`)
  }
  if (typeof raw.emergency_stop !== 'boolean') throw new SnapshotError('SNAPSHOT_INVALID', 'emergency_stop')
  const quotas = isObject(raw.quotas) ? raw.quotas : {}
  return {
    environment: 'TEST',
    read_only: true,
    source: 'hive_reader',
    schema_version: raw.schema_version ?? 'UNKNOWN',
    generated_at: raw.generated_at ?? null,
    queue,
    census,
    emergency: { stop: raw.emergency_stop, code: raw.emergency_code ?? null },
    quotas: {
      openrouter: sanitizeQuota(quotas.openrouter),
      openclaw: sanitizeQuota(quotas.openclaw),
    },
    circuits: Array.isArray(raw.circuits) ? raw.circuits.slice(0, 20) : [],
    recent_events: Array.isArray(raw.recent_events) ? raw.recent_events.slice(0, 10) : [],
  }
}

// Sólo lo que la consola necesita: nada de configuración interna ni de secretos.
function sanitizeQuota(quota) {
  if (!isObject(quota)) return { state: 'UNKNOWN' }
  return {
    provider: typeof quota.provider === 'string' ? quota.provider : 'UNKNOWN',
    calls: Number.isFinite(quota.calls) ? quota.calls : null,
    tokens: Number.isFinite(quota.tokens) ? quota.tokens : null,
    percent_used: Number.isFinite(quota.percent_used) ? quota.percent_used : null,
    level: typeof quota.level === 'string' ? quota.level : 'UNKNOWN',
    allow_new_secondary_tasks: quota.allow_new_secondary_tasks === true,
    // La cuota mensual no está medida: se declara UNKNOWN, no se estima.
    monthly_quota: quota.monthly_quota === 'UNKNOWN' || quota.monthly_quota === undefined ? 'UNKNOWN' : quota.monthly_quota,
  }
}

export function readSnapshot(client) {
  const text = client.json(SNAPSHOT_SQL)
  return normalizeSnapshot(text)
}

/** El endpoint sólo puede arrancar con un rol que no pueda escribir ni ejecutar la cola. */
export function readerFacts(client) {
  const facts = client.json(`
    select jsonb_build_object(
      'current_user', current_user,
      'is_superuser', (select rolsuper from pg_roles where rolname = current_user),
      'is_reader_member', pg_has_role(current_user, 'hive_reader', 'member'),
      'can_insert_jobs', has_table_privilege('hive.jobs', 'INSERT'),
      'can_update_jobs', has_table_privilege('hive.jobs', 'UPDATE'),
      'can_delete_jobs', has_table_privilege('hive.jobs', 'DELETE'),
      'can_reserve', has_function_privilege('hive.reserve_job(text,integer,text)', 'EXECUTE'),
      'can_complete', has_function_privilege('hive.complete_job(uuid,text,bigint,jsonb,text)', 'EXECUTE'),
      'can_select_jobs', has_table_privilege('hive.jobs', 'SELECT'),
      'can_read_metrics', has_function_privilege('hive.queue_metrics()', 'EXECUTE')
    )::text;`)
  const violations = []
  if (facts.is_superuser) violations.push('SUPERUSER')
  if (!facts.is_reader_member) violations.push('NOT_READER_ROLE')
  if (facts.can_insert_jobs || facts.can_update_jobs || facts.can_delete_jobs) violations.push('HAS_WRITE_PRIVILEGE')
  if (facts.can_reserve || facts.can_complete) violations.push('CAN_RUN_QUEUE')
  if (!facts.can_select_jobs || !facts.can_read_metrics) violations.push('MISSING_READ_PRIVILEGE')
  return { ...facts, ok: violations.length === 0, violations }
}
