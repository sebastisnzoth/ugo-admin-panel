// ScoutSection.tsx — Scout Radar con Leaflet + teardrop pins
import React, { useState, useEffect, useRef, useCallback } from 'react';

declare const L: any;

const SB_URL = 'https://byajcqrgetloavrgyqak.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs';

// Categorías con label en ES / PT / EN
const CAT_CONFIG: Record<string,{label:string;emoji:string;grupo:string}> = {
  // ── HOGAR ──────────────────────────────────────────────────
  electricista:      {label:'Electricista · Eletricista',       emoji:'⚡',  grupo:'🏠 Hogar'},
  plomero:           {label:'Plomero · Encanador · Hidráulica', emoji:'🚿',  grupo:'🏠 Hogar'},
  limpeza:           {label:'Limpieza · Faxina',                emoji:'🧹',  grupo:'🏠 Hogar'},
  chaveiro:          {label:'Chaveiro · Cerrajero · Locksmith',  emoji:'🔑',  grupo:'🏠 Hogar'},
  pintura:           {label:'Pintura · Pintor',                  emoji:'🎨',  grupo:'🏠 Hogar'},
  carpintaria:       {label:'Carpintaria · Marcenaria',          emoji:'🪚',  grupo:'🏠 Hogar'},
  jardinagem:        {label:'Jardinagem · Paisagismo',           emoji:'🌿',  grupo:'🏠 Hogar'},
  climatizacao:      {label:'Climatização · AC · HVAC',         emoji:'❄️',  grupo:'🏠 Hogar'},
  ti_redes:          {label:'TI · Informática · Redes',          emoji:'💻',  grupo:'🏠 Hogar'},
  reformas:          {label:'Reformas · Construção',             emoji:'🏗️', grupo:'🏠 Hogar'},
  marido_aluguel:    {label:'Marido de Aluguel · Serv. Gerais',  emoji:'🛠️', grupo:'🏠 Hogar'},
  mudanca:           {label:'Mudança · Frete',                   emoji:'📦',  grupo:'🏠 Hogar'},
  // ── AUTOMOTIVO ─────────────────────────────────────────────
  automotivo:        {label:'Automotivo (todos os serviços)',    emoji:'🚗',  grupo:'🚗 Automotivo'},
  // ── PERSONALIZADO ──────────────────────────────────────────
  custom:            {label:'✏️ Categoría personalizada...',    emoji:'🔍',  grupo:'⚙️ Personalizado'},
};

const fmtD = (d:number) => d<1000?Math.round(d)+'m':(d/1000).toFixed(1)+'km';
const pinColor = (hasPhone:boolean, dist:number) =>
  hasPhone && dist < 2000 ? '#05944F' : hasPhone ? '#F59E0B' : dist < 2000 ? '#E11900' : '#9CA3AF';

