import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { message, role = 'admin', history = [], context = '' } = req.body;

    // Leer keys y prompt desde Supabase config_sistema
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: rows } = await sb
      .from('config_sistema')
      .select('clave, valor')
      .in('clave', [`hugo_prompt_${role}`, 'api_gemini_key', 'api_anthropic_key']);

    const cfg: Record<string, string> = {};
    rows?.forEach((r: any) => { cfg[r.clave] = r.valor; });

    const systemPrompt = (cfg[`hugo_prompt_${role}`] ||
      'Eres Hugo, núcleo de inteligencia de U.GO. Respondé en español. Máximo 4 frases.') +
      (context ? `\n\nESTADO DEL SISTEMA:\n${context}` : '');

    const geminiKey    = cfg['api_gemini_key']    || '';
    const anthropicKey = cfg['api_anthropic_key'] || process.env.ANTHROPIC_API_KEY || '';

    // ── GEMINI ───────────────────────────────────────────────
    if (geminiKey) {
      const geminiHistory = history.slice(-6).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      const body = JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [...geminiHistory, { role: 'user', parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
      });

      for (const model of MODELS) {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-goog-api-key': geminiKey }, body }
        );
        const data = await r.json();
        if (data.error) continue;

        const texto = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sin respuesta.';
        const m = texto.match(/\[ACCION:\s*([^\]]+)\]/i);
        return res.json({
          hugo_mensaje: texto.replace(/\[ACCION:[^\]]+\]/gi, '').trim(),
          accion: m?.[1]?.trim() ?? null, engine: `gemini/${model}`,
        });
      }
    }

    // ── ANTHROPIC (fallback) ──────────────────────────────────
    if (anthropicKey) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022', max_tokens: 400, system: systemPrompt,
          messages: [...history.slice(-6), { role: 'user', content: message }],
        }),
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error.message);
      const texto = data.content?.[0]?.text ?? '';
      const m = texto.match(/\[ACCION:\s*([^\]]+)\]/i);
      return res.json({
        hugo_mensaje: texto.replace(/\[ACCION:[^\]]+\]/gi, '').trim(),
        accion: m?.[1]?.trim() ?? null, engine: 'anthropic',
      });
    }

    throw new Error('Sin API Key configurada. Ve a ⚙ Config → API Keys en el panel.');

  } catch (err: any) {
    return res.status(500).json({ hugo_mensaje: `Error: ${err.message}`, accion: null });
  }
}
