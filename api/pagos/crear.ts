import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN

function getBaseUrl(req: VercelRequest) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0]
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return host ? `${proto}://${host}` : ''
}

function paymentMethod(req: VercelRequest) {
  return req.body?.metodo === 'pix' ? 'pix' : 'mercadopago'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !MP_ACCESS_TOKEN) {
    return res.status(503).json({ error: 'Mercado Pago no está configurado en el servidor.' })
  }

  const authHeader = req.headers.authorization || ''
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!accessToken) return res.status(401).json({ error: 'Sesión requerida.' })

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const { data: authData, error: authError } = await sb.auth.getUser(accessToken)
    const user = authData.user
    if (authError || !user) return res.status(401).json({ error: 'Sesión inválida o vencida.' })

    const servicioId = typeof req.body?.servicioId === 'string' ? req.body.servicioId : ''
    const metodo = paymentMethod(req)
    if (!servicioId) return res.status(400).json({ error: 'Falta servicioId.' })

    const { data: servicio, error: serviceError } = await sb
      .from('servicios')
      .select('id,numero,cliente_id,proveedor_id,tarifa,comision_ugo,ganancia_proveedor,moneda,estado,descripcion')
      .eq('id', servicioId)
      .maybeSingle()

    if (serviceError) throw serviceError
    if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado.' })
    if (servicio.cliente_id !== user.id) return res.status(403).json({ error: 'Este servicio no pertenece al cliente autenticado.' })
    if (!servicio.proveedor_id) return res.status(409).json({ error: 'El servicio todavía no tiene proveedor asignado.' })
    if (!['asignado', 'en_camino', 'en_progreso', 'esperando_aprobacion'].includes(servicio.estado)) {
      return res.status(409).json({ error: `El servicio no se puede pagar en estado ${servicio.estado}.` })
    }

    const montoTotal = Number(servicio.tarifa || 0)
    if (!Number.isFinite(montoTotal) || montoTotal <= 0) return res.status(409).json({ error: 'El servicio no tiene una tarifa válida.' })

    const comisionUgo = Number(servicio.comision_ugo ?? Math.round(montoTotal * 0.15 * 100) / 100)
    const gananciaProveedor = Number(servicio.ganancia_proveedor ?? Math.round((montoTotal - comisionUgo) * 100) / 100)
    const moneda = servicio.moneda || 'BRL'
    if (metodo === 'pix' && moneda !== 'BRL') return res.status(409).json({ error: 'Pix está disponible únicamente para pagos en BRL.' })

    const { data: existing } = await sb.from('pagos').select('*').eq('servicio_id', servicioId).order('created_at', { ascending: false }).limit(1).maybeSingle()

    if (existing?.estado === 'liberado' || (existing?.estado === 'retenido' && existing?.mp_payment_id)) {
      return res.status(200).json({ success: true, alreadyPaid: true, pagoId: existing.id, estado: existing.estado, metodo: existing.metodo || metodo, montoTotal: Number(existing.monto_bruto ?? montoTotal), comisionUgo: Number(existing.comision_ugo ?? comisionUgo), gananciaProveedor: Number(existing.ganancia_proveedor ?? gananciaProveedor) })
    }

    if (metodo === 'pix' && existing?.metodo === 'pix' && existing?.estado === 'pendiente' && existing?.pix_copia_cola) {
      return res.status(200).json({ success: true, pagoId: existing.id, metodo: 'pix', paymentId: existing.mp_payment_id, pixTxid: existing.pix_txid, pixCopiaCola: existing.pix_copia_cola, pixQrCode: existing.pix_qr_code, pixExpiraAt: existing.pix_expira_at, montoTotal, comisionUgo, gananciaProveedor, moneda })
    }

    const baseUrl = getBaseUrl(req)

    if (metodo === 'pix') {
      if (!user.email) return res.status(409).json({ error: 'Tu cuenta necesita un email válido para generar el cobro Pix.' })
      const expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      const pixPayload = {
        transaction_amount: montoTotal,
        description: `U.G.O. · Servicio #${servicio.numero || servicio.id.slice(0, 8)}`,
        payment_method_id: 'pix',
        payer: { email: user.email },
        external_reference: servicioId,
        notification_url: baseUrl ? `${baseUrl}/api/pagos/webhook` : undefined,
        date_of_expiration: expiration,
        metadata: { servicio_id: servicioId, cliente_id: user.id, proveedor_id: servicio.proveedor_id, metodo: 'pix' },
      }

      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MP_ACCESS_TOKEN}`, 'X-Idempotency-Key': `ugo-pix-${servicioId}` },
        body: JSON.stringify(pixPayload),
      })
      if (!mpResponse.ok) {
        const details = await mpResponse.json().catch(() => null)
        return res.status(502).json({ error: 'Mercado Pago no pudo generar el Pix.', details })
      }

      const mpData = await mpResponse.json()
      const tx = mpData.point_of_interaction?.transaction_data || {}
      const paymentRow = {
        servicio_id: servicioId,
        cliente_id: user.id,
        proveedor_id: servicio.proveedor_id,
        procesador: 'mercadopago',
        metodo: 'pix',
        monto_bruto: montoTotal,
        comision_ugo: comisionUgo,
        ganancia_proveedor: gananciaProveedor,
        moneda,
        estado: mpData.status === 'approved' ? 'retenido' : 'pendiente',
        mp_payment_id: String(mpData.id || ''),
        mp_status: String(mpData.status || 'pending'),
        pix_txid: String(mpData.id || ''),
        pix_copia_cola: tx.qr_code || null,
        pix_qr_code: tx.qr_code_base64 || null,
        pix_expira_at: expiration,
        updated_at: new Date().toISOString(),
      }
      let pago
      if (existing?.id) {
        const { data, error } = await sb.from('pagos').update(paymentRow).eq('id', existing.id).select().single()
        if (error) throw error
        pago = data
      } else {
        const { data, error } = await sb.from('pagos').insert(paymentRow).select().single()
        if (error) throw error
        pago = data
      }
      return res.status(200).json({ success: true, pagoId: pago.id, metodo: 'pix', paymentId: mpData.id, pixTxid: String(mpData.id || ''), pixCopiaCola: tx.qr_code || null, pixQrCode: tx.qr_code_base64 || null, pixTicketUrl: tx.ticket_url || null, pixExpiraAt: expiration, estado: paymentRow.estado, montoTotal, comisionUgo, gananciaProveedor, moneda })
    }

    if (existing?.mp_preference_id && existing?.mp_init_point && existing?.estado === 'pendiente' && existing?.metodo !== 'pix') {
      return res.status(200).json({ success: true, pagoId: existing.id, metodo: 'mercadopago', preferenceId: existing.mp_preference_id, initPoint: existing.mp_init_point, montoTotal, comisionUgo, gananciaProveedor })
    }

    const preference = {
      items: [{ id: servicio.id, title: `U.G.O. · Servicio #${servicio.numero || servicio.id.slice(0, 8)}`, description: servicio.descripcion || 'Pago de servicio U.G.O.', quantity: 1, currency_id: moneda, unit_price: montoTotal }],
      payer: user.email ? { email: user.email } : undefined,
      payment_methods: { excluded_payment_types: [{ id: 'atm' }] },
      back_urls: baseUrl ? { success: `${baseUrl}/?app=client&pago=confirmado&svc=${servicioId}`, failure: `${baseUrl}/?app=client&pago=fallido&svc=${servicioId}`, pending: `${baseUrl}/?app=client&pago=pendiente&svc=${servicioId}` } : undefined,
      notification_url: baseUrl ? `${baseUrl}/api/pagos/webhook` : undefined,
      auto_return: baseUrl ? 'approved' : undefined,
      external_reference: servicioId,
      metadata: { servicio_id: servicioId, cliente_id: user.id, proveedor_id: servicio.proveedor_id, metodo: 'mercadopago' },
    }

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MP_ACCESS_TOKEN}` }, body: JSON.stringify(preference) })
    if (!mpResponse.ok) {
      const details = await mpResponse.json().catch(() => null)
      return res.status(502).json({ error: 'Mercado Pago rechazó la creación del checkout.', details })
    }

    const mpData = await mpResponse.json()
    const paymentRow = { servicio_id: servicioId, cliente_id: user.id, proveedor_id: servicio.proveedor_id, procesador: 'mercadopago', metodo: 'mercadopago', monto_bruto: montoTotal, comision_ugo: comisionUgo, ganancia_proveedor: gananciaProveedor, moneda, estado: 'pendiente', mp_preference_id: mpData.id, mp_init_point: mpData.init_point, mp_status: 'preference_created', pix_txid: null, pix_copia_cola: null, pix_qr_code: null, pix_expira_at: null, updated_at: new Date().toISOString() }

    let pago
    if (existing?.id) {
      const { data, error } = await sb.from('pagos').update(paymentRow).eq('id', existing.id).select().single()
      if (error) throw error
      pago = data
    } else {
      const { data, error } = await sb.from('pagos').insert(paymentRow).select().single()
      if (error) throw error
      pago = data
    }

    return res.status(200).json({ success: true, pagoId: pago.id, metodo: 'mercadopago', preferenceId: mpData.id, initPoint: mpData.init_point, montoTotal, comisionUgo, gananciaProveedor, moneda })
  } catch (error) {
    console.error('Error en crear pago:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'No se pudo iniciar el pago.' })
  }
}
