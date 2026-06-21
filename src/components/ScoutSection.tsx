import React, { useState, useEffect, useRef, useCallback } from 'react';

declare const L: any;

const SB_URL = 'https://byajcqrgetloavrgyqak.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs';

// Slugs reales de la tabla categorias + queries Overpass optimizadas para Brasil
const CAT_CONFIG: Record<string,{label:string; emoji:string; tags:string[][]; nameRegex:string}> = {
  electricista: { label:'Electricista', emoji:'⚡', tags:[['craft','electrician'],['shop','electronics_repair']], nameRegex:'elétric|eletric|instalação elétrica|eletricista' },
  plomero:      { label:'Plomero',      emoji:'🔧', tags:[['craft','plumber'],['craft','plumbing']], nameRegex:'hidrau|encanador|plomber|desentupid' },
  limpeza:      { label:'Limpeza',      emoji:'🧹', tags:[['craft','cleaning'],['shop','laundry']], nameRegex:'limpeza|faxina|clean|higieniz' },
  chaveiro:     { label:'Chaveiro',     emoji:'🔑', tags:[['craft','locksmith']], nameRegex:'chaveiro|chaves|fechadura|segurança resid' },
  pintura:      { label:'Pintura',      emoji:'🎨', tags:[['craft','painter']], nameRegex:'pintura|pintor|reforma|decoração' },
  carpintaria:  { label:'Carpintaria',  emoji:'🪚', tags:[['craft','carpenter'],['craft','joiner']], nameRegex:'carpintaria|marcenaria|marceneiro|moveis' },
  jardinagem:   { label:'Jardinagem',   emoji:'🌿', tags:[['craft','gardener']], nameRegex:'jardim|jardineiro|paisagismo|grama|poda' },
  climatizacao: { label:'Climatização', emoji:'❄️', tags:[['craft','hvac'],['craft','refrigeration']], nameRegex:'ar condicionado|climatização|refrigeração|hvac' },
  ti_redes:     { label:'TI & Redes',   emoji:'💻', tags:[['shop','computer'],['craft','electronics_repair']], nameRegex:'informática|computador|ti |redes|assistência técnica' },
  reformas:     { label:'Reformas',     emoji:'🏠', tags:[['craft','builder'],['craft','construction']], nameRegex:'reforma|construção|obras|pedreiro|empreit' },
};

const DIST_COLORS = ['#05944F','#F59E0B','#E11900'];
const distColor = (d:number) => d<1000?DIST_COLORS[0]:d<3000?DIST_COLORS[1]:DIST_COLORS[2];
const fmtD = (d:number) => d<1000?Math.round(d)+'m':(d/1000).toFixed(1)+'km';

type Provider = {
  id:string; name:string; phone?:string; address?:string;
  lat:number; lng:number; dist:number; tags:any;
};

const S = {
  card: {background:'#FFF',border:'1px solid rgba(0,0,0,.1)',borderRadius:'14px',padding:'14px',boxShadow:'0 1px 4px rgba(0,0,0,.06)'},
  label: {fontSize:'10px',fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'.6px',color:'rgba(0,0,0,.5)',marginBottom:'5px',display:'block'},
  input: {width:'100%',padding:'9px 12px',border:'2px solid rgba(0,0,0,.15)',borderRadius:'9px',fontSize:'12px',fontFamily:'Inter,sans-serif',outline:'none',color:'#111',background:'#F8F9FA',transition:'border .2s'},
  select: {width:'100%',padding:'9px 12px',border:'2px solid rgba(0,0,0,.15)',borderRadius:'9px',fontSize:'12px',fontFamily:'Inter,sans-serif',outline:'none',color:'#111',background:'#F8F9FA',cursor:'pointer'},
  btn: (v='p') => ({padding:'8px 16px',borderRadius:'50px',border:'none',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:'11px',fontWeight:700,
    background:v==='p'?'#05944F':v==='d'?'rgba(225,25,0,.1)':v==='wa'?'#25D366':'rgba(0,0,0,.07)',
    color:v==='p'?'#FFF':v==='d'?'#E11900':v==='wa'?'#FFF':'#111',transition:'opacity .15s'} as React.CSSProperties),
  pill: (c='g') => ({display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:'20px',fontSize:'9px',fontWeight:700,
    background:c==='g'?'rgba(5,148,79,.09)':'rgba(245,158,11,.09)',
    color:c==='g'?'#05944F':'#996000',border:`1px solid ${c==='g'?'rgba(5,148,79,.2)':'rgba(245,158,11,.2)'}`} as React.CSSProperties),
};


const FSQ_SEARCH_QUERIES: Record<string, string[]> = {
  electricista: ['eletricista', 'elétrica', 'instalação elétrica'],
  plomero:      ['encanador', 'hidráulica', 'desentupidora'],
  limpeza:      ['limpeza', 'faxina', 'limpadora'],
  chaveiro:     ['chaveiro', 'chaves'],
  pintura:      ['pintor', 'pintura'],
  carpintaria:  ['carpintaria', 'marcenaria'],
  jardinagem:   ['jardineiro', 'jardinagem', 'paisagismo'],
  climatizacao: ['ar condicionado', 'climatização'],
  ti_redes:     ['informática', 'assistência técnica'],
  reformas:     ['reforma', 'pedreiro', 'construção'],
};

