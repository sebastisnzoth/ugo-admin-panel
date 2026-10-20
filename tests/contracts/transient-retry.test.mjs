import assert from 'node:assert/strict'
import {test} from 'node:test'
import {
  createUserWithRetry,
  fetchWithTransientRetry,
  isTransientSupabaseError,
  retryDelayMs,
  retrySupabaseResult,
  withTransientRetry,
} from '../../scripts/lib/transient-retry.mjs'

test('clasifica los fallos transitorios reales de CI UGO TEST', () => {
  const authRetryable = Object.assign(new Error('Gateway Timeout'), {
    name: 'AuthRetryableFetchError',
    status: 504,
  })
  assert.equal(isTransientSupabaseError(authRetryable), true)
  assert.equal(isTransientSupabaseError(new TypeError('fetch failed')), true)
  assert.equal(isTransientSupabaseError(Object.assign(new Error('connect ECONNRESET'), {code: 'ECONNRESET'})), true)
  assert.equal(
    isTransientSupabaseError(new Error('canceling statement due to statement timeout')),
    true,
  )
  assert.equal(
    isTransientSupabaseError(new Error('<!DOCTYPE html><title>supabase.co | 522: Connection timed out</title>')),
    true,
  )
  assert.equal(isTransientSupabaseError(Object.assign(new Error('HTTP 522'), {status: 522})), true)
  assert.equal(isTransientSupabaseError(Object.assign(new Error('Too Many Requests'), {status: 429})), true)
})

test('NO clasifica como transitorio un fallo de comportamiento bajo prueba', () => {
  assert.equal(isTransientSupabaseError(new Error('ADMIN_REALTIME_TIMEOUT expected 3 got 2')), false)
  assert.equal(isTransientSupabaseError(new Error('HUGO_PROVIDER_TOOL_RESPONSE_TIMEOUT:provider_set_online')), false)
  assert.equal(isTransientSupabaseError(new Error('PROFILE_PHOTO_CLEANUP_REQUIRED')), false)
  assert.equal(isTransientSupabaseError(new Error('permission denied for table servicios')), false)
  assert.equal(isTransientSupabaseError(new Error('JSON parse error: unexpected token < in JSON')), false)
  assert.equal(isTransientSupabaseError(null), false)
})

test('withTransientRetry reintenta sólo transitorios y respeta el intento final', async () => {
  const calls = []
  const delays = []
  const result = await withTransientRetry(
    async (attempt) => {
      calls.push(attempt)
      if (attempt < 3) throw new Error('fetch failed')
      return 'ok'
    },
    {attempts: 4, label: 'unit', sleep: async (ms) => delays.push(ms)},
  )
  assert.equal(result, 'ok')
  assert.deepEqual(calls, [1, 2, 3])
  assert.equal(delays.length, 2)
  assert.equal(delays[0], retryDelayMs(1))
  assert.ok(delays[1] > delays[0])
})

test('withTransientRetry propaga errores NO transitorios sin reintentar', async () => {
  let calls = 0
  await assert.rejects(
    () => withTransientRetry(
      async () => {
        calls += 1
        throw new Error('ADMIN_REALTIME_TIMEOUT expected 5 got 4')
      },
      {attempts: 4, sleep: async () => {}},
    ),
    /ADMIN_REALTIME_TIMEOUT/,
  )
  assert.equal(calls, 1)
})

test('withTransientRetry agota los intentos y lanza el último error transitorio', async () => {
  let calls = 0
  await assert.rejects(
    () => withTransientRetry(
      async () => {
        calls += 1
        throw Object.assign(new Error('Gateway Timeout'), {name: 'AuthRetryableFetchError', status: 504})
      },
      {attempts: 3, label: 'unit', sleep: async () => {}},
    ),
    /Gateway Timeout/,
  )
  assert.equal(calls, 3)
})

test('retrySupabaseResult reintenta error devuelto transitorio y conserva errores duros', async () => {
  let phase = 'transient'
  const retried = await retrySupabaseResult(
    async () => {
      if (phase === 'transient') {
        phase = 'hard'
        return {data: null, error: {message: 'canceling statement due to statement timeout', code: '57014'}}
      }
      return {data: 42, error: null}
    },
    {attempts: 3, label: 'unit', sleep: async () => {}},
  )
  assert.deepEqual(retried, {data: 42, error: null})

  const hard = await retrySupabaseResult(
    async () => ({data: null, error: {message: 'duplicate key value violates unique constraint', code: '23505'}}),
    {attempts: 3, sleep: async () => {}},
  )
  assert.equal(hard.error.message, 'duplicate key value violates unique constraint')
})

test('createUserWithRetry reaprovecha el usuario si el primer intento transitorio ya se aplicó', async () => {
  let calls = 0
  const authClient = {
    auth: {
      admin: {
        async createUser () {
          calls += 1
          if (calls === 1) throw Object.assign(new Error('Gateway Timeout'), {name: 'AuthRetryableFetchError', status: 504})
          return {data: null, error: {message: 'A user with this email address has already been registered'}}
        },
        async listUsers () {
          return {data: {users: [{id: 'existing-uid', email: 'fixture@example.test'}]}, error: null}
        },
      },
    },
  }
  const created = await createUserWithRetry(
    authClient,
    {email: 'fixture@example.test', password: 'x', email_confirm: true},
    {attempts: 3, sleep: async () => {}},
  )
  assert.equal(created.error, null)
  assert.equal(created.data.user.id, 'existing-uid')
  assert.equal(calls, 2)
})

test('createUserWithRetry devuelve intacto un error no transitorio', async () => {
  const authClient = {
    auth: {
      admin: {
        async createUser () {
          return {data: null, error: {message: 'Password should be at least 6 characters.', code: 'weak_password'}}
        },
      },
    },
  }
  const created = await createUserWithRetry(authClient, {email: 'a@b.test'}, {attempts: 3, sleep: async () => {}})
  assert.equal(created.error.message, 'Password should be at least 6 characters.')
})

test('fetchWithTransientRetry reintenta 522 y devuelve la respuesta final', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    if (calls < 3) return new Response('<!DOCTYPE html><title>supabase.co | 522</title>', {status: 522})
    return new Response('ok', {status: 200})
  }
  try {
    const response = await fetchWithTransientRetry(
      'https://example.test/public.png',
      undefined,
      {attempts: 3, sleep: async () => {}},
    )
    assert.equal(response.status, 200)
    assert.equal(calls, 3)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('fetchWithTransientRetry devuelve sin reintentar un 404 definitivo', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    return new Response('missing', {status: 404})
  }
  try {
    const response = await fetchWithTransientRetry(
      'https://example.test/missing.png',
      undefined,
      {attempts: 3, sleep: async () => {}},
    )
    assert.equal(response.status, 404)
    assert.equal(calls, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('retryDelayMs crece exponencialmente con tope', () => {
  assert.equal(retryDelayMs(1), 1500)
  assert.equal(retryDelayMs(2), 3000)
  assert.equal(retryDelayMs(3), 6000)
  assert.equal(retryDelayMs(10), 10000)
})
