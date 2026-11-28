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
        billed_usd: 0,
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
      }, { authorization: `Bearer ${config.openRouterKey}`, 'x-title': 'UGO Hive TEST' }, config.requestTimeoutMs, fetchImpl)
      return {
        text: String(body.choices?.[0]?.message?.content ?? ''),
        model: String(body.model ?? route.model),
        provider: 'openrouter',
        usage: { prompt_tokens: Number(body.usage?.prompt_tokens ?? 0), completion_tokens: Number(body.usage?.completion_tokens ?? 0) },
        billed_usd: 0,
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
        billed_usd: 0,
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
