import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://trfsjuseqjxlhrxuvdsm.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || process.env.VITE_SUPABASE_ANON_KEY
  || 'sb_publishable_bbCcM7ElzH-iGAQw8Qefzg_ZmO0sKH8'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

function getBearer(req: any) {
  const raw = String(req.headers?.authorization || '')
  return raw.startsWith('Bearer ') ? raw.slice(7).trim() : ''
}

function roleInstructions(role: 'client' | 'provider', context: string) {
  const audience = role === 'client'
    ? 'Estás hablando con un cliente que necesita resolver un servicio.'
    : 'Estás hablando con un proveedor que recibe y ejecuta misiones.'

  return [
    'Sos Hugo, el agente de voz de U.G.O., una plataforma de servicios.',
    'Hablá en español rioplatense natural, cálido y directo, usando voseo.',
    'Respondé normalmente en una o dos frases; ampliá solo cuando sea necesario.',
    'Escuchá activamente y permití que el usuario te interrumpa sin insistir en terminar tu frase.',
    audience,
    'No inventes estados, precios, personas, pagos ni acciones. Usá únicamente el contexto recibido.',
    'Esta sesión de voz no ejecuta operaciones por sí sola: cuando el usuario quiera aceptar, cancelar, aprobar, pagar o cambiar un estado, explicale cuál botón de la interfaz debe usar.',
    context ? `CONTEXTO ACTUAL DE U.G.O.: ${context}` : '',
  ].filter(Boolean).join('\n')
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const accessToken = getBearer(req)
    if (!accessToken) return res.status(401).json({ error: 'Sesión requerida' })

    const { data, error } = await supabase.auth.getUser(accessToken)
    if (error || !data.user) return res.status(401).json({ error: 'Sesión inválida' })

    const openaiKey = process.env.OPENAI_API_KEY?.trim()
    if (!openaiKey) return res.status(503).json({ error: 'OPENAI_API_KEY no configurada en el servidor' })

    const requestedRole = req.body?.role === 'provider' ? 'provider' : 'client'
    const expectedDbRole = requestedRole === 'provider' ? 'proveedor' : 'cliente'
    const { data: profile } = await supabase
      .from('usuarios')
      .select('tipo,nombre')
      .eq('id', data.user.id)
      .maybeSingle()

    if (!profile || profile.tipo !== expectedDbRole) {
      return res.status(403).json({ error: 'El rol de la sesión no coincide con esta aplicación' })
    }

    const context = String(req.body?.context || '').slice(0, 4000)
    const safetyId = createHash('sha256').update(`ugo:${data.user.id}`).digest('hex')
    const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1'
    const voice = process.env.OPENAI_REALTIME_VOICE || 'marin'

    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Safety-Identifier': safetyId,
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model,
          output_modalities: ['audio'],
          instructions: roleInstructions(requestedRole, context),
          audio: {
            input: {
              turn_detection: {
                type: 'semantic_vad',
                eagerness: 'auto',
                create_response: true,
                interrupt_response: true,
              },
            },
            output: { voice },
          },
        },
      }),
    })

    const payload: any = await response.json().catch(() => ({}))
    if (!response.ok || !payload?.value) {
      console.error('OpenAI realtime client secret failed', response.status, payload?.error?.message || payload)
      return res.status(502).json({ error: payload?.error?.message || 'No se pudo iniciar la voz de Hugo' })
    }

    return res.status(200).json({
      value: payload.value,
      expires_at: payload.expires_at || null,
      model,
      voice,
    })
  } catch (error: any) {
    console.error('realtime-token:', error)
    return res.status(500).json({ error: error?.message || 'Error interno' })
  }
}
