import type { ServerCreatePaymentInput, ServerCreatedPayment, ServerPaymentProvider, ServerPaymentStatusResult, ServerRefundInput, ServerRefundResult } from './types.js'

type OpenPixMode = 'sandbox' | 'production'

function mapOpenPixStatus(status?: string): ServerPaymentStatusResult['status'] {
  const value = String(status || '').toUpperCase()
  if (['COMPLETED', 'CONCLUIDA', 'PAID', 'APPROVED'].includes(value)) return 'held'
  if (['ACTIVE', 'ATIVA', 'CREATED', 'PENDING', 'IN_PROCESSING'].includes(value)) return 'pending'
  if (['EXPIRED', 'CANCELLED', 'CANCELED', 'REMOVED'].includes(value)) return 'cancelled'
  if (['REFUNDED', 'DEVOLVIDO'].includes(value)) return 'refunded'
  return 'pending'
}

function cents(value: number) {
  return Math.round(value * 100)
}

export class OpenPixProvider implements ServerPaymentProvider {
  readonly id = 'openpix' as const
  private readonly baseUrl: string

  constructor(private readonly appId: string, mode: OpenPixMode = 'sandbox') {
    this.baseUrl = mode === 'production'
      ? 'https://api.openpix.com.br/api/v1'
      : 'https://api.woovi-sandbox.com/api/v1'
  }

  private headers() {
    return { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: this.appId }
  }

  async createPayment(input: ServerCreatePaymentInput): Promise<ServerCreatedPayment> {
    if (input.currency !== 'BRL') throw new Error('OpenPix acepta únicamente BRL en UGO.')
    const correlationID = input.idempotencyKey
    const response = await fetch(`${this.baseUrl}/charge?return_existing=true`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        correlationID,
        value: cents(input.amount),
        comment: input.description.slice(0, 140),
        expiresIn: Math.max(300, input.expiresInSeconds || 1800),
        customer: input.customerName && (input.payerEmail || input.customerTaxId || input.customerPhone) ? {
          name: input.customerName,
          ...(input.payerEmail ? { email: input.payerEmail } : {}),
          ...(input.customerTaxId ? { taxID: input.customerTaxId } : {}),
          ...(input.customerPhone ? { phone: input.customerPhone } : {}),
        } : undefined,
      }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(`OpenPix create failed (${response.status}): ${JSON.stringify(data)}`)
    const charge = data?.charge || data
    const externalPaymentId = String(charge?.correlationID || charge?.identifier || correlationID)
    return {
      processor: this.id,
      externalPaymentId,
      status: mapOpenPixStatus(charge?.status),
      amount: input.amount,
      currency: input.currency,
      copyPasteCode: charge?.brCode || charge?.pixKey || charge?.qrCode?.brCode || null,
      qrCodeBase64: charge?.qrCodeImage || charge?.qrCode?.image || null,
      paymentLink: charge?.paymentLinkUrl || charge?.paymentLink || charge?.paymentLinkID || null,
      expiresAt: charge?.expiresDate || charge?.expiresAt || null,
      raw: data,
    }
  }

  async getPaymentStatus(externalPaymentId: string): Promise<ServerPaymentStatusResult> {
    const response = await fetch(`${this.baseUrl}/charge/${encodeURIComponent(externalPaymentId)}`, { headers: this.headers() })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(`OpenPix status failed (${response.status}): ${JSON.stringify(data)}`)
    const charge = data?.charge || data
    return {
      processor: this.id,
      externalPaymentId,
      status: mapOpenPixStatus(charge?.status),
      endToEndId: charge?.transaction?.endToEndId || charge?.endToEndId || null,
      raw: data,
    }
  }

  async refundPayment(input: ServerRefundInput): Promise<ServerRefundResult> {
    const response = await fetch(`${this.baseUrl}/charge/${encodeURIComponent(input.externalPaymentId)}/refund`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        correlationID: input.idempotencyKey,
        ...(input.amount ? { value: cents(input.amount) } : {}),
        ...(input.reason ? { comment: input.reason.slice(0, 140) } : {}),
      }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) return { processor: this.id, externalPaymentId: input.externalPaymentId, status: 'failed', raw: data }
    const refund = data?.refund || data
    const status = String(refund?.status || '').toUpperCase()
    return {
      processor: this.id,
      externalPaymentId: input.externalPaymentId,
      refundId: refund?.correlationID || refund?.endToEndId || null,
      status: ['REFUNDED', 'DEVOLVIDO', 'COMPLETED'].includes(status) ? 'refunded' : 'pending',
      raw: data,
    }
  }
}
