// api/scout/places.js
// Fuentes en cascada:
// 1. TomTom Search REST API (si key válida)
// 2. BrasilAPI CNPJ/CNAE (datos Receita Federal — gratis, sin key)
// 3. Overpass OSM (fallback final)

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://byajcqrgetloavrgyqak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs'
);

// CNAE codes for each category (Classificação Nacional de Atividades Econômicas)
const CNAE_MAP = {
  electricista: ['4321500'],        // Instalação elétrica
  plomero:      ['4322301','4322302'], // Hidráulica
  limpeza:      ['8121400','8122200'], // Limpeza
  chaveiro:     ['8011102','8020000'], // Segurança/chaveiro
  pintura:      ['4330404'],        // Pintura
  carpintaria:  ['4330402','3101200'], // Carpintaria/marcenaria
  jardinagem:   ['8130300'],        // Jardinagem/paisagismo
  climatizacao: ['4322302','3314702'], // Climatização
  ti_redes:     ['6209100','9511800'], // TI/informática
  reformas:     ['4399103','4312600'], // Reformas/construção
};

const TT_QUERIES = {
  electricista:['eletricista','instalação elétrica'],
  plomero:['encanador','hidráulica'],
  limpeza:['limpeza','faxina'],
  chaveiro:['chaveiro'],
  pintura:['pintor','pintura'],
  carpintaria:['carpintaria','marcenaria'],
  jardinagem:['jardineiro','jardinagem'],
  climatizacao:['ar condicionado','climatização'],
  ti_redes:['informática','assistência técnica'],
  reformas:['reforma','pedreiro'],
};

const NAME_REGEX = {
  electricista:'elétric|eletric|instalação',
  plomero:'hidrau|encanador|desentupid',
  limpeza:'limpeza|faxina|limpadora',
  chaveiro:'chaveiro|chaves|fechadura',
  pintura:'pintor|pintura',
  carpintaria:'carpintaria|marcenaria',
  jardinagem:'jardim|jardineiro|paisagismo',
  climatizacao:'ar condicionado|climatização|refrigeração',
  ti_redes:'informática|computador|assistência técnica',
  reformas:'reforma|pedreiro|construção',
};

const OVERPASS_TAGS = {
  electricista:[['craft','electrician'],['office','electrician']],
  plomero:[['craft','plumber']],
  limpeza:[['craft','cleaning'],['shop','laundry']],
  chaveiro:[['craft','locksmith']],
  pintura:[['craft','painter']],
  carpintaria:[['craft','carpenter']],
  jardinagem:[['craft','gardener']],
  climatizacao:[['craft','hvac']],
  ti_redes:[['shop','computer'],['craft','electronics_repair']],
  reformas:[['craft','builder'],['craft','construction']],
};

function haversine(lat1,lng1,lat2,lng2){
  const R=6371000,dL=(lat2-lat1)*Math.PI/180,dN=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dN/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ── 1. TomTom (cuando la key funciona) ────────────────────────
async function searchTomTom(lat, lng, radius, categoria, ttKey) {
  const queries = TT_QUERIES[categoria] || [categoria];
  const results = [], seen = new Set();

  for (const q of queries.slice(0,2)) {
    try {
      const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(q)}.json?key=${ttKey}&lat=${lat}&lon=${lng}&radius=${Math.min(radius,50000)}&limit=30&language=pt-BR&idxSet=POI`;
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) { console.warn('[TT]', r.status); continue; }
      const d = await r.json();
      for (const p of (d.results||[])) {
        if (!p.position || seen.has(String(p.id))) continue;
        seen.add(String(p.id));
        const dist = p.dist ?? haversine(lat,lng,p.position.lat,p.position.lon);
        results.push({ id:String(p.id), name:p.poi?.name||p.address?.freeformAddress||q,
          phone:p.poi?.phone||null, address:p.address?.freeformAddress||null,
          website:p.poi?.url||null, lat:p.position.lat, lng:p.position.lon, dist,
          rating:null, source:'tomtom' });
      }
    } catch(e) { console.warn('[TT]',q,e.message); }
  }
  return results.sort((a,b)=>a.dist-b.dist);
}

// ── 2. Brasil CNPJ/CNAE via ReceitaWS (dados Receita Federal) ──
async function searchBrasilCNPJ(lat, lng, categoria) {
  // Usa a API pública do ReceitaWS para buscar empresas por CNAE
  // Limitação: precisa de município. Usamos geocodificação reversa Nominatim
  try {
    // Primeiro: descobrir o município pelas coordenadas
    const geoR = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers:{'User-Agent':'ugo-scout/1.0'}, signal:AbortSignal.timeout(8000) }
    );
    const geo = await geoR.json();
    const city = geo.address?.city || geo.address?.town || geo.address?.municipality || 'Florianópolis';
    const state = geo.address?.state_code || geo.address?.ISO3166_2_lvl4?.split('-')[1] || 'SC';

    const cnaeList = CNAE_MAP[categoria] || [];
    if (!cnaeList.length) return [];

    const results = [];

    // Buscar por cada CNAE usando a BrasilAPI
    for (const cnae of cnaeList.slice(0,2)) {
      try {
        const url = `https://brasilapi.com.br/api/cnpj/v1/pesquisa?municipio=${encodeURIComponent(city)}&uf=${state}&cnae_principal=${cnae}&situacao=Ativa&limit=20`;
        const r = await fetch(url, { signal: AbortSignal.timeout(10000), headers:{'Accept':'application/json'} });
        if (!r.ok) continue;
        const data = await r.json();
        const items = Array.isArray(data) ? data : data.data || data.empresas || [];

        for (const emp of items.slice(0,15)) {
          const empLat = emp.latitude ? parseFloat(emp.latitude) : null;
          const empLng = emp.longitude ? parseFloat(emp.longitude) : null;
          const dist = empLat && empLng ? haversine(lat,lng,empLat,empLng) : 999999;
          const addr = [emp.logradouro, emp.numero, emp.bairro, emp.municipio].filter(Boolean).join(', ');
          results.push({
            id: emp.cnpj || String(Math.random()),
            name: emp.razao_social || emp.nome_fantasia || `Empresa ${cnae}`,
            phone: emp.ddd_telefone_1 ? `(${emp.ddd_telefone_1}) ${emp.telefone_1}` : null,
            address: addr || city,
            website: null, lat: empLat, lng: empLng, dist,
            rating: null, source: 'cnpj_br'
          });
        }
      } catch(e) { console.warn('[CNPJ]', cnae, e.message); }
    }
    // Filtrar resultados sin coordenadas pero con dados úteis
    return results.sort((a,b)=>a.dist-b.dist);
  } catch(e) {
    console.warn('[BrasilAPI]', e.message);
    return [];
  }
}

