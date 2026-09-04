// api/scout/places.js — Geoapify principal → OSM Overpass → Nominatim

const QUERIES = {
  electricista: ['electrician','eletricista','electricista','électricien'],
  plomero: ['plumber','encanador','plomero','plombier','hidráulica'],
  gasista: ['gasista','gas fitter','instalador gas','gas technician'],
  limpeza: ['cleaning','limpeza','limpieza','faxina','nettoyage'],
  cerrajero: ['locksmith','chaveiro','cerrajero','serrurier'],
  pintura: ['painter','pintor','pintura','peintre'],
  carpintaria: ['carpenter','carpinteiro','carpintero','marcenaria'],
  jardinagem: ['gardener','jardineiro','jardinero','jardinagem'],
  climatizacao: ['hvac','air conditioning','ar condicionado','climatização'],
  ti_redes: ['computer repair','informática','IT services','assistência técnica'],
  reformas: ['handyman','pedreiro','reformas','builder','construção'],
  mecanico_geral: ['mecânico','mecanico','auto repair','oficina mecânica','taller mecánico','garage'],
  mecanico_eletrico: ['elétrica automotiva','auto electrician','electric car repair','mecánico eléctrico'],
  pintura_chapa: ['funilaria','body shop','chapa y pintura','carrosserie'],
  auxilio_ruta: ['socorro mecânico','roadside assistance','auxilio en ruta','guincho','grua'],
  vulcanizacion: ['borracharia','gomería','tire shop','tyre','vulcanización'],
  electricista_auto: ['eletricista automotivo','auto electrician','electricista automotriz'],
  lavado_auto: ['lava rápido','car wash','lavado de autos','lavage auto'],
};

const OVERPASS_TAGS = {
  electricista: [['craft','electrician'],['shop','electrician']],
  plomero: [['craft','plumber'],['shop','plumbing']],
  gasista: [['craft','gas'],['craft','plumber']],
  limpeza: [['craft','cleaning'],['shop','laundry'],['amenity','laundry']],
  cerrajero: [['craft','locksmith'],['shop','locksmith']],
  pintura: [['craft','painter'],['shop','paint']],
  carpintaria: [['craft','carpenter'],['shop','carpenter']],
  jardinagem: [['craft','gardener'],['shop','garden_centre']],
  climatizacao: [['craft','hvac'],['shop','hvac'],['craft','heating']],
  ti_redes: [['shop','computer'],['craft','electronics_repair']],
  reformas: [['craft','builder'],['craft','construction'],['shop','hardware']],
  mecanico_geral: [['shop','car_repair'],['amenity','car_service'],['craft','mechanic']],
  mecanico_eletrico: [['shop','car_repair'],['amenity','car_service']],
  pintura_chapa: [['shop','car_repair'],['craft','body_builder']],
  auxilio_ruta: [['amenity','car_service'],['shop','car_repair']],
  vulcanizacion: [['shop','tyres'],['craft','tyre']],
  electricista_auto: [['shop','car_parts'],['shop','car_repair']],
  lavado_auto: [['amenity','car_wash'],['shop','car_wash']],
};

