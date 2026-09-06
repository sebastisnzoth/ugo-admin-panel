import type { VercelRequest, VercelResponse } from '@vercel/node'

function normalizeStatus(event: string) {
  const value = event.toUpperCase()
  if (value.includes('CHARGE_COMPLETED') || value.includes('TRANSACTION_RECEIVED')) return 'held'
  if (value.includes('CHARGE_EXPIRED')) return 'cancelled'
  if (value.includes('REFUND') && value.includes('CONFIRMED')) return 'refunded'
  return 'pending'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (process.env.PAYMENTS_OPENPIX_ENABLED !== 'true') return res.status(404).json({ error: 'OpenPix webhook deshabilitado.' })

  const expected = process.env.OPENPIX_WEBHOOK_AUTHORIZATION
  if (expected) {
    const received = String(req.headers.authorization || '')
    if (received !== expected) return res.status(401).json({ error: 'Webhook no autorizado.' })
  }

  const body = req.body || {}
  const event = String(body.event || body.type || body?.charge?.event || '')
  const charge = body.charge || body.transaction || body.pix || {}
  const correlationID = String(charge.correlationID || body.correlationID || '')
  const externalPaymentId = String(charge.identifier || charge.id || correlationID || '')
  const endToEndId = charge.endToEndId || charge.transaction?.endToEndId || body.endToEndId || null

  // Fase sandbox: solo normaliza y registra en logs. No muta pagos ni bóveda.
  console.info('[openpix-webhook:sandbox]', {
    event,
    correlationID,
    externalPaymentId,
    endToEndId,
    status: normalizeStatus(event),
  })

  return res.status(200).json({
    ok: true,
    processor: 'openpix',
    event,
    externalPaymentId,
    serviceId: correlationID.startsWith('ugo-openpix-') ? correlationID.slice('ugo-openpix-'.length) : null,
    status: normalizeStatus(event),
    endToEndId,
    sandbox: true,
  })
}
