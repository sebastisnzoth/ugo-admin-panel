// UGO TEST runtime · reintentos acotados SOLO para fallos transitorios del plano
// de control de Supabase observados en CI (evidencia 2026-10-20):
//   - AuthRetryableFetchError: Gateway Timeout (504) en auth.admin.createUser
//   - Cloudflare 522/524 HTML devuelto como si fuera JSON (REST/read bootstrap)
//   - TypeError: fetch failed / ECONNRESET / ETIMEDOUT (auth-js _request)
//   - canceling statement due to statement timeout (SQLSTATE 57014)
//   - 429/500/502/503 de kong/GoTrue/PostgREST
// NUNCA reintenta errores de comportamiento bajo prueba (asserts, timeouts de
// UI/Realtime, transiciones inválidas, etc.): esas expectativas no cambian.

const DEFAULT_ATTEMPTS = 4
const DEFAULT_BASE_DELAY_MS = 1500
const MAX_DELAY_MS = 10000

const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 599])
const TRANSIENT_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EPIPE',
  'ECONNABORTED',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
  '57014',
])

const TRANSIENT_MESSAGE = [
  /^fetch failed$/i,
  /failed to fetch/i,
  /socket hang up/i,
  /gateway timeout/i,
  /bad gateway/i,
  /service unavailable/i,
  /connection timed out/i,
  /connection reset/i,
  /network error/i,
  /socket timeout/i,
  /request timeout/i,
  /too many requests/i,
  /remaining connection slots/i,
  /too many connections/i,
  /canceling statement due to statement timeout/i,
  /statement timeout/i,
  /supabase\.co \| \d{3}/i,
]

export function isTransientSupabaseError (error) {
  if (!error) return false
  const status = Number(error.status ?? error.statusCode ?? error.code ?? NaN)
  if (TRANSIENT_STATUS.has(status)) return true
  const name = String(error.name || '')
  if (name === 'AuthRetryableFetchError' || name === 'FetchError') return true
  const causeCode = String(error.cause && error.cause.code ? error.cause.code : '')
  if (TRANSIENT_CODES.has(causeCode)) return true
  const code = String(error.code || '')
  if (TRANSIENT_CODES.has(code)) return true
  const message = String(error.message || error.hint || '')
  if (!message) return false
  for (const pattern of TRANSIENT_MESSAGE) {
    if (pattern.test(message)) return true
  }
  // Página HTML de error del edge (p. ej. Cloudflare 522) donde esperábamos JSON.
  if (/<!DOCTYPE html>/i.test(message) && /\b5\d{2}\b/.test(message)) return true
  return false
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function transientError (error) {
  if (error instanceof Error) return error
  const wrapped = new Error(String((error && error.message) || error))
  Object.assign(wrapped, error || {})
  return wrapped
}

export function retryDelayMs (attempt, baseDelayMs = DEFAULT_BASE_DELAY_MS) {
  return Math.min(baseDelayMs * 2 ** (attempt - 1), MAX_DELAY_MS)
}

/**
 * Ejecuta `operation` reintentando SOLO ante errores transitorios (ver
 * isTransientSupabaseError). `operation` debe lanzar el error; los errores no
 * transitorios se propagan al primer intento. El resultado final no se altera.
 */
export async function withTransientRetry (operation, options = {}) {
  const attempts = Math.max(1, Number(options.attempts) || DEFAULT_ATTEMPTS)
  const baseDelayMs = Number(options.baseDelayMs) || DEFAULT_BASE_DELAY_MS
  const label = options.label || 'operation'
  const wait = typeof options.sleep === 'function' ? options.sleep : sleep
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt)
    } catch (error) {
      lastError = error
      if (!isTransientSupabaseError(error) || attempt === attempts) throw error
      const delay = retryDelayMs(attempt, baseDelayMs)
      console.warn(
        `[transient-retry] ${label} intento ${attempt}/${attempts} falló transitoriamente (${String(error.message || error).slice(0, 160)}) · reintentando en ${delay}ms`,
      )
      await wait(delay)
    }
  }
  throw lastError
}

