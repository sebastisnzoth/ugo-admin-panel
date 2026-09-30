import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function clean(value:unknown,max=4000){return String(value??'').trim().slice(0,max)}
function sanitizeForModel(value:unknown,max=4000){
  let text=clean(value,max)
  text=text
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi,'Bearer [REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,'[REDACTED_JWT]')
    .replace(/\b(?:sk|sb_secret|service_role|ghp|github_pat|AIza)[-_A-Za-z0-9]{12,}\b/g,'[REDACTED_SECRET]')
    .replace(/\b(api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password|passwd|authorization)\b\s*[:=]\s*["']?[^\s,"'}]{6,}["']?/gi,'$1=[REDACTED]')
  return text.slice(0,max)
}

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

    const safeContext = sanitizeForModel(context, 60000);
    const systemPrompt = sanitizeForModel(row?.valor ?? 'Eres Hugo, el núcleo de inteligencia de U.GO. Responde en español, máximo 3 frases.', 12000) +
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
          ...history.slice(-6).map((item:unknown)=>{
            const record=item&&typeof item==='object'?item as Record<string,unknown>:{}
            return{role:record.role==='assistant'?'assistant':'user',content:sanitizeForModel(record.content,1200)}
          }),
          { role: 'user', content: sanitizeForModel(message,1800) }
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
      JSON.stringify({ hugo_mensaje: `Error: ${err.message}`, accion: null }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
