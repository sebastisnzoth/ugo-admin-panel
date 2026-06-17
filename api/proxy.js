import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs'
);

const MODELS = ['gemini-flash-latest'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // Leer Gemini key desde Supabase
    const { data } = await sb.from('config_sistema').select('valor').eq('clave','api_gemini_key').single();
    const geminiKey = data?.valor?.trim();
    if (!geminiKey) return res.status(500).json({ error: 'Sin Gemini API Key configurada' });

    // Convertir request de formato Anthropic → Gemini
    const { system, messages, max_tokens = 400 } = req.body;
    const userMsg = messages?.find(m => m.role === 'user')?.content || '';
    const prompt = system ? `${system}\n\n${userMsg}` : userMsg;

    const body = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: max_tokens, temperature: 0.7 }
    });

    let lastErr = '';
    for (const model of MODELS) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey }, body }
      );
      const d = await r.json();
      if (d.error) { lastErr = d.error.message; continue; }
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!text) continue;

      // Responder en formato compatible con lo que espera Scout
      return res.json({
        content: [{ type: 'text', text }],
        model
      });
    }

    return res.status(500).json({ error: `Gemini falló: ${lastErr}` });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
