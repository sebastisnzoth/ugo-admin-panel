import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type UgoRole = 'client' | 'provider'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://trfsjuseqjxlhrxuvdsm.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'sb_publishable_bbCcM7ElzH-iGAQw8Qefzg_ZmO0sKH8'

const clients = new Map<UgoRole, SupabaseClient>()

export function getRoleSupabase(role: UgoRole): SupabaseClient {
  const existing = clients.get(role)
  if (existing) return existing

  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storageKey: `ugo-${role}-auth`,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: { params: { eventsPerSecond: 10 } },
  })

  clients.set(role, client)
  return client
}
