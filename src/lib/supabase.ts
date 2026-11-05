import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { UGO_ENVIRONMENT, UGO_SUPABASE_PUBLISHABLE_KEY, UGO_SUPABASE_URL } from './supabaseProject'

export const supabase = createClient<Database>(UGO_SUPABASE_URL, UGO_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storageKey: `ugo-${UGO_ENVIRONMENT}-admin-auth`,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: { params: { eventsPerSecond: 10 } },
})
