// api/scout/places.js — Búsqueda global: TomTom → OSM Overpass → Nominatim
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs'
);

// ── Búsquedas multilingüales por categoría (ES + PT + EN + FR) ───
const TT_QUERIES = {
  electricista:  ['electrician','eletricista','electricista','électricien','elektrikçi'],
  plomero:       ['plumber','encanador','plomero','plombier','tesisatçı'],
  limpeza:       ['cleaning','limpeza','limpieza','nettoyage','temizlik','maid service'],
  chaveiro:      ['locksmith','chaveiro','cerrajero','serrurier'],
  pintura:       ['painter','pintor','peintre','boyacı'],
  carpintaria:   ['carpenter','carpinteiro','carpintero','menuisier','marangoz'],
  jardinagem:    ['gardener','jardineiro','jardinero','jardinier','bahçıvan'],
  climatizacao:  ['hvac','air conditioning','ar condicionado','climatización','climatisation'],
  ti_redes:      ['computer repair','informática','IT services','réparation informatique'],
  reformas:      ['handyman','builder','pedreiro','reformas','bricoleur','tamirci'],
};

// OSM tags son universales (en inglés internacionalmente)
const OVERPASS_TAGS = {
  electricista:  [['craft','electrician'],['shop','electrician']],
  plomero:       [['craft','plumber'],['shop','plumbing']],
  limpeza:       [['craft','cleaning'],['shop','laundry'],['amenity','laundry']],
  chaveiro:      [['craft','locksmith']],
  pintura:       [['craft','painter']],
  carpintaria:   [['craft','carpenter'],['shop','carpenter']],
  jardinagem:    [['craft','gardener'],['shop','garden_centre']],
  climatizacao:  [['craft','hvac'],['shop','hvac']],
  ti_redes:      [['shop','computer'],['craft','electronics_repair']],
  reformas:      [['craft','builder'],['craft','construction'],['shop','hardware']],
};

// Regex multilingüal para búsqueda por nombre
const NAME_REGEX = {
  electricista:  'electr|eletric|電気|전기',
  plomero:       'plumb|encanad|plomer|hydraul|hydrau',
  limpeza:       'clean|limpez|limpiez|nettoy|temizl|faxin',
  chaveiro:      'locks|chavei|cerraj|serrum|schloss',
  pintura:       'paint|pintor|pintur|peintr|boya',
  carpintaria:   'carpent|marcen|menuisi|marangoz|木工',
  jardinagem:    'garden|jardim|jardin|bahç|庭',
  climatizacao:  'hvac|air.cond|climatiz|ar.cond|clim|냉난방',
  ti_redes:      'comput|inform|tech|répar.inform|bilgisay',
  reformas:      'handyman|reform|builder|bricoleur|repair|tamirci',
};

