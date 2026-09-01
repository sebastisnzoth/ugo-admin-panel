import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(503).json({ error: 'Supabase no está configurado en el servidor.' })
  }

  const authHeader = req.headers.authorization || ''
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!accessToken) return res.status(401).json({ error: 'Sesión requerida.' })

  const monto = Number(req.body?.monto)
  if (!Number.isFinite(monto) || monto < 50) {
    return res.status(400).json({ error: 'El monto mínimo de retiro es R$ 50.' })
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const { data: authData, error: authError } = await admin.auth.getUser(accessToken)
    if (authError || !authData.user) return res.status(401).json({ error: 'Sesión inválida o vencida.' })

    // Ejecutar el RPC con la sesión real del proveedor. El RPC usa auth.uid(),
    // valida rol, cuenta de cobro, saldo disponible y evita doble retiro concurrente.
    const userClient = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false },
    })

    const { data, error } = await (userClient as any).rpc('solicitar_retiro', { p_monto: monto })
    if (error) {
      const status = /saldo insuficiente|monto mínimo|configurá tu cuenta/i.test(error.message) ? 409 : 400
      return res.status(status).json({ error: error.message })
    }

    return res.status(200).json({
      success: true,
      retiro: data,
      mensaje: 'Solicitud de retiro registrada. UGO la procesará por el canal de pago configurado.',
    })
  } catch (error) {
    console.error('Error en solicitar retiro:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'No se pudo solicitar el retiro.' })
  }
}
