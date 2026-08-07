import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Proyecto Supabase oficial de U.G.O. Mantenerlo explícito evita que variables
// VITE legacy guardadas en Vercel reemplacen el backend durante el build.
const SUPABASE_URL = 'https://trfsjuseqjxlhrxuvdsm.supabase.co'
const SUPABASE_KEY = 'sb_publishable_bbCcM7ElzH-iGAQw8Qefzg_ZmO0sKH8'

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storageKey: 'ugo-admin-auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: { params: { eventsPerSecond: 10 } },
})
