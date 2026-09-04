import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://trfsjuseqjxlhrxuvdsm.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

type Role = 'cliente' | 'proveedor' | 'admin' | 'superadmin'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!SERVICE_KEY) return res.status(503).json({ error: 'SUPABASE_SERVICE_KEY no configurada.' })

  const authHeader = String(req.headers.authorization || '')
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!accessToken) return res.status(401).json({ error: 'Sesión Admin requerida.' })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  let createdUserId: string | null = null

  try {
    const { data: authData, error: authError } = await sb.auth.getUser(accessToken)
    if (authError || !authData.user) return res.status(401).json({ error: 'Sesión inválida o vencida.' })

    const { data: caller } = await sb.from('usuarios').select('tipo,activo').eq('id', authData.user.id).maybeSingle()
    if (!caller?.activo || !['admin', 'superadmin'].includes(String(caller.tipo))) {
      return res.status(403).json({ error: 'Sólo administradores pueden crear usuarios.' })
    }

    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    const nombre = String(req.body?.nombre || '').trim()
    const apellido = String(req.body?.apellido || '').trim() || null
    const role = String(req.body?.role || 'cliente') as Role
    const demo = Boolean(req.body?.demo)
    const providerVerified = Boolean(req.body?.providerVerified)

    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Email inválido.' })
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' })
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido.' })
    if (!['cliente', 'proveedor', 'admin', 'superadmin'].includes(role)) return res.status(400).json({ error: 'Rol inválido.' })
    if (['admin', 'superadmin'].includes(role) && caller.tipo !== 'superadmin') return res.status(403).json({ error: 'Sólo Super Admin puede crear administradores.' })

    const created = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, apellido, tipo: role, source: 'ugo-admin-panel', demo },
    })
    if (created.error || !created.data.user) throw created.error || new Error('No se pudo crear el usuario Auth.')
    createdUserId = created.data.user.id

    const { error: userError } = await sb.from('usuarios').upsert({
      id: createdUserId,
      nombre,
      apellido,
      tipo: role,
      activo: true,
      pais: 'BR',
      email,
      es_demo: demo,
    }, { onConflict: 'id' })
    if (userError) throw userError

    if (role === 'cliente') {
      const { error } = await sb.from('perfiles_cliente').upsert({ usuario_id: createdUserId, ciudad: 'Florianópolis' }, { onConflict: 'usuario_id' })
      if (error) throw error
    }

    if (role === 'proveedor') {
      const verified = demo && providerVerified
      const { error } = await sb.from('perfiles_proveedor').upsert({
        usuario_id: createdUserId,
        ciudad_base: 'Florianópolis',
        estado_verificacion: verified ? 'verificado' : 'registrado',
        online: verified,
        disponible: verified,
        onboarding_paso: verified ? 15 : 0,
        onboarding_completo_at: verified ? new Date().toISOString() : null,
      }, { onConflict: 'usuario_id' })
      if (error) throw error
    }

    return res.status(200).json({
      ok: true,
      user: { id: createdUserId, email, nombre, apellido, role, demo, providerVerified: role === 'proveedor' && demo && providerVerified },
    })
  } catch (error) {
    if (createdUserId) await sb.auth.admin.deleteUser(createdUserId).catch(() => {})
    const message = error instanceof Error ? error.message : 'No se pudo crear el usuario.'
    return res.status(500).json({ error: message })
  }
}
