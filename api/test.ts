import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs'
);

const TEST_MODELS = [
  { name: 'gemini-1.5-flash', api: 'v1beta' },
  { name: 'gemini-1.5-flash', api: 'v1' },
  { name: 'gemini-1.5-pro', api: 'v1beta' },
  { name: 'gemini-pro', api: 'v1' },
  { name: 'gemini-1.0-pro', api: 'v1beta' },
];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { data } = await sb.from('config_sistema').select('valor').eq('clave','api_gemini_key').single();
  const key = data?.valor?.trim();
  const supabase_ok = !!key;
  
  const results: any[] = [];
  
  for (const { name, api } of TEST_MODELS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/${api}/models/${name}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Di "ok" en una palabra.' }] }],
            generationConfig: { maxOutputTokens: 10 }
          })
        }
      );
      const d = await r.json();
      const ok = !!d.candidates?.[0]?.content?.parts?.[0]?.text;
      results.push({ model: name, api, ok, error: d.error?.message || null });
      if (ok) break; // found one that works
    } catch(e: any) {
      results.push({ model: name, api, ok: false, error: e.message });
    }
  }

  const working = results.find(r => r.ok);
  return res.json({
    supabase_ok,
    key_prefix: key?.slice(0, 10) + '...',
    gemini_ok: !!working,
    working_model: working ? `${working.name} (${working.api})` : null,
    all_results: results
  });
}
