import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string
  || 'https://byajcqrgetloavrgyqak.supabase.co';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string
  || 'sb_publishable_wAkmRZHwX9ddcZ-zNZSyXw_EH1f1iGZ';

// detectSessionInUrl: false → CRÍTICO. El panel admin NO debe procesar
// tokens OAuth desde la URL: ese trabajo es exclusivo del script
// interceptor en index.html, que redirige a /provider.html o /client.html
// ANTES de que React monte. Si este cliente también detecta el hash,
// crea sesión acá mismo y el listener de abajo (AdminPanel.tsx) la
// cierra de inmediato por no ser el admin — carrera que rompía el login
// de Google para proveedores y clientes.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 10 } },
});
