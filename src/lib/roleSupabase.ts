import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { UGO_SUPABASE_PUBLISHABLE_KEY, UGO_SUPABASE_URL } from './supabaseProject'

export type UgoRole = 'client' | 'provider'

const clients = new Map<UgoRole, SupabaseClient>()

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
