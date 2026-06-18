import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs'
);

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Intenta Gemini, con retry
async function callGemini(key: string, prompt: string, hist: any[], sys: string): Promise<string> {
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: sys }] },
    contents: [...hist, { role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 400, temperature: 0.7 }
  });
  for (let i = 0; i < 3; i++) {
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body }
    );
    const d = await r.json();
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (text) return text;
    const err = d.error?.message || '';
    if (err.includes('high demand') || err.includes('quota') || r.status === 503) {
      if (i < 2) await sleep(1500 * (i + 1));
      continue;
    }
    throw new Error(err || 'Sin respuesta de Gemini');
  }
  throw new Error('Gemini con alta demanda. Intentá en unos segundos.');
}

// Fallback: Groq (si hay key configurada)
async function callGroq(key: string, prompt: string, hist: any[], sys: string): Promise<string> {
  const messages = [
    { role: 'system', content: sys },
    ...hist.map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: prompt }
  ];
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 400, temperature: 0.7 })
  });
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '';
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { message, role = 'admin', history = [], context = '' } = req.body;
    const { data: rows } = await sb.from('config_sistema').select('clave,valor')
      .in('clave', [`hugo_prompt_${role}`, 'api_gemini_key', 'api_groq_key']);
    const cfg: Record<string, string> = {};
    rows?.forEach((r: any) => { cfg[r.clave] = r.valor; });

    const geminiKey = cfg['api_gemini_key']?.trim();
    const groqKey   = cfg['api_groq_key']?.trim();

    if (!geminiKey && !groqKey) {
      return res.status(500).json({ hugo_mensaje: 'Sin API Key de IA configurada.' });
    }

    const sys = (cfg[`hugo_prompt_${role}`] || 'Eres Hugo de U.GO. Responde en español, máximo 3 frases.')
      + (context ? `\nCONTEXTO: ${context}` : '');
    const userMsg = message === '__INICIO__' ? `Saluda brevemente al usuario: ${context}` : message;
    const hist = history.slice(-8).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    let texto = '';
    let usedModel = '';

    // 1. Intentar Groq primero (más rápido) si hay key
    if (groqKey) {
      try {
        const histGroq = history.slice(-8).map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
        texto = await callGroq(groqKey, userMsg, histGroq, sys.replace('model','assistant'));
        usedModel = 'groq/llama-3.3-70b';
      } catch (e) {
        console.error('Groq failed, trying Gemini:', e);
      }
    }

    // 2. Fallback a Gemini
    if (!texto && geminiKey) {
      texto = await callGemini(geminiKey, userMsg, hist, sys);
      usedModel = 'gemini-flash-latest';
    }

    if (!texto) throw new Error('Ningún proveedor de IA respondió.');

    const match = texto.match(/\[ACCION:\s*([^\]]+)\]/i);
    return res.json({
      hugo_mensaje: texto.replace(/\[ACCION:[^\]]+\]/gi, '').trim(),
      accion: match?.[1]?.trim() ?? null,
      model: usedModel
    });
  } catch (err: any) {
    return res.status(500).json({ hugo_mensaje: `Error: ${err.message}` });
  }
}
