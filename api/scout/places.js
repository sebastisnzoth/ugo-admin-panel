// api/scout/places.js
// Foursquare Places API v3 → fallback Overpass OSM
// Key guardada en Supabase config_sistema, nunca expuesta al cliente

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs'
);

// Queries Overpass de respaldo
const OVERPASS_TAGS = {
  electricista:  [['craft','electrician'],['craft','electrical']],
  plomero:       [['craft','plumber'],['craft','plumbing']],
  limpeza:       [['craft','cleaning'],['shop','laundry']],
  chaveiro:      [['craft','locksmith']],
  pintura:       [['craft','painter']],
  carpintaria:   [['craft','carpenter'],['craft','joiner']],
  jardinagem:    [['craft','gardener']],
  climatizacao:  [['craft','hvac'],['craft','refrigeration']],
  ti_redes:      [['shop','computer'],['craft','electronics_repair']],
  reformas:      [['craft','builder'],['craft','construction']],
};

const NAME_REGEX = {
  electricista:  'elétric|eletric|instalação elétrica|eletricista',
  plomero:       'hidrau|encanador|plomber|desentupid',
  limpeza:       'limpeza|faxina|limpadora|clean',
  chaveiro:      'chaveiro|chaves|fechadura',
  pintura:       'pintura|pintor|reforma',
  carpintaria:   'carpintaria|marcenaria|marceneiro',
  jardinagem:    'jardim|jardineiro|paisagismo|grama',
  climatizacao:  'ar condicionado|climatização|refrigeração|hvac',
  ti_redes:      'informática|computador|assistência técnica|redes',
  reformas:      'reforma|construção|obras|pedreiro',
};

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dL = (lat2-lat1)*Math.PI/180;
  const dN = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dL/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dN/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// Queries en português para mejores resultados en Brasil
const FSQ_ASK_QUERIES = {
  electricista: 'eletricistas e instaladores elétricos',
  plomero:      'encanadores e hidráulica',
  limpeza:      'serviços de limpeza e faxina',
  chaveiro:     'chaveiros e serviços de fechadura',
  pintura:      'pintores e serviços de pintura',
  carpintaria:  'carpinteiros e marceneiros',
  jardinagem:   'jardineiros e paisagismo',
  climatizacao: 'técnicos de ar condicionado e climatização',
  ti_redes:     'assistência técnica em informática e redes',
  reformas:     'pedreiros e serviços de reforma e construção',
};

const FSQ_SEARCH_QUERIES = {
  electricista: ['eletricista', 'elétrica', 'instalação elétrica'],
  plomero:      ['encanador', 'hidráulica', 'desentupidora'],
  limpeza:      ['limpeza', 'faxina', 'limpadora'],
  chaveiro:     ['chaveiro', 'chaves'],
  pintura:      ['pintor', 'pintura'],
  carpintaria:  ['carpintaria', 'marcenaria'],
  jardinagem:   ['jardineiro', 'jardinagem'],
  climatizacao: ['ar condicionado', 'climatização'],
  ti_redes:     ['informática', 'assistência técnica'],
  reformas:     ['reforma', 'pedreiro', 'construção'],
};

// Normalizar resultado FSQ a formato común
function normalizeFSQPlace(p, lat, lng, source) {
  const geo = p.geocodes?.main || p.geocodes?.roof;
  if (!geo) return null;
  const pLat = geo.latitude, pLng = geo.longitude;
  const loc = p.location || {};
  const address = [loc.address, loc.locality, loc.region].filter(Boolean).join(', ') || '';
  const dist = p.distance || haversine(lat, lng, pLat, pLng);
  return {
    id: p.fsq_place_id || p.fsq_id || String(Math.random()),
    name: p.name,
    phone: p.tel || null,
    address: address || null,
    website: p.website || null,
    lat: pLat, lng: pLng, dist,
    rating: p.rating ? (p.rating / 2) : null,
    source,
    tags: {},
  };
}

