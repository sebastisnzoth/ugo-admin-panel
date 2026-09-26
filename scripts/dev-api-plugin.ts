import type { Plugin, ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Dev-only bridge: mounts the repo's Vercel serverless functions (api/*)
// on the Vite dev server so /api/* works in local and preview development.
// configureServer never runs during production builds.

const REWRITES: Array<[RegExp, string]> = [
  [/^\/api\/admin\/create-user$/, '/api/proxy?admin_create_user=1'],
  [/^\/api\/hugo\/gemini$/, '/api/test'],
  [/^\/api\/pagos\/efectivo$/, '/api/operations?op=cash-select'],
  [/^\/api\/pagos\/confirmar-efectivo$/, '/api/operations?op=cash-confirm'],
  [/^\/api\/kyc\/verify$/, '/api/operations?op=kyc-verify'],
  [/^\/api\/calendar\/(.+)$/, '/api/test?ugo_calendar=$1'],
  [/^\/api\/disputes\/analyze$/, '/api/test?ugo_dispute_ai=1'],
  [/^\/api\/scout\/gmail$/, '/api/scout/places?ugo_scout_gmail=1'],
]

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return undefined
  if (!String(req.headers['content-type'] || '').includes('json')) return raw
  try { return JSON.parse(raw) } catch { return undefined }
}

function vercelRes(res: ServerResponse) {
  const shim = res as typeof res & {
    status: (code: number) => unknown
    json: (body: unknown) => unknown
    redirect: (codeOrUrl: number | string, maybeUrl?: string) => unknown
  }
  shim.status = (code) => { res.statusCode = code; return shim }
  shim.json = (body) => {
    if (!res.writableEnded) {
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.end(JSON.stringify(body))
    }
    return shim
  }
  shim.redirect = (codeOrUrl, maybeUrl) => {
    if (!res.writableEnded) {
      res.statusCode = typeof codeOrUrl === 'number' ? codeOrUrl : 302
      res.setHeader('location', typeof codeOrUrl === 'string' ? codeOrUrl : String(maybeUrl || '/'))
      res.end()
    }
    return shim
  }
  return shim
}

export function ugoDevApiPlugin(): Plugin {
  return {
    name: 'ugo-dev-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const incoming = new URL(req.url || '/', 'http://ugo.local')
        if (!incoming.pathname.startsWith('/api/')) return next()
        const search = incoming.searchParams
        let target = incoming.pathname
        for (const [pattern, replacement] of REWRITES) {
          if (pattern.test(target)) {
            const rewritten = new URL(target.replace(pattern, replacement), 'http://ugo.local')
            target = rewritten.pathname
            rewritten.searchParams.forEach((value, key) => { if (!search.has(key)) search.append(key, value) })
            break
          }
        }
        const moduleId = target.replace(/^\/api\//, '')
        if (!/^[\w/-]+$/.test(moduleId)) return next()
        const base = resolve(server.config.root, 'api', moduleId)
        const extension = existsSync(base + '.ts') ? '.ts' : existsSync(base + '.js') ? '.js' : ''
        if (!extension) return next()
        try {
          const mod = (await server.ssrLoadModule(`/api/${moduleId}${extension}`)) as { default?: (req: unknown, res: unknown) => Promise<void> | void }
          const handler = mod.default
          if (typeof handler !== 'function') return next()
          const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req)
          const query: Record<string, string> = {}
          search.forEach((value, key) => { query[key] = value })
          await handler({ method: req.method, headers: req.headers, query, body }, vercelRes(res))
          if (!res.writableEnded) res.end()
        } catch (error) {
          console.error(`[ugo-dev-api] ${req.method} ${incoming.pathname} failed`, error)
          if (!res.writableEnded) {
            res.statusCode = 500
            res.setHeader('content-type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'API local falló' }))
          }
        }
      })
    },
  }
}
