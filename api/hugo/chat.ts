import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'sb_publishable_wAkmRZHwX9ddcZ-zNZSyXw_EH1f1iGZ'
);

// Cliente separado para autenticar las sesiones del nuevo MVP.
const voiceSb = createClient(
  process.env.VITE_SUPABASE_URL || 'https://trfsjuseqjxlhrxuvdsm.supabase.co',
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || 'sb_publishable_bbCcM7ElzH-iGAQw8Qefzg_ZmO0sKH8',
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Configuración legacy. OpenAI se lee únicamente desde variables de entorno de Vercel.
const BACKEND_TOKEN = process.env.UGO_BACKEND_TOKEN || '';

function getBearer(req: any) {
  const raw = String(req.headers?.authorization || '');
  return raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
}

function voiceInstructions(role: 'client' | 'provider', context: string) {
  const audience = role === 'client'
    ? 'Estás hablando con un cliente que necesita resolver un servicio.'
    : 'Estás hablando con un proveedor que recibe y ejecuta misiones.';
  return [
    'Sos Hugo, el agente de voz de U.G.O., una plataforma de servicios.',
    'Hablá en español rioplatense natural, cálido y directo, usando voseo.',
    'Respondé normalmente en una o dos frases; ampliá solo cuando sea necesario.',
    'Escuchá activamente y permití que el usuario te interrumpa sin insistir en terminar tu frase.',
    audience,
    'No inventes estados, precios, personas, pagos ni acciones. Usá únicamente el contexto recibido.',
    'Esta sesión de voz no ejecuta operaciones por sí sola: cuando el usuario quiera aceptar, cancelar, aprobar, pagar o cambiar un estado, explicale cuál botón de la interfaz debe usar.',
    context ? `CONTEXTO ACTUAL DE U.G.O.: ${context}` : '',
  ].filter(Boolean).join('\n');
}

async function handleRealtime(req: any, res: any) {
  const accessToken = getBearer(req);
  if (!accessToken) return res.status(401).json({ error: 'Sesión requerida' });

  const { data, error } = await voiceSb.auth.getUser(accessToken);
  if (error || !data.user) return res.status(401).json({ error: 'Sesión inválida' });

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) return res.status(503).json({ error: 'OPENAI_API_KEY no configurada en el servidor' });

  const requestedRole: 'client' | 'provider' = req.body?.role === 'provider' ? 'provider' : 'client';
  const expectedDbRole = requestedRole === 'provider' ? 'proveedor' : 'cliente';

  // Propaga el JWT del usuario para que RLS pueda evaluar auth.uid().
  const userSb = createClient(
    process.env.VITE_SUPABASE_URL || 'https://trfsjuseqjxlhrxuvdsm.supabase.co',
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
      || process.env.VITE_SUPABASE_ANON_KEY
      || 'sb_publishable_bbCcM7ElzH-iGAQw8Qefzg_ZmO0sKH8',
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }
  );

  const { data: profile } = await userSb
    .from('usuarios')
    .select('tipo,nombre')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile || profile.tipo !== expectedDbRole) {
    return res.status(403).json({ error: 'El rol de la sesión no coincide con esta aplicación' });
  }

  const context = String(req.body?.context || '').slice(0, 4000);
  const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1';
  const voice = process.env.OPENAI_REALTIME_VOICE || 'marin';

  const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Safety-Identifier': `ugo-${data.user.id}`,
    },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        model,
        output_modalities: ['audio'],
        instructions: voiceInstructions(requestedRole, context),
        audio: {
          input: {
            turn_detection: {
              type: 'semantic_vad',
              eagerness: 'auto',
              create_response: true,
              interrupt_response: true,
            },
          },
          output: { voice },
        },
      },
    }),
  });

  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.value) {
    console.error('OpenAI realtime client secret failed', response.status, payload?.error?.message || payload);
    return res.status(502).json({ error: payload?.error?.message || 'No se pudo iniciar la voz de Hugo' });
  }

  return res.status(200).json({
    value: payload.value,
    expires_at: payload.expires_at || null,
    model,
    voice,
  });
}

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

