// api/scout/places.js
// TomTom Search API (primary) + Overpass OSM (fallback)
// TomTom soporta llamadas server-side sin timeout

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs'
);

const TT_QUERIES = {
  electricista: ['eletricista','instalação elétrica'],
  plomero:      ['encanador','hidráulica'],
  limpeza:      ['limpeza','faxina'],
  chaveiro:     ['chaveiro'],
  pintura:      ['pintor','pintura'],
  carpintaria:  ['carpintaria','marcenaria'],
  jardinagem:   ['jardineiro','jardinagem'],
  climatizacao: ['ar condicionado','climatização'],
  ti_redes:     ['informática','assistência técnica'],
  reformas:     ['reforma','pedreiro'],
};

const OVERPASS_TAGS = {
  electricista:[['craft','electrician']],plomero:[['craft','plumber']],
  limpeza:[['craft','cleaning']],chaveiro:[['craft','locksmith']],
  pintura:[['craft','painter']],carpintaria:[['craft','carpenter']],
  jardinagem:[['craft','gardener']],climatizacao:[['craft','hvac']],
  ti_redes:[['shop','computer']],reformas:[['craft','builder']],
};

const NAME_REGEX = {
  electricista:'elétric|eletric|instalação',plomero:'hidrau|encanador',
  limpeza:'limpeza|faxina',chaveiro:'chaveiro',pintura:'pintor|pintura',
  carpintaria:'carpintaria|marcenaria',jardinagem:'jardim|jardineiro',
  climatizacao:'ar condicionado|climatização',ti_redes:'informática|assistência',
  reformas:'reforma|pedreiro|construção',
};

function haversine(lat1,lng1,lat2,lng2){
  const R=6371000,dL=(lat2-lat1)*Math.PI/180,dN=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dN/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

async function searchTomTom(lat, lng, radius, categoria, ttKey) {
  const queries = TT_QUERIES[categoria] || [categoria];
  const results = [], seen = new Set();

  for (const q of queries.slice(0, 2)) {
    try {
      const url = new URL(`https://api.tomtom.com/search/2/search/${encodeURIComponent(q)}.json`);
      url.searchParams.set('key', ttKey);
      url.searchParams.set('lat', lat);
      url.searchParams.set('lon', lng);
      url.searchParams.set('radius', Math.min(radius, 50000));
      url.searchParams.set('limit', '30');
      url.searchParams.set('language', 'pt-BR');
      url.searchParams.set('idxSet', 'POI');
      url.searchParams.set('countrySet', 'BR,AR,CL,CO,MX,PE,UY,PY,BO,EC,VE');

      const r = await fetch(url.toString(), { signal: AbortSignal.timeout(12000) });
      if (!r.ok) { console.warn('[TT]', r.status); continue; }

      const d = await r.json();
      for (const p of (d.results || [])) {
        if (!p.position || seen.has(p.id)) continue;
        seen.add(p.id);
        const dist = p.dist || haversine(lat, lng, p.position.lat, p.position.lon);
        results.push({
          id: String(p.id),
          name: p.poi?.name || p.address?.freeformAddress || q,
          phone: p.poi?.phone || p.poi?.phones?.[0] || null,
          address: p.address?.freeformAddress || p.address?.municipality || null,
          website: p.poi?.url || null,
          lat: p.position.lat, lng: p.position.lon, dist,
          rating: null, source: 'tomtom',
        });
      }
    } catch(e) { console.warn('[TT query]', q, e.message); }
  }

  return results.sort((a,b) => a.dist - b.dist);
}

async function searchOverpass(lat, lng, radius, categoria) {
  const tags = OVERPASS_TAGS[categoria] || [];
  const nameRx = NAME_REGEX[categoria] || '';
  const EPS = ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];

  const run = async (q) => {
    for (const ep of EPS) {
      try {
        const r = await fetch(ep, {
          method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body:'data='+encodeURIComponent(q), signal:AbortSignal.timeout(15000),
        });
        if (!r.ok) continue;
        const d = await r.json();
        if (d.elements?.length) return d.elements;
      } catch { continue; }
    }
    return [];
  };

  const tagQ = (r) => {
    const p = tags.map(([k,v])=>`node["${k}"="${v}"](around:${r},${lat},${lng});way["${k}"="${v}"](around:${r},${lat},${lng});`).join('');
    return `[out:json][timeout:25];(${p});out center;`;
  };
  const nameQ = (r) => `[out:json][timeout:25];(node["name"~"${nameRx}",i](around:${r},${lat},${lng});way["name"~"${nameRx}",i](around:${r},${lat},${lng}););out center;`;

  let els = [];
  if (tags.length) els = await run(tagQ(radius));
  if (!els.length && nameRx) els = await run(nameQ(radius));
  if (!els.length && nameRx) els = await run(nameQ(radius*2));

  return els.map(el => {
    const eLat = el.lat ?? el.center?.lat, eLng = el.lon ?? el.center?.lon;
    if (!eLat || !eLng) return null;
    return {
      id: String(el.id),
      name: el.tags?.name || el.tags?.['name:pt'] || `Serviço ${categoria}`,
      phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
      address: el.tags?.['addr:street'] ? `${el.tags['addr:street']} ${el.tags['addr:housenumber']||''}`.trim() : null,
      website: el.tags?.website || null,
      lat: eLat, lng: eLng, dist: haversine(lat, lng, eLat, eLng),
      rating: null, source: 'osm',
    };
  }).filter(Boolean).sort((a,b)=>a.dist-b.dist);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { lat, lng, radius = 5000, categoria = 'electricista', fsqDisabled } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: 'lat y lng requeridos' });

  try {
    let results = [], source = 'none';

    if (!fsqDisabled) {
      const { data } = await sb.from('config_sistema').select('valor').eq('clave','api_tomtom_key').single();
      const ttKey = data?.valor?.trim();

      if (ttKey) {
        results = await searchTomTom(lat, lng, radius, categoria, ttKey);
        if (results.length) source = 'tomtom';
      }
    }

    if (!results.length) {
      results = await searchOverpass(lat, lng, radius, categoria);
      source = results.length ? 'osm' : 'none';
    }

    // Deduplicar
    const seen = new Set();
    const deduped = results.filter(r => {
      const k = `${Math.round(r.lat*10000)}_${Math.round(r.lng*10000)}`;
      return seen.has(k) ? false : seen.add(k);
    });

    return res.json({ results: deduped.slice(0,50), total: deduped.length, source, categoria });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
