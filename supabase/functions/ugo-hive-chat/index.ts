import { createClient } from 'npm:@supabase/supabase-js@2.108.1'

const projectRef = 'tmossnqfwfwjrtzwcbmm'
const allowedUrl = 'https://' + projectRef + '.supabase.co'
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const renderToken = Deno.env.get('HIVE_RENDER_TOKEN') || ''
const RENDER_API = 'https://ugo-hive-freeapi.onrender.com/api/agent/chat'

const response = (code: number, data: Record<string, unknown>) =>
  new Response(JSON.stringify(data), { status: code, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

function errorResponse(status: number, code: string, id: string) {
  return response(status, { ok: false, code, correlation_id: id })
}

async function authorize(req: Request) {
  if (supabaseUrl !== allowedUrl || !serviceKey) return null
  const auth = req.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  if (!token || token.length > 4096) return null
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return null
  const { data: profile, error: pError } = await admin.from('usuarios')
    .select('tipo,activo').eq('id', data.user.id).maybeSingle()
  if (pError || profile?.activo !== true || String(profile.tipo).toLowerCase() !== 'superadmin') return null
  return data.user.id as string
}

const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

Deno.serve(async (req: Request) => {
  const id = crypto.randomUUID()
  if (req.method === 'OPTIONS') {
    if (!allowedUrl.includes(req.headers.get('origin') || '')) return errorResponse(403, 'ORIGIN_DENIED', id)
    return new Response(null, { status: 204, headers: {
      ...cors(req),
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'authorization, apikey, x-client-info, content-type',
      'access-control-max-age': '300'
    } })
  }
  if (req.method !== 'GET' && req.method !== 'POST') return errorResponse(405, 'METHOD_NOT_ALLOWED', id)
  if (req.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
    return errorResponse(415, 'JSON_REQUIRED', id)

  let userId: string | null
  try { userId = await authorize(req) } catch { return errorResponse(503, 'AUTH_UNAVAILABLE', id) }
  if (!userId) return errorResponse(403, 'SUPERADMIN_REQUIRED', id)

  if (req.method === 'POST') {
    let payload: Record<string, unknown>
    try {
      const raw = new TextDecoder().decode(await readBounded(req, 8192))
      const parsed = JSON.parse(raw)
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JSON_OBJECT_REQUIRED')
      payload = parsed
    } catch (error) {
      if (error instanceof Error && error.message === 'TOO_LARGE') return errorResponse(413, 'PAYLOAD_TOO_LARGE', id)
      return errorResponse(400, 'INVALID_JSON', id)
    }

    if (!payload.message || typeof payload.message !== 'string') {
      return errorResponse(400, 'MESSAGE_REQUIRED', id)
    }

    // Store the message in the service_messages table
    const { error: insertError } = await admin.from('mensajes_servicio').insert({
      servicio_id: 'hive-admin-panel',
      autor_id: userId,
      mensaje: payload.message,
      created_at: new Date().toISOString()
    })

    if (insertError) return errorResponse(503, 'DB_INSERT_FAILED', id)

    // Dispatch to Render agent service
    let agentResponse: string
    let renderCorrelationId = ''
    
    if (renderToken) {
      try {
        const renderResp = await fetch(RENDER_API, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${renderToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Correlation-ID': id
          },
          body: JSON.stringify({ message: payload.message }),
          signal: AbortSignal.timeout(30000)
        })
        
        const renderData = await renderResp.json().catch(() => ({}))
        
        if (renderResp.ok && renderData.reply) {
          agentResponse = renderData.reply
          renderCorrelationId = renderData.correlation_id || ''
        } else if (renderResp.status === 401) {
          agentResponse = 'Render agent auth failed - check HIVE_RENDER_TOKEN'
        } else {
          agentResponse = `Agent response failed: ${renderResp.status} ${JSON.stringify(renderData)}`
        }
      } catch (error) {
        agentResponse = `Agent dispatch error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    } else {
      agentResponse = 'HIVE_RENDER_TOKEN not configured - agent dispatch skipped'
    }

    // Store agent response
    await admin.from('mensajes_servicio').insert({
      servicio_id: 'hive-admin-panel',
      autor_id: 'agent',
      mensaje: agentResponse,
      created_at: new Date().toISOString()
    })

    return response(200, {
      ok: true,
      correlation_id: id,
      render_correlation_id: renderCorrelationId,
      role: 'superadmin',
      text: payload.message,
      response: agentResponse,
      stored: true
    })
  }

  if (req.method === 'GET') {
    const { data, error } = await admin.from('mensajes_servicio')
      .select('*')
      .eq('servicio_id', 'hive-admin-panel')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return errorResponse(503, 'DB_QUERY_FAILED', id)

    return response(200, {
      ok: true,
      correlation_id: id,
      responses: data || []
    })
  }

  return errorResponse(405, 'METHOD_NOT_ALLOWED', id)
})

function cors(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigins = new Set(['https://sebastisnqfwfwjrtzwcbmm.supabase.co', 'http://localhost:5173', 'http://localhost:5174'])
  return allowedOrigins.has(origin) ? { 'access-control-allow-origin': origin, 'vary': 'Origin' } : {}
}

async function readBounded(req: Request, limit: number) {
  if (Number(req.headers.get('content-length')) > limit) throw new Error('TOO_LARGE')
  const reader = req.body?.getReader()
  if (!reader) return new Uint8Array()
  const parts: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) throw new Error('TOO_LARGE')
      parts.push(value)
    }
  } finally {
    await reader.cancel()
  }
  const result = new Uint8Array(size)
  let offset = 0
  for (const p of parts) {
    result.set(p, offset)
    offset += p.byteLength
  }
  return result
}