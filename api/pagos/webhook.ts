import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN

function paymentIdFrom(req: VercelRequest) {
  const queryId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  const bodyId = req.body?.data?.id || req.body?.id
  return String(queryId || bodyId || '')
}

function eventTypeFrom(req: VercelRequest) {
  const queryType = Array.isArray(req.query.type) ? req.query.type[0] : req.query.type
  return String(queryType || req.body?.type || req.body?.action || '')
}

function hintedServiceId(req: VercelRequest) {
  const raw = Array.isArray(req.query.svc) ? req.query.svc[0] : req.query.svc
  return String(raw || '')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(200).json({ received: true })
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Mercado Pago webhook missing Supabase server configuration')
    return res.status(200).json({ received: true })
  }

  const paymentId = paymentIdFrom(req)
  const eventType = eventTypeFrom(req)
  if (!paymentId || (eventType && !eventType.includes('payment'))) {
    return res.status(200).json({ received: true, ignored: true })
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    let serviceHint = hintedServiceId(req)
    let hintedService:any = null
    let token = MP_ACCESS_TOKEN || ''

    if (serviceHint) {
      const { data } = await sb.from('servicios').select('id,numero,cliente_id,proveedor_id,tarifa,moneda,estado').eq('id', serviceHint).maybeSingle()
      hintedService = data
      if (hintedService?.proveedor_id) {
        const { data: oauthRows } = await sb.rpc('mp_oauth_get_private', { p_proveedor_id: hintedService.proveedor_id })
        const seller = oauthRows?.[0]
        if (seller?.access_token && (!seller.expires_at || new Date(seller.expires_at).getTime() > Date.now())) token = seller.access_token
      }
    }

    if (!token) {
      console.error('Mercado Pago webhook has no usable access token')
      return res.status(200).json({ received: true })
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!mpResponse.ok) {
      console.error('Error consultando Mercado Pago:', await mpResponse.text())
      return res.status(200).json({ received: true })
    }

    const paymentData = await mpResponse.json()
    const servicioId = String(paymentData.external_reference || paymentData.metadata?.servicio_id || serviceHint || '')
    if (!servicioId) return res.status(200).json({ received: true, ignored: true })

    const servicio = hintedService?.id === servicioId ? hintedService : (await sb
      .from('servicios')
      .select('id,numero,cliente_id,proveedor_id,tarifa,moneda,estado')
      .eq('id', servicioId)
      .maybeSingle()).data

    if (!servicio) {
      console.error('Servicio del webhook no encontrado')
      return res.status(200).json({ received: true })
    }

    const paidAmount = Number(paymentData.transaction_amount || 0)
    const expectedAmount = Number(servicio.tarifa || 0)
    const paidCurrency = String(paymentData.currency_id || '')
    const expectedCurrency = String(servicio.moneda || 'BRL')
    const amountMatches = Math.abs(paidAmount - expectedAmount) < 0.01
    const currencyMatches = !paidCurrency || paidCurrency === expectedCurrency

    const { data: pago, error: paymentLookupError } = await sb
      .from('pagos')
      .select('*')
      .eq('servicio_id', servicioId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (paymentLookupError || !pago) {
      console.error('Registro de pago no encontrado:', paymentLookupError)
      return res.status(200).json({ received: true })
    }

    let nuevoEstado = 'pendiente'
    if (paymentData.status === 'approved' && amountMatches && currencyMatches) nuevoEstado = 'retenido'
    if (paymentData.status === 'refunded') nuevoEstado = 'reembolsado'
    if (['rejected', 'cancelled', 'charged_back'].includes(paymentData.status)) nuevoEstado = 'fallido'

    const update:any = {
      estado: nuevoEstado,
      mp_status: paymentData.status,
      mp_payment_id: String(paymentData.id || paymentId),
      updated_at: new Date().toISOString(),
    }
    if (nuevoEstado === 'retenido') update.autorizado_at = new Date().toISOString()
    if (nuevoEstado === 'reembolsado') update.reembolsado_at = new Date().toISOString()

    const { error: updateError } = await sb.from('pagos').update(update).eq('id', pago.id)

    if (updateError) {
      console.error('Error actualizando pago:', updateError)
      return res.status(200).json({ received: true })
    }

    if (paymentData.status === 'approved' && (!amountMatches || !currencyMatches)) {
      console.error('Pago aprobado con monto/moneda inconsistente', { servicioId, expectedAmount, paidAmount, expectedCurrency, paidCurrency })
      return res.status(200).json({ received: true, updated: true, mismatch: true })
    }

    return res.status(200).json({ received: true, updated: true, estado: nuevoEstado, modeloPago: pago.modelo_pago || 'custodia_ugo' })
  } catch (error) {
    console.error('Error en webhook Mercado Pago:', error)
    return res.status(200).json({ received: true })
  }
}
