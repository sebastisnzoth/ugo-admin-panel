import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://trfsjuseqjxlhrxuvdsm.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_bbCcM7ElzH-iGAQw8Qefzg_ZmO0sKH8'
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.7-flash'

function bearer(req: any) {
  const raw = String(req.headers?.authorization || '')
  return raw.startsWith('Bearer ') ? raw.slice(7).trim() : ''
}

function extractJson(text: string) {
  const cleaned = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim()
  try { return JSON.parse(cleaned) } catch { /* continue */ }
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)) } catch { /* noop */ }
  }
  return null
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  try {
    const token = bearer(req)
    if (!token) return res.status(401).json({ error: 'Sesión requerida' })

    const geminiKey = process.env.GEMINI_API_KEY?.trim()
    if (!geminiKey) return res.status(503).json({ error: 'GEMINI_API_KEY no está configurada en Vercel' })

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { data: authData, error: authError } = await authClient.auth.getUser(token)
    if (authError || !authData.user) return res.status(401).json({ error: 'Sesión inválida' })

    const requestedRole = req.body?.role === 'provider' ? 'provider' : 'client'
    const expectedRole = requestedRole === 'provider' ? 'proveedor' : 'cliente'
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { data: profile } = await userClient.from('usuarios').select('tipo,nombre').eq('id', authData.user.id).maybeSingle()
    if (!profile || profile.tipo !== expectedRole) return res.status(403).json({ error: 'El rol de la sesión no coincide con esta aplicación' })

    const message = String(req.body?.message || '').trim().slice(0, 2000)
    if (!message) return res.status(400).json({ error: 'Mensaje requerido' })
    const context = String(req.body?.context || '').slice(0, 5000)
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-6) : []

    const roleText = requestedRole === 'client'
      ? 'El usuario es un cliente que busca contratar un servicio.'
      : 'El usuario es un proveedor que recibe y ejecuta servicios.'

    const system = [
      'Sos Hugo, el asistente operativo de U.G.O.',
      'Hablá en español rioplatense natural, breve, útil y con voseo.',
      roleText,
      'No inventes profesionales, precios, pagos, estados ni acciones ejecutadas.',
      'Cuando el usuario describe una necesidad de servicio, identificá la categoría más probable.',
      'Categorías típicas: electricidad, plomería, pintura, limpieza, cerrajería, aire acondicionado, albañilería, jardinería, montaje, tecnología y reparaciones generales.',
      'Marcá urgent=true solo si expresa urgencia real: urgente, emergencia, ahora, ya, hoy mismo o equivalente.',
      'Devolvé EXCLUSIVAMENTE JSON válido con esta forma:',
      '{"reply":"respuesta breve para el usuario","action":"none|search_provider|prepare_request","category_hint":null,"urgent":false,"description":null}',
      'Si pide un profesional o describe un problema concreto, action debe ser search_provider.',
      `CONTEXTO ACTUAL DE UGO: ${context || 'Sin servicio activo.'}`,
    ].join('\n')

    const contents = [
      ...history.map((turn: any) => ({
        role: turn?.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(turn?.content || '').slice(0, 1200) }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ]

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 500,
        },
      }),
    })

    const payload: any = await response.json().catch(() => ({}))
    if (!response.ok) {
      console.error('Gemini Hugo error', response.status, payload?.error?.message || payload)
      return res.status(502).json({ error: payload?.error?.message || `Gemini respondió ${response.status}` })
    }

    const raw = payload?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') || ''
    const parsed = extractJson(raw)
    if (!parsed?.reply) return res.status(502).json({ error: 'Gemini no devolvió una respuesta válida' })

    return res.status(200).json({
      reply: String(parsed.reply).slice(0, 1000),
      action: ['none', 'search_provider', 'prepare_request'].includes(parsed.action) ? parsed.action : 'none',
      category_hint: parsed.category_hint ? String(parsed.category_hint).slice(0, 120) : null,
      urgent: Boolean(parsed.urgent),
      description: parsed.description ? String(parsed.description).slice(0, 1000) : null,
      model: GEMINI_MODEL,
    })
  } catch (error) {
    console.error('Hugo Gemini endpoint failed', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Error interno de Hugo' })
  }
}