async function callOpenAI(
  key: string,
  prompt: string,
  hist: any[],
  sys: string,
  jsonMode: boolean
): Promise<{ text: string; model: string }> {
  const model = process.env.OPENAI_TEXT_MODEL || 'gpt-5.4-mini';
  const messages = [
    { role: 'system', content: sys },
    ...hist.slice(-8).map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
    })),
    { role: 'user', content: prompt },
  ];

  const body: any = { model, messages };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.error?.message || `OpenAI respondió ${r.status}`);
  const text = d?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('OpenAI no devolvió contenido.');
  return { text, model: d?.model || model };
}

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
    const d: any = await r.json();
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
  const d: any = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || `Groq respondió ${r.status}`);
  return d.choices?.[0]?.message?.content || '';
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    if (req.query?.mode === 'realtime' || req.body?.mode === 'realtime') {
      return await handleRealtime(req, res);
    }

    const { message, role = 'admin', history = [], context = '', region = '', context_type = 'initial' } = req.body;
    const { data: rows } = await sb.rpc('config_backend', {
      p_token: BACKEND_TOKEN,
      p_claves: [`hugo_prompt_${role}`, 'api_gemini_key', 'api_groq_key', 'hugo_v2_enabled'],
    });
    const cfg: Record<string, string> = {};
    rows?.forEach((r: any) => { cfg[r.clave] = r.valor; });

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

    if (message === '__INICIO__' && plantilla?.prompt_text && !plantilla.prompt_text.includes('{')) {
      return res.json({ hugo_mensaje: plantilla.prompt_text, accion: null, ui_action: null, datos: null, model: 'template/hugo_prompts_v2' });
    }

    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    const geminiKey = cfg['api_gemini_key']?.trim();
    const groqKey = cfg['api_groq_key']?.trim();

    if (!openaiKey && !geminiKey && !groqKey) {
      return res.status(503).json({ hugo_mensaje: 'OPENAI_API_KEY no está configurada en el servidor.' });
    }

    const jsonMode = role === 'cliente' || role === 'proveedor';
    let sys = (cfg[`hugo_prompt_${role}`] || [
      'Sos Hugo, el núcleo de inteligencia de U.G.O.',
      'Respondé en español natural, directo y útil, normalmente en una a tres frases.',
      'Usá solamente los datos del contexto operativo para estados, métricas, precios, usuarios, servicios y pagos.',
      'No afirmes que una operación fue ejecutada si el backend no confirmó esa acción.',
    ].join(' '))
      + regionalSys
      + (context ? `\nCONTEXTO OPERATIVO ACTUAL: ${context}` : '');

    if (jsonMode) {
      sys += '\nREGLA ABSOLUTA: Responde ÚNICAMENTE con el objeto JSON. Sin texto antes ni después, sin markdown, sin backticks.';
    }

    const userMsg = message === '__INICIO__' ? `Saluda brevemente al usuario: ${context}` : message;
    const geminiHist = history.slice(-8).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    let texto = '';
    let usedModel = '';

    // OpenAI es el cerebro principal de Hugo.
    if (openaiKey) {
      try {
        const result = await callOpenAI(openaiKey, userMsg, history, sys, jsonMode);
        texto = result.text;
        usedModel = result.model;
      } catch (e) {
        console.error('OpenAI failed, trying legacy fallbacks:', e);
      }
    }

    if (!texto && geminiKey) {
      try {
        texto = await callGemini(geminiKey, userMsg, geminiHist, sys, jsonMode);
        usedModel = 'gemini-flash-latest';
      } catch (e) {
        console.error('Gemini failed, trying Groq:', e);
      }
    }

    if (!texto && groqKey) {
      try {
        texto = await callGroq(groqKey, userMsg, history.slice(-8), sys, jsonMode);
        usedModel = 'llama-3.3-70b-versatile';
      } catch (e) {
        console.error('Groq failed too:', e);
      }
    }

    if (!texto) throw new Error('Ningún proveedor de IA respondió.');

    const parsed = extractJson(texto);
    const matchAccion = texto.match(/\[ACCION:\s*([^\]]+)\]/i);

    if (parsed && typeof parsed.hugo_mensaje === 'string' && parsed.hugo_mensaje.trim()) {
      return res.json({
        hugo_mensaje: parsed.hugo_mensaje.trim(),
        accion: parsed.accion ?? matchAccion?.[1]?.trim() ?? null,
        ui_action: parsed.ui_action ?? null,
        datos: parsed.datos ?? null,
        model: usedModel
      });
    }

    let plano = texto
      .replace(/```json[\s\S]*?```/gi, '')
      .replace(/\{[\s\S]*"hugo_mensaje"[\s\S]*\}/g, '')
      .replace(/\[ACCION:[^\]]+\]/gi, '')
      .trim();
    if (!plano) plano = 'Hola, ¿en qué puedo ayudarte?';

    return res.json({
      hugo_mensaje: plano,
      accion: matchAccion?.[1]?.trim() ?? null,
      ui_action: null,
      datos: null,
      model: usedModel
    });
  } catch (err: any) {
    console.error('Hugo chat failed:', err);
    return res.status(500).json({ hugo_mensaje: `Error: ${err.message}` });
  }
}
