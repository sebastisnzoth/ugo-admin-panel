import { createClient } from '@supabase/supabase-js';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

// api/scout/places.js — TomTom principal → Geoapify → OSM Overpass → Nominatim

const SUPABASE_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_meCpkMt79S25M0nHgVv1aQ_V9AMPZEl';

const QUERIES = {
  electricista:['electrician','eletricista','electricista','electrical'],
  plomero:['plumber','encanador','plomero','plombier','hidraulica'],
  gasista:['gasista','gas fitter','instalador gas','gas technician'],
  limpeza:['cleaning','limpeza','limpieza','faxina','nettoyage'],
  chaveiro:['locksmith','chaveiro','cerrajero','serrurier'],
  cerrajero:['locksmith','chaveiro','cerrajero','serrurier'],
  pintura:['painter','pintor','pintura','peintre'],
  carpintaria:['carpenter','carpinteiro','carpintero','marcenaria'],
  jardinagem:['gardener','jardineiro','jardinero','jardinagem','paisagismo'],
  climatizacao:['hvac','air conditioning','ar condicionado','climatizacao'],
  ti_redes:['computer repair','informatica','IT services','assistencia tecnica','computer'],
  reformas:['handyman','pedreiro','reformas','builder','construcao'],
  marido_aluguel:['handyman','marido de aluguel','servicos gerais','faz tudo'],
  mudanca:['mudanca','frete','moving company','movers','transportadora'],
  automotivo:['auto repair','oficina mecanica','mecanico','car repair'],
  mecanico_geral:['mecanico','auto repair','oficina mecanica','taller mecanico','garage'],
  mecanico_eletrico:['eletrica automotiva','auto electrician','electric car repair','mecanico eletrico'],
  pintura_chapa:['funilaria','body shop','chapa y pintura','carrosserie'],
  auxilio_ruta:['socorro mecanico','roadside assistance','auxilio en ruta','guincho','grua'],
  vulcanizacion:['borracharia','gomeria','tire shop','tyre','vulcanizacion'],
  electricista_auto:['eletricista automotivo','auto electrician','electricista automotriz'],
  lavado_auto:['lava rapido','car wash','lavado de autos','lavage auto'],
};

const OVERPASS_TAGS={
  electricista:[['craft','electrician'],['shop','electrician']],
  plomero:[['craft','plumber'],['shop','plumbing']],
  gasista:[['craft','gas'],['craft','plumber']],
  limpeza:[['craft','cleaning'],['shop','laundry'],['amenity','laundry']],
  chaveiro:[['craft','locksmith'],['shop','locksmith']],
  cerrajero:[['craft','locksmith'],['shop','locksmith']],
  pintura:[['craft','painter'],['shop','paint']],
  carpintaria:[['craft','carpenter'],['shop','carpenter']],
  jardinagem:[['craft','gardener'],['shop','garden_centre']],
  climatizacao:[['craft','hvac'],['shop','hvac'],['craft','heating']],
  ti_redes:[['shop','computer'],['craft','electronics_repair']],
  reformas:[['craft','builder'],['craft','construction']],
  marido_aluguel:[['craft','handyman'],['craft','builder']],
  mudanca:[['office','moving_company'],['shop','storage_rental']],
  automotivo:[['shop','car_repair'],['amenity','car_service'],['craft','mechanic']],
  mecanico_geral:[['shop','car_repair'],['amenity','car_service'],['craft','mechanic']],
  mecanico_eletrico:[['shop','car_repair'],['amenity','car_service']],
  pintura_chapa:[['shop','car_repair'],['craft','body_builder']],
  auxilio_ruta:[['amenity','car_service'],['shop','car_repair']],
  vulcanizacion:[['shop','tyres'],['craft','tyre']],
  electricista_auto:[['shop','car_parts'],['shop','car_repair']],
  lavado_auto:[['amenity','car_wash'],['shop','car_wash']],
};

