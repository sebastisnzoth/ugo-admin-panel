import type { PaymentCountry, PaymentCurrency, PaymentProcessor } from './types'

export interface PaymentRoutingConfig {
  openPixEnabled: boolean
  argentinaEnabled: boolean
  mercadoPagoBrazilEnabled: boolean
}

export const DEFAULT_PAYMENT_ROUTING_CONFIG: PaymentRoutingConfig = {
  openPixEnabled: false,
  argentinaEnabled: false,
  mercadoPagoBrazilEnabled: true,
}

export function currencyForCountry(country: PaymentCountry): PaymentCurrency {
  return country === 'AR' ? 'ARS' : 'BRL'
}

export function selectPaymentProcessor(params: {
  country: PaymentCountry
  environment: 'real' | 'demo'
  config?: Partial<PaymentRoutingConfig>
}): PaymentProcessor {
  const config = { ...DEFAULT_PAYMENT_ROUTING_CONFIG, ...(params.config ?? {}) }

  if (params.environment === 'demo') return 'demo'

  if (params.country === 'AR') {
    if (!config.argentinaEnabled) {
      throw new Error('Pagos reales en Argentina todavía no están habilitados')
    }
    return 'mercadopago_ar'
  }

  if (config.openPixEnabled) return 'openpix'
  if (config.mercadoPagoBrazilEnabled) return 'mercadopago_br'

  throw new Error('No hay procesador de pagos REAL habilitado para Brasil')
}

export function buildPaymentIdempotencyKey(serviceId: string, attempt = 1): string {
  const normalizedAttempt = Number.isFinite(attempt) && attempt > 0 ? Math.floor(attempt) : 1
  return `ugo:${serviceId}:payment:${normalizedAttempt}`
}
