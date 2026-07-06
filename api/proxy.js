// api/proxy.js
// Hugo AI proxy — carga system prompts desde Supabase según modo
// Nunca expone keys ni prompts al cliente

import { createClient } from '@supabase/supabase-js';

const SB_URL = 'https://byajcqrgetloavrgyqak.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs';
const sb = createClient(SB_URL, SB_KEY);

// Env var en Vercel — nunca hardcodear el token en el repo.
const BACKEND_TOKEN = process.env.UGO_BACKEND_TOKEN || '';

async function getConfig(keys) {
  const { data } = await sb.rpc('config_backend', { p_token: BACKEND_TOKEN, p_claves: keys });
  const map = {};
  (data || []).forEach(r => { map[r.clave] = r.valor; });
  return map;
}

function injectContext(prompt, context = {}) {
  let p = prompt;
  Object.entries(context).forEach(([k, v]) => {
    p = p.replaceAll(`{{${k}}}`, v ?? '—');
  });
  return p;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    mode = 'admin',       // 'cliente' | 'proveedor' | 'admin'
    messages = [],
    system,               // legacy: si lo mandan directo lo usamos
    context = {},         // variables dinámicas para inyectar en el prompt
    max_tokens = 800,
  } = req.body;

  try {
    // Cargar keys desde Supabase
    const cfg = await getConfig([
      'api_groq_key',
      'api_gemini_key',
      `hugo_prompt_${mode}`,
    ]);

    // Sistema: prioridad → Supabase prompt → legacy system → fallback
    let systemPrompt = system || cfg[`hugo_prompt_${mode}`] || 'Eres Hugo, asistente de U.GO.';
    systemPrompt = injectContext(systemPrompt, context);

    const groqKey  = cfg['api_groq_key'];
    const geminiKey = cfg['api_gemini_key'];

    // ── 1. Intentar Gemini (primario) ──────────────────────────
    if (geminiKey) {
      try {
        const geminiMessages = messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: geminiMessages,
              generationConfig: { maxOutputTokens: max_tokens, temperature: 0.7 },
            }),
            signal: AbortSignal.timeout(15000),
          }
        );

        if (r.ok) {
          const d = await r.json();
          const text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
          return res.json({ content: [{ type: 'text', text }], model: 'gemini-2.0-flash', mode });
        }
      } catch(e) {
        console.warn('[Hugo] Gemini falló:', e.message);
      }
    }

    // ── 2. Fallback Groq (llama-3.3-70b) ──────────────────────
    if (groqKey) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages,
            ],
            max_tokens,
            temperature: 0.7,
            response_format: mode !== 'admin' ? { type: 'json_object' } : undefined,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (r.ok) {
          const d = await r.json();
          const text = d.choices?.[0]?.message?.content || '';
          return res.json({ content: [{ type: 'text', text }], model: 'groq/llama-3.3-70b', mode });
        }
      } catch(e) {
        console.warn('[Hugo] Groq falló:', e.message);
      }
    }

    return res.status(503).json({ error: 'Todos los modelos de IA no disponibles.' });

  } catch(e) {
    console.error('[Hugo proxy] Error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
