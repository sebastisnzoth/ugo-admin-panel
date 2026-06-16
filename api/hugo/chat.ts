import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs'
);

const MODELS = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { message, role = 'admin', history = [], context = '' } = req.body;

    const { data: rows } = await sb
      .from('config_sistema')
      .select('clave, valor')
      .in('clave', [`hugo_prompt_${role}`, 'api_gemini_key']);

    const cfg: Record<string, string> = {};
    rows?.forEach((r: any) => { cfg[r.clave] = r.valor; });

    const geminiKey = cfg['api_gemini_key']?.trim();
    if (!geminiKey) return res.status(500).json({ hugo_mensaje: 'Sin Gemini API Key. Configurala en ⚙ Config del panel.' });

    const systemPrompt =
      (cfg[`hugo_prompt_${role}`] || 'Eres Hugo, núcleo de inteligencia de U.GO. Respondé en español. Máximo 4 frases.') +
      (context ? `\n\nESTADO:\n${context}` : '');

    const geminiHistory = history.slice(-6).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body = JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [...geminiHistory, { role: 'user', parts: [{ text: message }] }],
      generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
    });

    let lastErr = '';
    for (const model of MODELS) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-goog-api-key': geminiKey }, body }
      );
      const d = await r.json();
      if (d.error) { lastErr = `${model}: ${d.error.message}`; continue; }

      const texto = d.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!texto) continue;

      const match = texto.match(/\[ACCION:\s*([^\]]+)\]/i);
      return res.json({
        hugo_mensaje: texto.replace(/\[ACCION:[^\]]+\]/gi, '').trim(),
        accion: match?.[1]?.trim() ?? null,
        engine: model,
      });
    }

    return res.status(500).json({ hugo_mensaje: `Gemini no respondió. ${lastErr}` });

  } catch (err: any) {
    return res.status(500).json({ hugo_mensaje: `Error: ${err.message}` });
  }
}
