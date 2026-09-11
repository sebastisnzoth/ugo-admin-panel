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
    .select('id,numero,cliente_id,proveedor_id,estado,ambiente')
    .eq('id', servicioId)
    .maybeSingle()
  if (serviceError) return res.status(500).json({ error: serviceError.message })
  if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado.' })
  if (servicio.proveedor_id !== user.id) return res.status(403).json({ error: 'Sólo el proveedor asignado puede confirmar el efectivo.' })

  const { data: pago, error: pagoError } = await sb.from('pagos').select('*').eq('servicio_id', servicioId).maybeSingle()
  if (pagoError) return res.status(500).json({ error: pagoError.message })
  if (!pago || pago.metodo !== 'efectivo' || pago.procesador !== 'efectivo' || pago.modelo_pago !== 'presencial') {
    return res.status(409).json({ error: 'Este servicio no está configurado para pago en efectivo.' })
  }
  if (pago.ambiente !== servicio.ambiente) return res.status(409).json({ error: 'El pago no pertenece al mismo ambiente del servicio.' })
  if (pago.estado === 'liberado') return res.status(200).json({ success: true, alreadyConfirmed: true, pagoId: pago.id })
  if (!['en_progreso','esperando_aprobacion','completado'].includes(servicio.estado)) return res.status(409).json({ error: 'Confirmá el efectivo al finalizar el trabajo.' })

  const ref = `CASH-${servicioId.replace(/-/g,'').slice(0,24)}-${Date.now()}`
  const now = new Date().toISOString()
  const { data: updated, error: updateError } = await sb.from('pagos').update({
    estado: 'liberado',
    pago_externo_id: ref,
    fecha_confirmacion: now,
    liberado_at: now,
    updated_at: now,
  }).eq('id', pago.id).eq('estado','pendiente').select().maybeSingle()
  if (updateError) return res.status(500).json({ error: updateError.message })
  if (!updated) {
    const { data: current } = await sb.from('pagos').select('id,estado').eq('id',pago.id).maybeSingle()
    if (current?.estado === 'liberado') return res.status(200).json({ success:true, alreadyConfirmed:true, pagoId:pago.id })
    return res.status(409).json({ error: 'El estado del pago cambió. Actualizá e intentá nuevamente.' })
  }

  await sb.from('notificaciones').insert({
    usuario_id: servicio.cliente_id,
    tipo: 'pago_efectivo_confirmado',
    titulo: 'Efectivo recibido',
    cuerpo: `El proveedor confirmó la recepción del pago en efectivo del servicio #${servicio.numero || servicio.id.slice(0,8)}.`,
    datos: { servicio_id: servicioId, pago_id: updated.id, metodo: 'efectivo', ambiente: servicio.ambiente },
  })

  return res.status(200).json({ success: true, pagoId: updated.id, estado: updated.estado, metodo: 'efectivo' })
}