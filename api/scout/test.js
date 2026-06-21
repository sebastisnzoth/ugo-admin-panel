// api/scout/test.js — diagnóstico TomTom
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs'
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const log = [];

  try {
    const { data } = await sb.from('config_sistema').select('valor').eq('clave','api_tomtom_key').single();
    const key = data?.valor?.trim();
    log.push({ step:'key', ok:!!key, preview: key?.slice(0,8)+'...' });

    // Test 1: Fuzzy search sin restricciones
    const url1 = `https://api.tomtom.com/search/2/search/eletricista.json?key=${key}&lat=-27.5954&lon=-48.5480&radius=10000&limit=5&language=pt-BR`;
    const r1 = await fetch(url1, { signal: AbortSignal.timeout(12000) });
    const d1 = await r1.json();
    log.push({ step:'fuzzy_basic', status:r1.status, results:d1.results?.length??0, raw:JSON.stringify(d1).slice(0,400) });

    // Test 2: Nearby search sin categoría
    const url2 = `https://api.tomtom.com/search/2/nearbySearch/.json?key=${key}&lat=-27.5954&lon=-48.5480&radius=5000&limit=5`;
    const r2 = await fetch(url2, { signal: AbortSignal.timeout(12000) });
    const d2 = await r2.json();
    log.push({ step:'nearby_all', status:r2.status, results:d2.results?.length??0, sample:d2.results?.slice(0,2).map(p=>p.poi?.name||p.address?.freeformAddress) });

    // Test 3: POI search
    const url3 = `https://api.tomtom.com/search/2/poiSearch/electricista.json?key=${key}&lat=-27.5954&lon=-48.5480&radius=10000&limit=5&language=pt-BR`;
    const r3 = await fetch(url3, { signal: AbortSignal.timeout(12000) });
    const d3 = await r3.json();
    log.push({ step:'poi_search', status:r3.status, results:d3.results?.length??0, sample:d3.results?.slice(0,2).map(p=>p.poi?.name) });

    // Test 4: Sin restricción de país ni categoría — buscar "eletric" genérico
    const url4 = `https://api.tomtom.com/search/2/search/eletric.json?key=${key}&lat=-27.5954&lon=-48.5480&radius=20000&limit=5`;
    const r4 = await fetch(url4, { signal: AbortSignal.timeout(12000) });
    const d4 = await r4.json();
    log.push({ step:'fuzzy_broad', status:r4.status, results:d4.results?.length??0, sample:d4.results?.slice(0,3).map(p=>({name:p.poi?.name||p.address?.freeformAddress,type:p.type})) });

    return res.json({ ok:true, log });
  } catch(e) {
    return res.status(500).json({ ok:false, error:e.message, log });
  }
}
