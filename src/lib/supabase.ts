import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string
  || 'https://byajcqrgetloavrgyqak.supabase.co';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string
  || 'sb_publishable_wAkmRZHwX9ddcZ-zNZSyXw_EH1f1iGZ';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: true, persistSession: true },
  realtime: { params: { eventsPerSecond: 10 } },
});
