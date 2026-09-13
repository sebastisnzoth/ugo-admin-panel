import adminIntegrationsStatus from '../../api/admin/integrations-status.ts'
import cascade from '../../api/cascade.js'
import hugoChat from '../../api/hugo/chat.ts'
import operations from '../../api/operations.ts'
import paymentExpansionAdjustment from '../../api/pagos/ajuste-ampliacion.ts'
import paymentCreate from '../../api/pagos/crear.ts'
import paymentWebhook from '../../api/pagos/webhook.ts'
import proxy from '../../api/proxy.js'
import withdrawalRequest from '../../api/retiros/solicitar.ts'
import scoutPlaces from '../../api/scout/places.js'
import testApi from '../../api/test.ts'
import whatsappSend from '../../api/whatsapp/send.js'

type LegacyHandler = (req: any, res: any) => unknown | Promise<unknown>

const routes: Record<string, LegacyHandler> = {
  '/api/admin/integrations-status': adminIntegrationsStatus,
  '/api/cascade': cascade,
  '/api/hugo/chat': hugoChat,
  '/api/operations': operations,
  '/api/pagos/ajuste-ampliacion': paymentExpansionAdjustment,
  '/api/pagos/crear': paymentCreate,
  '/api/pagos/webhook': paymentWebhook,
  '/api/proxy': proxy,
  '/api/retiros/solicitar': withdrawalRequest,
  '/api/scout/places': scoutPlaces,
  '/api/test': testApi,
  '/api/whatsapp/send': whatsappSend,
}

function buildQuery(url: URL) {
  const query: Record<string, string | string[]> = {}
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key)
    query[key] = values.length > 1 ? values : values[0] ?? ''
  }
  return query
}

async function parseBody(request: Request) {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined
  const text = await request.text()
  if (!text) return {}
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try { return JSON.parse(text) } catch { return {} }
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(text))
  }
  return text
}

function requestHeaders(headers: Headers) {
  const out: Record<string, string> = {}
  headers.forEach((value, key) => { out[key.toLowerCase()] = value })
  return out
}

function responseAdapter() {
  let statusCode = 200
  let body: BodyInit | null = null
  let finished = false
  const headers = new Headers()

  const res: any = {
    get statusCode() { return statusCode },
    set statusCode(value: number) { statusCode = Number(value) || 200 },
    status(code: number) { statusCode = code; return res },
    setHeader(name: string, value: string | number | readonly string[]) {
      if (Array.isArray(value)) {
        headers.delete(name)
        value.forEach((item) => headers.append(name, String(item)))
      } else {
        headers.set(name, String(value))
      }
      return res
    },
    getHeader(name: string) { return headers.get(name) },
    removeHeader(name: string) { headers.delete(name); return res },
    json(payload: unknown) {
      if (!headers.has('content-type')) headers.set('content-type', 'application/json; charset=utf-8')
      body = JSON.stringify(payload)
      finished = true
      return res
    },
    send(payload: unknown) {
      if (payload == null) body = null
      else if (typeof payload === 'string' || payload instanceof Uint8Array) body = payload as BodyInit
      else {
        if (!headers.has('content-type')) headers.set('content-type', 'application/json; charset=utf-8')
        body = JSON.stringify(payload)
      }
      finished = true
      return res
    },
    end(payload?: unknown) {
      if (payload != null) body = String(payload)
      finished = true
      return res
    },
    redirect(codeOrUrl: number | string, maybeUrl?: string) {
      const code = typeof codeOrUrl === 'number' ? codeOrUrl : 302
      const location = typeof codeOrUrl === 'string' ? codeOrUrl : String(maybeUrl || '/')
      statusCode = code
      headers.set('location', location)
      finished = true
      return res
    },
    writeHead(code: number, extraHeaders?: Record<string, string>) {
      statusCode = code
      if (extraHeaders) Object.entries(extraHeaders).forEach(([k, v]) => headers.set(k, String(v)))
      return res
    },
    write(chunk: unknown) {
      body = `${body == null ? '' : String(body)}${chunk == null ? '' : String(chunk)}`
      return true
    },
    get headersSent() { return finished },
  }

  return {
    res,
    toResponse() { return new Response(body, { status: statusCode, headers }) },
  }
}

export default async (request: Request) => {
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/$/, '') || '/'
  const handler = routes[pathname]
  if (!handler) {
    return Response.json({ error: 'API route not found', path: pathname }, { status: 404 })
  }

  const req = {
    method: request.method,
    url: `${url.pathname}${url.search}`,
    headers: requestHeaders(request.headers),
    query: buildQuery(url),
    body: await parseBody(request),
  }
  const { res, toResponse } = responseAdapter()

  try {
    await handler(req, res)
    return toResponse()
  } catch (error) {
    console.error('[netlify-api-adapter]', pathname, error)
    return Response.json(
      { error: 'Internal server error', path: pathname },
      { status: 500 },
    )
  }
}

export const config = {
  path: '/api/*',
}