export function SecScout() {
  const [lat, setLat] = useState<number|null>(null);
  const [lng, setLng] = useState<number|null>(null);
  const [locLabel, setLocLabel] = useState('Florianópolis, SC (predeterminado)');
  const [addr, setAddr] = useState('');
  const [showAddr, setShowAddr] = useState(false);
  const [cat, setCat] = useState('electricista');
  const [radius, setRadius] = useState('5000');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [results, setResults] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<Provider|null>(null);
  const [outreach, setOutreach] = useState<{type:'wa'|'email';text:string}|null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [manualPhone, setManualPhone] = useState('');
  const [stats, setStats] = useState({found:0,contacted:0,interested:0,joined:0});
  const [exportData, setExportData] = useState<Provider[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [contacted, setContacted] = useState<Set<string>>(new Set());
  const [fsqKey, setFsqKey] = useState('');
  const [prospectos, setProspectos] = useState<any[]>([]);
  const [loadingPs, setLoadingPs] = useState(false);
  const [approving, setApproving] = useState<string|null>(null);
  const mapRef = useRef<any>(null);
  const mapInst = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const centerMark = useRef<any>(null);

  // ── Carga prospectos guardados ─────────────────────────────
  const loadProspectos = useCallback(async () => {
    setLoadingPs(true);
    try {
      const r = await fetch(`${SB_URL}/rest/v1/prospectos_scouts?order=created_at.desc&limit=50`, {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
      });
      const data = await r.json();
      if (Array.isArray(data)) {
        setProspectos(data);
        const n = { found:0, contacted:0, interested:0, joined:0 };
        data.forEach((p:any) => {
          n.found++;
          if (['invitado','en_revision','aprobado'].includes(p.estado)) n.contacted++;
          if (p.estado === 'en_revision') n.interested++;
          if (p.estado === 'aprobado') n.joined++;
        });
        setStats(n);
      }
    } catch {}
    setLoadingPs(false);
  }, []);

  useEffect(() => {
    loadProspectos();
    // Cargar TomTom key desde Supabase para búsqueda directa desde browser
    fetch(`${SB_URL}/rest/v1/config_sistema?clave=eq.api_tomtom_key&select=valor`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    }).then(r=>r.json()).then(d => { if(d?.[0]?.valor) setFsqKey(d[0].valor.trim()); });
  }, [loadProspectos]);

  // ── Init mapa Leaflet ──────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInst.current || typeof L === 'undefined') return;
    const map = L.map(mapRef.current, { zoomControl:true, center:[-27.5954,-48.5480], zoom:13 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:'© OpenStreetMap contributors', maxZoom:19
    }).addTo(map);
    mapInst.current = map;
    [100,400,800].forEach(t => setTimeout(()=>map.invalidateSize(),t));
    // Default: mostrar Florianópolis
    setLat(-27.5954); setLng(-48.5480);
  }, []);

  // ── Ubicación ──────────────────────────────────────────────
  const setLocation = useCallback((la:number, ln:number, label?:string) => {
    setLat(la); setLng(ln);
    if (label) setLocLabel(label);
    const map = mapInst.current; if (!map) return;
    map.setView([la,ln],14);
    if (centerMark.current) map.removeLayer(centerMark.current);
    centerMark.current = L.marker([la,ln], {icon: L.divIcon({
      html:'<div style="width:16px;height:16px;border-radius:50%;background:#111;border:3px solid #FFF;box-shadow:0 2px 8px rgba(0,0,0,.3);"></div>',
      className:'',iconSize:[16,16],iconAnchor:[8,8]
    })}).addTo(map);
    if (!label) {
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${ln}&format=json`)
        .then(r=>r.json()).then(d=>{
          const p=[d.address?.suburb||d.address?.neighbourhood,d.address?.city||d.address?.town].filter(Boolean);
          if(p.length) setLocLabel(p.join(', '));
        }).catch(()=>{});
    }
  }, []);

  const getGPS = () => {
    if (!navigator.geolocation) {
      setLocLabel('Florianópolis, SC (GPS no disponible)');
      return;
    }
    setLocLabel('Detectando GPS...');
    navigator.geolocation.getCurrentPosition(
      p => setLocation(p.coords.latitude, p.coords.longitude),
      () => {
        setLocation(-27.5954,-48.5480,'Florianópolis, SC (GPS denegado — usando predeterminado)');
      },
      {timeout:8000, enableHighAccuracy:true}
    );
  };

  const geocode = async () => {
    if (!addr.trim()) return;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr+', Brasil')}&format=json&limit=1`);
      const d = await r.json();
      if (!d.length) return alert('No encontrado. Probá con más detalle.');
      setLocation(parseFloat(d[0].lat), parseFloat(d[0].lon), d[0].display_name.split(',').slice(0,3).join(','));
      setShowAddr(false);
    } catch { alert('Error al buscar dirección.'); }
  };


  const doSearch = async () => {
    if (lat === null || lng === null) return;
    setLoading(true); setResults([]); setSelected(null); setOutreach(null); setManualPhone('');
    markersRef.current.forEach(m => mapInst.current?.removeLayer(m));
    markersRef.current = [];

    const cfg = CAT_CONFIG[cat];

    try {
      let provs: Provider[] = [];
      let sourceLabel = '';

      // ── TomTom Search API directo desde browser (soporta CORS) ──
      if (fsqKey) {
        setLoadingMsg(`${cfg.emoji} Buscando en TomTom...`);
        try {
          const ttQueries = FSQ_SEARCH_QUERIES[cat] || [cat];
          const seen = new Set<string>();

          for (const q of ttQueries.slice(0, 2)) {
            const url = new URL(`https://api.tomtom.com/search/2/search/${encodeURIComponent(q)}.json`);
            url.searchParams.set('key', fsqKey);
            url.searchParams.set('lat', String(lat));
            url.searchParams.set('lon', String(lng));
            url.searchParams.set('radius', radius);
            url.searchParams.set('limit', '30');
            url.searchParams.set('language', 'pt-BR');
            url.searchParams.set('idxSet', 'POI');
            url.searchParams.set('countrySet', 'BR,AR,CL,CO,MX,PE,UY,PY,BO,EC,VE');

            const r = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
            if (!r.ok) { console.warn('[TomTom]', r.status, await r.text()); continue; }

            const d = await r.json();
            const items = d.results || [];
            for (const p of items) {
              if (!p.position || seen.has(p.id)) continue;
              seen.add(p.id);
              const dist = p.dist || haversine(lat, lng, p.position.lat, p.position.lon);
              const phone = p.poi?.phone || p.poi?.phones?.[0] || undefined;
              provs.push({
                id: String(p.id),
                name: p.poi?.name || p.address?.freeformAddress || q,
                phone,
                address: p.address?.freeformAddress || p.address?.municipality || undefined,
                lat: p.position.lat, lng: p.position.lon, dist,
                tags: {
                  website: p.poi?.url || undefined,
                  rating: null,
                  source: 'tomtom',
                },
              });
            }
          }
          if (provs.length) sourceLabel = `🗺 TomTom — ${provs.length} encontrados`;
        } catch(e: any) { console.warn('[TomTom browser]', e.message); }
      }

      // ── Fallback OSM si Foursquare da 0 ──────────────────────────
      if (provs.length === 0) {
        setLoadingMsg('🗺 Sin resultados en TomTom — buscando en OpenStreetMap...');
        try {
          const r = await fetch('/api/scout/places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng, radius: parseInt(radius), categoria: cat, fsqDisabled: true }),
          });
          if (r.ok) {
            const data = await r.json();
            provs = (data.results || []).map((p: any) => ({
              id: p.id, name: p.name,
              phone: p.phone || undefined,
              address: p.address || undefined,
              lat: p.lat, lng: p.lng, dist: p.dist,
              tags: { website: p.website, rating: null, source: 'osm' },
            }));
            if (provs.length) sourceLabel = `🗺 OpenStreetMap — ${provs.length} encontrados`;
          }
        } catch(e: any) { console.warn('[OSM fallback]', e.message); }
      }

      if (provs.length === 0) {
        setLoadingMsg('');
        setLoading(false);
        alert(`Sin resultados para "${cfg.label}" en ${fmtD(parseInt(radius))} radio.\n\nTip: Probá un radio mayor o categoría diferente.`);
        return;
      }

      setLoadingMsg(sourceLabel);

      setResults(provs);
      setExportData(provs);

      // Pines en mapa
      provs.forEach((p:Provider) => {
        const color = distColor(p.dist);
        const isFsq = p.tags?.source === 'foursquare';
        const mk = L.marker([p.lat,p.lng], {icon:L.divIcon({
          html:`<div style="width:30px;height:30px;border-radius:50%;background:${color};border:3px solid #FFF;display:flex;align-items:center;justify-content:center;font-size:12px;color:#FFF;font-weight:800;box-shadow:0 2px 8px rgba(0,0,0,.25);">${p.phone?'📱':'📍'}</div>`,
          className:'',iconSize:[30,30],iconAnchor:[15,15]
        })}).addTo(mapInst.current);
        mk.bindPopup(`<div style="font-family:Inter,sans-serif;min-width:160px;"><b style="font-size:12px;">${p.name}</b><br><span style="font-size:10px;color:#666;">${cfg.emoji} ${cfg.label} · ${fmtD(p.dist)}</span>${p.phone?`<br><span style="font-size:11px;color:#05944F;">📱 ${p.phone}</span>`:''}<br><span style="font-size:9px;color:#aaa;">${isFsq?'📍 Foursquare':'🗺 OpenStreetMap'}</span></div>`);
        mk.on('click', () => { setSelected(p); setOutreach(null); setManualPhone(''); });
        markersRef.current.push(mk);
      });

      if (mapInst.current) {
        const bounds = L.latLngBounds([[lat,lng], ...provs.map((p:Provider)=>[p.lat,p.lng])]);
        mapInst.current.fitBounds(bounds, {padding:[30,30]});
      }

    } catch(e:any) {
      alert('Error al buscar: ' + e.message);
    }
    setLoadingMsg('');
    setLoading(false);
  };

  // ── Guardar prospecto en Supabase ─────────────────────────
  const addToHugo = useCallback(async (p: Provider) => {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/prospectos_scouts`, {
        method:'POST',
        headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`,'Content-Type':'application/json',Prefer:'return=minimal,resolution=ignore-duplicates'},
        body: JSON.stringify({
          nombre:p.name, categoria:cat,
          telefono:p.phone||null, email:p.tags?.email||p.tags?.['contact:email']||null,
          website:p.tags?.website||null, direccion:p.address||null,
          ciudad:locLabel.split(',')[0]?.trim()||'Florianópolis', pais:'BR',
          latitud:p.lat, longitud:p.lng, fuente:'osm',
          score_confianza:p.phone?65:30,
          notas_hugo:`Scout ${CAT_CONFIG[cat]?.emoji} ${CAT_CONFIG[cat]?.label} · ${fmtD(p.dist)}`,
          estado:'prospecto_pendiente',
        })
      });
      if (r.ok||r.status===201||r.status===409) {
        setAdded(prev=>new Set([...prev,p.id]));
        await loadProspectos();
      }
    } catch(e:any) { alert('Error al guardar: '+e.message); }
  }, [cat, locLabel, loadProspectos]);

  // ── Marcar como contactado ─────────────────────────────────
  const markContacted = useCallback(async (p: Provider) => {
    setContacted(prev=>new Set([...prev,p.id]));
    // Actualizar en Supabase si ya fue guardado
    try {
      await fetch(`${SB_URL}/rest/v1/prospectos_scouts?nombre=eq.${encodeURIComponent(p.name)}&estado=eq.prospecto_pendiente`, {
        method:'PATCH',
        headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`,'Content-Type':'application/json'},
        body: JSON.stringify({estado:'invitado'})
      });
      await loadProspectos();
    } catch {}
  }, [loadProspectos]);

  // ── Generar mensaje con Gemini ─────────────────────────────
  const genOutreach = async (type: 'wa'|'email') => {
    if (!selected) return;
    setGenLoading(true); setOutreach(null);
    const cfg = CAT_CONFIG[cat];
    const sys = type==='wa'
      ? `Você é Hugo, assistente do U.GO — marketplace de serviços no Brasil. Escreva uma mensagem de WhatsApp CURTA (máx 80 palavras) em português brasileiro convidando este negócio para se tornar provedor do U.GO. Tom: amigável, direto. Destaque: receba pedidos próximos, 85% do pagamento garantido, sem mensalidade. Termine com o link: https://ugo.app/cadastro. NÃO use colchetes. Use no máximo 1 emoji.`
      : `Você é Hugo, assistente do U.GO — marketplace de serviços no Brasil. Escreva um email PROFISSIONAL em português brasileiro. PRIMEIRA LINHA deve ser exatamente "Assunto: [escreva aqui o assunto]". Depois uma linha em branco e o corpo (máx 150 palavras). Convide este negócio para ser provedor do U.GO. Benefícios: pedidos próximos, 85% do valor, sem taxa mensal, pagamento via escrow seguro. Termine com: https://ugo.app/cadastro`;
    const q = `Negócio: ${selected.name} | Serviço: ${cfg.label} | Distância: ${fmtD(selected.dist)}${selected.phone?` | Tel: ${selected.phone}`:''}${selected.address?` | Endereço: ${selected.address}`:''}`;
    try {
      const r = await fetch('/api/proxy', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({system:sys, messages:[{role:'user',content:q}], max_tokens:350})
      });
      const d = await r.json();
      const text = d.content?.[0]?.text || d.error || 'Error al generar.';
      setOutreach({type, text});
      setStats(s=>({...s, contacted:s.contacted+1}));
    } catch(e:any) { setOutreach({type, text:'Error: '+e.message}); }
    setGenLoading(false);
  };

  // ── Aprobar prospecto ──────────────────────────────────────
  const aprobar = useCallback(async (id:string) => {
    setApproving(id);
    try {
      // 1. Aprobar prospecto → crear usuario proveedor
      const r = await fetch(`${SB_URL}/rest/v1/rpc/aprobar_prospecto`, {
        method:'POST',
        headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`,'Content-Type':'application/json'},
        body: JSON.stringify({p_prospecto_id:id, p_admin_email:'sebastianzoth@gmail.com'})
      });
      const d = await r.json();
      if (!d.ok) { alert('Error: '+(d.error||d.message||'Revisar Supabase')); setApproving(null); return; }

      // 2. Generar mensaje de invitación con Hugo
      const prosp = prospectos.find(p => p.id === id);
      const catCfg = CAT_CONFIG[prosp?.categoria||cat];
      const msgBody = {
        mode:'admin',
        messages:[{role:'user',content:`Genera un mensaje de WhatsApp en português brasileiro (máx 80 palabras) invitando a "${prosp?.nombre||'este negocio'}" (${catCfg?.label||prosp?.categoria}) a ser proveedor de U.GO. Menciona: 85% del pago garantizado, sin mensualidad, clientes verificados. Link: ${d.link_onboarding||'https://ugo.app/cadastro'}. Solo el texto del mensaje, sin JSON.`}],
        max_tokens:200,
      };
      let waMsg = `Olá ${prosp?.nombre}! Sou Hugo do U.GO 🌀 Convidamos você para ser nosso prestador de ${catCfg?.label||prosp?.categoria} em ${prosp?.cidade||'sua cidade'}. Receba clientes verificados, 85% do valor garantido, sem mensalidade. Cadastre-se: ${d.link_onboarding||'https://ugo.app/cadastro'}`;

      try {
        const gr = await fetch('/api/proxy', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(msgBody)});
        const gd = await gr.json();
        const txt = gd.content?.[0]?.text?.trim();
        if (txt && txt.length > 20) waMsg = txt;
      } catch {}

      // 3. Enviar WhatsApp automático si tiene teléfono
      let waSent = false;
      if (prosp?.telefono) {
        try {
          const wr = await fetch('/api/whatsapp/send', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ to: prosp.telefono, message: waMsg, prospecto_id: id })
          });
          const wd = await wr.json();
          waSent = wd.ok;
        } catch {}
      }

      await loadProspectos();

      // 4. Feedback al admin
      const lines = [
        `✅ ${prosp?.nombre} aprobado como proveedor`,
        waSent ? `📲 WhatsApp enviado a ${prosp?.telefono}` : prosp?.telefono ? '⚠️ WhatsApp no enviado — revisá el token en config_sistema' : '📋 Sin teléfono — copiá el link:',
        d.link_onboarding || '',
      ].filter(Boolean);
      alert(lines.join('\n\n'));

      if (d.link_onboarding && !waSent) {
        navigator.clipboard.writeText(d.link_onboarding).catch(()=>{});
      }

    } catch(e:any) { alert('Error: '+e.message); }
    setApproving(null);
  }, [loadProspectos, prospectos, cat]);

  const exportCSV = () => {
    const cfg = CAT_CONFIG[cat];
    const rows = [
      ['Nombre','Teléfono','Email','Dirección','Distancia','Categoría','En Hugo'],
      ...exportData.map(p=>[
        p.name, p.phone||'', p.tags?.email||'', p.address||'',
        fmtD(p.dist), cfg.label, added.has(p.id)?'Sí':'No'
      ])
    ];
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `scout_${cat}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const phoneToUse = selected?.phone || manualPhone;

  return (
    <div style={{padding:'16px',overflowY:'auto',height:'100%',fontFamily:'Inter,sans-serif'}}>

      <div style={{fontSize:'18px',fontWeight:800,color:'#111',marginBottom:'2px',letterSpacing:'-.4px'}}>📡 Hugo Scout</div>
      <div style={{fontSize:'12px',color:'rgba(0,0,0,.5)',marginBottom:'14px'}}>Reclutamiento de proveedores por geolocalización · Outreach WhatsApp + Email con Gemini</div>

      {/* Stats — reales desde Supabase */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'14px'}}>
        {([['Encontrados',stats.found,'#276EF1'],['Contactados',stats.contacted,'#05944F'],['Interesados',stats.interested,'#996000'],['Incorporados',stats.joined,'#111']] as [string,number,string][]).map(([l,v,c])=>(
          <div key={l} style={{...S.card,padding:'10px 12px'}}>
            <div style={{fontSize:'9px',textTransform:'uppercase',letterSpacing:'.8px',color:'rgba(0,0,0,.45)',marginBottom:'3px'}}>{l}</div>
            <div style={{fontSize:'20px',fontWeight:800,color:c,fontFamily:'Inter'}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:'12px'}}>
        {/* ── IZQUIERDA ── */}
        <div>
          {/* Ubicación */}
          <div style={{...S.card,marginBottom:'10px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:showAddr?'8px':0}}>
              <div style={{width:'34px',height:'34px',borderRadius:'50%',background:'rgba(5,148,79,.08)',border:'1px solid rgba(5,148,79,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',flexShrink:0}}>📍</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'9px',color:'rgba(0,0,0,.45)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'1px'}}>Zona de búsqueda</div>
                <div style={{fontSize:'12px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{locLabel}</div>
              </div>
              <button style={S.btn()} onClick={getGPS}>📍 GPS</button>
              <button style={S.btn('s')} onClick={()=>setShowAddr(v=>!v)} title="Ingresar dirección">⌨</button>
            </div>
            {showAddr&&(
              <div style={{display:'flex',gap:'7px'}}>
                <input style={S.input} value={addr} onChange={e=>setAddr(e.target.value)} onKeyDown={e=>e.key==='Enter'&&geocode()} placeholder="Barrio, ciudad o dirección..."/>
                <button style={S.btn()} onClick={geocode}>Buscar</button>
                <button style={S.btn('s')} onClick={()=>setShowAddr(false)}>✕</button>
              </div>
            )}
          </div>

          {/* Controles */}
          <div style={{...S.card,display:'grid',gridTemplateColumns:'1fr 130px auto auto',gap:'10px',alignItems:'flex-end',marginBottom:'10px'}}>
            <div>
              <label style={S.label}>Categoría</label>
              <select style={S.select} value={cat} onChange={e=>{setCat(e.target.value);setResults([]);setSelected(null);}}>
                {Object.entries(CAT_CONFIG).map(([k,v])=><option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Radio</label>
              <select style={S.select} value={radius} onChange={e=>setRadius(e.target.value)}>
                <option value="2000">2 km</option>
                <option value="5000">5 km</option>
                <option value="10000">10 km</option>
                <option value="20000">20 km</option>
              </select>
            </div>
            <button style={{...S.btn(),whiteSpace:'nowrap'}} onClick={doSearch} disabled={loading}>
              {loading?'⏳ Buscando...':'🔎 Buscar'}
            </button>
            <button style={{...S.btn('s'),whiteSpace:'nowrap'}} onClick={exportCSV} disabled={!exportData.length} title="Exportar CSV">⬇ CSV</button>
          </div>

          {/* Mapa */}
          <div style={{...S.card,padding:0,overflow:'hidden',height:'260px',position:'relative',marginBottom:'10px'}}>
            <div ref={mapRef} style={{width:'100%',height:'100%'}}/>
            {loading&&<div style={{position:'absolute',inset:0,background:'rgba(255,255,255,.88)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:1000}}>
              <div style={{fontSize:'24px',marginBottom:'8px',animation:'spin 1s linear infinite'}}>⟳</div>
              <div style={{fontSize:'11px',color:'rgba(0,0,0,.6)'}}>{loadingMsg}</div>
              <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            </div>}
          </div>

          {/* Leyenda */}
          <div style={{display:'flex',gap:'12px',marginBottom:'10px',fontSize:'10px',color:'rgba(0,0,0,.5)'}}>
            {[['#05944F','< 1km'],['#F59E0B','1–3km'],['#E11900','> 3km']].map(([c,l])=>(
              <span key={l}><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:c,marginRight:4}}/>{l}</span>
            ))}
            <span style={{marginLeft:'auto'}}>📱 = con teléfono · 📍 = sin teléfono</span>
          </div>

          {/* Resultados */}
          {!loading&&results.length>0&&(
            <div>
              <div style={{fontSize:'11px',fontWeight:700,marginBottom:'8px',color:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',gap:'8px'}}>
                {results.length} proveedores · {results.filter(p=>p.phone).length} con teléfono
                <span style={{marginLeft:'auto',fontSize:'10px',color:'rgba(0,0,0,.4)'}}>Clic para seleccionar → Outreach</span>
              </div>
              {results.map(p=>(
                <div key={p.id} onClick={()=>{setSelected(s=>s?.id===p.id?null:p);setOutreach(null);setManualPhone('');}}
                  style={{...S.card,cursor:'pointer',borderColor:selected?.id===p.id?'#05944F':'rgba(0,0,0,.1)',
                    background:selected?.id===p.id?'rgba(5,148,79,.03)':'#FFF',
                    display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',marginBottom:'6px',
                    borderLeft:`3px solid ${p.phone?'#05944F':'#E5E5E5'}`}}>
                  <div style={{width:'32px',height:'32px',borderRadius:'50%',background:distColor(p.dist),display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:800,color:'#FFF',flexShrink:0}}>
                    {fmtD(p.dist)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:'12px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                    <div style={{fontSize:'10px',color:'rgba(0,0,0,.45)',marginTop:'2px'}}>
                      {p.address||CAT_CONFIG[cat]?.label}
                      {p.phone&&<span style={{color:'#05944F',marginLeft:6}}>📱 {p.phone}</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'5px',flexShrink:0}}>
                    {p.tags?.source==='tomtom'&&<span style={{fontSize:'8px',padding:'1px 6px',borderRadius:'10px',background:'rgba(39,110,241,.1)',color:'#276EF1',border:'1px solid rgba(39,110,241,.2)',fontWeight:700}}>TT</span>}
                  {contacted.has(p.id)&&<span style={{...S.pill('g'),fontSize:'8px'}}>Contactado</span>}
                    <button
                      style={{...S.btn(added.has(p.id)?'s':'p'),padding:'4px 10px',fontSize:'9px'}}
                      onClick={e=>{e.stopPropagation();if(!added.has(p.id))addToHugo(p);}}
                      disabled={added.has(p.id)}
                    >{added.has(p.id)?'✓ Guardado':'+ Hugo'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading&&results.length===0&&lat&&(
            <div style={{...S.card,textAlign:'center',padding:'24px',color:'rgba(0,0,0,.4)'}}>
              <div style={{fontSize:'28px',marginBottom:'8px'}}>🔍</div>
              <div style={{fontSize:'12px',fontWeight:600,marginBottom:'6px'}}>Tocá "Buscar" para encontrar proveedores</div>
              <div style={{fontSize:'10px',lineHeight:1.6}}>Hugo usa OpenStreetMap con 4 estrategias de búsqueda.<br/>Si no hay resultados, probá un radio mayor.</div>
            </div>
          )}
        </div>

        {/* ── DERECHA: Outreach ── */}
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>

          {/* Panel de outreach */}
          <div style={S.card}>
            <div style={{fontSize:'11px',fontWeight:700,marginBottom:'12px',display:'flex',alignItems:'center',gap:'6px'}}>
              ✉️ Panel de Outreach
              {selected&&<span style={{...S.pill('g'),marginLeft:'auto'}}>{CAT_CONFIG[cat]?.emoji} {CAT_CONFIG[cat]?.label}</span>}
            </div>

            {!selected?(
              <div style={{textAlign:'center',padding:'28px 0',color:'rgba(0,0,0,.35)'}}>
                <div style={{fontSize:'28px',marginBottom:'8px'}}>👆</div>
                <div style={{fontSize:'11px',fontWeight:600,marginBottom:'4px'}}>Seleccioná un proveedor</div>
                <div style={{fontSize:'10px',lineHeight:1.6}}>Del mapa o de la lista de resultados<br/>para generar el mensaje de Hugo</div>
              </div>
            ):(
              <>
                {/* Info del seleccionado */}
                <div style={{background:'#F8F9FA',borderRadius:'10px',padding:'10px 12px',marginBottom:'12px'}}>
                  <div style={{fontWeight:700,fontSize:'13px',marginBottom:'2px'}}>{selected.name}</div>
                  <div style={{fontSize:'10px',color:'rgba(0,0,0,.5)'}}>{CAT_CONFIG[cat]?.label} · {fmtD(selected.dist)}</div>
                  {selected.phone&&<div style={{fontSize:'12px',marginTop:'5px',color:'#05944F',fontWeight:600}}>📱 {selected.phone}</div>}
                  {selected.address&&<div style={{fontSize:'10px',marginTop:'3px',color:'rgba(0,0,0,.55)'}}>📍 {selected.address}</div>}
                  {selected.tags?.website&&<div style={{fontSize:'10px',marginTop:'3px'}}><a href={selected.tags.website} target="_blank" rel="noreferrer" style={{color:'#276EF1'}}>🌐 Website</a></div>}
                  {selected.tags?.rating&&<div style={{fontSize:'10px',marginTop:'3px',color:'#F59E0B'}}>★ {Number(selected.tags.rating).toFixed(1)}/5</div>}
                  {selected.tags?.source&&<div style={{fontSize:'9px',marginTop:'2px',color:'rgba(0,0,0,.35)'}}>{selected.tags.source==='foursquare'?'📍 Foursquare':'🗺 OpenStreetMap'}</div>}
                </div>

                {/* Teléfono manual si no tiene */}
                {!selected.phone&&(
                  <div style={{marginBottom:'10px'}}>
                    <label style={S.label}>📱 Ingresar teléfono para WhatsApp</label>
                    <div style={{display:'flex',gap:'6px'}}>
                      <input style={{...S.input,flex:1}} value={manualPhone} onChange={e=>setManualPhone(e.target.value)} placeholder="+55 48 9 9999-9999"/>
                    </div>
                  </div>
                )}

                {/* Botones generar */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px',marginBottom:'12px'}}>
                  <button style={S.btn('wa')} onClick={()=>genOutreach('wa')} disabled={genLoading}>📲 WhatsApp</button>
                  <button style={S.btn('s')} onClick={()=>genOutreach('email')} disabled={genLoading}>📧 Email</button>
                </div>

                {genLoading&&(
                  <div style={{textAlign:'center',padding:'14px',color:'rgba(0,0,0,.4)',fontSize:'11px',background:'#F8F9FA',borderRadius:'8px',marginBottom:'10px'}}>
                    ✨ Gemini generando mensaje...
                  </div>
                )}

                {outreach&&(
                  <div style={{background:'#F8F9FA',border:'1px solid rgba(0,0,0,.1)',borderRadius:'10px',padding:'12px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                      <span style={{fontSize:'10px',fontWeight:700,color:'rgba(0,0,0,.5)',textTransform:'uppercase'}}>
                        {outreach.type==='wa'?'📲 WhatsApp':'📧 Email'}
                      </span>
                      <button style={{...S.btn('s'),padding:'3px 10px',fontSize:'9px'}}
                        onClick={()=>{navigator.clipboard.writeText(outreach.text);markContacted(selected);}}>
                        📋 Copiar
                      </button>
                    </div>
                    <div style={{fontSize:'11px',lineHeight:1.65,whiteSpace:'pre-wrap',color:'#111',maxHeight:'180px',overflowY:'auto'}}>
                      {outreach.text}
                    </div>

                    {/* Acciones de envío */}
                    <div style={{marginTop:'10px',display:'flex',flexDirection:'column',gap:'6px'}}>
                      {outreach.type==='wa'&&phoneToUse&&(
                        <a href={`https://wa.me/${phoneToUse.replace(/\D/g,'')}?text=${encodeURIComponent(outreach.text)}`}
                          target="_blank" rel="noreferrer"
                          style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',padding:'9px',background:'#25D366',color:'#FFF',borderRadius:'9px',textDecoration:'none',fontSize:'11px',fontWeight:700}}
                          onClick={()=>markContacted(selected)}>
                          Abrir WhatsApp y enviar →
                        </a>
                      )}
                      {outreach.type==='wa'&&!phoneToUse&&(
                        <div style={{fontSize:'10px',color:'#E11900',textAlign:'center',padding:'6px',background:'rgba(225,25,0,.05)',borderRadius:'7px'}}>
                          ⚠ Ingresá el teléfono arriba para enviar por WhatsApp
                        </div>
                      )}
                      {outreach.type==='email'&&(selected.tags?.email||selected.tags?.['contact:email'])&&(
                        <a href={`mailto:${selected.tags?.email||selected.tags?.['contact:email']}?subject=${encodeURIComponent(outreach.text.split('\n')[0].replace('Assunto:','').trim())}&body=${encodeURIComponent(outreach.text.split('\n').slice(2).join('\n'))}`}
                          style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',padding:'9px',background:'#276EF1',color:'#FFF',borderRadius:'9px',textDecoration:'none',fontSize:'11px',fontWeight:700}}
                          onClick={()=>markContacted(selected)}>
                          Abrir cliente de email →
                        </a>
                      )}
                      {outreach.type==='email'&&!(selected.tags?.email||selected.tags?.['contact:email'])&&(
                        <div style={{fontSize:'10px',color:'rgba(0,0,0,.45)',textAlign:'center'}}>
                          Sin email registrado en OSM — copiá el mensaje y envialo manualmente
                        </div>
                      )}
                    </div>

                    {/* Marcar estado */}
                    <div style={{display:'flex',gap:'6px',marginTop:'8px'}}>
                      <button style={{...S.btn('s'),flex:1,fontSize:'9px'}} onClick={()=>{markContacted(selected);setStats(s=>({...s,interested:s.interested+1}));}}>⭐ Interesado</button>
                      <button style={{...S.btn(),flex:1,fontSize:'9px'}} onClick={()=>{markContacted(selected);addToHugo(selected);setStats(s=>({...s,joined:s.joined+1}));}}>✅ Incorporar</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Instrucciones */}
          <div style={{...S.card,padding:'12px',fontSize:'10px',color:'rgba(0,0,0,.5)',lineHeight:1.7}}>
            <div style={{fontWeight:700,marginBottom:'6px',color:'rgba(0,0,0,.7)'}}>💡 Cómo funciona</div>
            1. Pulsá <b>Buscar</b> para encontrar proveedores<br/>
            2. Clic en uno para seleccionarlo<br/>
            3. Generá mensaje de <b>WhatsApp</b> o <b>Email</b><br/>
            4. Envialo directamente o copiá el texto<br/>
            5. Pulsá <b>+ Hugo</b> para guardar en Supabase<br/>
            6. Aprobá desde la lista de abajo
          </div>
        </div>
      </div>

      {/* ── PROSPECTOS GUARDADOS ── */}
      <div style={{marginTop:'16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
          <div style={{fontSize:'13px',fontWeight:700,color:'#111'}}>🗂 Prospectos en Supabase ({prospectos.length})</div>
          <button style={{...S.btn('s'),padding:'5px 12px',fontSize:'10px'}} onClick={loadProspectos} disabled={loadingPs}>
            {loadingPs?'⏳':'↻ Actualizar'}
          </button>
        </div>

        {prospectos.length===0&&!loadingPs&&(
          <div style={{...S.card,textAlign:'center',padding:'20px',color:'rgba(0,0,0,.4)',fontSize:'12px'}}>
            Sin prospectos guardados. Buscá y pulsá "+ Hugo" para agregar.
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          {prospectos.map(p=>{
            const estadoColor:Record<string,string> = {
              prospecto_pendiente:'#996000', invitado:'#276EF1',
              en_revision:'#7356BF', aprobado:'#05944F', rechazado:'#E11900'
            };
            return (
              <div key={p.id} style={{...S.card,display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px'}}>
                <div style={{width:'36px',height:'36px',borderRadius:'50%',background:`rgba(${p.estado==='aprobado'?'5,148,79':'153,96,0'},.1)`,border:`1.5px solid rgba(${p.estado==='aprobado'?'5,148,79':'153,96,0'},.3)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>
                  {p.estado==='aprobado'?'✅':p.estado==='invitado'?'📨':p.estado==='rechazado'?'❌':'⏳'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:'12px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nombre}</div>
                  <div style={{fontSize:'10px',color:'rgba(0,0,0,.45)',marginTop:'2px'}}>
                    {p.categoria} · {p.ciudad}
                    {p.telefono&&` · 📱 ${p.telefono}`}
                    {` · Score: ${p.score_confianza}/100`}
                  </div>
                </div>
                <div style={{display:'flex',gap:'6px',flexShrink:0,alignItems:'center'}}>
                  <span style={{fontSize:'9px',fontWeight:700,padding:'2px 8px',borderRadius:'20px',border:`1px solid ${estadoColor[p.estado]||'#999'}`,color:estadoColor[p.estado]||'#999',background:`${estadoColor[p.estado]||'#999'}14`}}>
                    {p.estado?.replace('_',' ').toUpperCase()}
                  </span>
                  {p.estado==='prospecto_pendiente'&&(
                    <button style={{...S.btn(),padding:'5px 12px',fontSize:'10px',whiteSpace:'nowrap'}}
                      onClick={()=>aprobar(p.id)} disabled={approving===p.id}>
                      {approving===p.id?'⏳':'✓ Aprobar'}
                    </button>
                  )}
                  {p.estado==='invitado'&&(
                    <button style={{...S.btn('s'),padding:'5px 10px',fontSize:'10px'}}
                      onClick={async()=>{
                        await fetch(`${SB_URL}/rest/v1/prospectos_scouts?id=eq.${p.id}`,{
                          method:'PATCH',
                          headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`,'Content-Type':'application/json'},
                          body:JSON.stringify({estado:'en_revision'})
                        });
                        loadProspectos();
                      }}>⭐ Interesado</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function haversine(lat1:number,lng1:number,lat2:number,lng2:number){
  const R=6371000,dL=(lat2-lat1)*Math.PI/180,dN=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dN/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

export default SecScout;
