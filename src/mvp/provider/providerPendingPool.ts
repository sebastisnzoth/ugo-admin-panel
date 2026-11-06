// The pending-request pool depends on RPCs shipped by migration
// 20261105130000_provider_pending_request_pool.sql. The frontend can be deployed
// before that migration is applied to the connected Supabase project. In that case
// PostgREST answers HTTP 404 / PGRST202 ("Could not find the function ... in the
// schema cache") and Postgres may report 42883 (undefined_function). That means
// "feature not deployed yet", not an operational failure, so the pool must stay
// hidden instead of showing an error to every provider.
// Timeouts, permission errors and 5xx responses are real errors and still surface.
export function isMissingPendingPoolRpc(error: unknown, status?: number): boolean {
  if (status === 404) return true
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown }
  const code = String(e.code ?? '')
  if (code === 'PGRST202' || code === '42883') return true
  const text = [e.message, e.details, e.hint].map(value => String(value ?? '')).join(' ')
  return /could not find the function|function [\w.]+\([^)]*\) does not exist/i.test(text)
}
