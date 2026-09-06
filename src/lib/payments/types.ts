export type PaymentCountry = 'BR' | 'AR'
export type PaymentCurrency = 'BRL' | 'ARS'
export type PaymentProcessor = 'demo' | 'mercadopago_br' | 'openpix' | 'mercadopago_ar'

export type NormalizedPaymentStatus =
  | 'pending'
  | 'confirmed'
  | 'held'
  | 'released'
  | 'refunded'
  | 'failed'
  | 'cancelled'

export interface PaymentContext {
  serviceId: string
  customerId?: string | null
  providerId?: string | null
  country: PaymentCountry
  currency: PaymentCurrency
  amount: number
  environment: 'real' | 'demo'
  description?: string | null
}

export interface CreatePaymentInput extends PaymentContext {
  idempotencyKey: string
  metadata?: Record<string, unknown>
}

export interface CreatedPayment {
  processor: PaymentProcessor
  externalPaymentId: string
  status: NormalizedPaymentStatus
  amount: number
  currency: PaymentCurrency
  qrCode?: string | null
  qrCodeBase64?: string | null
  copyPasteCode?: string | null
  expiresAt?: string | null
  raw?: unknown
}

export interface PaymentStatusResult {
  processor: PaymentProcessor
  externalPaymentId: string
  status: NormalizedPaymentStatus
  amount?: number
  currency?: PaymentCurrency
  raw?: unknown
}

export interface RefundPaymentInput {
  externalPaymentId: string
  amount?: number
  idempotencyKey: string
  reason?: string
}

export interface RefundPaymentResult {
  processor: PaymentProcessor
  externalPaymentId: string
  refundId?: string | null
  status: 'pending' | 'refunded' | 'failed'
  raw?: unknown
}

export interface NormalizedWebhookEvent {
  processor: PaymentProcessor
  eventId?: string | null
  externalPaymentId: string
  serviceId?: string | null
  status: NormalizedPaymentStatus
  amount?: number
  currency?: PaymentCurrency
  endToEndId?: string | null
  occurredAt?: string | null
  raw?: unknown
}

export interface PaymentProvider {
  readonly id: PaymentProcessor
  createPayment(input: CreatePaymentInput): Promise<CreatedPayment>
  getPaymentStatus(externalPaymentId: string): Promise<PaymentStatusResult>
  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult>
  parseWebhook(payload: unknown, headers?: Record<string, string>): Promise<NormalizedWebhookEvent>
}
