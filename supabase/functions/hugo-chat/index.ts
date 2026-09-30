import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SECRET_PATTERNS = [
  /\b(?:sk|sb|ghp|github_pat|xox[baprs]|AIza)[A-Za-z0-9_\-]{12,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+\/-]{12,}=*/gi,
  /\b(?:password|passwd|secret|token|api[_-]?key|service[_-]?role[_-]?key)\s*[:=]\s*["']?[^\s,;"']{4,}/gi,
  /data:[^;\s]+;base64,[A-Za-z0-9+/=]{80,}/gi,
];
function sanitizeForModel(value: unknown, max = 12000) {
  let text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  for (const pattern of SECRET_PATTERNS) text = text.replace(pattern, '[REDACTED]');
  return text.replace(/[A-Za-z0-9+/]{800,}={0,2}/g, '[REDACTED_BLOB]').trim().slice(0, max);
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { message, role = 'admin', history = [], context = '' } = await req.json();

    // Fetch system prompt from config_sistema
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: row } = await sb
      .from('config_sistema')
      .select('valor')
      .eq('clave', `hugo_prompt_${role}`)
      .single();

    const safeContext = sanitizeForModel(context, 12000);
    const safeMessage = sanitizeForModel(message, 1800);
    const safeHistory = Array.isArray(history) ? history.slice(-6).map((item) => ({ role: item?.role === 'assistant' ? 'assistant' : 'user', content: sanitizeForModel(item?.content, 1200) })) : [];
    const systemPrompt = sanitizeForModel(row?.valor ?? 'Eres Hugo, el núcleo de inteligencia de U.GO. Responde en español, máximo 3 frases.', 8000) +
      (safeContext ? `\n\nESTADO DEL SISTEMA:\n${safeContext}` : '');

    // Call Anthropic
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 400,
        system: systemPrompt,
        messages: [
          ...safeHistory,
          { role: 'user', content: safeMessage }
        ],
      }),
    });

    const data = await anthropicRes.json();

    if (data.error) throw new Error(data.error.message);

    const hugo_mensaje = data.content?.[0]?.text ?? 'Sin respuesta.';

    // Extract [ACCION:...] if present
    const accionMatch = hugo_mensaje.match(/\[ACCION:\s*([^\]]+)\]/i);
    const accion = accionMatch ? accionMatch[1].trim() : null;
    const texto = hugo_mensaje.replace(/\[ACCION:[^\]]+\]/gi, '').trim();

    return new Response(
      JSON.stringify({ hugo_mensaje: texto, accion }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ hugo_mensaje: 'Hugo no pudo responder ahora.', accion: null }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
