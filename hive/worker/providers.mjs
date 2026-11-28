// UGO Hive · worker runtime · proveedores de inferencia.
//
// Regla dura: el worker NO puede inventarse una ruta gratuita. La elegibilidad se decide
// con la política ya revisada del repositorio
// (`supabase/functions/ugo-hive-model-router/policy.mjs`), que exige modelo terminado en
// `:free`, precios en cero, evidencia de facturación y aprobación previa con vencimiento.
// Si no hay ruta aprobada, el worker falla cerrado: `NO_VERIFIED_FREE_ROUTE`.
//
// Estado real de cada adaptador hoy:
//   mock       → sólo con HIVE_WORKER_TEST_MODE=1 (pruebas E2E; nunca en operación)
//   openrouter → implementado y cerrado hasta que exista ruta aprobada + clave gratuita
//   openclaw   → implementado y cerrado hasta que exista endpoint aprobado
//   freellmapi → cerrado por política (pinning no verificable)

import { eligibleRoute } from '../../supabase/functions/ugo-hive-model-router/policy.mjs'

export const MAX_PROMPT_CHARS = 8000
export const MAX_COMPLETION_CHARS = 20000

const FREE_ROUTE_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

// Un "proveedor local" sólo puede ser loopback: si apunta a internet, no es local.
const LOOPBACK = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d{2,5})?$/

/**
 * El coste NO se asume: se lee de lo que declara el proveedor y se clasifica.
 *   VERIFIED_ZERO → el proveedor informó un coste numérico igual a 0
 *   COST_NON_ZERO → el proveedor informó un coste mayor que 0
 *   UNVERIFIED    → no informó nada: no se puede afirmar "gratis"
 */
export function classifyCost(reported, source = 'provider_usage.cost') {
  if (reported === null || reported === undefined || reported === '') {
    return { state: 'UNVERIFIED', value: null, source, reason: 'COST_NOT_REPORTED' }
  }
  const value = Number(reported)
  if (!Number.isFinite(value) || value < 0) {
    return { state: 'UNVERIFIED', value: null, source, reason: 'COST_NOT_NUMERIC' }
  }
  return value === 0
    ? { state: 'VERIFIED_ZERO', value: 0, source }
    : { state: 'COST_NON_ZERO', value, source }
}

/**
 * Guarda de egreso: durante una llamada al proveedor local, cualquier petición que no vaya
 * a loopback se bloquea antes de salir. No demuestra qué hace el servidor local por dentro,
 * pero garantiza que NUESTRO proceso no contacta ningún servicio remoto en esa ruta.
 */
export function localFetchGuard(fetchImpl = globalThis.fetch, allow = LOOPBACK) {
  const blocked = []
  const guarded = (input, init) => {
    const raw = typeof input === 'string' ? input : input?.url ?? String(input)
    let origin
    try { origin = new URL(raw).origin } catch { origin = '' }
    if (!allow.test(origin)) {
      blocked.push(origin || 'invalid-url')
      return Promise.reject(new ProviderError('EGRESS_BLOCKED', `el proveedor local intentó salir a ${origin || 'una URL inválida'}`))
    }
    return fetchImpl(input, init)
  }
  guarded.blocked = blocked
  return guarded
}

/**
 * Un servidor local puede reenviar a un proveedor gratuito upstream. Se acepta sólo si lo
 * declara y si además declara facturación gratuita; si no, se trata como no verificado.
 */
export function classifyUpstream(declared, billing) {
  if (!declared) return { state: 'LOCAL', upstream: null }
  const name = String(declared)
  if (/^(local|loopback|self)$/i.test(name)) return { state: 'LOCAL', upstream: name }
  const free = ['free', 'none', 'no_billing'].includes(String(billing ?? '').toLowerCase())
  return free ? { state: 'UPSTREAM_FREE_DECLARED', upstream: name } : { state: 'UPSTREAM_UNVERIFIED', upstream: name }
}

