import { createClient, type AuthChangeEvent, type SupabaseClient } from '@supabase/supabase-js'
import { UGO_ENVIRONMENT, UGO_SUPABASE_PUBLISHABLE_KEY, UGO_SUPABASE_URL } from './supabaseProject'

// Opt-in only for an authorized, restricted preview. Default remains TEST.
// This never redirects the Admin client or server-side integrations.
const roleDatabaseTarget = import.meta.env.VITE_UGO_ROLE_DATABASE_TARGET === 'prod-preview' ? 'prod' : UGO_ENVIRONMENT
const roleSupabaseUrl = roleDatabaseTarget === 'prod'
  ? 'https://trfsjuseqjxlhrxuvdsm.supabase.co'
  : UGO_SUPABASE_URL
const roleSupabaseKey = roleDatabaseTarget === 'prod'
  ? 'sb_publishable_bbCcM7ElzH-iGAQw8Qefzg_ZmO0sKH8'
  : UGO_SUPABASE_PUBLISHABLE_KEY

export type UgoRole = 'client' | 'provider'

const clients = new Map<UgoRole, SupabaseClient>()

type DiagnosticOrigin = 'auth' | 'gps' | 'realtime' | 'availability'
type DiagnosticReason = 'auth_event' | 'token_refreshed' | 'signed_out_received' | 'session_restored' | 'session_check_failed' | 'login_no_session' | 'login_confirmed_signed_out' | 'profile_failed' | 'explicit_sign_out' | 'location_failed' | 'channel_failed' | 'channel_ready' | 'online_saved' | 'offline_saved' | 'availability_failed'
/** Only fixed categories are emitted: never sessions, tokens, user IDs or API error text. */
export const PROVIDER_AUTH_TRACE_KEY = 'ugo:provider:auth-trace:v1'
export function getProviderAuthTrace(): string {
  if (typeof window === 'undefined') return '[]'
  try { return window.localStorage.getItem(PROVIDER_AUTH_TRACE_KEY) || '[]' } catch { return '[]' }
}
export function recordSessionDiagnostic(role: UgoRole, origin: DiagnosticOrigin, reason: DiagnosticReason, event?: AuthChangeEvent) {
  if (typeof window === 'undefined') return
  const at = Date.now()
  if (role === 'provider') {
    // Store only allow-listed labels and timestamps, never credentials or user IDs.
    try {
      const existing = JSON.parse(getProviderAuthTrace())
      const list = Array.isArray(existing) ? existing : []
      list.push({at, origin, reason, event: event || null})
      window.localStorage.setItem(PROVIDER_AUTH_TRACE_KEY, JSON.stringify(list.slice(-40)))
    } catch { /* diagnostics must never interrupt auth */ }
  }
  window.dispatchEvent(new CustomEvent('ugo:session-diagnostic', {detail: {role, origin, reason, event, at}}))
}

export function getRoleSupabase(role: UgoRole): SupabaseClient {
  const existing = clients.get(role)
  if (existing) return existing

  const client = createClient(roleSupabaseUrl, roleSupabaseKey, {
    auth: {
      storageKey: `ugo-${roleDatabaseTarget}-${role}-auth`,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: { params: { eventsPerSecond: 10 } },
  })

  clients.set(role, client)
  return client
}
