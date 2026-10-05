import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { UGO_SUPABASE_PUBLISHABLE_KEY, UGO_SUPABASE_URL } from './supabaseProject'

export type UgoRole = 'client' | 'provider'

const clients = new Map<UgoRole, SupabaseClient>()

export function clearRoleSession(role: UgoRole) {
  try {
    localStorage.removeItem(`ugo-test-${role}-auth`)
    sessionStorage.removeItem(`ugo-test-${role}-auth`)
  } catch {}

  try {
    localStorage.removeItem('supabase.auth.token')
    sessionStorage.removeItem('supabase.auth.token')
  } catch {}

  try {
    localStorage.removeItem('ugo-oauth-intended-role')
  } catch {}
}

export function resetRoleSupabase(role: UgoRole) {
  clients.delete(role)
  clearRoleSession(role)
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

export async function signOutRole(role: UgoRole) {
  const active = clients.get(role)
  const cleanup = () => {
    resetRoleSupabase(role)
  }

  try {
    if (active) {
      await active.auth.signOut()
    }
  } catch {}

  cleanup()
}
