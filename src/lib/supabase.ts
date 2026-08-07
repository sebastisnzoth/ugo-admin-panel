import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || 'https://trfsjuseqjxlhrxuvdsm.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'sb_publishable_bbCcM7ElzH-iGAQw8Qefzg_ZmO0sKH8'

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storageKey: 'ugo-admin-auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: { params: { eventsPerSecond: 10 } },
})
