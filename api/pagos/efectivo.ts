import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'Backend de pagos no configurado.' })

  const authHeader = req.headers.authorization || ''
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!accessToken) return res.status(401).json({ error: 'Sesión requerida.' })

  const servicioId = typeof req.body?.servicioId === 'string' ? req.body.servicioId : ''
  if (!servicioId) return res.status(400).json({ error: 'Falta servicioId.' })

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: authData, error: authError } = await sb.auth.getUser(accessToken)
  const user = authData.user
  if (authError || !user) return res.status(401).json({ error: 'Sesión inválida o vencida.' })

  const { data: servicio, error: serviceError } = await sb
    .from('servicios')
    .select('id,numero,cliente_id,proveedor_id,tarifa,comision_ugo,ganancia_proveedor,moneda,estado,ambiente')
    .eq('id', servicioId)
    .maybeSingle()

  if (serviceError) return res.status(500).json({ error: serviceError.message })
  if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado.' })
  if (servicio.cliente_id !== user.id) return res.status(403).json({ error: 'Este servicio no pertenece al cliente autenticado.' })
  if (!servicio.proveedor_id) return res.status(409).json({ error: 'El servicio todavía no tiene proveedor asignado.' })
  if (!['asignado','en_camino','llegado','en_progreso','esperando_aprobacion'].includes(servicio.estado)) return res.status(409).json({ error: `No podés elegir efectivo en estado ${servicio.estado}.` })

  const montoTotal = Number(servicio.tarifa || 0)
  if (!Number.isFinite(montoTotal) || montoTotal <= 0) return res.status(409).json({ error: 'El servicio no tiene una tarifa válida.' })
  const comisionUgo = Number(servicio.comision_ugo ?? Math.round(montoTotal * 0.15 * 100) / 100)
  const gananciaProveedor = Number(servicio.ganancia_proveedor ?? Math.round((montoTotal - comisionUgo) * 100) / 100)
  const moneda = servicio.moneda || 'BRL'
  const ambiente = servicio.ambiente === 'demo' ? 'demo' : 'real'

  const { data: existing, error: existingError } = await sb.from('pagos').select('*').eq('servicio_id', servicioId).maybeSingle()
  if (existingError) return res.status(500).json({ error: existingError.message })
  if (existing && existing.metodo !== 'efectivo' && ['retenido','liberado'].includes(existing.estado)) {
    return res.status(409).json({ error: 'El servicio ya tiene un pago electrónico confirmado.' })
  }

  const paymentRow = {
    servicio_id: servicioId,
    cliente_id: user.id,
    proveedor_id: servicio.proveedor_id,
    procesador: 'efectivo',
    metodo: 'efectivo',
    modelo_pago: 'presencial',
    ambiente,
    pago_externo_id: null,
    monto_bruto: montoTotal,
    comision_ugo: comisionUgo,
    ganancia_proveedor: gananciaProveedor,
    moneda,
    estado: 'pendiente',
    mp_payment_id: null,
    mp_preference_id: null,
    mp_init_point: null,
    mp_status: null,
    updated_at: new Date().toISOString(),
  }

  const { data: pago, error: paymentError } = existing?.id
    ? await sb.from('pagos').update(paymentRow).eq('id', existing.id).select().single()
    : await sb.from('pagos').insert(paymentRow).select().single()

  if (paymentError) return res.status(500).json({ error: paymentError.message })

  await sb.from('notificaciones').insert({
    usuario_id: servicio.proveedor_id,
    tipo: 'pago_efectivo_seleccionado',
    titulo: 'Pago en efectivo',
    cuerpo: `El cliente eligió pagar en efectivo el servicio #${servicio.numero || servicio.id.slice(0,8)}.`,
    datos: { servicio_id: servicioId, pago_id: pago.id, metodo: 'efectivo', ambiente },
  })

  return res.status(200).json({ success: true, pagoId: pago.id, metodo: 'efectivo', estado: 'pendiente', ambiente, montoTotal, comisionUgo, gananciaProveedor, moneda })
}