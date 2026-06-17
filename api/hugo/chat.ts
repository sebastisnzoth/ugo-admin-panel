import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs'
);

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function callGemini(key: string, body: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body }
    );
    const d = await r.json();
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (text) return text;
    // High demand / quota → wait and retry
    if (d.error?.message?.includes('high demand') || d.error?.message?.includes('quota') || r.status === 503) {
      if (i < retries - 1) await sleep(1500 * (i + 1));
      continue;
    }
    throw new Error(d.error?.message || 'Sin respuesta de Gemini');
  }
  throw new Error('Gemini con alta demanda. Intentá en unos segundos.');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { message, role = 'admin', history = [], context = '' } = req.body;
    const { data: rows } = await sb.from('config_sistema').select('clave,valor')
      .in('clave', [`hugo_prompt_${role}`, 'api_gemini_key']);
    const cfg: Record<string, string> = {};
    rows?.forEach((r: any) => { cfg[r.clave] = r.valor; });
    const key = cfg['api_gemini_key']?.trim();
    if (!key) return res.status(500).json({ hugo_mensaje: 'Sin Gemini API Key configurada.' });
    const sys = (cfg[`hugo_prompt_${role}`] || 'Eres Hugo de U.GO. Responde en español, máximo 3 frases.')
      + (context ? `\nESTADO:\n${context}` : '');
    const userMsg = message === '__INICIO__' ? `Saluda al usuario: ${context}` : message;
    const hist = history.slice(-8).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }]
    }));
    const body = JSON.stringify({
      system_instruction: { parts: [{ text: sys }] },
      contents: [...hist, { role: 'user', parts: [{ text: userMsg }] }],
      generationConfig: { maxOutputTokens: 400, temperature: 0.7 }
    });
    const texto = await callGemini(key, body);
    const match = texto.match(/\[ACCION:\s*([^\]]+)\]/i);
    return res.json({
      hugo_mensaje: texto.replace(/\[ACCION:[^\]]+\]/gi, '').trim(),
      accion: match?.[1]?.trim() ?? null
    });
  } catch (err: any) {
    return res.status(500).json({ hugo_mensaje: `Error: ${err.message}` });
  }
}