function makePin(color:string, emoji:string, size=30) {
  const tail = Math.round(size*0.4);
  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,.28));">
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid #FFF;
        display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*.43)}px;">
        ${emoji}</div>
      <div style="width:0;height:0;border-left:${tail}px solid transparent;border-right:${tail}px solid transparent;
        border-top:${Math.round(tail*1.4)}px solid ${color};margin-top:-2px;"></div>
    </div>`,
    className:'',
    iconSize:[size, size+Math.round(tail*1.4)+2],
    iconAnchor:[size/2, size+Math.round(tail*1.4)+2],
    popupAnchor:[0,-(size+Math.round(tail*1.4)+2)],
  });
}

type Provider = {id:string;name:string;phone?:string;address?:string;lat:number;lng:number;dist:number;website?:string;source?:string};

const S = {
  card:{background:'#FFF',border:'1px solid rgba(0,0,0,.1)',borderRadius:'12px',padding:'12px',boxShadow:'0 1px 4px rgba(0,0,0,.06)'},
  lbl:{fontSize:'9px',fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'.6px',color:'rgba(0,0,0,.45)',marginBottom:'4px',display:'block'},
  inp:{width:'100%',padding:'8px 12px',border:'1.5px solid rgba(0,0,0,.15)',borderRadius:'8px',fontSize:'12px',fontFamily:'Inter,sans-serif',outline:'none',background:'#F8F9FA',color:'#111'},
  sel:{width:'100%',padding:'8px 12px',border:'1.5px solid rgba(0,0,0,.15)',borderRadius:'8px',fontSize:'12px',fontFamily:'Inter,sans-serif',outline:'none',background:'#F8F9FA',color:'#111',cursor:'pointer'},
  btn:(v='p')=>({padding:'8px 16px',borderRadius:'50px',border:'none',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:'11px',fontWeight:700,
    background:v==='p'?'#05944F':v==='wa'?'#25D366':'rgba(0,0,0,.07)',
    color:v==='p'||v==='wa'?'#FFF':'#111',transition:'all .15s',whiteSpace:'nowrap'} as React.CSSProperties),
};

export function SecScout() {
  const [lat,setLat]           = useState(-27.5954);
  const [lng,setLng]           = useState(-48.5480);
  const [locLabel,setLocLabel] = useState('Florianópolis, SC (predeterminado)');
  const [addrInput,setAddrInput] = useState('');
  const [addrLoading,setAddrLoading] = useState(false);
  const [cat,setCat]           = useState('electricista');
  const [radius,setRadius]     = useState('5000');
  const [loading,setLoading]   = useState(false);
  const [loadMsg,setLoadMsg]   = useState('');
  const [results,setResults]   = useState<Provider[]>([]);
  const [selected,setSelected] = useState<Provider|null>(null);
  const [outreach,setOutreach] = useState<{type:'wa'|'email';text:string}|null>(null);
  const [genLoading,setGenLoading] = useState(false);
  const [manualPhone,setManualPhone] = useState('');
  const [added,setAdded]       = useState<Set<string>>(new Set());
  const [contacted,setContacted] = useState<Set<string>>(new Set());
  const [prospectos,setProspectos] = useState<any[]>([]);
  const [approving,setApproving] = useState<string|null>(null);
  const [selMap,setSelMap]       = useState<Set<string>>(new Set());
  const [bulkLoading,setBulkLoading] = useState(false);
  const [stats,setStats]       = useState({found:0,contacted:0,joined:0});
  const [customCat,setCustomCat] = useState('');
  const [leafletReady,setLeafletReady] = useState(false);

  const mapRef    = useRef<HTMLDivElement>(null);
  const mapInst   = useRef<any>(null);
  const markers   = useRef<any[]>([]);
  const centerMk  = useRef<any>(null);

  // ── Leaflet init ─────────────────────────────────────────────
  useEffect(() => {
    if ((window as any).L) { setLeafletReady(true); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInst.current) return;
    const map = L.map(mapRef.current, { center:[-27.5954,-48.5480], zoom:13, zoomControl:true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:'© OpenStreetMap contributors', maxZoom:19
    }).addTo(map);
    mapInst.current = map;
    [100,400,800].forEach(t => setTimeout(()=>map.invalidateSize(),t));
    setCenter(-27.5954,-48.5480);
  }, [leafletReady]);

  const setCenter = useCallback((la:number,lo:number) => {
    const map = mapInst.current; if (!map) return;
    if (centerMk.current) map.removeLayer(centerMk.current);
    centerMk.current = L.marker([la,lo], { icon: L.divIcon({
      html:'<div style="width:16px;height:16px;border-radius:50%;background:#111;border:3px solid #FFF;box-shadow:0 0 0 4px rgba(17,17,17,.15);"></div>',
      className:'',iconSize:[16,16],iconAnchor:[8,8]
    })}).addTo(map);
    map.setView([la,lo],14);
  },[]);

  // ── Carga prospectos ──────────────────────────────────────────
  const loadProspectos = useCallback(async () => {
    const r = await fetch(`${SB_URL}/rest/v1/prospectos_scouts?order=created_at.desc&limit=50`,{
      headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`}});
    const data = await r.json();
    if (Array.isArray(data)) {
      setProspectos(data);
      setStats({found:data.length,contacted:data.filter((p:any)=>p.estado==='invitado').length,joined:data.filter((p:any)=>p.estado==='aprobado').length});
    }
  },[]);
  useEffect(()=>{ loadProspectos(); loadDbProviders(); },[loadProspectos]);

  // ── Carga proveedores de Supabase para mostrar en mapa ───────
  const loadDbProviders = useCallback(async () => {
    const r = await fetch(`${SB_URL}/rest/v1/vista_todos_proveedores?select=id,nombre,lat,lng,categoria,cat_emoji,pin_color,estado_mapa,telefono,zona`,{
      headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`}});
    const data = await r.json();
    if (!Array.isArray(data)||!mapInst.current) return;
    // Capa separada de proveedores DB (pines más pequeños)
    data.forEach((p:any) => {
      const sz=24, tail=Math.round(sz*.4);
      const mk = L.marker([p.lat,p.lng],{icon:L.divIcon({
        html:`<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,.25));opacity:.85;">
          <div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${p.pin_color||'#6B7280'};border:2px solid #FFF;display:flex;align-items:center;justify-content:center;font-size:${Math.round(sz*.43)}px;">${p.cat_emoji||'📍'}</div>
          <div style="width:0;height:0;border-left:${tail}px solid transparent;border-right:${tail}px solid transparent;border-top:${Math.round(tail*1.4)}px solid ${p.pin_color||'#6B7280'};margin-top:-1px;"></div>
        </div>`,className:'',iconSize:[sz,sz+Math.round(tail*1.4)+1],iconAnchor:[sz/2,sz+Math.round(tail*1.4)+1],popupAnchor:[0,-(sz+Math.round(tail*1.4)+1)]
      }),zIndexOffset:-100}).addTo(mapInst.current);
      mk.bindPopup(`<div style="font-family:Inter,sans-serif;min-width:140px;padding:2px;">
        <div style="font-size:9px;font-weight:700;color:#276EF1;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;">✅ Registrado en U.GO</div>
        <div style="font-weight:700;font-size:12px;">${p.nombre}</div>
        <div style="font-size:10px;color:#666;">${p.cat_emoji||''} ${p.categoria||'—'}${p.telefono?` · 📱 ${p.telefono}`:''}</div>
        <div style="font-size:10px;color:${p.pin_color||'#666'};margin-top:3px;">${p.estado_mapa==='online'?'🟢 Online':p.estado_mapa==='offline'?'🟡 Offline':'🔴 Inactivo'}</div>
        ${p.zona?`<div style="font-size:9px;color:#aaa;margin-top:2px;">📍 ${p.zona}</div>`:''}
      </div>`);
    });
  },[]);

  // ── GPS ───────────────────────────────────────────────────────
  const getGPS = () => {
    setLocLabel('Detectando GPS...');
    navigator.geolocation?.getCurrentPosition(
      p => { setLat(p.coords.latitude); setLng(p.coords.longitude); setCenter(p.coords.latitude,p.coords.longitude);
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${p.coords.latitude}&lon=${p.coords.longitude}&format=json`,{headers:{'User-Agent':'ugo-scout/1.0'}})
          .then(r=>r.json()).then(d=>{ const parts=[d.address?.suburb||d.address?.neighbourhood,d.address?.city||d.address?.town].filter(Boolean); setLocLabel(parts.join(', ')||d.display_name.split(',')[0]); }).catch(()=>{}); },
      () => setLocLabel('Florianópolis, SC (GPS denegado)')
    );
  };

  // ── Geocodificar dirección ────────────────────────────────────
  const geocode = async () => {
    if (!addrInput.trim()) return;
    setAddrLoading(true);
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addrInput)}&format=json&limit=1&addressdetails=1`,{headers:{'User-Agent':'ugo-scout/1.0'}});
    const d = await r.json();
    if (d[0]) {
      const la=parseFloat(d[0].lat), lo=parseFloat(d[0].lon);
      setLat(la); setLng(lo); setCenter(la,lo);
      const parts=[d[0].address?.suburb||d[0].address?.neighbourhood,d[0].address?.city||d[0].address?.town||d[0].address?.municipality].filter(Boolean);
      setLocLabel(parts.join(', ')||d[0].display_name.split(',').slice(0,3).join(','));
      setAddrInput('');
    } else {
      // Try without country restriction
      const r2 = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addrInput)}&format=json&limit=3&addressdetails=1`,{headers:{'User-Agent':'ugo-scout/1.0'}});
      const d2 = await r2.json();
      if (d2[0]) {
        const la=parseFloat(d2[0].lat), lo=parseFloat(d2[0].lon);
        setLat(la); setLng(lo); setCenter(la,lo);
        const parts=[d2[0].address?.city||d2[0].address?.town||d2[0].address?.municipality,d2[0].address?.country].filter(Boolean);
        setLocLabel(parts.join(', ')||d2[0].display_name.split(',').slice(0,3).join(','));
        setAddrInput('');
      } else alert('No encontrado. Probá con: "Buenos Aires, Argentina" o "Santiago, Chile"');
    }
    setAddrLoading(false);
  };

  // ── Buscar proveedores ────────────────────────────────────────
  const doSearch = async () => {
    setLoading(true); setResults([]); setSelected(null); setOutreach(null);
    markers.current.forEach(m=>mapInst.current?.removeLayer(m)); markers.current=[];
    const cfg = CAT_CONFIG[cat==='custom'?'custom':cat] || {label:customCat||cat,emoji:'🔍',grupo:'⚙️ Personalizado'};
    const searchLabel = cat==='custom' ? (customCat||'?') : cfg.label;
    setLoadMsg(`${cfg.emoji} Buscando ${searchLabel}...`);

    try {
      const r = await fetch('/api/scout/places',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({lat,lng,radius:parseInt(radius),categoria:cat,customCat:cat==='custom'?customCat:undefined}),
      });
      const data = await r.json();
      const provs: Provider[] = (data.results||[]).map((p:any)=>({
        id:p.id, name:p.name, phone:p.phone||undefined,
        address:p.address||undefined, lat:p.lat, lng:p.lng, dist:p.dist,
        website:p.website||undefined, source:p.source,
      })).sort((a:Provider,b:Provider)=>a.dist-b.dist);

      if (!provs.length) {
        setLoadMsg(''); setLoading(false);
        alert(`Sin resultados para "${cfg.label}" en ${fmtD(parseInt(radius))} radio.\nProbá un radio mayor.`);
        return;
      }

      // Pins en mapa
      provs.forEach(p => {
        const color = pinColor(!!p.phone, p.dist);
        const mk = L.marker([p.lat,p.lng],{
          icon: makePin(color, p.phone ? cfg.emoji : '📍', 30)
        }).addTo(mapInst.current);
        mk.bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:160px;padding:2px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:3px;">${p.name}</div>
            <div style="font-size:10px;color:#666;margin-bottom:4px;">${cfg.emoji} ${cfg.label} · ${fmtD(p.dist)}</div>
            ${p.phone?`<div style="font-size:11px;color:#05944F;font-weight:600;">📱 ${p.phone}</div>`:''}
            ${p.address?`<div style="font-size:10px;color:#888;margin-top:3px;">📍 ${p.address}</div>`:''}
            <div style="font-size:9px;color:#bbb;margin-top:4px;">
              ${p.source==='tomtom'?'📍 TomTom':p.source==='cnpj_br'?'🇧🇷 CNPJ/Receita':'🗺 OpenStreetMap'}
            </div>
          </div>`);
        mk.on('click',()=>{ setSelected(p); setOutreach(null); setManualPhone(''); });
        markers.current.push(mk);
      });

      // Fit bounds
      const bounds = L.latLngBounds([[lat,lng],...provs.map((p:Provider)=>[p.lat,p.lng])]);
      mapInst.current.fitBounds(bounds,{padding:[30,30],maxZoom:15});

      setResults(provs);
      setLoadMsg(`${data.source==='tomtom'?'📍 TomTom':data.source==='cnpj_br'?'🇧🇷 CNPJ':'🗺 OSM'} — ${provs.length} proveedores`);
    } catch(e:any) { alert('Error: '+e.message); }

    setLoading(false);
  };

  // ── Guardar en Supabase ───────────────────────────────────────
  const addToHugo = useCallback(async (p:Provider) => {
    const cfg = CAT_CONFIG[cat==='custom'?'custom':cat] || {label:customCat||cat,emoji:'🔍',grupo:'⚙️ Personalizado'};
    await fetch(`${SB_URL}/rest/v1/prospectos_scouts`,{
      method:'POST',
      headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`,'Content-Type':'application/json',Prefer:'return=minimal,resolution=ignore-duplicates'},
      body:JSON.stringify({
        nombre:p.name, categoria:cat, telefono:p.phone||null, email:null, website:p.website||null,
        direccion:p.address||null, ciudad:locLabel.split(',')[0]?.trim()||'Florianópolis', pais:'BR',
        latitud:p.lat, longitud:p.lng, fuente:p.source==='tomtom'?'tomtom':p.source==='cnpj_br'?'cnpj_br':'osm',
        score_confianza:p.phone?65:30, estado:'prospecto_pendiente',
        notas_hugo:`Scout ${cfg.emoji} ${cfg.label} · ${fmtD(p.dist)}`,
      })
    });
    setAdded(prev=>new Set([...prev,p.id]));
    await loadProspectos();
  },[cat,locLabel,loadProspectos]);

  // ── Generar outreach ──────────────────────────────────────────
  const genOutreach = async (type:'wa'|'email') => {
    if (!selected) return;
    setGenLoading(true); setOutreach(null);
    const cfg = CAT_CONFIG[cat==='custom'?'custom':cat] || {label:customCat||cat,emoji:'🔍',grupo:'⚙️ Personalizado'};
    const prompt = type==='wa'
      ? `Você é Hugo do U.GO. Escreva mensagem WhatsApp curta (máx 80 palavras) em português convidando ${selected.name} (${cfg.label}) para ser provedor do U.GO. Benefícios: 85% do valor garantido, sem mensalidade, clientes verificados. Link: https://ugo.app/cadastro. Máx 1 emoji, sem colchetes.`
      : `Você é Hugo do U.GO. Escreva email profissional em português para ${selected.name}. Primeira linha: "Assunto: [assunto]". Convide para ser provedor U.GO. Máx 150 palavras. Link: https://ugo.app/cadastro`;
    const r = await fetch('/api/proxy',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({mode:'admin',messages:[{role:'user',content:prompt}],max_tokens:300})});
    const d = await r.json();
    setOutreach({type,text:d.content?.[0]?.text||'Error al generar.'});
    setContacted(prev=>new Set([...prev,selected.id]));
    setGenLoading(false);
  };

  // ── Aprobar prospecto ─────────────────────────────────────────
  const aprobar = useCallback(async (id:string) => {
    setApproving(id);
    const r = await fetch(`${SB_URL}/rest/v1/rpc/aprobar_prospecto`,{
      method:'POST',
      headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({p_prospecto_id:id,p_admin_email:'sebastianzoth@gmail.com'})
    });
    const d = await r.json();
    if (d.ok) {
      const prosp = prospectos.find(p=>p.id===id);
      if (prosp?.telefono) {
        const msgR = await fetch('/api/proxy',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({mode:'admin',messages:[{role:'user',content:`Mensaje WhatsApp breve en português invitando a "${prosp.nombre}" (${prosp.categoria}) a U.GO. Link: ${d.link_onboarding||'https://ugo.app/cadastro'}. Sin colchetes. Máx 60 palavras.`}],max_tokens:120})});
        const msgD = await msgR.json();
        const msg = msgD.content?.[0]?.text?.trim()||`Olá ${prosp.nombre}! Convidamos você para o U.GO: ${d.link_onboarding||'https://ugo.app/cadastro'}`;
        const waR = await fetch('/api/whatsapp/send',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({to:prosp.telefono,message:msg,prospecto_id:id})});
        const waD = await waR.json();
        alert(`✅ ${prosp.nombre} aprobado\n${waD.ok?`📲 WhatsApp enviado`:`📋 ${d.link_onboarding||''}`}`);
      } else {
        if (d.link_onboarding) navigator.clipboard.writeText(d.link_onboarding).catch(()=>{});
        alert(`✅ Aprobado\n📋 Link copiado: ${d.link_onboarding||''}`);
      }
      await loadProspectos();
    } else alert('Error: '+(d.error||d.message||'Revisar Supabase'));
    setApproving(null);
  },[prospectos,loadProspectos]);


  // ── Aprobación masiva ─────────────────────────────────────────
  const toggleSel = (id:string) => setSelMap(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const selAll = () => {
    const pending = prospectos.filter(p => p.estado !== 'aprobado' && p.estado !== 'rechazado');
    setSelMap(new Set(pending.map(p => p.id)));
  };

  const selNone = () => setSelMap(new Set());

  const aprobarBulk = async () => {
    if (!selMap.size) return;
    const ids = Array.from(selMap);
    setBulkLoading(true);
    let ok=0, err=0;
    for (const id of ids) {
      try {
        const prosp = prospectos.find(p=>p.id===id);
        if (!prosp) continue;
        // Insert directly to usuarios
        const slug = (prosp.nombre||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'.').slice(0,25);
        const email = `${slug}.${Date.now().toString(36)}@ugo-import.br`;
        const row = {
          email, nombre: prosp.nombre||prosp.name||'',
          tipo: 'proveedor', activo: true, karma: 5.0,
          telefono: prosp.telefono||null,
          categoria: prosp.categoria||'Geral',
          endereco: prosp.direccion||prosp.address||null,
          lat: prosp.lat||null, lng: prosp.lng||null,
          bio: prosp.website?`Website: ${prosp.website}`:null,
          pais: prosp.pais||'BR', updated_at: new Date().toISOString()
        };
        const r1 = await fetch(`${SB_URL}/rest/v1/usuarios`, {
          method:'POST',
          headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},
          body: JSON.stringify(row)
        });
        // Update prospecto estado
        await fetch(`${SB_URL}/rest/v1/prospectos_scouts?id=eq.${id}`, {
          method:'PATCH',
          headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`,'Content-Type':'application/json'},
          body: JSON.stringify({estado:'aprobado', aprobado_at: new Date().toISOString()})
        });
        if (r1.ok||r1.status===201) ok++; else err++;
      } catch { err++; }
    }
    setBulkLoading(false);
    setSelMap(new Set());
    alert(`✅ ${ok} proveedores aprobados y guardados como usuarios.${err>0?`\n⚠️ ${err} errores.`:''}`);
    await loadProspectos();
  };

  const phoneToUse = selected?.phone||manualPhone;
  const stColors:Record<string,string> = {prospecto_pendiente:'#996000',invitado:'#276EF1',en_revision:'#7356BF',aprobado:'#05944F',rechazado:'#E11900'};
  const stIcons:Record<string,string>  = {prospecto_pendiente:'⏳',invitado:'📨',en_revision:'⭐',aprobado:'✅',rechazado:'❌'};

  return (
    <div style={{padding:'16px',overflowY:'auto',height:'100%',fontFamily:'Inter,sans-serif'}}>
      {/* Header */}
      <div style={{fontSize:'18px',fontWeight:800,color:'#111',marginBottom:'2px',letterSpacing:'-.3px'}}>📡 Hugo Scout</div>
      <div style={{fontSize:'11px',color:'rgba(0,0,0,.5)',marginBottom:'14px'}}>
        Reclutamiento de proveedores · Florianópolis & LATAM
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'14px'}}>
        {[['En Supabase',stats.found,'#276EF1'],['Contactados',stats.contacted,'#05944F'],['Incorporados',stats.joined,'#111']].map(([l,v,c])=>(
          <div key={String(l)} style={{...S.card,padding:'10px'}}>
            <div style={{fontSize:'9px',textTransform:'uppercase',letterSpacing:'.8px',color:'rgba(0,0,0,.4)',marginBottom:'3px'}}>{l}</div>
            <div style={{fontSize:'22px',fontWeight:800,color:String(c)}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:'12px'}}>
        {/* LEFT: Map */}
        <div>
          {/* Zona */}
          <div style={{...S.card,marginBottom:'10px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',color:'rgba(0,0,0,.4)',marginBottom:'1px'}}>ZONA DE BÚSQUEDA</div>
                <div style={{fontSize:'12px',fontWeight:600,color:'#111',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{locLabel}</div>
              </div>
              <button style={S.btn()} onClick={getGPS}>📍 GPS</button>
            </div>
            <div style={{display:'flex',gap:'7px'}}>
              <input style={{...S.inp,flex:1}} value={addrInput} onChange={e=>setAddrInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&geocode()}
                placeholder="Escribí ciudad, barrio o dirección..."/>
              <button style={{...S.btn('s'),padding:'8px 14px',background:'rgba(0,0,0,.07)',color:'#111'}}
                onClick={geocode} disabled={addrLoading||!addrInput.trim()}>
                {addrLoading?'⏳':'🔍 Ir'}
              </button>
            </div>
          </div>

          {/* Controles */}
          <div style={{...S.card,display:'grid',gridTemplateColumns:'1fr 120px auto auto',gap:'10px',alignItems:'flex-end',marginBottom:'10px'}}>
            <div>
              <label style={S.lbl}>Categoría</label>
              <select style={S.sel} value={cat} onChange={e=>{setCat(e.target.value);setResults([]);setSelected(null);}}>
  {(() => {
                const groups: Record<string,Array<[string,{label:string;emoji:string;grupo:string}]>> = {};
                Object.entries(CAT_CONFIG).forEach(([k,v]) => {
                  if (!groups[v.grupo]) groups[v.grupo] = [];
                  groups[v.grupo].push([k,v]);
                });
                return Object.entries(groups).map(([grupo, items]) => (
                  <optgroup key={grupo} label={grupo}>
                    {items.map(([k,v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                  </optgroup>
                ));
              })()}
              </select>
            </div>
            {cat==='custom'&&(
              <div>
                <label style={S.lbl}>Categoría personalizada</label>
                <input style={S.inp} value={customCat}
                  onChange={e=>setCustomCat(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&doSearch()}
                  placeholder="Ej: cerrajero, taller mecánico, pintor..."/>
              </div>
            )}
            <div>
              <label style={S.lbl}>Radio</label>
              <select style={S.sel} value={radius} onChange={e=>setRadius(e.target.value)}>
                <option value="2000">2 km</option>
                <option value="5000">5 km</option>
                <option value="10000">10 km</option>
                <option value="20000">20 km</option>
                <option value="50000">50 km</option>
                <option value="100000">100 km</option>
                <option value="200000">200 km</option>
                <option value="500000">500 km (país)</option>
              </select>
            </div>
            <button style={S.btn()} onClick={doSearch} disabled={loading}>
              {loading?'⏳ Buscando...':'🔎 Buscar'}
            </button>
            <button style={{...S.btn('s'),padding:'8px 12px',background:'rgba(0,0,0,.07)',color:'#111'}}
              onClick={()=>{
                if(!results.length)return;
                const hdr=['id','nombre','categoria','direccion','ciudad','pais','telefono','email','website','rating','reviews_count','latitud','longitud','fuente','estado','fecha_prospectado','notas_hugo','score_confianza'];
                const now=new Date().toISOString().replace('T',' ').slice(0,19);
                const ciudad=locLabel.split(',')[0]?.trim()||'Florianópolis';
                const cfg=CAT_CONFIG[cat]||{label:customCat||cat,emoji:'🔍',grupo:'⚙️ Personalizado'};
                const rows=results.map(p=>['',p.name,cat,p.address||'',ciudad,locLabel.split(',').slice(-1)[0]?.trim()||'Brasil',p.phone||'','',p.website||'','','0',p.lat?.toFixed(10)||'',p.lng?.toFixed(10)||'',p.source==='tomtom'?'tomtom':p.source==='cnpj_br'?'cnpj_br':'osm','prospecto_pendiente',now,`Scout ${cfg.emoji} ${cfg.label} · ${fmtD(p.dist)}`,p.phone?'65':'30']);
                const csv=[hdr,...rows].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
                const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
                a.download=`prospectos_scouts_${cat}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
              }} disabled={!results.length}>⬇ CSV</button>
          </div>

          {/* Mapa */}
          <div style={{...S.card,padding:0,overflow:'hidden',height:'320px',position:'relative',marginBottom:'10px',borderRadius:'12px'}}>
            <div ref={mapRef} style={{width:'100%',height:'100%'}}/>
            {loading&&<div style={{position:'absolute',inset:0,background:'rgba(255,255,255,.9)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:1000}}>
              <div style={{fontSize:'28px',marginBottom:'8px',animation:'spin 1s linear infinite'}}>⟳</div>
              <div style={{fontSize:'11px',color:'rgba(0,0,0,.6)'}}>{loadMsg}</div>
              <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            </div>}
          </div>

          {/* Leyenda */}
          {results.length>0&&<div style={{display:'flex',gap:'12px',marginBottom:'8px',fontSize:'10px',color:'rgba(0,0,0,.5)',flexWrap:'wrap'}}>
            {[['#05944F','Con teléfono < 2km'],['#F59E0B','Con teléfono > 2km'],['#E11900','Sin teléfono < 2km'],['#9CA3AF','Sin teléfono > 2km']].map(([c,l])=>(
              <span key={l}><span style={{display:'inline-block',width:9,height:9,borderRadius:'50%',background:c,marginRight:4,verticalAlign:'middle'}}/>{l}</span>
            ))}
            <span style={{marginLeft:'auto'}}>{loadMsg}</span>
          </div>}

          {/* Lista de resultados */}
          {results.length>0&&<div>
            <div style={{fontSize:'11px',fontWeight:700,marginBottom:'8px',color:'rgba(0,0,0,.6)'}}>
              {results.length} proveedores · {results.filter(p=>p.phone).length} con teléfono
            </div>
            {results.map(p=>{
              const color = pinColor(!!p.phone,p.dist);
              return (
                <div key={p.id} onClick={()=>{setSelected(s=>s?.id===p.id?null:p);setOutreach(null);setManualPhone('');}}
                  style={{...S.card,cursor:'pointer',borderColor:selected?.id===p.id?'#05944F':'rgba(0,0,0,.08)',
                    background:selected?.id===p.id?'rgba(5,148,79,.03)':'#FFF',
                    display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',marginBottom:'5px',
                    borderLeft:`3px solid ${color}`}}>
                  <div style={{width:'36px',height:'36px',borderRadius:'50%',background:color,border:'2px solid #FFF',
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',flexShrink:0,
                    boxShadow:`0 2px 6px ${color}44`}}>
                    {p.phone?CAT_CONFIG[cat]?.emoji:'📍'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:'12px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                    <div style={{fontSize:'10px',color:'rgba(0,0,0,.45)',marginTop:'2px'}}>
                      {fmtD(p.dist)}
                      {p.phone&&<span style={{color:'#05944F',marginLeft:6,fontWeight:600}}>📱 {p.phone}</span>}
                      {p.address&&<span style={{marginLeft:6}}>· {p.address.split(',')[0]}</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'5px',flexShrink:0,alignItems:'center'}}>
                    {contacted.has(p.id)&&<span style={{fontSize:'8px',padding:'2px 6px',borderRadius:'20px',background:'rgba(5,148,79,.1)',color:'#05944F',border:'1px solid rgba(5,148,79,.2)',fontWeight:700}}>✓</span>}
                    <button style={{...S.btn(added.has(p.id)?undefined:'p'),padding:'5px 10px',fontSize:'10px',background:added.has(p.id)?'rgba(0,0,0,.06)':'#05944F',color:added.has(p.id)?'#666':'#FFF'}}
                      onClick={e=>{e.stopPropagation();if(!added.has(p.id))addToHugo(p);}} disabled={added.has(p.id)}>
                      {added.has(p.id)?'✓ Guardado':'+ Hugo'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>}
        </div>

        {/* RIGHT: Outreach */}
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <div style={S.card}>
            <div style={{fontSize:'11px',fontWeight:700,marginBottom:'12px'}}>✉️ Outreach con Hugo
              {selected&&<span style={{fontSize:'9px',padding:'2px 7px',borderRadius:'20px',background:'rgba(5,148,79,.1)',color:'#05944F',border:'1px solid rgba(5,148,79,.2)',fontWeight:700,marginLeft:8}}>{CAT_CONFIG[cat]?.emoji} {CAT_CONFIG[cat]?.label}</span>}
            </div>
            {!selected?(
              <div style={{textAlign:'center',padding:'24px 0',color:'rgba(0,0,0,.35)'}}>
                <div style={{fontSize:'32px',marginBottom:'8px'}}>👆</div>
                <div style={{fontSize:'11px',fontWeight:600,marginBottom:'4px'}}>Seleccioná un proveedor</div>
                <div style={{fontSize:'10px',lineHeight:1.5}}>Del mapa o la lista de resultados</div>
              </div>
            ):(
              <>
                <div style={{background:'#F8F9FA',borderRadius:'10px',padding:'10px 12px',marginBottom:'12px'}}>
                  <div style={{fontWeight:700,fontSize:'13px',marginBottom:'2px'}}>{selected.name}</div>
                  <div style={{fontSize:'10px',color:'rgba(0,0,0,.5)'}}>{CAT_CONFIG[cat]?.label} · {fmtD(selected.dist)}</div>
                  {selected.phone&&<div style={{fontSize:'12px',marginTop:'5px',color:'#05944F',fontWeight:600}}>📱 {selected.phone}</div>}
                  {selected.address&&<div style={{fontSize:'10px',marginTop:'3px',color:'rgba(0,0,0,.55)'}}>📍 {selected.address}</div>}
                  {selected.website&&<a href={selected.website} target="_blank" rel="noreferrer" style={{fontSize:'10px',color:'#276EF1',display:'block',marginTop:'3px'}}>🌐 Website</a>}
                  <div style={{fontSize:'9px',color:'rgba(0,0,0,.35)',marginTop:'4px'}}>
                    {selected.source==='tomtom'?'📍 TomTom':selected.source==='cnpj_br'?'🇧🇷 Receita Federal':'🗺 OpenStreetMap'}
                  </div>
                </div>

                {!selected.phone&&<div style={{marginBottom:'10px'}}>
                  <label style={S.lbl}>📱 Teléfono para WhatsApp</label>
                  <input style={S.inp} value={manualPhone} onChange={e=>setManualPhone(e.target.value)} placeholder="+55 48 9 9999-9999"/>
                </div>}

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px',marginBottom:'12px'}}>
                  <button style={S.btn('wa')} onClick={()=>genOutreach('wa')} disabled={genLoading}>📲 WhatsApp</button>
                  <button style={{...S.btn('s'),background:'rgba(0,0,0,.07)',color:'#111'}} onClick={()=>genOutreach('email')} disabled={genLoading}>📧 Email</button>
                </div>

                {genLoading&&<div style={{textAlign:'center',padding:'12px',background:'#F8F9FA',borderRadius:'8px',marginBottom:'10px',fontSize:'11px',color:'rgba(0,0,0,.5)'}}>✨ Hugo generando...</div>}

                {outreach&&<div style={{background:'#F8F9FA',border:'1px solid rgba(0,0,0,.1)',borderRadius:'10px',padding:'12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                    <span style={{fontSize:'10px',fontWeight:700,color:'rgba(0,0,0,.5)'}}>{outreach.type==='wa'?'📲 WhatsApp':'📧 Email'}</span>
                    <button style={{...S.btn('s'),padding:'3px 10px',fontSize:'9px',background:'rgba(0,0,0,.07)',color:'#111'}}
                      onClick={()=>navigator.clipboard.writeText(outreach.text)}>📋 Copiar</button>
                  </div>
                  <div style={{fontSize:'11px',lineHeight:1.65,whiteSpace:'pre-wrap',maxHeight:'180px',overflowY:'auto'}}>{outreach.text}</div>
                  {outreach.type==='wa'&&phoneToUse&&(
                    <a href={`https://wa.me/${phoneToUse.replace(/\D/g,'')}?text=${encodeURIComponent(outreach.text)}`}
                      target="_blank" rel="noreferrer" onClick={()=>setContacted(prev=>new Set([...prev,selected.id]))}
                      style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'9px',background:'#25D366',color:'#FFF',borderRadius:'9px',textDecoration:'none',fontSize:'11px',fontWeight:700,marginTop:'10px'}}>
                      Abrir WhatsApp →
                    </a>
                  )}
                </div>}
              </>
            )}
          </div>

          <div style={{...S.card,padding:'12px',fontSize:'10px',color:'rgba(0,0,0,.5)',lineHeight:1.7}}>
            <b style={{color:'rgba(0,0,0,.7)',display:'block',marginBottom:'5px'}}>💡 Flujo</b>
            1. Zona → Categoría → Buscar<br/>
            2. Pin/fila → seleccionar → Outreach<br/>
            3. <b>+ Hugo</b> → guarda en Supabase<br/>
            4. <b>✓ Aprobar</b> → WhatsApp automático
          </div>
        </div>
      </div>

      {/* Prospectos */}
      <div style={{marginTop:'16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
          <div style={{fontSize:'13px',fontWeight:700,color:'#111'}}>🗂 Prospectos en Supabase ({prospectos.length})</div>
          <button style={{...S.btn('s'),padding:'5px 12px',fontSize:'10px',background:'rgba(0,0,0,.07)',color:'#111'}} onClick={loadProspectos}>↻</button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
          {/* Bulk bar */}
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8,flexWrap:'wrap'}}>
                <span style={{fontSize:11,fontWeight:700,color:'rgba(0,0,0,.5)'}}>📋 {prospectos.length}</span>
                <button onClick={selAll} style={{fontSize:'9px',padding:'3px 8px',borderRadius:20,border:'1px solid #ddd',background:'transparent',cursor:'pointer',fontWeight:700}}>☑ Todos</button>
                <button onClick={selNone} style={{fontSize:'9px',padding:'3px 8px',borderRadius:20,border:'1px solid #ddd',background:'transparent',cursor:'pointer',fontWeight:700}}>☐ Ninguno</button>
                {selMap.size>0&&<button onClick={aprobarBulk} disabled={bulkLoading}
                  style={{padding:'4px 12px',borderRadius:20,border:'none',background:'#05944F',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:'10px',marginLeft:'auto'}}>
                  {bulkLoading?'⏳...':<>✅ Aprobar <b>{selMap.size}</b> seleccionados</>}
                </button>}
              </div>
              {prospectos.map(p=>(
            <div key={p.id} style={{...S.card,display:'flex',alignItems:'center',gap:'8px',padding:'8px 10px',outline:selMap.has(p.id)?'2px solid #05944F':'none',cursor:'pointer'}}>
              <input type="checkbox" checked={selMap.has(p.id)} onChange={e=>{e.stopPropagation();toggleSel(p.id);}} style={{flexShrink:0,width:14,height:14,cursor:'pointer'}}/>
              <div style={{width:'32px',height:'32px',borderRadius:'50%',background:`${stColors[p.estado]||'#999'}18`,border:`1.5px solid ${stColors[p.estado]||'#999'}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',flexShrink:0}}>{stIcons[p.estado]||'⏳'}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:'12px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nombre}</div>
                <div style={{fontSize:'10px',color:'rgba(0,0,0,.45)',marginTop:'2px'}}>{p.categoria} · {p.ciudad}{p.telefono?` · 📱 ${p.telefono}`:''}</div>
              </div>
              <div style={{display:'flex',gap:'6px',flexShrink:0,alignItems:'center'}}>
                <span style={{fontSize:'9px',fontWeight:700,padding:'2px 8px',borderRadius:'20px',border:`1px solid ${stColors[p.estado]||'#999'}`,color:stColors[p.estado]||'#999',background:`${stColors[p.estado]||'#999'}12`}}>{(p.estado||'').replace(/_/g,' ').toUpperCase()}</span>
                {p.estado==='prospecto_pendiente'&&<button style={{...S.btn(),padding:'5px 12px',fontSize:'10px'}} onClick={()=>aprobar(p.id)} disabled={approving===p.id}>{approving===p.id?'⏳':'✓ Aprobar'}</button>}
              </div>
            </div>
          ))}
          {prospectos.length===0&&<div style={{...S.card,textAlign:'center',padding:'20px',color:'rgba(0,0,0,.4)',fontSize:'12px'}}>Sin prospectos. Buscá y pulsá "+ Hugo".</div>}
        </div>
      </div>
    </div>
  );
}
export default SecScout;
