import { createClient, type AuthChangeEvent, type SupabaseClient } from '@supabase/supabase-js'
import { UGO_SUPABASE_PUBLISHABLE_KEY, UGO_SUPABASE_URL } from './supabaseProject'

export type UgoRole = 'client' | 'provider'

const clients = new Map<UgoRole, SupabaseClient>()

type DiagnosticOrigin = 'auth' | 'gps' | 'realtime' | 'availability'
type DiagnosticReason = 'auth_event' | 'token_refreshed' | 'signed_out_received' | 'session_restored' | 'session_check_failed' | 'login_no_session' | 'login_confirmed_signed_out' | 'profile_failed' | 'explicit_sign_out' | 'location_failed' | 'channel_failed' | 'channel_ready' | 'online_saved' | 'offline_saved' | 'availability_failed'
/** Only fixed categories are emitted: never sessions, tokens, user IDs or API error text. */
export function recordSessionDiagnostic(role: UgoRole, origin: DiagnosticOrigin, reason: DiagnosticReason, event?: AuthChangeEvent) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('ugo:session-diagnostic', {detail: {role, origin, reason, event, at: Date.now()}}))
}

export function getRoleSupabase(role: UgoRole): SupabaseClient {
  const existing = clients.get(role)
  if (existing) return existing

  const client = createClient(UGO_SUPABASE_URL, UGO_SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storageKey: `ugo-test-${role}-auth`,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: { params: { eventsPerSecond: 10 } },
  })

  clients.set(role, client)
  return client
}