function haversine(lat1,lng1,lat2,lng2){
  const R=6371000,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function normalize(s=''){
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}

function matchesCategory(place,categoria,customCat=''){
  const words = categoria==='custom' && customCat ? [customCat] : (QUERIES[categoria] || [categoria]);
  const haystack = normalize([
    place.name, place.address, place.categories?.join?.(' '), place.datasource?.raw?.craft,
    place.datasource?.raw?.shop, place.datasource?.raw?.amenity
  ].filter(Boolean).join(' '));
  return words.some(w=>{
    const parts=normalize(w).split(/\s+/).filter(p=>p.length>2);
    return parts.length && parts.some(p=>haystack.includes(p));
  });
}

async function searchGeoapify(lat,lng,radius,categoria,customCat,key){
  if(!key) return [];
  const url = new URL('https://api.geoapify.com/v2/places');
  // service + commercial da amplitud; UGO filtra la profesión por nombre/tags.
  url.searchParams.set('categories','service,commercial');
  url.searchParams.set('filter',`circle:${lng},${lat},${Math.min(Number(radius)||5000,50000)}`);
  url.searchParams.set('bias',`proximity:${lng},${lat}`);
  url.searchParams.set('limit','100');
  url.searchParams.set('lang','pt');
  url.searchParams.set('apiKey',key);

  try{
    const r=await fetch(url,{signal:AbortSignal.timeout(12000)});
    if(!r.ok){ console.warn('[Geoapify]',r.status); return []; }
    const d=await r.json();
    const rows=(d.features||[]).map((f)=>{
      const p=f.properties||{};
      const coords=f.geometry?.coordinates||[];
      const pLng=Number(coords[0]??p.lon), pLat=Number(coords[1]??p.lat);
      if(!Number.isFinite(pLat)||!Number.isFinite(pLng)) return null;
      const phone = p.contact?.phone || p.phone || p.datasource?.raw?.phone || p.datasource?.raw?.['contact:phone'] || null;
      const website = p.website || p.contact?.website || p.datasource?.raw?.website || p.datasource?.raw?.['contact:website'] || null;
      return {
        id:`geo_${p.place_id||p.osm_id||`${pLat}_${pLng}`}`,
        name:p.name||p.address_line1||p.formatted||'Profesional',
        phone,
        address:p.formatted||[p.address_line1,p.address_line2].filter(Boolean).join(', ')||null,
        website,
        lat:pLat,
        lng:pLng,
        dist:haversine(Number(lat),Number(lng),pLat,pLng),
        source:'geoapify',
        categories:p.categories||[],
        datasource:p.datasource||null,
      };
    }).filter(Boolean);

    return rows.filter(p=>matchesCategory(p,categoria,customCat)).sort((a,b)=>a.dist-b.dist);
  }catch(e){
    console.warn('[Geoapify]',e?.message||e);
    return [];
  }
}

async function searchOverpass(lat,lng,radius,categoria,customCat=''){
  const tags = categoria==='custom' ? [] : (OVERPASS_TAGS[categoria]||[]);
  const words = categoria==='custom' && customCat ? [customCat] : (QUERIES[categoria]||[categoria]);
  const nameRx = words.map(w=>normalize(w).replace(/[^a-z0-9]+/g,'.')).filter(Boolean).join('|');
  const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
  const timeout=Number(radius)>100000?60:30;

  const run=async(q)=>{
    for(const ep of endpoints){
      try{
        const r=await fetch(ep,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(q),signal:AbortSignal.timeout(timeout*1000)});
        if(!r.ok) continue;
        const d=await r.json();
        if(d.elements?.length) return d.elements;
      }catch{}
    }
    return [];
  };

  let els=[];
  if(tags.length){
    const parts=tags.map(([k,v])=>`node["${k}"="${v}"](around:${radius},${lat},${lng});way["${k}"="${v}"](around:${radius},${lat},${lng});`).join('');
    els=await run(`[out:json][timeout:${timeout}];(${parts});out center;`);
  }
  if(!els.length && nameRx){
    els=await run(`[out:json][timeout:${timeout}];(node["name"~"${nameRx}",i](around:${radius},${lat},${lng});way["name"~"${nameRx}",i](around:${radius},${lat},${lng}););out center;`);
  }

  return els.map(el=>{
    const pLat=el.lat??el.center?.lat,pLng=el.lon??el.center?.lon,t=el.tags||{};
    const name=t.name||t['name:pt']||t['name:es']||t['name:en'];
    if(!pLat||!pLng||!name) return null;
    return {
      id:`osm_${el.id}`,name,
      phone:t.phone||t['contact:phone']||t['contact:mobile']||null,
      address:[t['addr:street'],t['addr:housenumber'],t['addr:city']].filter(Boolean).join(', ')||null,
      website:t.website||t['contact:website']||null,
      lat:pLat,lng:pLng,dist:haversine(lat,lng,pLat,pLng),source:'osm'
    };
  }).filter(Boolean).sort((a,b)=>a.dist-b.dist);
}

async function searchNominatim(lat,lng,radius,categoria,customCat=''){
  const queries=categoria==='custom'&&customCat?[customCat]:(QUERIES[categoria]||[categoria]);
  const results=[];
  const bbox=[lat-radius/111000,lng-radius/85000,lat+radius/111000,lng+radius/85000].join(',');
  for(const q of queries.slice(0,2)){
    try{
      const url=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=20&bounded=1&viewbox=${bbox}&extratags=1`;
      const r=await fetch(url,{headers:{'User-Agent':'ugo-scout/2.0'},signal:AbortSignal.timeout(10000)});
      if(!r.ok) continue;
      const d=await r.json();
      for(const p of d){
        const pLat=parseFloat(p.lat),pLng=parseFloat(p.lon);
        if(!Number.isFinite(pLat)||!Number.isFinite(pLng)) continue;
        results.push({id:`nom_${p.place_id}`,name:p.display_name?.split(',')[0]||q,phone:p.extratags?.phone||null,address:p.display_name||null,website:p.extratags?.website||null,lat:pLat,lng:pLng,dist:haversine(lat,lng,pLat,pLng),source:'nominatim'});
      }
    }catch(e){ console.warn('[Nominatim]',e?.message||e); }
  }
  return results.sort((a,b)=>a.dist-b.dist);
}

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','content-type');
  if(req.method==='OPTIONS') return res.status(200).end();
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});

  const {lat,lng,radius=5000,categoria='electricista',customCat=''}=req.body||{};
  const nLat=Number(lat),nLng=Number(lng),nRadius=Math.max(500,Math.min(Number(radius)||5000,200000));
  if(!Number.isFinite(nLat)||!Number.isFinite(nLng)) return res.status(400).json({error:'lat y lng requeridos'});

  try{
    let results=[],source='none';

    const geoKey=(process.env.GEOAPIFY_API_KEY||'').trim();
    if(geoKey){
      results=await searchGeoapify(nLat,nLng,nRadius,categoria,customCat,geoKey);
      if(results.length) source='geoapify';
    }

    if(!results.length){
      results=await searchOverpass(nLat,nLng,nRadius,categoria,customCat);
      if(results.length) source='osm';
    }

    if(!results.length){
      results=await searchNominatim(nLat,nLng,nRadius,categoria,customCat);
      if(results.length) source='nominatim';
    }

    const seen=new Set();
    const deduped=results.filter(r=>{
      const key=`${Math.round((r.lat||0)*1000)}_${Math.round((r.lng||0)*1000)}`;
      if(seen.has(key)) return false;
      seen.add(key); return true;
    });

    return res.json({results:deduped.slice(0,60),total:deduped.length,source,categoria});
  }catch(e){
    return res.status(500).json({error:e?.message||'Scout search failed'});
  }
}