export class ProviderError extends Error {
  constructor(code, detail = '') {
    super(detail ? `${code}: ${detail}` : code)
    this.code = code
  }
}

/** Rechaza cualquier ruta que la política revisada no considere gratuita y aprobada. */
export function approvedOpenRouterRoute(config, now = Date.now()) {
  if (!config.openRouterModel.endsWith(':free')) return null
  let approval
  try { approval = JSON.parse(config.openRouterApproval) } catch { return null }
  const route = {
    provider: 'openrouter',
    endpoint: FREE_ROUTE_ENDPOINT,
    model: config.openRouterModel,
    terms_approved: approval?.terms_approved === true,
    billing_evidence: typeof approval?.billing_evidence === 'string' ? approval.billing_evidence : '',
    valid_until: approval?.valid_until,
    checked_at: approval?.checked_at,
    pricing: approval?.pricing,
  }
  return eligibleRoute(route, [FREE_ROUTE_ENDPOINT], now) ? route : null
}

async function postJson(url, body, headers, timeoutMs, fetchImpl = globalThis.fetch) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
      redirect: 'error',
    })
    const text = await response.text()
    if (!response.ok) {
      throw new ProviderError(response.status === 429 ? 'PROVIDER_RATE_LIMITED' : 'PROVIDER_HTTP_ERROR',
        `${response.status} ${text.slice(0, 200)}`)
    }
    try { return JSON.parse(text) } catch { throw new ProviderError('PROVIDER_INVALID_JSON') }
  } catch (error) {
    if (error instanceof ProviderError) throw error
    if (error?.name === 'AbortError') throw new ProviderError('PROVIDER_TIMEOUT')
    throw new ProviderError('PROVIDER_NETWORK_ERROR', String(error?.message ?? error).slice(0, 200))
  } finally {
    clearTimeout(timer)
  }
}

