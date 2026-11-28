#!/usr/bin/env node
// Comprobación del proveedor LOCAL (OpenClaw / FreeLLMAPI en la computadora del fundador).
//
//   HIVE_LOCAL_PROVIDER_URL=http://127.0.0.1:8123 \
//   HIVE_LOCAL_PROVIDER_APPROVED=APROBADO \
//   [HIVE_LOCAL_PROVIDER_SHAPE=hive|openai] \
//   [HIVE_LOCAL_PROVIDER_MODEL=local/free] \
//   node scripts/hive/local-provider-check.mjs [--out docs/ugo-hive/evidence/local-provider.json]
//
// Qué comprueba, con una única llamada:
//   · el endpoint es loopback (un host remoto no es "local");
//   · la respuesta declara coste numérico y es 0 (si no, NO se aprueba);
//   · la forma del backend es la declarada: `hive` (/api/complete) u `openai`
//     (/v1/chat/completions); con `openai` el backend DEBE añadir `cost` — si no, no hay
//     aprobación porque «gratis» no se supone;
//   · si declara un upstream remoto, declara también facturación gratuita;
//   · nuestra propia petición no sale a ningún host que no sea loopback (guarda de egreso).
//
// No usa proveedores pagados, no gasta cuota y no imprime la URL con credenciales.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { loadConfig, redact } from '../../hive/worker/config.mjs'
import { resolveProvider, ProviderError } from '../../hive/worker/providers.mjs'

const PROMPT = 'Responde con una sola frase: ¿está operativa la cola de UGO Hive?'
const argv = process.argv.slice(2)
const outIndex = argv.indexOf('--out')
const out = outIndex >= 0 ? argv[outIndex + 1] : null

const config = { ...loadConfig(process.env, []), provider: 'local' }

const host = (() => {
  try {
    const url = new URL(config.localProviderUrl)
    return `${url.protocol}//${url.host}`
  } catch {
    return null
  }
})()

const finish = (report, code) => {
  if (out) {
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`)
  }
  console.log(redact(JSON.stringify(report, null, 2)))
  process.exit(code)
}

if (!config.localProviderUrl) {
  finish({ ok: false, code: 'LOCAL_PROVIDER_NOT_CONFIGURED', hint: 'exporta HIVE_LOCAL_PROVIDER_URL (loopback)' }, 3)
}
if (config.localProviderApproved !== 'APROBADO') {
  finish({ ok: false, code: 'LOCAL_PROVIDER_NOT_APPROVED', hint: 'exporta HIVE_LOCAL_PROVIDER_APPROVED=APROBADO tras revisarlo' }, 3)
}

const started = Date.now()
try {
  const result = await resolveProvider('local').complete({ config, prompt: PROMPT })
  const report = {
    ok: result.cost.state === 'VERIFIED_ZERO' && result.upstream?.state !== 'UPSTREAM_UNVERIFIED',
    code: result.cost.state === 'VERIFIED_ZERO' ? 'LOCAL_PROVIDER_VERIFIED' : 'LOCAL_COST_NOT_VERIFIED',
    endpoint: host,
    shape: result.shape,
    model: result.model,
    latency_ms: Date.now() - started,
    text_chars: String(result.text ?? '').length,
    usage: result.usage,
    cost: result.cost,
    upstream: result.upstream,
    egress_blocked: result.egress_blocked ?? 0,
    checks: {
      loopback_endpoint: Boolean(host && /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)),
      cost_declared: result.cost.state !== 'UNVERIFIED',
      cost_is_zero: result.cost.state === 'VERIFIED_ZERO',
      upstream_not_unverified: result.upstream?.state !== 'UPSTREAM_UNVERIFIED',
      no_external_egress: (result.egress_blocked ?? 0) === 0,
      produced_text: String(result.text ?? '').trim().length > 0,
      declared_shape: ['hive', 'openai'].includes(config.localProviderShape ?? 'hive'),
    },
  }
  report.ok = Object.values(report.checks).every(Boolean)
  finish(report, report.ok ? 0 : 5)
} catch (error) {
  const code = error instanceof ProviderError ? error.code : 'LOCAL_PROVIDER_FAILED'
  finish({ ok: false, code, detail: String(error?.message ?? error).slice(0, 200), endpoint: host }, 4)
}
