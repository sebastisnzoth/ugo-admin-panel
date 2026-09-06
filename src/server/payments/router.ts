import { MercadoPagoProvider } from './mercadoPago.js'
import { OpenPixProvider } from './openPix.js'
import type { ServerPaymentProvider } from './types.js'

function serverEnv(): Record<string, string | undefined> {
  return ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env) || {}
}

export function getServerPaymentProvider(input: { country: 'BR'|'AR'; processor?: string | null }): ServerPaymentProvider {
  if (input.country === 'AR') throw new Error('Mercado Pago Argentina todavía no está activado en esta fase.')
  const env = serverEnv()

  if (input.processor === 'openpix') {
    if (env.PAYMENTS_OPENPIX_ENABLED !== 'true') throw new Error('OpenPix está deshabilitado por feature flag.')
    const appId = env.OPENPIX_SANDBOX_APP_ID
    if (!appId) throw new Error('Falta OPENPIX_SANDBOX_APP_ID.')
    return new OpenPixProvider(appId, 'sandbox')
  }

  const mpToken = env.MERCADO_PAGO_ACCESS_TOKEN
  if (!mpToken) throw new Error('Mercado Pago no está configurado.')
  return new MercadoPagoProvider(mpToken)
}