const normalize=(s='')=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const hasPhone=p=>Boolean(String(p?.phone||'').replace(/\D/g,'').length>=7);

function bearer(req){const raw=String(req.headers?.authorization||'');return raw.startsWith('Bearer ')?raw.slice(7).trim():''}
async function requireAdmin(req){
  const token=bearer(req);if(!token)throw Object.assign(new Error('Sesión Admin requerida.'),{status:401});
  const sb=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
    global:{headers:{Authorization:`Bearer ${token}`}},
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
  const{data,error}=await sb.auth.getUser(token);if(error||!data?.user)throw Object.assign(new Error('Sesión inválida o vencida.'),{status:401});
  const{data:profile,error:profileError}=await sb.from('usuarios').select('tipo,activo').eq('id',data.user.id).maybeSingle();if(profileError)throw profileError;
  if(!profile?.activo||!['admin','superadmin'].includes(String(profile.tipo)))throw Object.assign(new Error('Acceso Admin requerido.'),{status:403});
  return {user:data.user,sb};
}

function haversine(lat1,lng1,lat2,lng2){
  const R=6371000,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function targetTerms(categoria,customCat=''){
  const raw=categoria==='custom'&&customCat?[customCat]:(QUERIES[categoria]||[categoria]);
  const terms=[];
  for(const phrase of raw){
    const n=normalize(phrase).trim();
    if(n.length>=4) terms.push(n);
    for(const p of n.split(/[^a-z0-9]+/).filter(Boolean)) if(p.length>=5) terms.push(p);
  }
  return [...new Set(terms)];
}

function placeText(place){
  return normalize([
    place.name,place.address,
    ...(Array.isArray(place.categories)?place.categories:[]),
    ...(Array.isArray(place.classifications)?place.classifications:[]),
    place.datasource?.raw?.craft,place.datasource?.raw?.shop,
    place.datasource?.raw?.amenity,place.datasource?.raw?.description
  ].filter(Boolean).join(' '));
}

function matchesCategory(place,categoria,customCat=''){
  const haystack=placeText(place);
  return targetTerms(categoria,customCat).some(term=>haystack.includes(term));
}

function inferSubcategory(place,categoria){
  const text=placeText(place);
  const hit=(terms)=>terms.some(t=>text.includes(t));

  const AUTO=['auto','automot','car ','carro','veicul','vehicle','oficina','mecan','funilar','borrachar','pneu','tire','tyre','lava rapido','car wash'];
  const COMM=['comercial','commercial','empresa','company','corporat','industrial','industria','office','escritorio','loja','store','shopping','hotel','restaurant'];
  const RES=['residencial','residential','casa','home','house','apart','condominio','condominium','predio','building'];

  if(categoria==='automotivo'||categoria==='mecanico_geral') return {key:'mecanica',label:'Mecánica automotriz',confidence:'alta'};
  if(categoria==='mecanico_eletrico'||categoria==='electricista_auto') return {key:'eletrica_auto',label:'Electricidad automotriz',confidence:'alta'};
  if(categoria==='pintura_chapa') return {key:'chapa_pintura_auto',label:'Chapa y pintura automotriz',confidence:'alta'};
  if(categoria==='auxilio_ruta') return {key:'auxilio_ruta',label:'Auxilio / remolque',confidence:'alta'};
  if(categoria==='vulcanizacion') return {key:'neumaticos',label:'Neumáticos / gomería',confidence:'alta'};
  if(categoria==='lavado_auto') return {key:'lavado_auto',label:'Lavado automotriz',confidence:'alta'};

  if(categoria==='climatizacao' && hit(AUTO)) return {key:'automotriz',label:'Aire acondicionado automotriz',confidence:'alta'};
  if(categoria==='electricista' && hit(AUTO)) return {key:'automotriz',label:'Electricidad automotriz',confidence:'media'};
  if(categoria==='pintura' && hit(AUTO)) return {key:'automotriz',label:'Pintura automotriz',confidence:'media'};

  if(hit(COMM)) return {key:'comercial',label:'Empresas / comercial',confidence:'media'};
  if(hit(RES)) return {key:'residencial',label:'Casas / residencial',confidence:'media'};

  const defaults={
    climatizacao:'Climatización general',electricista:'Electricidad general',plomero:'Plomería general',gasista:'Gas general',
    limpeza:'Limpieza general',chaveiro:'Cerrajería general',cerrajero:'Cerrajería general',pintura:'Pintura general',
    carpintaria:'Carpintería general',jardinagem:'Jardinería general',ti_redes:'TI / redes general',reformas:'Reformas general',
    marido_aluguel:'Servicios generales',mudanca:'Mudanzas / fletes'
  };
  return {key:'general',label:defaults[categoria]||'General',confidence:'baja'};
}

function enrichRows(rows,categoria){
  return (rows||[]).map(p=>{
    const sub=inferSubcategory(p,categoria);
    return {...p,subcategoria:sub.key,subcategoria_label:sub.label,subcategoria_confianza:sub.confidence};
  });
}

function validRows(rows,categoria,customCat=''){
  return enrichRows(rows,categoria).filter(p=>hasPhone(p)&&matchesCategory(p,categoria,customCat)).sort((a,b)=>a.dist-b.dist);
}

async function searchTomTom(lat,lng,radius,categoria,customCat,key){
  if(!key)return[];
  const queries=categoria==='custom'&&customCat?[customCat]:(QUERIES[categoria]||[categoria]);
  const results=[],seen=new Set();
  for(const q of queries.slice(0,4)){
    try{
      const url=new URL(`https://api.tomtom.com/search/2/search/${encodeURIComponent(q)}.json`);
      Object.entries({key,lat:String(lat),lon:String(lng),radius:String(Math.min(Number(radius)||5000,50000)),limit:'50',idxSet:'POI'}).forEach(([k,v])=>url.searchParams.set(k,v));
      const r=await fetch(url,{signal:AbortSignal.timeout(10000)});
      if(!r.ok)continue;
      const d=await r.json();
      for(const p of d.results||[]){
        if(!p.position)continue;
        const id=String(p.id||`${p.position.lat}_${p.position.lon}_${q}`);
        if(seen.has(id))continue;
        const pLat=Number(p.position.lat),pLng=Number(p.position.lon);
        if(!Number.isFinite(pLat)||!Number.isFinite(pLng))continue;
        const candidate={
          id:`tt_${id}`,name:p.poi?.name||p.address?.freeformAddress||q,
          phone:p.poi?.phone||null,email:p.poi?.email||null,address:p.address?.freeformAddress||null,website:p.poi?.url||null,
          lat:pLat,lng:pLng,dist:Number.isFinite(Number(p.dist))?Number(p.dist):haversine(lat,lng,pLat,pLng),source:'tomtom',
          categories:(p.poi?.categories||[]).map(String),
          classifications:(p.poi?.classifications||[]).flatMap(c=>[c?.code,...(c?.names||[]).map(n=>n?.name)]).filter(Boolean).map(String)
        };
        if(!hasPhone(candidate)||!matchesCategory(candidate,categoria,customCat))continue;
        seen.add(id);results.push(candidate);
      }
    }catch(e){console.warn('[TomTom]',e?.message||e);}
  }
  return validRows(results,categoria,customCat);
}

async function searchGeoapify(lat,lng,radius,categoria,customCat,key){
  if(!key)return[];
  const url=new URL('https://api.geoapify.com/v2/places');
  url.searchParams.set('categories','service,commercial');
  url.searchParams.set('filter',`circle:${lng},${lat},${Math.min(Number(radius)||5000,50000)}`);
  url.searchParams.set('bias',`proximity:${lng},${lat}`);url.searchParams.set('limit','100');url.searchParams.set('lang','pt');url.searchParams.set('apiKey',key);
  try{
    const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)return[];
    const d=await r.json();
    const rows=(d.features||[]).map(f=>{
      const p=f.properties||{},coords=f.geometry?.coordinates||[];
      const pLng=Number(coords[0]??p.lon),pLat=Number(coords[1]??p.lat);if(!Number.isFinite(pLat)||!Number.isFinite(pLng))return null;
      return {id:`geo_${p.place_id||p.osm_id||`${pLat}_${pLng}`}`,name:p.name||p.address_line1||p.formatted||'Profesional',
        phone:p.contact?.phone||p.phone||p.datasource?.raw?.phone||p.datasource?.raw?.['contact:phone']||null,
        email:p.contact?.email||p.email||p.datasource?.raw?.email||p.datasource?.raw?.['contact:email']||null,
        address:p.formatted||[p.address_line1,p.address_line2].filter(Boolean).join(', ')||null,
        website:p.website||p.contact?.website||p.datasource?.raw?.website||p.datasource?.raw?.['contact:website']||null,
        lat:pLat,lng:pLng,dist:haversine(Number(lat),Number(lng),pLat,pLng),source:'geoapify',categories:p.categories||[],datasource:p.datasource||null};
    }).filter(Boolean);
    return validRows(rows,categoria,customCat);
  }catch(e){console.warn('[Geoapify]',e?.message||e);return[];}
}

