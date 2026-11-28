// Sonda ejecutable para probar el cliente TS de la consola sin bundler.
// Se lanza con `node --experimental-strip-types` desde tests/hive/console-client.test.mjs.
// Nunca se ejecuta en la app: sólo comprueba comportamiento del cliente HTTP.
import { createServer } from 'node:http'
import { parseHiveSnapshot, loadHiveSnapshot } from '../../../src/mvp/hiveConsoleApi.ts'

const results = []
const check = (name, condition, detail = null) => results.push({ name, ok: Boolean(condition), detail })

const valid = {
  environment: 'TEST',
  read_only: true,
  source: 'hive_reader',
  schema_version: '2.2.0',
  generated_at: '2026-11-28T00:00:00.000Z',
  queue: { queued: 2, leased: 0, succeeded: 5, failed: 1, cancelled: 0, stale_leases: 0, effects_applied: 5 },
  census: { total: 127, operative: 1, connected: 0, registered: 123, disabled: 3, max_operative_agents: 1 },
  emergency: { stop: false, code: null },
  quotas: {
    openrouter: { provider: 'openrouter', calls: 0, tokens: 0, percent_used: 0, level: 'NORMAL', allow_new_secondary_tasks: true, monthly_quota: 'UNKNOWN' },
    openclaw: { provider: 'openclaw', calls: 0, tokens: 0, percent_used: 0, level: 'NORMAL', allow_new_secondary_tasks: true, monthly_quota: 'UNKNOWN' },
  },
  departments: [
    { id: 1, key: 'executive', name: 'Dirección ejecutiva', agents_total: 6, operative: 1, connected: 0, registered: 5, disabled: 0 },
    { id: 2, key: 'operations', name: 'Operaciones', agents_total: 11, operative: 0, connected: 0, registered: 11, disabled: 0 },
  ],
  agents_unassigned: 110,
  circuits: [],
  recent_events: [],
}

check('parse válido', parseHiveSnapshot(valid)?.queue.queued === 2)
check('rechaza entorno distinto', parseHiveSnapshot({ ...valid, environment: 'PROD' }) === null)
check('rechaza read_only ausente', parseHiveSnapshot({ ...valid, read_only: false }) === null)
check('rechaza origen distinto', parseHiveSnapshot({ ...valid, source: 'supabase' }) === null)
check('rechaza contadores no numéricos', parseHiveSnapshot({ ...valid, queue: { ...valid.queue, queued: '2' } }) === null)
check('rechaza censo incompleto', parseHiveSnapshot({ ...valid, census: { total: 127 } }) === null)
check('rechaza emergencia no booleana', parseHiveSnapshot({ ...valid, emergency: { stop: 'no' } }) === null)
check('no inventa cuota mensual', parseHiveSnapshot({ ...valid, quotas: { ...valid.quotas, openrouter: { ...valid.quotas.openrouter, monthly_quota: undefined } } })?.quotas.openrouter.monthly_quota === 'UNKNOWN')
check('descarta campos desconocidos', !('secret' in (parseHiveSnapshot({ ...valid, secret: 'x' }) ?? {})))
check('lee departamentos con sus estados', parseHiveSnapshot(valid)?.departments?.[1]?.registered === 11)
check('declara agentes sin departamento', parseHiveSnapshot(valid)?.agents_unassigned === 110)
check('sin departamentos no inventa filas', (parseHiveSnapshot({ ...valid, departments: undefined })?.departments.length ?? -1) === 0)

let receivedAuth = null
const server = createServer((req, res) => {
  receivedAuth = req.headers.authorization ?? null
  const send = (status, body) => res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body))
  if (req.url === '/bad') return send(200, { ...valid, queue: {} })
  if (req.url === '/unauthorized') return send(401, { code: 'AUTH_REQUIRED' })
  if (req.url === '/forbidden') return send(403, { code: 'SUPERADMIN_REQUIRED' })
  return send(200, valid)
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`

const codeOf = async promise => {
  try { await promise; return 'OK' } catch (error) { return error?.code ?? 'UNKNOWN' }
}

const snapshot = await loadHiveSnapshot({ endpoint: base, token: 'token-de-prueba-0123456789' })
check('lee instantánea real', snapshot.queue.succeeded === 5)
check('manda bearer sin exponerlo', receivedAuth === 'Bearer token-de-prueba-0123456789')
check('sin endpoint no llama a nadie', await codeOf(loadHiveSnapshot({ endpoint: '', token: 'x'.repeat(24) })) === 'NOT_CONFIGURED')
check('401 → AUTH_REQUIRED', await codeOf(loadHiveSnapshot({ endpoint: `${base}/unauthorized`.replace('/unauthorized', ''), token: 'x'.repeat(24), fetchImpl: async () => new Response('{}', { status: 401 }) })) === 'AUTH_REQUIRED')
check('403 → FORBIDDEN', await codeOf(loadHiveSnapshot({ endpoint: base, token: 'x'.repeat(24), fetchImpl: async () => new Response('{}', { status: 403 }) })) === 'FORBIDDEN')
check('payload inválido → INVALID', await codeOf(loadHiveSnapshot({ endpoint: base, token: 'x'.repeat(24), fetchImpl: async () => new Response(JSON.stringify({ ...valid, queue: {} }), { status: 200 }) })) === 'INVALID')
check('red caída → UNAVAILABLE', await codeOf(loadHiveSnapshot({ endpoint: base, token: 'x'.repeat(24), fetchImpl: async () => { throw new TypeError('network') } })) === 'UNAVAILABLE')

await new Promise(resolve => server.close(resolve))
process.stdout.write(`${JSON.stringify({ results })}\n`)
