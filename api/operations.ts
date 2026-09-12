import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function operation(req: VercelRequest) {
  const raw = req.query.op
  return Array.isArray(raw) ? raw[0] : raw || ''
}

function accessToken(req: VercelRequest) {
  const authHeader = req.headers.authorization || ''
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
}

async function selectCash(req: VercelRequest, res: VercelResponse) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(503).json({ error: 'Backend de pagos no configurado.' })
  const token = accessToken(req)
  if (!token) return res.status(401).json({ error: 'Sesión requerida.' })
  const servicioId = typeof req.body?.servicioId === 'string' ? req.body.servicioId : ''
  if (!servicioId) return res.status(400).json({ error: 'Falta servicioId.' })

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await sb.rpc('seleccionar_pago_efectivo', { p_servicio_id: servicioId })
  if (error) return res.status(409).json({ error: error.message })
  const pago = Array.isArray(data) ? data[0] : data
  if (!pago) return res.status(500).json({ error: 'Supabase no devolvió el pago en efectivo.' })
  return res.status(200).json({
    success: true,
    pagoId: pago.id,
    metodo: pago.metodo,
    estado: pago.estado,
    ambiente: pago.ambiente,
    montoTotal: Number(pago.monto_bruto || 0),
    comisionUgo: Number(pago.comision_ugo || 0),
    gananciaProveedor: Number(pago.ganancia_proveedor || 0),
    moneda: pago.moneda || 'BRL',
  })
}

async function confirmCash(req: VercelRequest, res: VercelResponse) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(503).json({ error: 'Backend de pagos no configurado.' })
  const token = accessToken(req)
  if (!token) return res.status(401).json({ error: 'Sesión requerida.' })
  const servicioId = typeof req.body?.servicioId === 'string' ? req.body.servicioId : ''
  if (!servicioId) return res.status(400).json({ error: 'Falta servicioId.' })

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await sb.rpc('confirmar_pago_efectivo', { p_servicio_id: servicioId })
  if (error) return res.status(409).json({ error: error.message })
  const pago = Array.isArray(data) ? data[0] : data
  if (!pago) return res.status(500).json({ error: 'Supabase no devolvió la confirmación del efectivo.' })
  return res.status(200).json({
    success: true,
    pagoId: pago.id,
    estado: pago.estado,
    metodo: pago.metodo,
    alreadyConfirmed: pago.estado === 'liberado',
  })
}

async function verifyKyc(req: VercelRequest, res: VercelResponse) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({ error: 'Backend KYC no configurado.' })
  const { documentoId, aprobado, notas, adminId } = req.body || {}
  if (!documentoId || aprobado === undefined) return res.status(400).json({ error: 'Missing required fields' })

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  try {
    const { data: doc } = await sb.from('documentos').select('usuario_id').eq('id', documentoId).single()
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' })

    await sb.from('documentos').update({
      estado: aprobado ? 'aprobado' : 'rechazado',
      notas,
      revisor_id: adminId,
      revisado_at: new Date().toISOString(),
    }).eq('id', documentoId)

    if (aprobado) {
      const { data: docs } = await sb.from('documentos').select('estado').eq('usuario_id', doc.usuario_id)
      const allApproved = docs?.every((d) => d.estado === 'aprobado')
      if (allApproved) {
        await sb.from('usuarios').update({ activo: true }).eq('id', doc.usuario_id)
        await sb.from('notificaciones').insert({
          usuario_id: doc.usuario_id,
          tipo: 'kyc_aprobado',
          titulo: '¡Bienvenido a U.GO!',
          mensaje: 'Tu perfil ha sido verificado y aprobado.',
          leido: false,
        })
      }
    }

    return res.status(200).json({ success: true, message: aprobado ? 'Documento aprobado' : 'Documento rechazado' })
  } catch (error) {
    console.error('KYC verify error:', error)
    return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' })
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  switch (operation(req)) {
    case 'cash-select': return selectCash(req, res)
    case 'cash-confirm': return confirmCash(req, res)
    case 'kyc-verify': return verifyKyc(req, res)
    default: return res.status(404).json({ error: 'Operación no encontrada.' })
  }
}
