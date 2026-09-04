// api/proxy.js
// Hugo AI proxy + acciones administrativas seguras reutilizando una sola función Vercel.

import { createClient } from '@supabase/supabase-js';

const SB_URL = 'https://byajcqrgetloavrgyqak.supabase.co';
const SB_KEY = 'sb_publishable_wAkmRZHwX9ddcZ-zNZSyXw_EH1f1iGZ';
const sb = createClient(SB_URL, SB_KEY);
const OFFICIAL_URL = process.env.SUPABASE_URL || 'https://trfsjuseqjxlhrxuvdsm.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
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

function bearer(req) {
  const raw = String(req.headers?.authorization || '');
  return raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
}

async function adminCreateUser(req, res) {
  if (!SERVICE_KEY) return res.status(503).json({ error: 'SUPABASE_SERVICE_KEY no configurada.' });
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: 'Sesión Admin requerida.' });
  const admin = createClient(OFFICIAL_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let createdUserId = null;
  try {
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return res.status(401).json({ error: 'Sesión inválida o vencida.' });
    const { data: caller } = await admin.from('usuarios').select('tipo,activo').eq('id', authData.user.id).maybeSingle();
    if (!caller?.activo || !['admin','superadmin'].includes(String(caller.tipo))) return res.status(403).json({ error: 'Sólo administradores pueden crear usuarios.' });

    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const nombre = String(req.body?.nombre || '').trim();
    const apellido = String(req.body?.apellido || '').trim() || null;
    const role = String(req.body?.role || 'cliente');
    const demo = Boolean(req.body?.demo);
    const providerVerified = Boolean(req.body?.providerVerified);

    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Email inválido.' });
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido.' });
    if (!['cliente','proveedor','admin','superadmin'].includes(role)) return res.status(400).json({ error: 'Rol inválido.' });
    if (['admin','superadmin'].includes(role) && caller.tipo !== 'superadmin') return res.status(403).json({ error: 'Sólo Super Admin puede crear administradores.' });

    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombre, apellido, tipo: role, source: 'ugo-admin-panel', demo } });
    if (created.error || !created.data.user) throw created.error || new Error('No se pudo crear el usuario Auth.');
    createdUserId = created.data.user.id;

    const { error: userError } = await admin.from('usuarios').upsert({ id: createdUserId, nombre, apellido, tipo: role, activo: true, pais: 'BR', email, es_demo: demo }, { onConflict: 'id' });
    if (userError) throw userError;

    if (role === 'cliente') {
      const { error } = await admin.from('perfiles_cliente').upsert({ usuario_id: createdUserId, ciudad: 'Florianópolis' }, { onConflict: 'usuario_id' });
      if (error) throw error;
    }
    if (role === 'proveedor') {
      const verified = demo && providerVerified;
      const { error } = await admin.from('perfiles_proveedor').upsert({ usuario_id: createdUserId, ciudad_base: 'Florianópolis', estado_verificacion: verified ? 'verificado' : 'registrado', online: verified, disponible: verified, onboarding_paso: verified ? 15 : 0, onboarding_completo_at: verified ? new Date().toISOString() : null }, { onConflict: 'usuario_id' });
      if (error) throw error;
    }
    return res.status(200).json({ ok: true, user: { id: createdUserId, email, nombre, apellido, role, demo, providerVerified: role === 'proveedor' && demo && providerVerified } });
  } catch (e) {
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId).catch(() => {});
    return res.status(500).json({ error: e instanceof Error ? e.message : 'No se pudo crear el usuario.' });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type,authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (String(req.body?.action || '') === 'admin_create_user') return adminCreateUser(req, res);

  const { mode = 'admin', messages = [], system, context = {}, max_tokens = 800 } = req.body;
  try {
    const cfg = await getConfig(['api_groq_key','api_gemini_key',`hugo_prompt_${mode}`]);
    let systemPrompt = system || cfg[`hugo_prompt_${mode}`] || 'Eres Hugo, asistente de U.GO.';
    systemPrompt = injectContext(systemPrompt, context);
    const groqKey = cfg['api_groq_key'];
    const geminiKey = cfg['api_gemini_key'];

    if (geminiKey) {
      try {
        const geminiMessages = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents: geminiMessages, generationConfig: { maxOutputTokens: max_tokens, temperature: 0.7 } }), signal: AbortSignal.timeout(15000) });
        if (r.ok) { const d = await r.json(); const text = d.candidates?.[0]?.content?.parts?.[0]?.text || ''; return res.json({ content: [{ type: 'text', text }], model: 'gemini-2.0-flash', mode }); }
      } catch(e) { console.warn('[Hugo] Gemini falló:', e.message); }
    }

    if (groqKey) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, ...messages], max_tokens, temperature: 0.7, response_format: mode !== 'admin' ? { type: 'json_object' } : undefined }), signal: AbortSignal.timeout(15000) });
        if (r.ok) { const d = await r.json(); const text = d.choices?.[0]?.message?.content || ''; return res.json({ content: [{ type: 'text', text }], model: 'groq/llama-3.3-70b', mode }); }
      } catch(e) { console.warn('[Hugo] Groq falló:', e.message); }
    }
    return res.status(503).json({ error: 'Todos los modelos de IA no disponibles.' });
  } catch(e) {
    console.error('[Hugo proxy] Error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