const adapters = {
  /** Proveedor de pruebas: HTTP real contra un servidor local, sin red externa ni coste. */
  mock: {
    requiresBudget: false,
    async complete({ config, prompt, fetchImpl }) {
      if (!config.testMode) throw new ProviderError('MOCK_PROVIDER_DISABLED', 'sólo con HIVE_WORKER_TEST_MODE=1')
      if (!config.mockProviderUrl) throw new ProviderError('MOCK_PROVIDER_NOT_CONFIGURED')
      const body = await postJson(`${config.mockProviderUrl.replace(/\/$/, '')}/complete`,
        { prompt, model: 'mock/free' }, {}, config.requestTimeoutMs, fetchImpl)
      return {
        text: String(body.text ?? ''),
        model: String(body.model ?? 'mock/free'),
        provider: 'mock',
        usage: { prompt_tokens: Number(body.usage?.prompt_tokens ?? 0), completion_tokens: Number(body.usage?.completion_tokens ?? 0) },
        // El servidor de pruebas declara el coste; si no lo hace, queda UNVERIFIED.
        cost: classifyCost(body.cost, 'mock.cost'),
      }
    },
  },

  openrouter: {
    requiresBudget: true,
    async complete({ config, prompt, fetchImpl, now = Date.now() }) {
      const route = approvedOpenRouterRoute(config, now)
      if (!route) throw new ProviderError('NO_VERIFIED_FREE_ROUTE',
        'falta modelo :free con aprobación vigente, precios en cero y evidencia de facturación')
      if (!config.openRouterKey) throw new ProviderError('PROVIDER_KEY_MISSING')
      const body = await postJson(route.endpoint, {
        model: route.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
        stream: false,
      }, { authorization: `Bearer ${config.openRouterKey}`, 'x-title': 'UGO Hive TEST',
        // El coste se pide explícitamente: sin pedirlo, OpenRouter no lo devuelve añadido.
        'x-usage-accounting': 'true' }, config.requestTimeoutMs, fetchImpl)
      return {
        text: String(body.choices?.[0]?.message?.content ?? ''),
        model: String(body.model ?? route.model),
        provider: 'openrouter',
        usage: { prompt_tokens: Number(body.usage?.prompt_tokens ?? 0), completion_tokens: Number(body.usage?.completion_tokens ?? 0) },
        // OpenRouter sólo devuelve `usage.cost` si se pide; sin ese dato no se afirma 0.
        cost: classifyCost(body.usage?.cost ?? body.cost, 'openrouter.usage.cost'),
      }
    },
  },

  openclaw: {
    requiresBudget: true,
    async complete({ config, prompt, fetchImpl }) {
      if (config.openClawApproved !== 'APROBADO') throw new ProviderError('OPENCLAW_NOT_APPROVED')
      if (!/^https:\/\//.test(config.openClawUrl)) throw new ProviderError('OPENCLAW_NOT_CONFIGURED')
      const body = await postJson(`${config.openClawUrl.replace(/\/$/, '')}/v1/complete`,
        { prompt, model: config.openClawModel, max_tokens: 512 }, {}, config.requestTimeoutMs, fetchImpl)
      return {
        text: String(body.text ?? body.completion ?? ''),
        model: String(body.model ?? config.openClawModel),
        provider: 'openclaw',
        usage: { prompt_tokens: Number(body.usage?.prompt_tokens ?? 0), completion_tokens: Number(body.usage?.completion_tokens ?? 0) },
        cost: classifyCost(body.cost ?? body.usage?.cost, 'openclaw.cost'),
      }
    },
  },

  /**
   * Integración LOCAL (FreeLLMAPI / OpenClaw en la propia máquina): sólo loopback, sólo con
   * aprobación explícita y sólo si el servidor declara el coste. Pensado para probar el
   * camino completo sin proveedores pagados ni red externa.
   */
  local: {
    requiresBudget: false,
    async complete({ config, prompt, fetchImpl }) {
      if (config.localProviderApproved !== 'APROBADO') throw new ProviderError('LOCAL_PROVIDER_NOT_APPROVED')
      if (!LOOPBACK.test(config.localProviderUrl)) {
        throw new ProviderError('LOCAL_PROVIDER_NOT_LOOPBACK',
          'sólo http(s)://127.0.0.1, localhost o [::1]: un endpoint remoto nunca es "local"')
      }
      const guarded = localFetchGuard(fetchImpl)
      const body = await postJson(`${config.localProviderUrl.replace(/\/$/, '')}/api/complete`,
        { prompt, model: config.localProviderModel, max_tokens: 512 }, {}, config.requestTimeoutMs, guarded)
      const upstream = classifyUpstream(body.upstream ?? body.provider_upstream, body.upstream_billing ?? body.billing)
      if (upstream.state === 'UPSTREAM_UNVERIFIED') {
        throw new ProviderError('LOCAL_PROVIDER_UPSTREAM_UNVERIFIED',
          `el servidor local declara upstream "${upstream.upstream}" sin facturación gratuita verificable`)
      }
      return {
        text: String(body.text ?? body.completion ?? ''),
        model: String(body.model ?? config.localProviderModel),
        provider: 'local',
        usage: { prompt_tokens: Number(body.usage?.prompt_tokens ?? 0), completion_tokens: Number(body.usage?.completion_tokens ?? 0) },
        cost: classifyCost(body.cost ?? body.usage?.cost, 'local.cost'),
        upstream,
        egress_blocked: guarded.blocked.length,
      }
    },
  },

  freellmapi: {
    requiresBudget: true,
    async complete() {
      // La política revisada lo cierra: su pinning de proveedor no es verificable.
      throw new ProviderError('NO_VERIFIED_FREE_ROUTE', 'freellmapi no tiene contrato de pinning verificable')
    },
  },
}

export function resolveProvider(name) {
  const adapter = adapters[name]
  if (!adapter) throw new ProviderError('PROVIDER_NOT_ALLOWED', `proveedor desconocido: ${name}`)
  return adapter
}

export const knownProviders = () => Object.keys(adapters)
