import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN

type ServiceHint={id:string;numero:number|string|null;cliente_id:string;proveedor_id:string|null;tarifa:number|null;moneda:string|null;estado:string}
type PaymentUpdate={estado:string;mp_status:string;mp_payment_id:string;updated_at:string;autorizado_at?:string;reembolsado_at?:string}

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

function hintedExpansionId(req: VercelRequest) {
  const raw = Array.isArray(req.query.exp) ? req.query.exp[0] : req.query.exp
  return String(raw || '')
}

function openPixEventFrom(req: VercelRequest) {
  return String(req.body?.event || req.body?.type || req.body?.charge?.event || '')
}

function openPixStatus(event: string) {
  const value = event.toUpperCase()
  if (value.includes('CHARGE_COMPLETED') || value.includes('TRANSACTION_RECEIVED')) return 'held'
  if (value.includes('CHARGE_EXPIRED')) return 'cancelled'
  if (value.includes('REFUND') && value.includes('CONFIRMED')) return 'refunded'
  return 'pending'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(200).json({ received: true })

  const openPixEvent = openPixEventFrom(req)
  if (process.env.PAYMENTS_OPENPIX_ENABLED === 'true' && openPixEvent.toUpperCase().startsWith('OPENPIX:')) {
    const expected = process.env.OPENPIX_WEBHOOK_AUTHORIZATION
    if (expected && String(req.headers.authorization || '') !== expected) return res.status(401).json({ received: false, error: 'Webhook OpenPix no autorizado.' })
    const charge = req.body?.charge || req.body?.transaction || req.body?.pix || {}
    const correlationID = String(charge?.correlationID || req.body?.correlationID || '')
    const externalPaymentId = String(charge?.identifier || charge?.id || correlationID || '')
    const endToEndId = charge?.endToEndId || charge?.transaction?.endToEndId || req.body?.endToEndId || null
    console.info('[openpix-webhook:sandbox]', { event: openPixEvent, correlationID, externalPaymentId, endToEndId, status: openPixStatus(openPixEvent) })
    return res.status(200).json({ received: true, processor: 'openpix', sandbox: true, event: openPixEvent, externalPaymentId, serviceId: correlationID.startsWith('ugo-openpix-') ? correlationID.slice('ugo-openpix-'.length) : null, status: openPixStatus(openPixEvent), endToEndId })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Mercado Pago webhook missing Supabase server configuration')
    return res.status(200).json({ received: true })
  }

  const paymentId = paymentIdFrom(req)
  const eventType = eventTypeFrom(req)
  if (!paymentId || (eventType && !eventType.includes('payment'))) return res.status(200).json({ received: true, ignored: true })

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const expansionHint = hintedExpansionId(req)
    const serviceHint = hintedServiceId(req)
    let hintedService:ServiceHint|null = null
    let token = MP_ACCESS_TOKEN || ''

    if (serviceHint) {
      const { data } = await sb.from('servicios').select('id,numero,cliente_id,proveedor_id,tarifa,moneda,estado').eq('id', serviceHint).maybeSingle()
      hintedService = (data||null) as ServiceHint|null
      if (!expansionHint && hintedService?.proveedor_id) {
        const { data: oauthRows } = await sb.rpc('mp_oauth_get_private', { p_proveedor_id: hintedService.proveedor_id })
        const seller = oauthRows?.[0]
        if (seller?.access_token && (!seller.expires_at || new Date(seller.expires_at).getTime() > Date.now())) token = seller.access_token
      }
    }

    if (!token) {
      console.error('Mercado Pago webhook has no usable access token')
      return res.status(200).json({ received: true })
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!mpResponse.ok) {
      console.error('Error consultando Mercado Pago:', await mpResponse.text())
      return res.status(200).json({ received: true })
    }

    const paymentData = await mpResponse.json()
    const metadataExpansion = String(paymentData.metadata?.ampliacion_id || '')
    const externalRef = String(paymentData.external_reference || '')
    const expansionId = expansionHint || metadataExpansion || (externalRef.startsWith('exp:') ? externalRef.slice(4) : '')

    if (expansionId) {
      const { data: expansion, error: expansionError } = await sb.from('ampliaciones_servicio').select('id,servicio_id,monto_extra,estado,pago_estado,ajuste_estado').eq('id', expansionId).maybeSingle()
      if (expansionError || !expansion) {
        console.error('Ampliación del webhook no encontrada:', expansionError)
        return res.status(200).json({ received: true, ignored: true })
      }
      const { data: service, error: serviceError } = await sb.from('servicios').select('id,moneda').eq('id', expansion.servicio_id).maybeSingle()
      if (serviceError || !service) return res.status(200).json({ received: true, ignored: true })
      if (serviceHint && serviceHint !== service.id) return res.status(200).json({ received: true, mismatch: true })

      const paidAmount = Number(paymentData.transaction_amount || 0)
      const expectedAmount = Number(expansion.monto_extra || 0)
      const paidCurrency = String(paymentData.currency_id || '')
      const expectedCurrency = String(service.moneda || 'BRL')
      const amountMatches = Math.abs(paidAmount - expectedAmount) < 0.01
      const currencyMatches = !paidCurrency || paidCurrency === expectedCurrency
      const externalPaymentId = String(paymentData.id || paymentId)

      if (paymentData.status === 'approved' && amountMatches && currencyMatches) {
        const { error: confirmError } = await sb.rpc('confirmar_pago_ampliacion', { p_ampliacion_id: expansion.id, p_pago_externo_id: externalPaymentId, p_monto: paidAmount, p_moneda: expectedCurrency })
        if (confirmError) {
          console.error('No se pudo aplicar el ajuste de ampliación:', confirmError)
          return res.status(200).json({ received: true, updated: false })
        }
        return res.status(200).json({ received: true, updated: true, tipo: 'ampliacion', estado: 'retenido' })
      }

      let adjustmentState = 'pendiente'
      if (paymentData.status === 'refunded') adjustmentState = 'reembolsado'
      if (['rejected', 'cancelled', 'charged_back'].includes(paymentData.status)) adjustmentState = 'fallido'
      const pagoEstado = adjustmentState === 'reembolsado' ? 'pendiente_ajuste' : expansion.pago_estado
      const { error: updateError } = await sb.from('ampliaciones_servicio').update({ ajuste_estado: adjustmentState, ajuste_pago_externo_id: externalPaymentId, ajuste_monto: paidAmount || expectedAmount, ajuste_moneda: expectedCurrency, ajuste_actualizado_at: new Date().toISOString(), pago_estado: pagoEstado, updated_at: new Date().toISOString() }).eq('id', expansion.id)
      if (updateError) console.error('No se pudo actualizar estado del ajuste:', updateError)
      if (paymentData.status === 'approved' && (!amountMatches || !currencyMatches)) {
        console.error('Ajuste aprobado con monto/moneda inconsistente', { expansionId, expectedAmount, paidAmount, expectedCurrency, paidCurrency })
        return res.status(200).json({ received: true, mismatch: true })
      }
      return res.status(200).json({ received: true, updated: !updateError, tipo: 'ampliacion', estado: adjustmentState })
    }

    const servicioId = String(paymentData.external_reference || paymentData.metadata?.servicio_id || serviceHint || '')
    if (!servicioId) return res.status(200).json({ received: true, ignored: true })

    const servicio = hintedService?.id === servicioId ? hintedService : ((await sb.from('servicios').select('id,numero,cliente_id,proveedor_id,tarifa,moneda,estado').eq('id', servicioId).maybeSingle()).data as ServiceHint|null)
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

    const { data: pago, error: paymentLookupError } = await sb.from('pagos').select('*').eq('servicio_id', servicioId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (paymentLookupError || !pago) {
      console.error('Registro de pago no encontrado:', paymentLookupError)
      return res.status(200).json({ received: true })
    }

    let nuevoEstado = 'pendiente'
    if (paymentData.status === 'approved' && amountMatches && currencyMatches) nuevoEstado = 'retenido'
    if (paymentData.status === 'refunded') nuevoEstado = 'reembolsado'
    if (['rejected', 'cancelled', 'charged_back'].includes(paymentData.status)) nuevoEstado = 'fallido'

    const update:PaymentUpdate = { estado: nuevoEstado, mp_status: String(paymentData.status||''), mp_payment_id: String(paymentData.id || paymentId), updated_at: new Date().toISOString() }
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