async function searchOverpass(lat,lng,radius,categoria,customCat=''){
  const tags=categoria==='custom'?[]:(OVERPASS_TAGS[categoria]||[]),words=categoria==='custom'&&customCat?[customCat]:(QUERIES[categoria]||[categoria]);
  const nameRx=words.map(w=>normalize(w).replace(/[^a-z0-9]+/g,'.')).filter(Boolean).join('|');
  const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
  const run=async q=>{for(const ep of endpoints){try{const r=await fetch(ep,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(q),signal:AbortSignal.timeout(30000)});if(r.ok){const d=await r.json();if(d.elements?.length)return d.elements;}}catch{}}return[];};
  let els=[];
  if(tags.length){const parts=tags.map(([k,v])=>`node["${k}"="${v}"](around:${radius},${lat},${lng});way["${k}"="${v}"](around:${radius},${lat},${lng});`).join('');els=await run(`[out:json][timeout:30];(${parts});out center;`);}
  if(!els.length&&nameRx)els=await run(`[out:json][timeout:30];(node["name"~"${nameRx}",i](around:${radius},${lat},${lng});way["name"~"${nameRx}",i](around:${radius},${lat},${lng}););out center;`);
  const rows=els.map(el=>{const pLat=el.lat??el.center?.lat,pLng=el.lon??el.center?.lon,t=el.tags||{},name=t.name||t['name:pt']||t['name:es']||t['name:en'];if(!pLat||!pLng||!name)return null;return{id:`osm_${el.id}`,name,phone:t.phone||t['contact:phone']||t['contact:mobile']||null,email:t.email||t['contact:email']||null,address:[t['addr:street'],t['addr:housenumber'],t['addr:city']].filter(Boolean).join(', ')||null,website:t.website||t['contact:website']||null,lat:pLat,lng:pLng,dist:haversine(lat,lng,pLat,pLng),source:'osm',categories:[t.craft,t.shop,t.amenity,t.office].filter(Boolean)};}).filter(Boolean);
  return validRows(rows,categoria,customCat);
}

