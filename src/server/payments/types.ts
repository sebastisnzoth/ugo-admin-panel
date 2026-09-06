export type ServerPaymentProcessor = 'mercadopago_br' | 'openpix'
export type ServerPaymentStatus = 'pending' | 'confirmed' | 'held' | 'refunded' | 'failed' | 'cancelled'

export interface ServerCreatePaymentInput {
  serviceId: string
  amount: number
  currency: 'BRL' | 'ARS'
  description: string
  payerEmail?: string | null
  customerName?: string | null
  customerTaxId?: string | null
  customerPhone?: string | null
  idempotencyKey: string
  notificationUrl?: string | null
  expiresInSeconds?: number
}

export interface ServerCreatedPayment {
  processor: ServerPaymentProcessor
  externalPaymentId: string
  status: ServerPaymentStatus
  amount: number
  currency: 'BRL' | 'ARS'
  copyPasteCode?: string | null
  qrCodeBase64?: string | null
  paymentLink?: string | null
  expiresAt?: string | null
  raw?: unknown
}

export interface ServerPaymentStatusResult {
  processor: ServerPaymentProcessor
  externalPaymentId: string
  status: ServerPaymentStatus
  endToEndId?: string | null
  raw?: unknown
}

export interface ServerRefundInput {
  externalPaymentId: string
  amount?: number
  idempotencyKey: string
  reason?: string
}

export interface ServerRefundResult {
  processor: ServerPaymentProcessor
  externalPaymentId: string
  refundId?: string | null
  status: 'pending' | 'refunded' | 'failed'
  raw?: unknown
}

export interface ServerPaymentProvider {
  readonly id: ServerPaymentProcessor
  createPayment(input: ServerCreatePaymentInput): Promise<ServerCreatedPayment>
  getPaymentStatus(externalPaymentId: string): Promise<ServerPaymentStatusResult>
  refundPayment(input: ServerRefundInput): Promise<ServerRefundResult>
}
