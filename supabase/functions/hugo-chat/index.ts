import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const systemPrompt = (row?.valor ?? 'Eres Hugo, el núcleo de inteligencia de U.GO. Responde en español, máximo 3 frases.') +
      (context ? `\n\nESTADO DEL SISTEMA:\n${context}` : '');

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
          ...history.slice(-6),
          { role: 'user', content: message }
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
