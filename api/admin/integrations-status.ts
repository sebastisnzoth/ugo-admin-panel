import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

type Integration = {
  id: string
  label: string
  category: 'core'|'payments'|'ai'|'messaging'|'maps'|'deploy'
  configured: boolean
  enabled: boolean
  environment: string
  runtimeSource: string
  note: string
}

function bearer(req: VercelRequest) {
  const raw = String(req.headers.authorization || '')
  return raw.startsWith('Bearer ') ? raw.slice(7).trim() : ''
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'Backend Supabase no configurado.' })

  const token = bearer(req)
  if (!token) return res.status(401).json({ error: 'Sesión Admin requerida.' })

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: authData, error: authError } = await sb.auth.getUser(token)
  const user = authData.user
  if (authError || !user) return res.status(401).json({ error: 'Sesión inválida o vencida.' })

  const { data: profile, error: profileError } = await sb.from('usuarios').select('tipo,activo').eq('id', user.id).maybeSingle()
  if (profileError || !profile?.activo || !['admin','superadmin'].includes(String(profile.tipo))) return res.status(403).json({ error: 'Acceso Admin requerido.' })

  const openPixConfigured = Boolean(process.env.OPENPIX_SANDBOX_APP_ID)
  const openPixEnabled = process.env.PAYMENTS_OPENPIX_ENABLED === 'true' && openPixConfigured
  const mpBrConfigured = Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN)
  const pixDirectConfigured = Boolean(process.env.UGO_PIX_KEY)
  const whatsappConfigured = Boolean((process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_ACCESS_TOKEN) && (process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WHATSAPP_PHONE_NUMBER_ID))
  const openAiConfigured = Boolean(process.env.OPENAI_API_KEY)
  const argentinaFlag = process.env.PAYMENTS_ARGENTINA_ENABLED === 'true'

  const integrations: Integration[] = [
    { id:'supabase', label:'Supabase', category:'core', configured:true, enabled:true, environment:'production', runtimeSource:'server env', note:'Auth, PostgreSQL, Realtime y Storage del proyecto UGO.' },
    { id:'mercadopago_br', label:'Mercado Pago Brasil', category:'payments', configured:mpBrConfigured, enabled:mpBrConfigured, environment:'production', runtimeSource:'MERCADO_PAGO_ACCESS_TOKEN', note:'Runtime actual de Pix y checkout electrónico BR.' },
    { id:'pix_direto', label:'Pix direto UGO', category:'payments', configured:pixDirectConfigured, enabled:pixDirectConfigured, environment:'production', runtimeSource:'UGO_PIX_KEY', note:'Generación EMV propia; requiere conciliación antes de considerar pago protegido.' },
    { id:'openpix', label:'OpenPix / Woovi', category:'payments', configured:openPixConfigured, enabled:openPixEnabled, environment:'sandbox', runtimeSource:'OPENPIX_SANDBOX_APP_ID + PAYMENTS_OPENPIX_ENABLED', note:'Sandbox solamente; el webhook no libera fondos reales.' },
    { id:'mercadopago_ar', label:'Mercado Pago Argentina', category:'payments', configured:false, enabled:false, environment:'disabled', runtimeSource:'router', note: argentinaFlag ? 'Feature flag solicitado, pero el router todavía bloquea Argentina.' : 'Declarado pero no activado en esta fase.' },
    { id:'openai_hugo', label:'OpenAI · Hugo Voice', category:'ai', configured:openAiConfigured, enabled:openAiConfigured, environment:process.env.VERCEL_ENV || 'server', runtimeSource:'OPENAI_API_KEY', note:`Modelo: ${process.env.OPENAI_REALTIME_MODEL || 'default del servidor'}.` },
    { id:'whatsapp', label:'WhatsApp Cloud API', category:'messaging', configured:whatsappConfigured, enabled:whatsappConfigured, environment:'production', runtimeSource:'WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID', note:'Bandeja Admin y envío server-side. Gemini es apoyo opcional para extracción.' },
    { id:'maps', label:'Mapas y rutas', category:'maps', configured:true, enabled:true, environment:'client', runtimeSource:'OpenStreetMap + MapLibre; routing configurable', note:'Mapa base no requiere clave. Routing usa VITE_ROUTING_ENGINE (haversine por defecto / OSRM opcional).' },
    { id:'vercel', label:'Vercel', category:'deploy', configured:Boolean(process.env.VERCEL), enabled:Boolean(process.env.VERCEL), environment:process.env.VERCEL_ENV || 'unknown', runtimeSource:'Vercel runtime', note:`Commit runtime: ${(process.env.VERCEL_GIT_COMMIT_SHA || 'desconocido').slice(0,8)}.` },
  ]

  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    deployment: { environment: process.env.VERCEL_ENV || 'unknown', commit: process.env.VERCEL_GIT_COMMIT_SHA || null },
    integrations,
    warning: 'Configurado indica presencia de configuración en el runtime actual; no equivale a transacción E2E validada.'
  })
}
