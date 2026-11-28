import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createHiveConsoleApi, ALLOWED_ORIGINS, supabaseVerifier, AUTH_MODES } from '../../hive/console-api/server.mjs'
import { normalizeSnapshot, SnapshotError } from '../../hive/console-api/snapshot.mjs'

const VALID = {
  schema_version: '2.2.0',
  queue: { queued: 1, leased: 0, succeeded: 3, failed: 0, cancelled: 0, stale_leases: 0, effects_applied: 3 },
  census: { total: 127, operative: 0, connected: 0, registered: 124, disabled: 3, max_operative_agents: 1 },
  emergency_stop: false,
  emergency_code: null,
  quotas: {
    openrouter: { provider: 'openrouter', calls: 0, tokens: 0, percent_used: 0, level: 'NORMAL', allow_new_secondary_tasks: true, monthly_quota: 'UNKNOWN' },
    openclaw: { provider: 'openclaw', calls: 0, tokens: 0, percent_used: 0, level: 'NORMAL', allow_new_secondary_tasks: true, monthly_quota: 'UNKNOWN' },
  },
  circuits: [],
  recent_events: [],
  generated_at: '2026-11-28T00:00:00.000Z',
}

const readerOf = snapshot => ({ readSnapshot: () => snapshot })

async function withServer(handler, run) {
  const server = createServer((req, res) => handler(req, res))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    await run(base)
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
}

const token = 'Bearer test-token-with-enough-characters'
const superadmin = async () => ({ userId: 'u-1', superadmin: true, active: true })

test('la API exige autenticación y no responde datos sin ella', async () => {
  const handler = createHiveConsoleApi({ reader: readerOf(normalizeSnapshot(VALID)), verifyToken: superadmin })
  await withServer(handler, async base => {
    const noToken = await fetch(`${base}/api/hive/snapshot`)
    assert.equal(noToken.status, 401)
    assert.deepEqual(await noToken.json(), { code: 'AUTH_REQUIRED' })

    const shortToken = await fetch(`${base}/api/hive/snapshot`, { headers: { authorization: 'Bearer abc' } })
    assert.equal(shortToken.status, 401)

    const ok = await fetch(`${base}/api/hive/snapshot`, { headers: { authorization: token } })
    assert.equal(ok.status, 200)
    const body = await ok.json()
    assert.equal(body.read_only, true)
    assert.equal(body.source, 'hive_reader')
    assert.equal(body.environment, 'TEST')
    assert.equal(body.queue.queued, 1)
    assert.equal(ok.headers.get('cache-control'), 'no-store')
  })
})

test('sólo un superadmin activo obtiene la instantánea', async () => {
  let current = { userId: 'u-1', superadmin: false, active: true }
  const handler = createHiveConsoleApi({ reader: readerOf(normalizeSnapshot(VALID)), verifyToken: async () => current })
  await withServer(handler, async base => {
    const notSuper = await fetch(`${base}/api/hive/snapshot`, { headers: { authorization: token } })
    assert.equal(notSuper.status, 403)
    assert.equal((await notSuper.json()).code, 'SUPERADMIN_REQUIRED')

    current = { userId: 'u-1', superadmin: true, active: false }
    const inactive = await fetch(`${base}/api/hive/snapshot`, { headers: { authorization: token } })
    assert.equal(inactive.status, 403)
    assert.equal((await inactive.json()).code, 'USER_INACTIVE')

    current = { userId: null, superadmin: false, active: false }
    const invalid = await fetch(`${base}/api/hive/snapshot`, { headers: { authorization: token } })
    assert.equal(invalid.status, 401)
  })
})

test('un fallo del verificador es 503, nunca "sin permiso" ni "sin datos"', async () => {
  const handler = createHiveConsoleApi({
    reader: readerOf(normalizeSnapshot(VALID)),
    verifyToken: async () => { throw new Error('supabase caído') },
  })
  await withServer(handler, async base => {
    const response = await fetch(`${base}/api/hive/snapshot`, { headers: { authorization: token } })
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { code: 'AUTH_UNAVAILABLE' })
  })
})

