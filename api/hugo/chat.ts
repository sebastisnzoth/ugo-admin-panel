import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs'
);

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// config_sistema ya no es legible por REST (las API keys estaban expuestas);
// el backend lee las claves secretas vía RPC config_backend con este token.
// Se configura como env var en Vercel — nunca hardcodearlo en el repo.
const BACKEND_TOKEN = process.env.UGO_BACKEND_TOKEN || '';

// ── Extrae el primer objeto JSON balanceado de un texto (tolera preámbulo y fences) ──
function extractJson(raw: string): any | null {
  if (!raw) return null;
  const t = raw.replace(/```json/gi, '').replace(/```/g, '');
  const start = t.indexOf('{');
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { if (inStr) esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(t.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

// Intenta Gemini, con retry
async function callGemini(key: string, prompt: string, hist: any[], sys: string, jsonMode: boolean): Promise<string> {
  const genCfg: any = { maxOutputTokens: 400, temperature: 0.7 };
  if (jsonMode) genCfg.responseMimeType = 'application/json';
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: sys }] },
    contents: [...hist, { role: 'user', parts: [{ text: prompt }] }],
    generationConfig: genCfg
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
async function callGroq(key: string, prompt: string, hist: any[], sys: string, jsonMode: boolean): Promise<string> {
  const messages = [
    { role: 'system', content: sys },
    ...hist.map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: prompt }
  ];
  const body: any = { model: 'llama-3.3-70b-versatile', messages, max_tokens: 400, temperature: 0.7 };
  if (jsonMode) body.response_format = { type: 'json_object' };
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify(body)
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
    const { message, role = 'admin', history = [], context = '', region = '', context_type = 'initial', usuario_id = '' } = req.body;
    const { data: rows } = await sb.rpc('config_backend', {
      p_token: BACKEND_TOKEN,
      p_claves: [`hugo_prompt_${role}`, 'api_gemini_key', 'api_groq_key', 'hugo_v2_enabled'],
    });
    const cfg: Record<string, string> = {};
    rows?.forEach((r: any) => { cfg[r.clave] = r.valor; });

    // ── Hugo 2.0: contexto regional + prompts dinámicos (hugo_prompts_v2) ──
    const v2 = cfg['hugo_v2_enabled'] === 'true';
    const regionOk = v2 && /^[A-Z]{2}$/.test(region) && (role === 'cliente' || role === 'proveedor');
    let regionalSys = '';
    let plantilla: any = null;
    if (regionOk) {
      const [{ data: reg }, { data: pr }] = await Promise.all([
        sb.from('regiones').select('codigo_pais,moneda,simbolo_moneda').eq('codigo_pais', region).maybeSingle(),
        sb.from('hugo_prompts_v2').select('prompt_text,system_prompt,tone')
          .eq('role_type', role).eq('region', region).eq('context_type', context_type).eq('active', true)
          .order('version', { ascending: false }).limit(1).maybeSingle()
      ]);
      plantilla = pr;
      const idioma = region === 'BR'
        ? 'Responde SIEMPRE em português brasileiro, informal e caloroso.'
        : 'Respondé SIEMPRE en español rioplatense, con voseo, cercano.';
      regionalSys = `\nREGIÓN DEL USUARIO: ${region}.`
        + (reg ? ` Moneda: ${reg.simbolo_moneda} (${reg.moneda}) — usá SIEMPRE esa moneda en los precios.` : '')
        + ` ${idioma}`
        + (plantilla?.system_prompt ? `\n${plantilla.system_prompt}` : '')
        + (plantilla?.prompt_text ? `\nESTILO de referencia para la situación "${context_type}": "${plantilla.prompt_text}"` : '');
    }

    // Saludo inicial: si hay plantilla regional sin placeholders, se responde directo (0 tokens de IA)
    if (message === '__INICIO__' && plantilla?.prompt_text && !plantilla.prompt_text.includes('{')) {
      return res.json({ hugo_mensaje: plantilla.prompt_text, accion: null, ui_action: null, datos: null, model: 'template/hugo_prompts_v2' });
    }

    const geminiKey = cfg['api_gemini_key']?.trim();
    const groqKey   = cfg['api_groq_key']?.trim();

    if (!geminiKey && !groqKey) {
      return res.status(500).json({ hugo_mensaje: 'Sin API Key de IA configurada.' });
    }

    // cliente/proveedor responden JSON estructurado; admin usa protocolo [ACCION] en texto plano
    const jsonMode = role === 'cliente' || role === 'proveedor';
    let sys = (cfg[`hugo_prompt_${role}`] || 'Eres Hugo de U.GO. Responde en español, máximo 3 frases.')
      + regionalSys
      + (context ? `\nCONTEXTO: ${context}` : '');
    if (jsonMode) {
      sys += '\nREGLA ABSOLUTA: Responde ÚNICAMENTE con el objeto JSON. Sin texto antes ni después, sin markdown, sin backticks.';
    }
    const userMsg = message === '__INICIO__' ? `Saluda brevemente al usuario: ${context}` : message;
    const hist = history.slice(-8).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    let texto = '';
    let usedModel = '';

    // 1. Intentar Gemini primero (primario) si hay key
    if (geminiKey) {
      try {
        texto = await callGemini(geminiKey, userMsg, hist, sys, jsonMode);
        usedModel = 'gemini-flash-latest';
      } catch (e) {
        console.error('Gemini failed, trying Groq:', e);
      }
    }

    // 2. Fallback a Groq
    if (!texto && groqKey) {
      const histGroq = history.slice(-8).map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
      texto = await callGroq(groqKey, userMsg, histGroq, sys.replace('model','assistant'), jsonMode);
      usedModel = 'groq/llama-3.3-70b';
    }

    if (!texto) throw new Error('Ningún proveedor de IA respondió.');

    // ── Normalizar salida: si el modelo emitió JSON (con o sin preámbulo), extraerlo ──
    const parsed = extractJson(texto);
    const matchAccion = texto.match(/\[ACCION:\s*([^\]]+)\]/i);

    if (parsed && typeof parsed.hugo_mensaje === 'string' && parsed.hugo_mensaje.trim()) {
      return res.json({
        hugo_mensaje: parsed.hugo_mensaje.trim(),
        accion:       parsed.accion ?? matchAccion?.[1]?.trim() ?? null,
        ui_action:    parsed.ui_action ?? null,
        datos:        parsed.datos ?? null,
        model:        usedModel
      });
    }

    // Texto plano (modo admin o modelo que no siguió el formato): limpiar JSON residual y [ACCION]
    let plano = texto
      .replace(/```json[\s\S]*?```/gi, '')
      .replace(/\{[\s\S]*"hugo_mensaje"[\s\S]*\}/g, '')
      .replace(/\[ACCION:[^\]]+\]/gi, '')
      .trim();
    if (!plano) plano = 'Hola, ¿en qué puedo ayudarte?';

    // Log interaction if usuario_id provided (fire-and-forget)
    if (usuario_id) {
      sb.rpc('hugo_log_interaction', {
        p_usuario_id: usuario_id,
        p_tipo: 'chat',
        p_contexto: { message, response: plano, model: usedModel }
      }).catch(() => {});
    }

    return res.json({
      hugo_mensaje: plano,
      accion: matchAccion?.[1]?.trim() ?? null,
      ui_action: null,
      datos: null,
      model: usedModel
    });
  } catch (err: any) {
    return res.status(500).json({ hugo_mensaje: `Error: ${err.message}` });
  }
}
