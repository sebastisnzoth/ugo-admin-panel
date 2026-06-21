import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://byajcqrgetloavrgyqak.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  const log = [];
  try {
    const { data } = await sb.from('config_sistema').select('valor').eq('clave','api_tomtom_key').single();
    const key = data?.valor?.trim();
    log.push({ step:'key', ok:!!key, len:key?.length, preview:key?.slice(0,10)+'...' });

    // Test TomTom con variantes de la key
    const variants = [
      { label:'key_as_is', url:`https://api.tomtom.com/search/2/search/eletricista.json?key=${key}&lat=-27.5954&lon=-48.5480&radius=5000&limit=3` },
      { label:'key_with_o', url:`https://api.tomtom.com/search/2/search/eletricista.json?key=o${key}&lat=-27.5954&lon=-48.5480&radius=5000&limit=3` },
      { label:'nearby', url:`https://api.tomtom.com/search/2/nearbySearch/.json?key=${key}&lat=-27.5954&lon=-48.5480&radius=5000&limit=3` },
    ];

    for (const v of variants) {
      try {
        const r = await fetch(v.url, { signal: AbortSignal.timeout(10000) });
        const d = await r.json();
        log.push({ step:v.label, status:r.status, results:d.results?.length??0, 
          sample:d.results?.slice(0,2).map(p=>p.poi?.name||p.address?.freeformAddress),
          error:d.httpStatusCode?d.message:undefined });
      } catch(e) { log.push({ step:v.label, error:e.message }); }
    }

    return res.json({ ok:true, log });
  } catch(e) { return res.status(500).json({ ok:false, error:e.message, log }); }
}
