import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs'
);

export default async function handler(req: any, res: any) {
  try {
    const { data, error } = await sb
      .from('config_sistema')
      .select('clave, valor')
      .eq('clave', 'api_gemini_key')
      .single();

    const key = data?.valor?.trim();

    // Probar Gemini
    let geminiOk = false;
    let geminiError = '';
    if (key) {
      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({ contents: [{ role:'user', parts:[{ text:'Di "hola"' }] }] }),
        }
      );
      const d = await r.json();
      geminiOk = !!d.candidates?.[0]?.content;
      geminiError = d.error?.message || '';
    }

    res.json({
      supabase_ok: !error,
      supabase_error: error?.message,
      key_found: !!key,
      key_prefix: key ? key.slice(0,8)+'...' : null,
      gemini_ok: geminiOk,
      gemini_error: geminiError,
    });
  } catch(e: any) {
    res.json({ fatal: e.message });
  }
}