test('métodos, query strings, orígenes y rutas quedan acotados', async () => {
  const handler = createHiveConsoleApi({ reader: readerOf(normalizeSnapshot(VALID)), verifyToken: superadmin })
  await withServer(handler, async base => {
    assert.equal((await fetch(`${base}/api/hive/snapshot?limit=1000`, { headers: { authorization: token } })).status, 400)
    assert.equal((await fetch(`${base}/api/hive/snapshot`, { method: 'POST', headers: { authorization: token } })).status, 405)
    assert.equal((await fetch(`${base}/api/otra-cosa`, { headers: { authorization: token } })).status, 404)
    const evil = await fetch(`${base}/api/hive/snapshot`, { headers: { authorization: token, origin: 'https://evil.example' } })
    assert.equal(evil.status, 403)
    assert.equal((await evil.json()).code, 'ORIGIN_DENIED')
    assert.equal(evil.headers.get('access-control-allow-origin'), null)
    const health = await fetch(`${base}/healthz`)
    assert.equal(health.status, 200)
    assert.deepEqual(await health.json(), { ok: true, service: 'ugo-hive-console-api', environment: 'TEST' })
    const allowed = await fetch(`${base}/api/hive/snapshot`, { headers: { authorization: token, origin: [...ALLOWED_ORIGINS][0] } })
    assert.equal(allowed.status, 200)
    assert.equal(allowed.headers.get('access-control-allow-origin'), [...ALLOWED_ORIGINS][0])
  })
})

test('lectura fallida no filtra el error de la base (podría traer la cadena de conexión)', async () => {
  const handler = createHiveConsoleApi({
    reader: { readSnapshot: () => { throw new Error('connection to postgresql://u:p@h/db failed') } },
    verifyToken: superadmin,
  })
  await withServer(handler, async base => {
    const response = await fetch(`${base}/api/hive/snapshot`, { headers: { authorization: token } })
    const text = await response.text()
    assert.equal(response.status, 503)
    assert.equal(text.includes('postgresql://'), false)
    assert.deepEqual(JSON.parse(text), { code: 'HIVE_READ_FAILED' })
  })
})

test('límite de peticiones por usuario', async () => {
  const handler = createHiveConsoleApi({
    reader: readerOf(normalizeSnapshot(VALID)),
    verifyToken: async () => ({ userId: 'u-rate', superadmin: true, active: true }),
    limits: { perMinute: 3 },
  })
  await withServer(handler, async base => {
    const codes = []
    for (let i = 0; i < 4; i++) {
      const response = await fetch(`${base}/api/hive/snapshot`, { headers: { authorization: token } })
      codes.push(response.status)
    }
    assert.deepEqual(codes, [200, 200, 200, 429])
  })
})

// ── Verificador: sin credenciales privilegiadas por defecto ────────────────────
const authUser = { id: 'u-abc', banned_until: null }
const profileRow = { tipo: 'superadmin', activo: true }

function recorder(handler) {
  const calls = []
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), headers: init.headers ?? {} })
    return handler(String(url), init)
  }
  return { calls, fetchImpl }
}

test('verificador: el modo por defecto confirma identidad con la clave pública', async () => {
  const { calls, fetchImpl } = recorder(url => {
    if (url.endsWith('/auth/v1/user')) return new Response(JSON.stringify(authUser), { status: 200 })
    return new Response(JSON.stringify([profileRow]), { status: 200 })
  })
  const verify = supabaseVerifier({ url: 'https://x.supabase.co', anonKey: 'anon-publica', fetchImpl })
  const identity = await verify('jwt-del-usuario')
  assert.deepEqual(identity, { userId: 'u-abc', superadmin: true, active: true })
  assert.equal(calls.length, 2)
  for (const call of calls) {
    assert.equal(call.headers.apikey, 'anon-publica')
    assert.match(call.headers.authorization, /^Bearer (jwt-del-usuario|anon-publica)$/)
  }
  assert.equal(calls[1].headers.authorization, 'Bearer jwt-del-usuario')
  assert.equal(JSON.stringify(calls).includes('service'), false)
})