// ── 3. Overpass OSM (fallback final) ──────────────────────────
async function searchOverpass(lat, lng, radius, categoria) {
  const tags = OVERPASS_TAGS[categoria]||[];
  const nameRx = NAME_REGEX[categoria]||'';
  const EPS = ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
  const rad2 = radius*2;

  const run = async (q) => {
    for (const ep of EPS) {
      try {
        const r = await fetch(ep,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body:'data='+encodeURIComponent(q),signal:AbortSignal.timeout(20000)});
        if(!r.ok)continue;
        const d=await r.json();
        if(d.elements?.length)return d.elements;
      } catch{continue;}
    }
    return [];
  };

  const fmt = (el) => {
    const eLat=el.lat??el.center?.lat, eLng=el.lon??el.center?.lon;
    if(!eLat||!eLng||!el.tags?.name)return null;
    const addr=[el.tags?.['addr:street'],el.tags?.['addr:housenumber'],el.tags?.['addr:city']].filter(Boolean).join(' ')||null;
    return { id:String(el.id), name:el.tags.name,
      phone:el.tags.phone||el.tags?.['contact:phone']||null,
      address:addr, website:el.tags.website||null,
      lat:eLat, lng:eLng, dist:haversine(lat,lng,eLat,eLng), rating:null, source:'osm' };
  };

  let els=[];
  if(tags.length){
    const p=tags.map(([k,v])=>`node["${k}"="${v}"](around:${radius},${lat},${lng});way["${k}"="${v}"](around:${radius},${lat},${lng});`).join('');
    els=await run(`[out:json][timeout:25];(${p});out center;`);
  }
  if(!els.length&&nameRx)els=await run(`[out:json][timeout:25];(node["name"~"${nameRx}",i](around:${radius},${lat},${lng});way["name"~"${nameRx}",i](around:${radius},${lat},${lng}););out center;`);
  if(!els.length&&nameRx)els=await run(`[out:json][timeout:25];(node["name"~"${nameRx}",i](around:${rad2},${lat},${lng});way["name"~"${nameRx}",i](around:${rad2},${lat},${lng}););out center;`);
  // Búsqueda amplia: cualquier shop/craft/office con nombre relevante
  if(!els.length&&nameRx){
    const allQ=`[out:json][timeout:25];(node["shop"](around:${radius},${lat},${lng});node["craft"](around:${radius},${lat},${lng});node["office"](around:${radius},${lat},${lng}););out center;`;
    const allEls=await run(allQ);
    const rx=new RegExp(nameRx,'i');
    els=allEls.filter(e=>e.tags?.name&&rx.test(e.tags.name));
  }

  return els.map(fmt).filter(Boolean).sort((a,b)=>a.dist-b.dist);
}

// ── HANDLER ────────────────────────────────────────────────────
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','content-type');
  if(req.method==='OPTIONS')return res.status(200).end();
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});

  const{lat,lng,radius=5000,categoria='electricista',fsqDisabled}=req.body;
  if(!lat||!lng)return res.status(400).json({error:'lat y lng requeridos'});

  try{
    let results=[],source='none';

    // 1. TomTom (si key válida)
    if(!fsqDisabled){
      const{data}=await sb.from('config_sistema').select('valor').eq('clave','api_tomtom_key').single();
      const ttKey=data?.valor?.trim();
      if(ttKey){
        results=await searchTomTom(lat,lng,radius,categoria,ttKey);
        if(results.length)source='tomtom';
      }
    }

    // 2. BrasilAPI CNPJ (Receita Federal — sin key, datos reales)
    if(!results.length){
      results=await searchBrasilCNPJ(lat,lng,categoria);
      if(results.length)source='cnpj_br';
    }

    // 3. Overpass OSM
    if(!results.length){
      results=await searchOverpass(lat,lng,radius,categoria);
      if(results.length)source='osm';
    }

    // Deduplicar por proximidad geográfica
    const seen=new Set();
    const deduped=results.filter(r=>{
      const k=`${Math.round((r.lat||0)*10000)}_${Math.round((r.lng||0)*10000)}`;
      return seen.has(k)?false:seen.add(k);
    });

    return res.json({results:deduped.slice(0,50),total:deduped.length,source,categoria});

  }catch(e){
    return res.status(500).json({error:e.message});
  }
}
