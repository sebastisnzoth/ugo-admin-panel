import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'sb_publishable_wAkmRZHwX9ddcZ-zNZSyXw_EH1f1iGZ'
);

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { data } = await sb.rpc('config_backend', {
    p_token: process.env.UGO_BACKEND_TOKEN || '',
    p_claves: ['api_gemini_key'],
  });
  const geminiKey = data?.[0]?.valor?.trim();

  let geminiOk = false;
  let geminiError = '';
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey || '' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Di ok' }] }], generationConfig: { maxOutputTokens: 5 } }),
    });
    const d = await r.json();
    geminiOk = !!d.candidates?.[0]?.content?.parts?.[0]?.text;
    geminiError = d.error?.message || '';
  } catch (e: any) {
    geminiError = e?.message || String(e);
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim() || '';
  let openaiOk = false;
  let openaiStatus = 0;
  let openaiError = '';
  try {
    if (openaiKey) {
      const r = await fetch('https://api.openai.com/v1/models/gpt-realtime-2.1', {
        headers: { Authorization: `Bearer ${openaiKey}` },
      });
      openaiStatus = r.status;
      const d: any = await r.json().catch(() => ({}));
      openaiOk = r.ok;
      openaiError = d?.error?.message || '';
    }
  } catch (e: any) {
    openaiError = e?.message || String(e);
  }

  return res.json({
    supabase_ok: !!geminiKey,
    gemini_ok: geminiOk,
    gemini_error: geminiError,
    openai_key_configured: !!openaiKey,
    openai_model_access: openaiOk,
    openai_status: openaiStatus,
    openai_error: openaiError,
  });
}