test('verificador: modo allowlist no consulta ninguna tabla', async () => {
  const { calls, fetchImpl } = recorder(url => {
    if (url.endsWith('/auth/v1/user')) return new Response(JSON.stringify(authUser), { status: 200 })
    throw new Error('no debería consultar el perfil')
  })
  const verify = supabaseVerifier({ mode: 'allowlist', url: 'https://x.supabase.co', anonKey: 'anon-publica',
    superadminIds: ['U-ABC'], fetchImpl })
  assert.deepEqual(await verify('jwt'), { userId: 'u-abc', superadmin: true, active: true })
  assert.equal(calls.length, 1)

  const outsider = supabaseVerifier({ mode: 'allowlist', url: 'https://x.supabase.co', anonKey: 'anon-publica',
    superadminIds: ['otro-id'], fetchImpl })
  assert.equal((await outsider('jwt')).superadmin, false)
})

test('verificador: el modo service exige clave y sólo entonces la usa', async () => {
  assert.throws(() => supabaseVerifier({ mode: 'service', url: 'https://x.supabase.co', anonKey: 'a' }),
    /SERVICE_KEY_REQUIRED_FOR_SERVICE_MODE/)
  assert.throws(() => supabaseVerifier({ mode: 'otro', url: 'https://x.supabase.co', anonKey: 'a' }), /AUTH_MODE_INVALID/)

  const { calls, fetchImpl } = recorder(url => {
    if (url.endsWith('/auth/v1/user')) return new Response(JSON.stringify(authUser), { status: 200 })
    return new Response(JSON.stringify([profileRow]), { status: 200 })
  })
  const verify = supabaseVerifier({ mode: 'service', url: 'https://x.supabase.co', anonKey: 'a', serviceKey: 'clave-servicio', fetchImpl })
  await verify('jwt')
  assert.equal(calls[1].headers.apikey, 'clave-servicio')
  assert.deepEqual(AUTH_MODES, ['user', 'allowlist', 'service'])
})

test('verificador: si RLS impide leer el perfil, es 503 y no un "sin permiso" silencioso', async () => {
  const { fetchImpl } = recorder(url => {
    if (url.endsWith('/auth/v1/user')) return new Response(JSON.stringify(authUser), { status: 200 })
    return new Response('{}', { status: 403 })
  })
  const handler = createHiveConsoleApi({
    reader: readerOf(normalizeSnapshot(VALID)),
    verifyToken: supabaseVerifier({ url: 'https://x.supabase.co', anonKey: 'a', fetchImpl }),
  })
  await withServer(handler, async base => {
    const response = await fetch(`${base}/api/hive/snapshot`, { headers: { authorization: token } })
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { code: 'AUTH_UNAVAILABLE' })
  })
})

test('la instantánea sólo publica campos conocidos y declara la cuota mensual UNKNOWN', () => {
  const snapshot = normalizeSnapshot({ ...VALID, secret_field: 'no debe salir' })
  assert.equal('secret_field' in snapshot, false)
  assert.equal(snapshot.quotas.openrouter.monthly_quota, 'UNKNOWN')
  assert.equal(snapshot.emergency.stop, false)
})

test('una respuesta incompleta se rechaza en vez de rellenarse con ceros', () => {
  const { queue, ...withoutQueue } = VALID
  assert.throws(() => normalizeSnapshot(withoutQueue), SnapshotError)
  assert.throws(() => normalizeSnapshot({ ...VALID, queue: { ...queue, queued: '1' } }), SnapshotError)
  assert.throws(() => normalizeSnapshot({ ...VALID, census: { total: 1 } }), SnapshotError)
  assert.throws(() => normalizeSnapshot({ ...VALID, emergency_stop: 'false' }), SnapshotError)
  assert.throws(() => normalizeSnapshot(null), SnapshotError)
})
