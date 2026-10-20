import { createClient, type AuthChangeEvent, type SupabaseClient } from '@supabase/supabase-js'
import { UGO_SUPABASE_PUBLISHABLE_KEY, UGO_SUPABASE_URL } from './supabaseProject'

export type UgoRole = 'client' | 'provider'
export type SessionDiagnosticOrigin = 'auth' | 'profile' | 'gps' | 'realtime' | 'availability' | 'navigation'
export type SessionDiagnosticReason =
  | 'auth_event'
  | 'initial_session_empty_ignored'
  | 'session_restored'
  | 'session_unavailable'
  | 'session_invalidated'
  | 'session_check_failed'
  | 'signed_out_received'
  | 'signed_out_confirmed'
  | 'session_preserved_after_signed_out'
  | 'token_refreshed'
  | 'profile_load_failed'
  | 'explicit_sign_out_requested'
  | 'explicit_sign_out_completed'
  | 'explicit_sign_out_failed'
  | 'login_route_shown'
  | 'login_route_suppressed'
  | 'gps_error'
  | 'gps_publish_failed'
  | 'realtime_channel_ready'
  | 'realtime_channel_failed'
  | 'online_saved'
  | 'offline_saved'
  | 'availability_recovered'
  | 'availability_failed'
  | 'provider_snapshot_failed'

type SessionDiagnosticErrorClass = 'network' | 'timeout' | 'authorization' | 'storage' | 'unknown'
type SessionDiagnostic = {
  role: UgoRole
  origin: SessionDiagnosticOrigin
  reason: SessionDiagnosticReason
  at: string
  event?: AuthChangeEvent
  errorClass?: SessionDiagnosticErrorClass
}

type SessionDiagnosticOptions = { event?: AuthChangeEvent; error?: unknown }
const SESSION_DIAGNOSTICS_KEY = 'ugo:session-diagnostics:v1'
const MAX_SESSION_DIAGNOSTICS = 100
const clients = new Map<UgoRole, SupabaseClient>()

function classifyDiagnosticError(error: unknown): SessionDiagnosticErrorClass | undefined {
  if (error == null) return undefined
  const value = typeof error === 'object' ? error as Record<string, unknown> : {}
  const name = typeof value.name === 'string' ? value.name : ''
  const code = typeof value.code === 'string' ? value.code.toLowerCase() : ''
  const status = Number(value.status)
  const message = error instanceof Error ? error.message.toLowerCase() : String(value.message || error).toLowerCase()

  if (/timeout|timed out|abort|57014/.test(`${name} ${code} ${message}`)) return 'timeout'
  if (['AuthSessionMissingError', 'AuthInvalidTokenResponseError'].includes(name) || /session_not_found|invalid refresh token|refresh token (?:was )?(?:not found|already used|revoked|expired)/.test(`${code} ${message}`)) return 'authorization'
  if (status === 401 || status === 403 || /unauthori[sz]ed|forbidden|invalid[_ ](jwt|token|grant)|permission denied/.test(`${code} ${message}`)) return 'authorization'
  if (/network|failed to fetch|fetcherror|connection|offline|temporar/.test(`${name} ${code} ${message}`)) return 'network'
  if (/storage|quota|localstorage|sessionstorage/.test(`${name} ${code} ${message}`)) return 'storage'
  return 'unknown'
}

/** Persist only bounded, fixed-category diagnostics. Never store session data, tokens, IDs, emails, or raw errors. */
export function recordSessionDiagnostic(
  role: UgoRole,
  origin: SessionDiagnosticOrigin,
  reason: SessionDiagnosticReason,
  options: SessionDiagnosticOptions = {},
) {
  if (typeof window === 'undefined') return
  const errorClass = classifyDiagnosticError(options.error)
  const entry: SessionDiagnostic = {
    role,
    origin,
    reason,
    at: new Date().toISOString(),
    ...(options.event ? { event: options.event } : {}),
    ...(errorClass ? { errorClass } : {}),
  }

  try {
    const stored = window.sessionStorage.getItem(SESSION_DIAGNOSTICS_KEY)
    const parsed: unknown = stored ? JSON.parse(stored) : []
    const previous = Array.isArray(parsed) ? parsed as SessionDiagnostic[] : []
    const last = previous[previous.length - 1]
    const duplicate = last && last.role === role && last.origin === origin && last.reason === reason &&
      last.event === entry.event && last.errorClass === entry.errorClass &&
      Date.now() - Date.parse(last.at) < 5_000
    if (!duplicate) {
      previous.push(entry)
      window.sessionStorage.setItem(SESSION_DIAGNOSTICS_KEY, JSON.stringify(previous.slice(-MAX_SESSION_DIAGNOSTICS)))
    }
  } catch {
    // Browser storage may be disabled; the in-page diagnostic event still fires.
  }

  try {
    window.dispatchEvent(new CustomEvent('ugo:session-diagnostic', { detail: entry }))
  } catch {
    // Observability must not affect authentication or provider operations.
  }
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