// 1. Foursquare ASK — lenguaje natural (mejor calidad)
async function fsqAsk(lat, lng, categoria, fsqKey) {
  const askQuery = FSQ_ASK_QUERIES[categoria];
  if (!askQuery) return [];

  const url = new URL('https://places-api.foursquare.com/places/ask');
  url.searchParams.set('query', askQuery);
  url.searchParams.set('ll', `${lat},${lng}`);
  url.searchParams.set('context', 'Procurando profissional de serviços residenciais para contratar agora');
  url.searchParams.set('fields', 'fsq_place_id,name,geocodes,location,tel,website,rating,distance,categories');

  const r = await fetch(url.toString(), {
    headers: {
      'Authorization': fsqKey,
      'X-Places-Api-Version': '2025-06-17',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!r.ok) {
    const err = await r.text();
    throw new Error(`FSQ Ask ${r.status}: ${err.slice(0, 150)}`);
  }

  const data = await r.json();
  const items = (data.results || []).map(item => item.place).filter(Boolean);
  return items.map(p => normalizeFSQPlace(p, lat, lng, 'foursquare_ask')).filter(Boolean);
}

// 2. Foursquare SEARCH — por query textual (fallback)
async function fsqSearch(lat, lng, radius, categoria, fsqKey) {
  const queries = FSQ_SEARCH_QUERIES[categoria] || [categoria];
  const results = [];
  const seen = new Set();

  for (const q of queries.slice(0, 2)) {
    try {
      const url = new URL('https://places-api.foursquare.com/places/search');
      url.searchParams.set('ll', `${lat},${lng}`);
      url.searchParams.set('radius', String(Math.min(radius, 50000)));
      url.searchParams.set('query', q);
      url.searchParams.set('limit', '30');
      url.searchParams.set('fields', 'fsq_place_id,name,geocodes,location,tel,website,rating,distance');

      const r = await fetch(url.toString(), {
        headers: {
          'Authorization': fsqKey,
          'X-Places-Api-Version': '2025-06-17',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!r.ok) continue;
      const data = await r.json();
      const items = data.places || data.results || [];

      for (const p of items) {
        const norm = normalizeFSQPlace(p, lat, lng, 'foursquare_search');
        if (norm && !seen.has(norm.id)) {
          seen.add(norm.id);
          results.push(norm);
        }
      }
    } catch(e) {
      console.warn(`[FSQ Search] query "${q}":`, e.message);
    }
  }

  return results.sort((a, b) => a.dist - b.dist);
}

async function searchFoursquare(lat, lng, radius, categoria, fsqKey) {
  // Intentar Ask primero (más inteligente)
  try {
    const askResults = await fsqAsk(lat, lng, categoria, fsqKey);
    if (askResults.length > 0) {
      console.log(`[FSQ Ask] ${askResults.length} resultados para ${categoria}`);
      return askResults;
    }
  } catch(e) {
    console.warn('[FSQ Ask] falló, probando Search:', e.message);
  }

  // Fallback a Search si Ask falla o da 0
  const searchResults = await fsqSearch(lat, lng, radius, categoria, fsqKey);
  console.log(`[FSQ Search] ${searchResults.length} resultados para ${categoria}`);
  return searchResults;
}


async function searchOverpass(lat, lng, radius, categoria) {
  const tags = OVERPASS_TAGS[categoria] || [];
  const nameRx = NAME_REGEX[categoria] || '';
  const ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter',
  ];

  const tryQuery = async (query) => {
    for (const ep of ENDPOINTS) {
      try {
        const r = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query),
          signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) continue;
        const d = await r.json();
        if (d.elements?.length > 0) return d.elements;
      } catch { continue; }
    }
    return [];
  };

  const tagQuery = (rad) => {
    const parts = tags.map(([k,v]) =>
      `node["${k}"="${v}"](around:${rad},${lat},${lng});way["${k}"="${v}"](around:${rad},${lat},${lng});`
    ).join('');
    return `[out:json][timeout:30];(${parts});out center;`;
  };

  const nameQuery = (rad) =>
    `[out:json][timeout:30];(node["name"~"${nameRx}",i](around:${rad},${lat},${lng});way["name"~"${nameRx}",i](around:${rad},${lat},${lng}););out center;`;

  let elements = [];
  if (tags.length) elements = await tryQuery(tagQuery(radius));
  if (!elements.length && nameRx) elements = await tryQuery(nameQuery(radius));
  if (!elements.length && nameRx) elements = await tryQuery(nameQuery(radius * 2));

  return elements.map(el => {
    const eLat = el.lat ?? el.center?.lat;
    const eLng = el.lon ?? el.center?.lon;
    if (!eLat || !eLng) return null;
    const address = el.tags?.['addr:street']
      ? `${el.tags['addr:street']} ${el.tags['addr:housenumber']||''}`.trim()
      : el.tags?.['addr:city'] || null;
    return {
      id: String(el.id),
      name: el.tags?.name || el.tags?.['name:pt'] || `Serviço ${categoria}`,
      phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
      address,
      website: el.tags?.website || null,
      lat: eLat, lng: eLng,
      dist: haversine(lat, lng, eLat, eLng),
      rating: null, source: 'osm', tags: {},
    };
  }).filter(Boolean).sort((a, b) => a.dist - b.dist);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { lat, lng, radius = 5000, categoria = 'electricista' } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: 'lat y lng requeridos' });

  try {
    // Obtener Foursquare key desde Supabase
    const { data } = await sb.from('config_sistema')
      .select('valor').eq('clave','api_foursquare_key').single();
    const fsqKey = data?.valor?.trim();

    let results = [];
    let source = 'none';

    // 1. Foursquare (primary)
    if (fsqKey) {
      try {
        results = await searchFoursquare(lat, lng, radius, categoria, fsqKey);
        source = 'foursquare';
      } catch(e) {
        console.warn('[Scout] Foursquare error:', e.message);
      }
    }

    // 2. Overpass fallback
    if (results.length === 0) {
      results = await searchOverpass(lat, lng, radius, categoria);
      source = results.length > 0 ? 'osm' : 'none';
    }

    // Deduplicar por proximidad (< 50m = mismo lugar)
    const deduped = [];
    const seen = new Set();
    for (const r of results) {
      const key = `${Math.round(r.lat*10000)}_${Math.round(r.lng*10000)}`;
      if (!seen.has(key)) { seen.add(key); deduped.push(r); }
    }

    return res.json({
      results: deduped.slice(0, 50),
      total: deduped.length,
      source,
      categoria,
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
