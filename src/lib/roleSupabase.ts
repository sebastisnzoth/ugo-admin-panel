import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type UgoRole = 'client' | 'provider'

// El MVP Cliente/Proveedor debe usar siempre el proyecto UGO actual.
// Las variables VITE antiguas de Vercel no deben poder redirigir el login
// hacia un proyecto Supabase legacy durante el build.
const SUPABASE_URL = 'https://trfsjuseqjxlhrxuvdsm.supabase.co'
const SUPABASE_KEY = 'sb_publishable_bbCcM7ElzH-iGAQw8Qefzg_ZmO0sKH8'

const clients = new Map<UgoRole, SupabaseClient>()

export function getRoleSupabase(role: UgoRole): SupabaseClient {
  const existing = clients.get(role)
  if (existing) return existing

  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      // v2 evita reutilizar JWT/sesiones persistidas del proyecto Supabase legacy.
      storageKey: `ugo-v2-${role}-auth`,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: { params: { eventsPerSecond: 10 } },
  })

  clients.set(role, client)
  return client
}
