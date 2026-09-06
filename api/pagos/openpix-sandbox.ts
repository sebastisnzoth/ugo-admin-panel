import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { OpenPixProvider } from './providers/openPix.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (process.env.PAYMENTS_OPENPIX_ENABLED !== 'true') return res.status(404).json({ error: 'OpenPix sandbox deshabilitado.' })
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'Backend no configurado.' })
  const appId = process.env.OPENPIX_SANDBOX_APP_ID
  if (!appId) return res.status(503).json({ error: 'OPENPIX_SANDBOX_APP_ID no configurado.' })

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Sesión requerida.' })

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data, error } = await sb.auth.getUser(token)
  if (error || !data.user) return res.status(401).json({ error: 'Sesión inválida.' })
  if (!String(data.user.email || '').toLowerCase().endsWith('@ugo.test')) return res.status(403).json({ error: 'Sandbox disponible solo para cuentas UGO de prueba.' })

  const provider = new OpenPixProvider(appId, 'sandbox')
  const action = String(req.body?.action || 'create')

  try {
    if (action === 'status') {
      const externalPaymentId = String(req.body?.externalPaymentId || '')
      if (!externalPaymentId) return res.status(400).json({ error: 'Falta externalPaymentId.' })
      return res.status(200).json(await provider.getPaymentStatus(externalPaymentId))
    }

    if (action === 'refund') {
      const externalPaymentId = String(req.body?.externalPaymentId || '')
      if (!externalPaymentId) return res.status(400).json({ error: 'Falta externalPaymentId.' })
      return res.status(200).json(await provider.refundPayment({
        externalPaymentId,
        amount: req.body?.amount ? Number(req.body.amount) : undefined,
        idempotencyKey: String(req.body?.idempotencyKey || `ugo-refund-${externalPaymentId}`),
        reason: req.body?.reason ? String(req.body.reason) : undefined,
      }))
    }

    const serviceId = String(req.body?.serviceId || '')
    const amount = Number(req.body?.amount || 0)
    if (!serviceId || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'serviceId y amount válidos son obligatorios.' })

    const result = await provider.createPayment({
      serviceId,
      amount,
      currency: 'BRL',
      description: String(req.body?.description || `U.G.O. sandbox · ${serviceId}`).slice(0, 140),
      payerEmail: data.user.email || null,
      customerName: req.body?.customerName ? String(req.body.customerName) : 'UGO Test',
      idempotencyKey: String(req.body?.idempotencyKey || `ugo-openpix-${serviceId}`),
      expiresInSeconds: 1800,
    })
    return res.status(200).json(result)
  } catch (err) {
    console.error('[openpix-sandbox]', err)
    return res.status(502).json({ error: err instanceof Error ? err.message : 'Error OpenPix sandbox.' })
  }
}