function haversine(lat1,lng1,lat2,lng2){
  const R=6371000,dL=(lat2-lat1)*Math.PI/180,dN=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dN/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ── 1. TomTom ──────────────────────────────────────────────────
async function searchTomTom(lat, lng, radius, categoria, ttKey) {
  const queries = TT_QUERIES[categoria] || [categoria];
  const results = [], seen = new Set();
  for (const q of queries.slice(0, 3)) {
    try {
      const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(q)}.json?key=${ttKey}&lat=${lat}&lon=${lng}&radius=${Math.min(radius,50000)}&limit=30&idxSet=POI`;
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) continue;
      const d = await r.json();
      for (const p of (d.results||[])) {
        if (!p.position || seen.has(String(p.id))) continue;
        seen.add(String(p.id));
        const dist = p.dist ?? haversine(lat,lng,p.position.lat,p.position.lon);
        results.push({
          id: String(p.id), name: p.poi?.name||p.address?.freeformAddress||q,
          phone: p.poi?.phone||null, address: p.address?.freeformAddress||null,
          website: p.poi?.url||null, lat: p.position.lat, lng: p.position.lon, dist, source:'tomtom'
        });
      }
    } catch(e) { console.warn('[TT]', q, e.message); }
  }
  return results.sort((a,b)=>a.dist-b.dist);
}

// ── 2. Overpass OSM (global, sin restricción de país) ──────────
async function searchOverpass(lat, lng, radius, categoria) {
  const tags = OVERPASS_TAGS[categoria] || [];
  const nameRx = NAME_REGEX[categoria] || '';
  const EPS = ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
  const timeout = radius > 100000 ? 60 : 30;

  const run = async (q) => {
    for (const ep of EPS) {
      try {
        const r = await fetch(ep, { method:'POST',
          headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body:'data='+encodeURIComponent(q), signal:AbortSignal.timeout(timeout*1000) });
        if (!r.ok) continue;
        const d = await r.json();
        if (d.elements?.length) return d.elements;
      } catch { continue; }
    }
    return [];
  };

  const fmt = (el) => {
    const eLat=el.lat??el.center?.lat, eLng=el.lon??el.center?.lon;
    if (!eLat||!eLng) return null;
    const name = el.tags?.name || el.tags?.['name:en'] || el.tags?.['name:es'] || el.tags?.['name:pt'];
    if (!name) return null;
    const addr = [el.tags?.['addr:street'],el.tags?.['addr:housenumber'],el.tags?.['addr:city'],el.tags?.['addr:country']].filter(Boolean).join(', ')||null;
    return {
      id: String(el.id), name,
      phone: el.tags?.phone||el.tags?.['contact:phone']||el.tags?.['contact:mobile']||null,
      address: addr, website: el.tags?.website||el.tags?.['contact:website']||null,
      lat: eLat, lng: eLng, dist: haversine(lat,lng,eLat,eLng), source:'osm'
    };
  };

  let els = [];
  if (tags.length) {
    const p = tags.map(([k,v])=>`node["${k}"="${v}"](around:${radius},${lat},${lng});way["${k}"="${v}"](around:${radius},${lat},${lng});`).join('');
    els = await run(`[out:json][timeout:${timeout}];(${p});out center;`);
  }
  // Fallback por nombre
  if (!els.length && nameRx) {
    els = await run(`[out:json][timeout:${timeout}];(node["name"~"${nameRx}",i](around:${radius},${lat},${lng});way["name"~"${nameRx}",i](around:${radius},${lat},${lng}););out center;`);
  }
  // Ampliar zona si no hay resultados
  if (!els.length && nameRx && radius < 200000) {
    els = await run(`[out:json][timeout:${timeout}];(node["name"~"${nameRx}",i](around:${radius*3},${lat},${lng});way["name"~"${nameRx}",i](around:${radius*3},${lat},${lng}););out center;`);
  }
  return els.map(fmt).filter(Boolean).sort((a,b)=>a.dist-b.dist);
}

// ── 3. Nominatim fallback (para zonas con pocos datos OSM) ─────
async function searchNominatim(lat, lng, radius, categoria) {
  const queries = TT_QUERIES[categoria] || [categoria];
  const results = [];
  const bbox = [lat - radius/111000, lng - radius/85000, lat + radius/111000, lng + radius/85000].join(',');
  for (const q of queries.slice(0,2)) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=20&bounded=1&viewbox=${bbox}&extratags=1`;
      const r = await fetch(url, { headers:{'User-Agent':'ugo-scout/1.0'}, signal: AbortSignal.timeout(10000) });
      if (!r.ok) continue;
      const d = await r.json();
      for (const p of d) {
        if (!p.lat||!p.lon) continue;
        results.push({
          id: `nom_${p.place_id}`, name: p.display_name.split(',')[0],
          phone: p.extratags?.phone||null, address: p.display_name,
          website: p.extratags?.website||null,
          lat: parseFloat(p.lat), lng: parseFloat(p.lon),
          dist: haversine(lat,lng,parseFloat(p.lat),parseFloat(p.lon)), source:'nominatim'
        });
      }
    } catch(e) { console.warn('[Nominatim]', e.message); }
  }
  return results;
}

// ── HANDLER ────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','content-type');
  if (req.method==='OPTIONS') return res.status(200).end();
  if (req.method!=='POST') return res.status(405).json({error:'Method not allowed'});

  const { lat, lng, radius=5000, categoria='electricista' } = req.body;
  if (!lat||!lng) return res.status(400).json({error:'lat y lng requeridos'});

  try {
    let results=[], source='none';

    // 1. TomTom (si key)
    const { data:ttData } = await sb.from('config_sistema').select('valor').eq('clave','api_tomtom_key').single();
    const ttKey = ttData?.valor?.trim();
    if (ttKey) {
      results = await searchTomTom(lat, lng, radius, categoria, ttKey);
      if (results.length) source='tomtom';
    }

    // 2. Overpass OSM (global)
    if (!results.length) {
      results = await searchOverpass(lat, lng, radius, categoria);
      if (results.length) source='osm';
    }

    // 3. Nominatim fallback
    if (!results.length) {
      results = await searchNominatim(lat, lng, radius, categoria);
      if (results.length) source='nominatim';
    }

    // Deduplicar
    const seen = new Set();
    const deduped = results.filter(r => {
      const k = `${Math.round((r.lat||0)*1000)}_${Math.round((r.lng||0)*1000)}`;
      return seen.has(k) ? false : seen.add(k);
    });

    return res.json({ results: deduped.slice(0,60), total: deduped.length, source, categoria });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
