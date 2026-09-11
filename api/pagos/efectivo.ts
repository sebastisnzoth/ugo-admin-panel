import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(503).json({ error: 'Backend de pagos no configurado.' })

  const authHeader = req.headers.authorization || ''
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!accessToken) return res.status(401).json({ error: 'Sesión requerida.' })

  const servicioId = typeof req.body?.servicioId === 'string' ? req.body.servicioId : ''
  if (!servicioId) return res.status(400).json({ error: 'Falta servicioId.' })

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
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
