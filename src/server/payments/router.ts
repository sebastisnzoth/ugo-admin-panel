import { MercadoPagoProvider } from './mercadoPago.js'
import { OpenPixProvider } from './openPix.js'
import type { ServerPaymentProvider } from './types.js'

export function getServerPaymentProvider(input: { country: 'BR'|'AR'; processor?: string | null }): ServerPaymentProvider {
  if (input.country === 'AR') throw new Error('Mercado Pago Argentina todavía no está activado en esta fase.')

  if (input.processor === 'openpix') {
    if (process.env.PAYMENTS_OPENPIX_ENABLED !== 'true') throw new Error('OpenPix está deshabilitado por feature flag.')
    const appId = process.env.OPENPIX_SANDBOX_APP_ID
    if (!appId) throw new Error('Falta OPENPIX_SANDBOX_APP_ID.')
    return new OpenPixProvider(appId, 'sandbox')
  }

  const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
  if (!mpToken) throw new Error('Mercado Pago no está configurado.')
  return new MercadoPagoProvider(mpToken)
}
