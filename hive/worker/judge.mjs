// UGO Hive · Judge · veredicto determinista sobre el resultado de un trabajo.
//
// Determinista de verdad: reglas explícitas, sin modelo, sin azar, sin red. Un resultado
// que no cumple se RECHAZA; el worker lo cierra como FAILED con `JUDGE_REJECTED` y el
// motivo exacto, en vez de darlo por bueno.

import { MAX_COMPLETION_CHARS } from './providers.mjs'

const SECRET_FRAGMENTS = [/postgres(?:ql)?:\/\//i, /Bearer\s+\S+/i, /\bsk-[A-Za-z0-9]{8,}/i, /password\s*=/i]

export const JUDGE_RULES = {
  minTextChars: 1,
  maxTextChars: MAX_COMPLETION_CHARS,
  maxTotalTokens: 20000,
  maxLatencyMs: 120000,
  allowedProviders: ['mock', 'openrouter', 'openclaw', 'local'],
}

export function verdict({ result, job, config, latencyMs, budget }) {
  const reasons = []
  const reject = (code, detail) => reasons.push({ code, detail })

  if (!result || typeof result !== 'object') {
    return { verdict: 'REJECT', code: 'JUDGE_INVALID_RESULT', reasons: [{ code: 'RESULT_NOT_OBJECT', detail: '' }] }
  }

  const text = typeof result.text === 'string' ? result.text : ''
  if (text.trim().length < JUDGE_RULES.minTextChars) reject('EMPTY_TEXT', 'la respuesta no aporta contenido')
  if (text.length > JUDGE_RULES.maxTextChars) reject('TEXT_TOO_LONG', `${text.length} caracteres`)

  if (!JUDGE_RULES.allowedProviders.includes(result.provider)) reject('PROVIDER_NOT_ALLOWED', String(result.provider))
  if (typeof result.model !== 'string' || !result.model) reject('MODEL_MISSING', '')

  const promptTokens = Number(result.usage?.prompt_tokens ?? NaN)
  const completionTokens = Number(result.usage?.completion_tokens ?? NaN)
  const totalTokens = promptTokens + completionTokens
  if (!Number.isFinite(totalTokens) || totalTokens < 0) reject('USAGE_INVALID', 'tokens no numéricos')
  if (Number.isFinite(totalTokens) && totalTokens > JUDGE_RULES.maxTotalTokens) reject('USAGE_OVER_LIMIT', `${totalTokens}`)
  // El coste no se asume: exige una declaración verificable del proveedor.
  const cost = result.cost ?? { state: 'UNVERIFIED', value: null, source: 'missing' }
  if (cost.state === 'COST_NON_ZERO') reject('COST_NOT_ZERO', `${cost.value} USD (${cost.source})`)
  if (cost.state !== 'VERIFIED_ZERO') reject('COST_UNVERIFIED', cost.reason ?? 'el proveedor no declaró coste 0')

  if (!Number.isFinite(latencyMs) || latencyMs < 0 || latencyMs > JUDGE_RULES.maxLatencyMs) reject('LATENCY_INVALID', String(latencyMs))
  if (!job?.id || !job?.idempotency_key) reject('JOB_NOT_TRACEABLE', 'sin id/idempotency_key no hay evidencia')

  // El resultado no puede devolver credenciales: sería una fuga, no un éxito.
  for (const fragment of SECRET_FRAGMENTS) {
    if (fragment.test(text)) { reject('SECRET_LEAK', String(fragment)); break }
  }

  // El proveedor debe ser el que el worker tenía permitido, no el que diga la respuesta.
  if (result.provider !== config.provider) reject('PROVIDER_MISMATCH', `${result.provider} ≠ ${config.provider}`)

  // El presupuesto declarado por el servidor manda sobre lo que diga el proveedor.
  if (budget && budget.allow_new_secondary_tasks === false) reject('BUDGET_EXCEEDED', String(budget.level))

  if (reasons.length > 0) {
    return { verdict: 'REJECT', code: 'JUDGE_REJECTED', reasons }
  }
  return {
    verdict: 'PASS',
    code: 'JUDGE_PASS',
    reasons: [],
    evidence: {
      provider: result.provider,
      model: result.model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      latency_ms: Math.round(latencyMs),
      text_chars: text.length,
      cost: { state: cost.state, value: cost.value, source: cost.source },
      cost_usd: cost.state === 'VERIFIED_ZERO' ? 0 : null,
    },
  }
}