async function searchNominatim(lat,lng,radius,categoria,customCat=''){
  const queries=categoria==='custom'&&customCat?[customCat]:(QUERIES[categoria]||[categoria]),results=[];
  const bbox=[lat-radius/111000,lng-radius/85000,lat+radius/111000,lng+radius/85000].join(',');
  for(const q of queries.slice(0,3)){try{const url=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=20&bounded=1&viewbox=${bbox}&extratags=1`;const r=await fetch(url,{headers:{'User-Agent':'ugo-scout/2.3'},signal:AbortSignal.timeout(10000)});if(!r.ok)continue;const d=await r.json();for(const p of d){const pLat=parseFloat(p.lat),pLng=parseFloat(p.lon);if(!Number.isFinite(pLat)||!Number.isFinite(pLng))continue;results.push({id:`nom_${p.place_id}`,name:p.display_name?.split(',')[0]||q,phone:p.extratags?.phone||null,email:p.extratags?.email||p.extratags?.['contact:email']||null,address:p.display_name||null,website:p.extratags?.website||null,lat:pLat,lng:pLng,dist:haversine(lat,lng,pLat,pLng),source:'nominatim',categories:[p.type,p.class,p.extratags?.craft,p.extratags?.shop].filter(Boolean)});}}catch(e){console.warn('[Nominatim]',e?.message||e);}}
  return validRows(results,categoria,customCat);
}


const EMAIL_RX=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig;
function cleanEmail(value=''){const v=String(value||'').trim().replace(/^mailto:/i,'').split('?')[0].toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?v:''}
function isPrivateAddress(address=''){const a=String(address).toLowerCase();if(a==='::1'||a.startsWith('fc')||a.startsWith('fd')||a.startsWith('fe80:'))return true;if(!/^\d+\.\d+\.\d+\.\d+$/.test(a))return false;const [x,y]=a.split('.').map(Number);return x===10||x===127||x===0||(x===169&&y===254)||(x===172&&y>=16&&y<=31)||(x===192&&y===168)}
async function publicWebsite(raw=''){
  try{
    const value=/^https?:\/\//i.test(String(raw))?String(raw):`https://${String(raw)}`,u=new URL(value),host=u.hostname.toLowerCase();
    if(!['http:','https:'].includes(u.protocol)||!host||host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||isPrivateAddress(host))return null;
    if(isIP(host)){if(isPrivateAddress(host))return null}else{const addresses=await lookup(host,{all:true,verbatim:true});if(!addresses.length||addresses.some(x=>isPrivateAddress(x.address)))return null}
    u.username='';u.password='';u.hash='';return u
  }catch{return null}
}
function emailsFromHtml(html=''){const out=new Set();for(const m of String(html).matchAll(/mailto:([^"'<>\s?]+)/ig)){const e=cleanEmail(m[1]);if(e)out.add(e)}for(const m of String(html).matchAll(EMAIL_RX)){const e=cleanEmail(m[0]);if(e&&!/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i.test(e))out.add(e)}return [...out].filter(e=>!/(example\.com|sentry\.io|wixpress\.com|cloudflare\.com)$/i.test(e)).slice(0,5)}
async function fetchHtml(url){const r=await fetch(url,{redirect:'follow',headers:{'User-Agent':'UGO-Scout/1.0 (+business-contact-discovery)','Accept':'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(6500)});if(!r.ok)return'';const type=String(r.headers.get('content-type')||''),len=Number(r.headers.get('content-length')||0);if(type&&!/text\/html|application\/xhtml\+xml/i.test(type)||len>1500000)return'';return(await r.text()).slice(0,600000)}
async function publicEmailFromWebsite(raw){const base=await publicWebsite(raw);if(!base)return'';try{const home=await fetchHtml(base.toString());let emails=emailsFromHtml(home);if(emails[0])return emails[0];const hrefs=[...home.matchAll(/href=["']([^"']+)["']/ig)].map(m=>m[1]).filter(h=>/(contato|contact|fale-conosco|falecom|sobre|about)/i.test(h)).slice(0,3);for(const href of hrefs){try{const u=new URL(href,base);if(u.origin!==base.origin)continue;emails=emailsFromHtml(await fetchHtml(u.toString()));if(emails[0])return emails[0]}catch{}}}catch{}return''}
async function enrichEmails(sb,ids){const unique=[...new Set((Array.isArray(ids)?ids:[]).map(String))].slice(0,20);if(!unique.length)return{checked:0,found:0};const{data,error}=await sb.from('prospectos_scouts').select('id,email,website,estado,no_contactar').in('id',unique);if(error)throw error;const rows=(data||[]).filter(p=>p.estado!=='rechazado'&&!p.no_contactar&&!cleanEmail(p.email)&&p.website);let found=0;for(let i=0;i<rows.length;i+=4){const results=await Promise.all(rows.slice(i,i+4).map(async p=>({p,email:await publicEmailFromWebsite(p.website)})));for(const item of results){if(!item.email)continue;const{error:updateError}=await sb.from('prospectos_scouts').update({email:item.email}).eq('id',item.p.id);if(!updateError)found++}}return{checked:rows.length,found}}
function mailText(template,row,zona='',inviteUrl=''){let text=String(template||'').replaceAll('{nombre}',row.nombre||'profissional').replaceAll('{categoria}',row.categoria||'serviços').replaceAll('{zona}',row.ciudad||zona||'sua região').replaceAll('{invite_url}',inviteUrl);if(inviteUrl&&!text.includes(inviteUrl))text+=`\n\nCadastre-se na UGO: ${inviteUrl}`;return text.slice(0,7000)}
async function sendResend(to,subject,textBody){const key=String(process.env.RESEND_API_KEY||'').trim(),from=String(process.env.SCOUT_EMAIL_FROM||process.env.EMAIL_FROM||'').trim();if(!key||!from)throw Object.assign(new Error('Email masivo no configurado. Cargá RESEND_API_KEY y SCOUT_EMAIL_FROM.'),{status:503});const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject:String(subject||'UGO · Convite para profissionais').slice(0,180),text:textBody}),signal:AbortSignal.timeout(12000)});const payload=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(payload?.message||`Resend ${r.status}`),{status:r.status});return payload}
async function emailCampaign(sb,body){
 const ids=[...new Set((Array.isArray(body.ids)?body.ids:[]).map(String))].slice(0,25);if(!ids.length)return{sent:0,failed:0}
 const subject=String(body.subject||'UGO · Convite para profissionais'),template=String(body.message||''),zona=String(body.zona||''),baseUrl=String(body.base_url||''),campaignId=body.campaign_id?String(body.campaign_id):null
 if(!template.trim())throw Object.assign(new Error('Falta el mensaje de reclutamiento.'),{status:400})
 const{data,error}=await sb.from('prospectos_scouts').select('id,nombre,categoria,email,ciudad,estado,pipeline_etapa,contactos_intentos,contactado_at,no_contactar,invitation_token,invitation_expires_at,invitation_revoked_at,invitation_claimed_at').in('id',ids)
 if(error)throw error
 let sent=0,failed=0,skipped=0
 for(const row of data||[]){
  const email=cleanEmail(row.email)
  if(!email||row.no_contactar||row.estado==='rechazado'){failed++;continue}
  if(campaignId){const{data:member}=await sb.from('scout_campaign_members').select('ultimo_envio_at').eq('campaign_id',campaignId).eq('prospecto_id',row.id).maybeSingle();if(member?.ultimo_envio_at&&Date.now()-new Date(member.ultimo_envio_at).getTime()<36*60*60*1000){skipped++;continue}}
  const validInvite=row.invitation_token&&!row.invitation_revoked_at&&!row.invitation_claimed_at&&row.invitation_expires_at&&new Date(row.invitation_expires_at).getTime()>Date.now()
  const inviteUrl=validInvite&&baseUrl?`${baseUrl}${baseUrl.includes('?')?'&':'?'}app=recruit&invite=${encodeURIComponent(row.invitation_token)}`:''
  try{
   await sendResend(email,subject,mailText(template,row,zona,inviteUrl));sent++
   const now=new Date(),next=new Date(now.getTime()+2*24*60*60*1000)
   await sb.from('prospectos_scouts').update({estado:row.estado==='prospecto_pendiente'?'invitado':row.estado,pipeline_etapa:['nuevo','listo'].includes(row.pipeline_etapa)?'contactado':row.pipeline_etapa,contactado_at:row.contactado_at||now.toISOString(),ultimo_contacto_at:now.toISOString(),ultimo_canal:'email',contactos_intentos:Number(row.contactos_intentos||0)+1,proximo_contacto_at:next.toISOString()}).eq('id',row.id)
   await sb.from('scout_contact_events').insert({prospecto_id:row.id,campaign_id:campaignId,canal:'email',tipo:'recruitment_sent',direccion:'out',estado:'sent',mensaje:mailText(template,row,zona,inviteUrl),metadata:{invite_url:inviteUrl||null}})
   if(campaignId)await sb.from('scout_campaign_members').update({estado:'enviado',ultimo_envio_at:now.toISOString(),error:null}).eq('campaign_id',campaignId).eq('prospecto_id',row.id)
  }catch(e){
   if(Number(e?.status)===503)throw e
   failed++
   if(campaignId)await sb.from('scout_campaign_members').update({estado:'error',error:String(e instanceof Error?e.message:e).slice(0,300)}).eq('campaign_id',campaignId).eq('prospecto_id',row.id)
  }
 }
 return{sent,failed,skipped}
}

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','content-type,authorization');
  if(req.method==='OPTIONS')return res.status(200).end();if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  let auth;try{auth=await requireAdmin(req);}catch(e){const status=Number(e?.status)||500;return res.status(status>=400&&status<600?status:500).json({error:e instanceof Error?e.message:'Scout authorization failed'});}
  const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{}),action=String(body.action||'search');
  try{
    if(action==='enrich_emails')return res.status(200).json(await enrichEmails(auth.sb,body.ids));
    if(action==='email_campaign')return res.status(200).json(await emailCampaign(auth.sb,body));
  }catch(e){const status=Number(e?.status)||500;return res.status(status>=400&&status<600?status:500).json({error:e instanceof Error?e.message:'Scout action failed'});}
  const {lat,lng,radius=5000,categoria='electricista',customCat=''}=body;
  const nLat=Number(lat),nLng=Number(lng),nRadius=Math.max(500,Math.min(Number(radius)||5000,200000));
  if(!Number.isFinite(nLat)||!Number.isFinite(nLng))return res.status(400).json({error:'lat y lng requeridos'});
  try{
    let results=[],source='none';
    const tt=(process.env.TOMTOM_API_KEY||'').trim();if(tt){results=await searchTomTom(nLat,nLng,nRadius,categoria,customCat,tt);if(results.length)source='tomtom';}
    if(!results.length){const geo=(process.env.GEOAPIFY_API_KEY||'').trim();if(geo){results=await searchGeoapify(nLat,nLng,nRadius,categoria,customCat,geo);if(results.length)source='geoapify';}}
    if(!results.length){results=await searchOverpass(nLat,nLng,nRadius,categoria,customCat);if(results.length)source='osm';}
    if(!results.length){results=await searchNominatim(nLat,nLng,nRadius,categoria,customCat);if(results.length)source='nominatim';}
    const seen=new Set();const deduped=validRows(results,categoria,customCat).filter(r=>{const key=`${Math.round((r.lat||0)*1000)}_${Math.round((r.lng||0)*1000)}`;if(seen.has(key))return false;seen.add(key);return true;});
    return res.json({results:deduped.slice(0,60),total:deduped.length,source,categoria,strict:true,phoneOnly:true,subcategories:true});
  }catch(e){return res.status(500).json({error:e?.message||'Scout search failed'});}
}
