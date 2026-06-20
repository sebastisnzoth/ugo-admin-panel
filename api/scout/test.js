// api/scout/test.js — endpoint temporal de diagnóstico
// BORRAR después de verificar que funciona

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs'
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const log = [];

  try {
    // 1. Verificar key en Supabase
    const { data } = await sb.from('config_sistema').select('clave,valor')
      .in('clave', ['api_foursquare_key']);
    const fsqKey = data?.[0]?.valor?.trim();
    log.push({ step: '1_supabase_key', ok: !!fsqKey, preview: fsqKey?.slice(0,8)+'...' });

    if (!fsqKey) {
      return res.json({ ok: false, log, error: 'No hay key en config_sistema' });
    }

    // 2. Test FSQ Ask
    try {
      const url = new URL('https://places-api.foursquare.com/places/ask');
      url.searchParams.set('query', 'eletricistas em Florianópolis');
      url.searchParams.set('ll', '-27.5954,-48.5480');
      url.searchParams.set('fields', 'fsq_place_id,name,tel,location');

      const r = await fetch(url.toString(), {
        headers: {
          'Authorization': fsqKey,
          'X-Places-Api-Version': '2025-06-17',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      const body = await r.text();
      let parsed = null;
      try { parsed = JSON.parse(body); } catch {}

      log.push({
        step: '2_fsq_ask',
        status: r.status,
        ok: r.ok,
        results: parsed?.results?.length ?? 0,
        raw_preview: body.slice(0, 300),
      });
    } catch(e) {
      log.push({ step: '2_fsq_ask', ok: false, error: e.message });
    }

    // 3. Test FSQ Search
    try {
      const url2 = new URL('https://places-api.foursquare.com/places/search');
      url2.searchParams.set('ll', '-27.5954,-48.5480');
      url2.searchParams.set('query', 'eletricista');
      url2.searchParams.set('radius', '10000');
      url2.searchParams.set('limit', '5');
      url2.searchParams.set('fields', 'fsq_place_id,name,tel');

      const r2 = await fetch(url2.toString(), {
        headers: {
          'Authorization': fsqKey,
          'X-Places-Api-Version': '2025-06-17',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      const body2 = await r2.text();
      let parsed2 = null;
      try { parsed2 = JSON.parse(body2); } catch {}

      log.push({
        step: '3_fsq_search',
        status: r2.status,
        ok: r2.ok,
        places: parsed2?.places?.length ?? parsed2?.results?.length ?? 0,
        raw_preview: body2.slice(0, 300),
      });
    } catch(e) {
      log.push({ step: '3_fsq_search', ok: false, error: e.message });
    }

    return res.json({ ok: true, log });

  } catch(e) {
    return res.status(500).json({ ok: false, error: e.message, log });
  }
}
