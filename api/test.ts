import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://trfsjuseqjxlhrxuvdsm.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || process.env.VITE_SUPABASE_ANON_KEY
  || 'sb_publishable_bbCcM7ElzH-iGAQw8Qefzg_ZmO0sKH8';

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
    'Escuchá activamente y permití que el usuario te interrumpa.',
    audience,
    'No inventes estados, precios, personas ni pagos. Usá únicamente el contexto recibido.',
    'No ejecutes operaciones financieras ni cambios de estado desde la voz; indicá la acción visible correspondiente.',
    context ? `CONTEXTO ACTUAL DE U.G.O.: ${context}` : '',
  ].filter(Boolean).join('\n');
}

async function createRealtimeSecret(req: any, res: any) {
  const accessToken = getBearer(req);
  if (!accessToken) return res.status(401).json({ error: 'Sesión requerida' });

  const authedSb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: authData, error: authError } = await authedSb.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return res.status(401).json({ error: 'Sesión inválida' });
  }

  const requestedRole: 'client' | 'provider' = req.body?.role === 'provider' ? 'provider' : 'client';
  const expectedDbRole = requestedRole === 'provider' ? 'proveedor' : 'cliente';

  const { data: profile, error: profileError } = await authedSb
    .from('usuarios')
    .select('tipo,nombre')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Hugo Voice profile lookup failed:', profileError.message);
    return res.status(500).json({ error: `No se pudo verificar el perfil: ${profileError.message}` });
  }
  if (!profile || profile.tipo !== expectedDbRole) {
    return res.status(403).json({ error: 'El rol de la sesión no coincide con esta aplicación' });
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) return res.status(503).json({ error: 'OPENAI_API_KEY no configurada en el servidor' });

  const context = String(req.body?.context || '').slice(0, 4000);
  const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1';
  const voice = process.env.OPENAI_REALTIME_VOICE || 'marin';

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Safety-Identifier': `ugo-${authData.user.id}`,
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
      const message = payload?.error?.message || `OpenAI Realtime respondió ${response.status}`;
      console.error('Hugo Voice OpenAI error:', response.status, message);
      return res.status(502).json({ error: message });
    }

    return res.status(200).json({ value: payload.value, expires_at: payload.expires_at || null, model, voice });
  } catch (e: any) {
    console.error('Hugo Voice network error:', e?.message || e);
    return res.status(502).json({ error: e?.message || 'No se pudo contactar a OpenAI Realtime' });
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST' && (req.query?.mode === 'realtime' || req.body?.mode === 'realtime')) {
    return createRealtimeSecret(req, res);
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim() || '';
  const textModel = process.env.OPENAI_TEXT_MODEL || 'gpt-5.4-mini';
  let realtimeOk = false;
  let realtimeStatus = 0;
  let realtimeError = '';
  let textOk = false;
  let textStatus = 0;
  let textError = '';

  try {
    if (openaiKey) {
      const r = await fetch('https://api.openai.com/v1/models/gpt-realtime-2.1', {
        headers: { Authorization: `Bearer ${openaiKey}` },
      });
      realtimeStatus = r.status;
      const d: any = await r.json().catch(() => ({}));
      realtimeOk = r.ok;
      realtimeError = d?.error?.message || '';
    }
  } catch (e: any) {
    realtimeError = e?.message || String(e);
  }

  try {
    if (openaiKey) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: textModel,
          messages: [{ role: 'user', content: 'Respondé únicamente OK.' }],
        }),
      });
      textStatus = r.status;
      const d: any = await r.json().catch(() => ({}));
      textOk = r.ok && !!d?.choices?.[0]?.message?.content;
      textError = d?.error?.message || '';
    }
  } catch (e: any) {
    textError = e?.message || String(e);
  }

  return res.json({
    openai_key_configured: !!openaiKey,
    realtime_model_access: realtimeOk,
    realtime_status: realtimeStatus,
    realtime_error: realtimeError,
    text_model: textModel,
    text_model_access: textOk,
    text_status: textStatus,
    text_error: textError,
  });
}