/**
 * Igual que withTransientRetry pero para las llamadas supabase-js que resuelven
 * `{data, error}` en vez de lanzar: un `error` transitorio se convierte en
 * excepción para el reintento; un error NO transitorio vuelve intacto para que
 * el assert del script original decida.
 */
export async function retrySupabaseResult (operation, options = {}) {
  return withTransientRetry(async () => {
    const result = await operation()
    if (result && result.error && isTransientSupabaseError(result.error)) {
      throw transientError(result.error)
    }
    return result
  }, options)
}

const EMAIL_TAKEN = /email.*(already|exists|registered)|already.*registered|user_already_exists|email_exists/i

/**
 * auth.admin.createUser con reintento transitorio. Si tras un fallo transitorio
 * el usuario ya existe (el primer intento llegó a aplicarse), resuelve vía
 * listUsers y devuelve el usuario existente con la forma {data:{user},error:null}.
 */
export async function createUserWithRetry (authClient, params, options = {}) {
  const label = options.label || 'auth.admin.createUser'
  const attempts = Math.max(1, Number(options.attempts) || DEFAULT_ATTEMPTS)
  let sawTransient = false
  let result
  try {
    result = await withTransientRetry(async () => {
      try {
        const created = await authClient.auth.admin.createUser(params)
        if (created && created.error && isTransientSupabaseError(created.error)) {
          throw transientError(created.error)
        }
        return created
      } catch (error) {
        if (isTransientSupabaseError(error)) {
          sawTransient = true
          throw error
        }
        // auth-js puede lanzar errores no transitorios (p. ej. validación);
        // se respetan igual que los devueltos.
        return { data: null, error }
      }
    }, { ...options, label, attempts })
  } catch (error) {
    if (sawTransient && EMAIL_TAKEN.test(String(error.message || ''))) {
      const existing = await resolveExistingUser(authClient, params.email)
      if (existing) return { data: { user: existing }, error: null }
    }
    throw error
  }
  if (
    result &&
    result.error &&
    sawTransient &&
    EMAIL_TAKEN.test(String(result.error.message || result.error.code || ''))
  ) {
    const existing = await resolveExistingUser(authClient, params.email)
    if (existing) return { data: { user: existing }, error: null }
  }
  return result
}

async function resolveExistingUser (authClient, email) {
  try {
    const listed = await authClient.auth.admin.listUsers({ page: 1, perPage: 1, filter: email })
    const user = listed && listed.data && listed.data.users
      ? listed.data.users.find((candidate) => candidate.email === email)
      : null
    if (user) {
      console.warn(`[transient-retry] createUser: usuario ${email} ya existía tras fallo transitorio · reutilizando ${user.id}`)
    }
    return user
  } catch {
    return null
  }
}

/**
 * fetch con reintento transitorio para URLs públicas (p. ej. CDN de storage
 * que devuelve 522 HTML). Los 2xx/4xx definitivos no se reintentan.
 */
export async function fetchWithTransientRetry (url, init, options = {}) {
  const attempts = Math.max(1, Number(options.attempts) || DEFAULT_ATTEMPTS)
  const label = options.label || 'fetch'
  const wait = typeof options.sleep === 'function' ? options.sleep : sleep
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, init)
      const status = Number(response.status)
      if (response.ok || !TRANSIENT_STATUS.has(status)) return response
      lastError = new Error(`HTTP ${status} en ${url}`)
      lastError.status = status
      if (attempt === attempts) return response
    } catch (error) {
      lastError = error
      if (!isTransientSupabaseError(error) || attempt === attempts) throw error
    }
    const delay = retryDelayMs(attempt, Number(options.baseDelayMs) || DEFAULT_BASE_DELAY_MS)
    console.warn(`[transient-retry] ${label} intento ${attempt}/${attempts} falló (${String(lastError.message)}) · reintentando en ${delay}ms`)
    await wait(delay)
  }
  throw lastError
}
