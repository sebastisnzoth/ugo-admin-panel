// UGO TEST runtimes share one Supabase project from a shared GitHub runner IP. Under bursty
// concurrency GoTrue/PostgREST answer 429/502/503/504 or drop the connection. Those responses are
// infrastructure noise, not a product failure: retrying them is legitimate. Permanent errors
// (401/403/404/422, constraint violations, invalid credentials) are never retried.

export function transientInfrastructureError(error) {
  if (!error) return false
  const message = String(error.message || '')
  const code = String(error.code || error.status || error.statusCode || '')
  if (/PGRST|57014|statement timeout|JWT expired|invalid_credentials|already registered|already exists/i.test(`${code} ${message}`)) {
    return /57014|statement timeout|timeout|timed out|fetch|network|abort|connection|gateway|rate.?limit/i.test(`${code} ${message}`)
  }
  return /429|502|503|504|gateway|timeout|timed out|rate.?limit|over_request_rate_limit|fetch failed|network|ECONN|ETIMEDOUT|EAI_AGAIN|socket hang up/i.test(`${code} ${message}`)
}

export async function withTransientRetry(operation, { label = 'ugo-test', attempts = 6, baseDelayMs = 2000 } = {}) {
  let lastError = null
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const result = await operation()
      if (result && typeof result === 'object' && 'error' in result && result.error) throw result.error
      return result
    } catch (error) {
      lastError = error
      if (!transientInfrastructureError(error)) throw error
      if (attempt === attempts - 1) break
      const delay = baseDelayMs * (attempt + 1)
      console.log(
        `::warning title=${label.toUpperCase()}_TRANSIENT_RETRY::` +
          JSON.stringify({ attempt: attempt + 1, delay, code: String(error?.code || error?.status || ''), message: String(error?.message || '').slice(0, 200) })
            .replaceAll('%', '%25')
            .replaceAll('\n', '%0A'),
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  console.log(
    `::error title=${label.toUpperCase()}_TRANSIENT_EXHAUSTED::` +
      JSON.stringify({ attempts, code: String(lastError?.code || lastError?.status || ''), message: String(lastError?.message || '').slice(0, 300) })
        .replaceAll('%', '%25')
        .replaceAll('\n', '%0A'),
  )
  throw lastError
}

// `supabase.auth.admin.createUser` is not idempotent: a gateway timeout can happen after the user
// was actually created. After a transient failure, look the account up by email before retrying so
// the run never creates a duplicate or fails on "already registered".
export async function createTestUser(admin, payload, { label = 'ugo-test-create-user' } = {}) {
  const email = payload?.email
  try {
    return await withTransientRetry(() => admin.auth.admin.createUser(payload), { label })
  } catch (error) {
    if (!email || !/already registered|already exists|email_exists/i.test(String(error?.message || ''))) throw error
    const found = await withTransientRetry(() => admin.auth.admin.listUsers({ page: 1, perPage: 200 }), { label })
    const user = (found?.data?.users || []).find((item) => String(item.email || '').toLowerCase() === String(email).toLowerCase())
    if (!user) throw error
    return { data: { user }, error: null }
  }
}
