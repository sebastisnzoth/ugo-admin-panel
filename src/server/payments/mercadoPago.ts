import type { ServerCreatePaymentInput, ServerCreatedPayment, ServerPaymentProvider, ServerPaymentStatusResult, ServerRefundInput, ServerRefundResult } from './types.js'

function mapStatus(status?: string): ServerPaymentStatusResult['status'] {
  if (status === 'approved') return 'held'
  if (status === 'refunded' || status === 'charged_back') return 'refunded'
  if (status === 'cancelled' || status === 'rejected') return 'cancelled'
  if (status === 'in_process' || status === 'pending' || status === 'authorized') return 'pending'
  return 'failed'
}

export class MercadoPagoProvider implements ServerPaymentProvider {
  readonly id = 'mercadopago_br' as const
  constructor(private readonly accessToken: string) {}

  private headers(idempotencyKey?: string) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
      ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
    }
  }

  async createPayment(input: ServerCreatePaymentInput): Promise<ServerCreatedPayment> {
    if (input.currency !== 'BRL') throw new Error('MercadoPagoProvider BR acepta únicamente BRL.')
    if (!input.payerEmail) throw new Error('Mercado Pago requiere email del pagador para Pix.')
    const expiration = new Date(Date.now() + (input.expiresInSeconds || 1800) * 1000).toISOString()
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: this.headers(input.idempotencyKey),
      body: JSON.stringify({
        transaction_amount: input.amount,
        description: input.description,
        payment_method_id: 'pix',
        payer: { email: input.payerEmail },
        external_reference: input.serviceId,
        notification_url: input.notificationUrl || undefined,
        date_of_expiration: expiration,
        metadata: { servicio_id: input.serviceId },
      }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(`Mercado Pago create failed (${response.status}): ${JSON.stringify(data)}`)
    const tx = data?.point_of_interaction?.transaction_data || {}
    return {
      processor: this.id,
      externalPaymentId: String(data?.id || ''),
      status: mapStatus(data?.status),
      amount: input.amount,
      currency: input.currency,
      copyPasteCode: tx.qr_code || null,
      qrCodeBase64: tx.qr_code_base64 || null,
      paymentLink: tx.ticket_url || null,
      expiresAt: expiration,
      raw: data,
    }
  }

  async getPaymentStatus(externalPaymentId: string): Promise<ServerPaymentStatusResult> {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(externalPaymentId)}`, { headers: this.headers() })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(`Mercado Pago status failed (${response.status}): ${JSON.stringify(data)}`)
    return { processor: this.id, externalPaymentId, status: mapStatus(data?.status), raw: data }
  }

  async refundPayment(input: ServerRefundInput): Promise<ServerRefundResult> {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(input.externalPaymentId)}/refunds`, {
      method: 'POST',
      headers: this.headers(input.idempotencyKey),
      body: JSON.stringify(input.amount ? { amount: input.amount } : {}),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) return { processor: this.id, externalPaymentId: input.externalPaymentId, status: 'failed', raw: data }
    return { processor: this.id, externalPaymentId: input.externalPaymentId, refundId: String(data?.id || ''), status: data?.status === 'approved' ? 'refunded' : 'pending', raw: data }
  }
}
