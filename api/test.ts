import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs'
);
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { data } = await sb.rpc('config_backend', { p_token: process.env.UGO_BACKEND_TOKEN || '', p_claves: ['api_gemini_key'] });
  const key = data?.[0]?.valor?.trim();
  let geminiOk = false, geminiError = '';
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
      { method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':key},
        body: JSON.stringify({contents:[{role:'user',parts:[{text:'Di ok'}]}],generationConfig:{maxOutputTokens:5}}) });
    const d = await r.json();
    geminiOk = !!d.candidates?.[0]?.content?.parts?.[0]?.text;
    geminiError = d.error?.message || '';
  } catch(e:any) { geminiError = e.message; }
  return res.json({ supabase_ok:!!key, gemini_ok:geminiOk, gemini_error:geminiError });
}
