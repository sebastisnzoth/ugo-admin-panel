// UGO Hive · worker runtime · configuración y redacción de secretos.
//
// Todo lo sensible entra por entorno y NUNCA por argv: los argumentos de un proceso son
// visibles en `ps` para cualquier usuario de la máquina.

const DEFAULTS = {
  workerId: 'hive-worker-1',
  agent: null,               // agent_key o name; null = trabajos genéricos
  maxIterations: 1,          // por defecto un solo ciclo: nada de bucles infinitos
  maxJobs: 1,
  leaseSeconds: 120,
  heartbeatRatio: 3,         // latido cada lease/3
  provider: 'none',
  requestTimeoutMs: 20000,
  idleSleepMs: 5000,
  maxIdleSleepMs: 60000,
  backoffBaseMs: 500,
  maxAttemptsPerJob: 1,      // el worker no reintenta dentro del mismo lease
  dryRun: false,
  testMode: false,
  allowUnprivileged: false,
  emergencyFile: null,
  healthPort: null,
  graceMs: 15000,
};

const int = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

export function loadConfig(env = process.env, argv = []) {
  const flags = new Set(argv.filter(arg => arg.startsWith('--')))
  const config = {
    databaseUrl: env.HIVE_WORKER_DATABASE_URL || env.HIVE_TEST_DATABASE_URL || '',
    workerId: env.HIVE_WORKER_ID || DEFAULTS.workerId,
    agent: env.HIVE_WORKER_AGENT || DEFAULTS.agent,
    provider: env.HIVE_WORKER_PROVIDER || DEFAULTS.provider,
    maxIterations: int(env.HIVE_WORKER_MAX_ITERATIONS, DEFAULTS.maxIterations, 1, 1000),
    maxJobs: int(env.HIVE_WORKER_MAX_JOBS, DEFAULTS.maxJobs, 1, 100),
    leaseSeconds: int(env.HIVE_WORKER_LEASE_SECONDS, DEFAULTS.leaseSeconds, 30, 600),
    requestTimeoutMs: int(env.HIVE_WORKER_REQUEST_TIMEOUT_MS, DEFAULTS.requestTimeoutMs, 1000, 120000),
    idleSleepMs: int(env.HIVE_WORKER_IDLE_SLEEP_MS, DEFAULTS.idleSleepMs, 200, 600000),
    backoffBaseMs: int(env.HIVE_WORKER_BACKOFF_MS, DEFAULTS.backoffBaseMs, 50, 30000),
    graceMs: int(env.HIVE_WORKER_GRACE_MS, DEFAULTS.graceMs, 0, 120000),
    emergencyFile: env.HIVE_WORKER_EMERGENCY_FILE || DEFAULTS.emergencyFile,
    healthPort: env.HIVE_WORKER_HEALTH_PORT ? int(env.HIVE_WORKER_HEALTH_PORT, 0, 1024, 65535) : null,
    dryRun: DEFAULTS.dryRun || flags.has('--dry-run'),
    testMode: env.HIVE_WORKER_TEST_MODE === '1',
    allowUnprivileged: env.HIVE_WORKER_ALLOW_UNPRIVILEGED === '1',
    once: flags.has('--once'),
    selfCheck: flags.has('--self-check'),
    help: flags.has('--help') || flags.has('-h'),
    mockProviderUrl: env.HIVE_MOCK_PROVIDER_URL || '',
    openRouterKey: env.OPENROUTER_API_KEY || '',
    openRouterModel: env.HIVE_OPENROUTER_MODEL || '',
    openRouterApproval: env.HIVE_OPENROUTER_APPROVAL || '',
    openClawUrl: env.HIVE_OPENCLAW_URL || '',
    openClawApproved: env.HIVE_OPENCLAW_APPROVED || '',
    openClawModel: env.HIVE_OPENCLAW_MODEL || 'openclaw-local',
    localProviderUrl: env.HIVE_LOCAL_PROVIDER_URL || '',
    localProviderApproved: env.HIVE_LOCAL_PROVIDER_APPROVED || '',
    localProviderModel: env.HIVE_LOCAL_PROVIDER_MODEL || 'local/free',
  }
  if (config.once) { config.maxIterations = Math.max(1, Math.min(config.maxIterations, 1000)) }
  return config
}

const SECRET_PATTERNS = [
  /postgres(?:ql)?:\/\/[^\s"']+/gi,
  /Bearer\s+[A-Za-z0-9._-]{10,}/gi,
  /\bsk-[A-Za-z0-9._-]{8,}/gi,
  /(?:password|passwd|pwd)\s*=\s*[^\s"']+/gi,
  /\b[A-Za-z0-9]{32,}\b/g,
]

/** Nada de lo que se registre puede contener una cadena de conexión, una clave o un token. */
export function redact(value) {
  let text = typeof value === 'string' ? value : JSON.stringify(value) ?? ''
  for (const pattern of SECRET_PATTERNS) text = text.replace(pattern, '[redacted]')
  return text
}

export function describeConfig(config) {
  return {
    worker_id: config.workerId,
    agent: config.agent,
    provider: config.provider,
    max_iterations: config.maxIterations,
    max_jobs: config.maxJobs,
    lease_seconds: config.leaseSeconds,
    request_timeout_ms: config.requestTimeoutMs,
    dry_run: config.dryRun,
    test_mode: config.testMode,
    emergency_file: config.emergencyFile ?? null,
    database_configured: Boolean(config.databaseUrl),
  }
}

export const jitter = (baseMs, attempt = 0) => {
  const exponential = Math.min(baseMs * 2 ** Math.min(attempt, 6), 60000)
  // Jitter completo en [50 %, 100 %]: evita que varios workers reintenten a la vez.
  return Math.round(exponential * (0.5 + Math.random() * 0.5))
}
