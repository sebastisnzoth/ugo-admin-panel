// ScoutSection.tsx — TomTom Maps SDK + POI Search
// @tomtom-org/maps-sdk v0.34.0
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TomTomConfig } from '@tomtom-org/maps-sdk/core';
import { search, reverseGeocode } from '@tomtom-org/maps-sdk/services';
import { TomTomMap, BaseMapModule, PlacesModule, POIsModule } from '@tomtom-org/maps-sdk/map';
// map/style.css loaded dynamically

const SB_URL = 'https://byajcqrgetloavrgyqak.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs';

const CAT_CONFIG: Record<string,{label:string;emoji:string;query:string;poiFilter:string}> = {
  electricista: { label:'Electricista', emoji:'⚡', query:'eletricista instalação elétrica', poiFilter:'electrician' },
  plomero:      { label:'Plomero',      emoji:'🔧', query:'encanador hidráulica',           poiFilter:'plumber'     },
  limpeza:      { label:'Limpeza',      emoji:'🧹', query:'limpeza faxina',                 poiFilter:'cleaning'    },
  chaveiro:     { label:'Chaveiro',     emoji:'🔑', query:'chaveiro',                       poiFilter:'locksmith'   },
  pintura:      { label:'Pintura',      emoji:'🎨', query:'pintor pintura',                 poiFilter:'painter'     },
  carpintaria:  { label:'Carpintaria',  emoji:'🪚', query:'carpintaria marcenaria',         poiFilter:'carpenter'   },
  jardinagem:   { label:'Jardinagem',   emoji:'🌿', query:'jardineiro jardinagem',          poiFilter:'gardener'    },
  climatizacao: { label:'Climatização', emoji:'❄️', query:'ar condicionado climatização',   poiFilter:'hvac'        },
  ti_redes:     { label:'TI & Redes',   emoji:'💻', query:'informática assistência técnica', poiFilter:'computer'   },
  reformas:     { label:'Reformas',     emoji:'🏠', query:'reforma pedreiro construção',    poiFilter:'contractor'  },
};

const fmtD = (d:number) => d<1000?Math.round(d)+'m':(d/1000).toFixed(1)+'km';

type Provider = {
  id:string; name:string; phone?:string; address?:string;
  lat:number; lng:number; dist:number; website?:string;
};

const S = {
  card:   { background:'#FFF', border:'1px solid rgba(0,0,0,.1)', borderRadius:'14px', padding:'14px', boxShadow:'0 1px 4px rgba(0,0,0,.06)' },
  label:  { fontSize:'10px', fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'.6px', color:'rgba(0,0,0,.5)', marginBottom:'5px', display:'block' },
  input:  { width:'100%', padding:'9px 12px', border:'2px solid rgba(0,0,0,.15)', borderRadius:'9px', fontSize:'12px', fontFamily:'Inter,sans-serif', outline:'none', color:'#111', background:'#F8F9FA' },
  select: { width:'100%', padding:'9px 12px', border:'2px solid rgba(0,0,0,.15)', borderRadius:'9px', fontSize:'12px', fontFamily:'Inter,sans-serif', outline:'none', color:'#111', background:'#F8F9FA', cursor:'pointer' },
  btn:    (v='p') => ({ padding:'8px 16px', borderRadius:'50px', border:'none', cursor:'pointer', fontFamily:'Inter,sans-serif', fontSize:'11px', fontWeight:700,
    background: v==='p'?'#05944F':v==='wa'?'#25D366':'rgba(0,0,0,.07)',
    color: v==='p'?'#FFF':v==='wa'?'#FFF':'#111', transition:'opacity .15s' } as React.CSSProperties),
  pill:   (c='g') => ({ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:'20px', fontSize:'9px', fontWeight:700,
    background: c==='g'?'rgba(5,148,79,.09)':'rgba(245,158,11,.09)',
    color: c==='g'?'#05944F':'#996000', border:`1px solid ${c==='g'?'rgba(5,148,79,.2)':'rgba(245,158,11,.2)'}` } as React.CSSProperties),
};

export function SecScout() {
  const [lat, setLat]         = useState(-27.5954);
  const [lng, setLng]         = useState(-48.5480);
  const [locLabel, setLocLabel] = useState('Florianópolis, SC');
  const [cat, setCat]         = useState('electricista');
  const [radius, setRadius]   = useState('5000');
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState('');
  const [results, setResults] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<Provider|null>(null);
  const [outreach, setOutreach] = useState<{type:'wa'|'email';text:string}|null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [manualPhone, setManualPhone] = useState('');
  const [added, setAdded]     = useState<Set<string>>(new Set());
  const [selected2, setSelected2] = useState<Set<string>>(new Set()); // multi-select for bulk add
  const [contacted, setContacted] = useState<Set<string>>(new Set());
  const [prospectos, setProspectos] = useState<any[]>([]);
  const [approving, setApproving] = useState<string|null>(null);
  const [stats, setStats]     = useState({found:0,contacted:0,joined:0});
  const [ttReady, setTtReady] = useState(false);
  const [ttError, setTtError] = useState('');

  const mapRef     = useRef<HTMLDivElement>(null);
  const ttMap      = useRef<TomTomMap|null>(null);
  const placesM    = useRef<any>(null);
  const poisM      = useRef<any>(null);

  // ── Init TomTom SDK ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Cargar maplibre-gl CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/maplibre-gl@3/dist/maplibre-gl.css';
    document.head.appendChild(cssLink);

    try {
        const r = await fetch(`${SB_URL}/rest/v1/config_sistema?clave=eq.api_tomtom_key&select=valor`, {
          headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
        });
        const d = await r.json();
        const key = d?.[0]?.valor?.trim();
        if (!key) { setTtError('TomTom key no configurada en Supabase.'); return; }

        TomTomConfig.instance.put({ apiKey: key, language: 'pt-BR' });

        if (cancelled || !mapRef.current) return;
        const map = new TomTomMap(
          { container: mapRef.current, center: [lng, lat], zoom: 12 },
          { key }
        );

        ttMap.current = map;
        placesM.current = await PlacesModule.get(map);
        poisM.current   = await POIsModule.get(map);
        await BaseMapModule.get(map);

        // Click en POI del mapa → seleccionar
        poisM.current.events.on('click', async (feature: any) => {
          const p = feature.properties;
          const coords = feature.geometry?.coordinates || [0,0];
          const prov: Provider = {
            id: p.id || String(Math.random()),
            name: p.name || 'Negócio',
            phone: p.phone || undefined,
            address: p.address || undefined,
            lat: coords[1], lng: coords[0],
            dist: 0,
          };
          setSelected(prov);
          setOutreach(null);
          setManualPhone('');
        });

        if (!cancelled) setTtReady(true);
      } catch(e:any) {
        if (!cancelled) setTtError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Cargar prospectos ────────────────────────────────────────
  const loadProspectos = useCallback(async () => {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/prospectos_scouts?order=created_at.desc&limit=50`, {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
      });
      const data = await r.json();
      if (Array.isArray(data)) {
        setProspectos(data);
        setStats({ found:data.length, contacted:data.filter((p:any)=>p.estado==='invitado').length, joined:data.filter((p:any)=>p.estado==='aprobado').length });
      }
    } catch {}
  }, []);

  useEffect(() => { loadProspectos(); }, [loadProspectos]);

  // ── GPS ──────────────────────────────────────────────────────
  const getGPS = () => {
    if (!navigator.geolocation) return;
    setLocLabel('Detectando...');
    navigator.geolocation.getCurrentPosition(
      async p => {
        const la = p.coords.latitude, lo = p.coords.longitude;
        setLat(la); setLng(lo);
        if(ttMap.current?.mapLibreMap) ttMap.current.mapLibreMap.flyTo({ center:[lo,la], zoom:14 });
        try {
          const place = await reverseGeocode({ position: [lo, la] });
          const addr = place.properties?.address?.freeformAddress;
          if (addr) setLocLabel(addr.split(',').slice(0,3).join(','));
        } catch { setLocLabel(`${la.toFixed(4)}, ${lo.toFixed(4)}`); }
      },
      () => setLocLabel('Florianópolis, SC (GPS denegado)')
    );
  };

  // ── BUSCAR con TomTom SDK ────────────────────────────────────
  const doSearch = async () => {
    if (!ttReady) { alert('TomTom SDK cargando...'); return; }
    setLoading(true); setResults([]); setSelected(null); setOutreach(null);
    await placesM.current?.clear();

    const cfg = CAT_CONFIG[cat];
    setLoadMsg(`${cfg.emoji} Buscando ${cfg.label} con TomTom SDK...`);

    try {
      // Buscar con POI categories primero
      let places: any = null;
      const rad = parseInt(radius);

      // Búsqueda directa por texto en PT/ES
      try {
        setLoadMsg(`${cfg.emoji} Buscando "${cfg.query.split(' ')[0]}" en TomTom...`);
        places = await search({
          query: cfg.query.split(' ')[0],
          geometries: [{ type:'Circle', coordinates:[lng,lat], radius: rad }],
          limit: 50,
        });
      } catch { /* seguir */ }

      // Fallback: búsqueda textual
      if (!places || places.features?.length === 0) {
        setLoadMsg(`${cfg.emoji} Búsqueda textual: "${cfg.query.split(' ')[0]}"...`);
        places = await search({
          query: cfg.query.split(' ')[0],
          geometries: [{ type:'Circle', coordinates:[lng,lat], radius: rad }],
          limit: 50,
        });
      }

      // Segunda query si poco resultado
      if ((!places?.features?.length) || places.features.length < 5) {
        setLoadMsg(`${cfg.emoji} Ampliando búsqueda...`);
        const places2 = await search({
          query: cfg.query.split(' ')[1] || cfg.query.split(' ')[0],
          geometries: [{ type:'Circle', coordinates:[lng,lat], radius: rad*2 }],
          limit: 50,
        });
        if ((places2?.features?.length||0) > (places?.features?.length||0)) {
          places = places2;
        }
      }

      const features = places?.features || [];
      if (features.length === 0) {
        setLoadMsg('');
        setLoading(false);
        alert(`Sin resultados para "${cfg.label}" en ${fmtD(rad)} radio.\n\nTip: Probá un radio mayor o categoría diferente.`);
        return;
      }

      // Mostrar en el mapa TomTom
      await placesM.current?.show(places);

      // Convertir a nuestro formato
      const provs: Provider[] = features.map((f:any) => {
        const props = f.properties || {};
        const [fLng, fLat] = f.geometry?.coordinates || [0,0];
        const dist = Math.sqrt(Math.pow((fLat-lat)*111000,2)+Math.pow((fLng-lng)*111000*Math.cos(lat*Math.PI/180),2));
        return {
          id: props.id || String(Math.random()),
          name: props.poi?.name || props.name || cfg.label,
          phone: props.poi?.phone || props.phone || undefined,
          address: props.address?.freeformAddress || props.address?.streetNameAndNumber || undefined,
          website: props.poi?.url || undefined,
          lat: fLat, lng: fLng, dist,
        };
      }).sort((a:Provider,b:Provider)=>a.dist-b.dist);

      setResults(provs);
      setLoadMsg(`📍 TomTom — ${provs.length} encontrados`);
      if(ttMap.current?.mapLibreMap) ttMap.current.mapLibreMap.flyTo({ center:[lng,lat], zoom:13 });

    } catch(e:any) {
      alert('Error al buscar: ' + e.message);
    }
    setLoading(false);
  };

  // ── Guardar en Supabase ──────────────────────────────────────
  const addToHugo = useCallback(async (p: Provider) => {
    try {
      await fetch(`${SB_URL}/rest/v1/prospectos_scouts`, {
        method:'POST',
        headers:{ apikey:SB_KEY, Authorization:`Bearer ${SB_KEY}`, 'Content-Type':'application/json', Prefer:'return=minimal,resolution=ignore-duplicates' },
        body: JSON.stringify({
          nombre:p.name, categoria:cat,
          telefono:p.phone||null, email:null, website:p.website||null,
          direccion:p.address||null,
          ciudad:locLabel.split(',')[0]?.trim()||'Florianópolis', pais:'BR',
          latitud:p.lat, longitud:p.lng, fuente:'tomtom',
          score_confianza:p.phone?65:30,
          notas_hugo:`Scout ${CAT_CONFIG[cat]?.emoji} ${CAT_CONFIG[cat]?.label} · ${fmtD(p.dist)}`,
          estado:'prospecto_pendiente',
        })
      });
      setAdded(prev=>new Set([...prev,p.id]));
      await loadProspectos();
    } catch(e:any) { alert('Error: '+e.message); }
  }, [cat, locLabel, loadProspectos]);

  // ── Generar outreach con Hugo ────────────────────────────────
  const genOutreach = async (type:'wa'|'email') => {
    if (!selected) return;
    setGenLoading(true); setOutreach(null);
    const cfg = CAT_CONFIG[cat];
    const prompt = type==='wa'
      ? `Você é Hugo, assistente do U.GO. Escreva mensagem WhatsApp curta (máx 80 palavras) em português convidando ${selected.name} (${cfg.label}) para ser provedor do U.GO. Destaque: 85% do pagamento, sem mensalidade, clientes verificados. Link: https://ugo.app/cadastro. SEM colchetes. Máx 1 emoji.`
      : `Você é Hugo, assistente do U.GO. Escreva email profissional em português para ${selected.name} (${cfg.label}). Primeira linha: "Assunto: [assunto aqui]". Convide para ser provedor U.GO. Máx 150 palavras. Link: https://ugo.app/cadastro`;
    try {
      const r = await fetch('/api/proxy', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ mode:'admin', messages:[{role:'user',content:prompt}], max_tokens:300 })
      });
      const d = await r.json();
      setOutreach({ type, text: d.content?.[0]?.text || 'Error al generar.' });
      setContacted(prev=>new Set([...prev,selected.id]));
    } catch(e:any) { setOutreach({type,text:'Error: '+e.message}); }
    setGenLoading(false);
  };

  // ── Aprobar prospecto ────────────────────────────────────────
  const aprobar = useCallback(async (id:string) => {
    setApproving(id);
    try {
      const r = await fetch(`${SB_URL}/rest/v1/rpc/aprobar_prospecto`, {
        method:'POST',
        headers:{ apikey:SB_KEY, Authorization:`Bearer ${SB_KEY}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ p_prospecto_id:id, p_admin_email:'sebastianzoth@gmail.com' })
      });
      const d = await r.json();
      if (!d.ok) { alert('Error: '+(d.error||'Revisar Supabase')); setApproving(null); return; }

      const prosp = prospectos.find(p=>p.id===id);
      let waSent = false;
      if (prosp?.telefono) {
        const msgR = await fetch('/api/proxy', { method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({ mode:'admin', messages:[{role:'user',content:`Mensaje WhatsApp breve en português invitando a "${prosp.nombre}" (${prosp.categoria}) a U.GO. Link: ${d.link_onboarding||'https://ugo.app/cadastro'}. Sin colchetes. Máx 60 palabras.`}], max_tokens:150 })});
        const msgD = await msgR.json();
        const msg = msgD.content?.[0]?.text?.trim() || `Olá ${prosp.nombre}! Convidamos você para o U.GO. Cadastre-se: ${d.link_onboarding||'https://ugo.app/cadastro'}`;
        const waR = await fetch('/api/whatsapp/send', { method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({ to:prosp.telefono, message:msg, prospecto_id:id }) });
        const waD = await waR.json();
        waSent = waD.ok;
      }

      await loadProspectos();
      alert(`✅ ${prosp?.nombre||'Proveedor'} aprobado\n${waSent?`📲 WhatsApp enviado a ${prosp?.telefono}`:'📋 Link: '+(d.link_onboarding||'')}`);
      if (!waSent && d.link_onboarding) navigator.clipboard.writeText(d.link_onboarding).catch(()=>{});
    } catch(e:any) { alert('Error: '+e.message); }
    setApproving(null);
  }, [prospectos, loadProspectos]);

  // ── RENDER ───────────────────────────────────────────────────
  if (ttError) return (
    <div style={{padding:'20px',fontFamily:'Inter,sans-serif'}}>
      <div style={{...S.card, borderLeft:'3px solid #E11900'}}>
        <b style={{color:'#E11900'}}>⚠ TomTom SDK Error</b>
        <p style={{color:'#666',marginTop:'6px',fontSize:'12px'}}>{ttError}</p>
        <p style={{fontSize:'11px',color:'#999'}}>Verificá que la key en Supabase config_sistema (api_tomtom_key) sea válida.</p>
      </div>
    </div>
  );

  const phoneToUse = selected?.phone || manualPhone;

  return (
    <div style={{padding:'16px',overflowY:'auto',height:'100%',fontFamily:'Inter,sans-serif'}}>
      <div style={{fontSize:'18px',fontWeight:800,color:'#111',marginBottom:'2px'}}>📡 Hugo Scout</div>
      <div style={{fontSize:'12px',color:'rgba(0,0,0,.5)',marginBottom:'14px'}}>
        Reclutamiento de proveedores · TomTom Maps SDK · {ttReady?'✅ SDK listo':'⏳ Iniciando...'}
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'14px'}}>
        {([['En Supabase',stats.found,'#276EF1'],['Contactados',stats.contacted,'#05944F'],['Incorporados',stats.joined,'#111']] as [string,number,string][]).map(([l,v,c])=>(
          <div key={l} style={{...S.card,padding:'10px'}}>
            <div style={{fontSize:'9px',textTransform:'uppercase',letterSpacing:'.8px',color:'rgba(0,0,0,.45)',marginBottom:'3px'}}>{l}</div>
            <div style={{fontSize:'22px',fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 330px',gap:'12px'}}>
        {/* MAP PANEL */}
        <div>
          {/* Ubicación */}
          <div style={{...S.card,marginBottom:'10px',display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'9px',color:'rgba(0,0,0,.4)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'1px'}}>Zona</div>
              <div style={{fontSize:'12px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{locLabel}</div>
            </div>
            <button style={S.btn()} onClick={getGPS}>📍 GPS</button>
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
            <button style={{...S.btn(),whiteSpace:'nowrap'}} onClick={doSearch} disabled={loading||!ttReady}>
              {loading?'⏳...':'🔎 Buscar'}
            </button>
            <button style={{...S.btn('s'),whiteSpace:'nowrap',background:'rgba(0,0,0,.07)',color:'#111'}}
              onClick={()=>{ const csv=[['Nombre','Tel','Dir'],...results.map(p=>[p.name,p.phone||'',p.address||''])].map(r=>r.map(c=>`"${c}"`).join(',')).join('\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=`scout_${cat}.csv`; a.click(); }}
              disabled={!results.length}>⬇ CSV</button>
          </div>

          {/* Mapa TomTom */}
          <div style={{...S.card,padding:0,overflow:'hidden',borderRadius:'14px',marginBottom:'10px',position:'relative'}}>
            <div ref={mapRef} style={{width:'100%',height:'320px'}}/>
            {loading&&<div style={{position:'absolute',inset:0,background:'rgba(255,255,255,.88)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:1000}}>
              <div style={{fontSize:'28px',marginBottom:'8px',animation:'spin 1s linear infinite'}}>⟳</div>
              <div style={{fontSize:'11px',color:'rgba(0,0,0,.6)'}}>{loadMsg}</div>
              <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            </div>}
          </div>

          {/* Resultados */}
          {results.length>0&&(
            <div>
              <div style={{fontSize:'11px',fontWeight:700,marginBottom:'8px',color:'rgba(0,0,0,.6)'}}>
                {results.length} proveedores · {results.filter(p=>p.phone).length} con teléfono
              </div>
              {results.map(p=>(
                <div key={p.id} onClick={()=>{setSelected(s=>s?.id===p.id?null:p);setOutreach(null);setManualPhone('');}}
                  style={{...S.card,cursor:'pointer',borderColor:selected?.id===p.id?'#05944F':'rgba(0,0,0,.1)',
                    background:selected?.id===p.id?'rgba(5,148,79,.03)':'#FFF',
                    display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',marginBottom:'6px',
                    borderLeft:`3px solid ${p.phone?'#05944F':'#E5E5E5'}`}}>
                  <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'#276EF1',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:800,color:'#FFF',flexShrink:0}}>
                    {fmtD(p.dist)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:'12px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                    <div style={{fontSize:'10px',color:'rgba(0,0,0,.45)',marginTop:'2px'}}>
                      {p.address||CAT_CONFIG[cat]?.label}
                      {p.phone&&<span style={{color:'#05944F',marginLeft:6}}>📱 {p.phone}</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'5px',flexShrink:0,alignItems:'center'}}>
                    {contacted.has(p.id)&&<span style={S.pill('g')}>Contactado</span>}
                    <button style={{...S.btn(added.has(p.id)?undefined:'p'),padding:'4px 10px',fontSize:'9px'}}
                      onClick={e=>{e.stopPropagation();if(!added.has(p.id))addToHugo(p);}}
                      disabled={added.has(p.id)}>{added.has(p.id)?'✓ Guardado':'+ Hugo'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* OUTREACH PANEL */}
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <div style={S.card}>
            <div style={{fontSize:'11px',fontWeight:700,marginBottom:'12px'}}>
              ✉️ Panel de Outreach
              {selected&&<span style={{...S.pill('g'),marginLeft:'8px',fontSize:'8px'}}>{CAT_CONFIG[cat]?.emoji} {CAT_CONFIG[cat]?.label}</span>}
            </div>

            {!selected?(
              <div style={{textAlign:'center',padding:'24px 0',color:'rgba(0,0,0,.35)'}}>
                <div style={{fontSize:'24px',marginBottom:'8px'}}>👆</div>
                <div style={{fontSize:'11px'}}>Seleccioná un proveedor del mapa o la lista</div>
              </div>
            ):(
              <>
                <div style={{background:'#F8F9FA',borderRadius:'10px',padding:'10px 12px',marginBottom:'12px'}}>
                  <div style={{fontWeight:700,fontSize:'13px',marginBottom:'2px'}}>{selected.name}</div>
                  <div style={{fontSize:'10px',color:'rgba(0,0,0,.5)'}}>{fmtD(selected.dist)}</div>
                  {selected.phone&&<div style={{fontSize:'12px',marginTop:'5px',color:'#05944F',fontWeight:600}}>📱 {selected.phone}</div>}
                  {selected.address&&<div style={{fontSize:'10px',marginTop:'3px',color:'rgba(0,0,0,.55)'}}>📍 {selected.address}</div>}
                  {selected.website&&<div style={{fontSize:'10px',marginTop:'3px'}}><a href={selected.website} target="_blank" rel="noreferrer" style={{color:'#276EF1'}}>🌐 Website</a></div>}
                </div>

                {!selected.phone&&(
                  <div style={{marginBottom:'10px'}}>
                    <label style={S.label}>📱 Teléfono manual para WhatsApp</label>
                    <input style={S.input} value={manualPhone} onChange={e=>setManualPhone(e.target.value)} placeholder="+55 48 9 9999-9999"/>
                  </div>
                )}

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px',marginBottom:'12px'}}>
                  <button style={{...S.btn('wa'),fontSize:'11px'}} onClick={()=>genOutreach('wa')} disabled={genLoading}>📲 WhatsApp</button>
                  <button style={{...S.btn('s'),background:'rgba(0,0,0,.07)',color:'#111',fontSize:'11px'}} onClick={()=>genOutreach('email')} disabled={genLoading}>📧 Email</button>
                </div>

                {genLoading&&<div style={{textAlign:'center',padding:'12px',background:'#F8F9FA',borderRadius:'8px',marginBottom:'10px',fontSize:'11px',color:'rgba(0,0,0,.5)'}}>✨ Gemini generando...</div>}

                {outreach&&(
                  <div style={{background:'#F8F9FA',border:'1px solid rgba(0,0,0,.1)',borderRadius:'10px',padding:'12px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                      <span style={{fontSize:'10px',fontWeight:700,color:'rgba(0,0,0,.5)'}}>{outreach.type==='wa'?'📲 WhatsApp':'📧 Email'}</span>
                      <button style={{...S.btn('s'),padding:'3px 10px',fontSize:'9px',background:'rgba(0,0,0,.07)',color:'#111'}}
                        onClick={()=>{ navigator.clipboard.writeText(outreach.text); }}>📋 Copiar</button>
                    </div>
                    <div style={{fontSize:'11px',lineHeight:1.65,whiteSpace:'pre-wrap',maxHeight:'180px',overflowY:'auto'}}>{outreach.text}</div>
                    {outreach.type==='wa'&&phoneToUse&&(
                      <a href={`https://wa.me/${phoneToUse.replace(/\D/g,'')}?text=${encodeURIComponent(outreach.text)}`}
                        target="_blank" rel="noreferrer" onClick={()=>setContacted(prev=>new Set([...prev,selected.id]))}
                        style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',padding:'9px',background:'#25D366',color:'#FFF',borderRadius:'9px',textDecoration:'none',fontSize:'11px',fontWeight:700,marginTop:'10px'}}>
                        Abrir WhatsApp →
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Instrucciones */}
          <div style={{...S.card,padding:'12px',fontSize:'10px',color:'rgba(0,0,0,.5)',lineHeight:1.7}}>
            <b style={{color:'rgba(0,0,0,.7)',display:'block',marginBottom:'5px'}}>💡 Flujo</b>
            1. GPS → Categoría → Buscar<br/>
            2. Clic en resultado → Outreach<br/>
            3. <b>+ Hugo</b> → guarda en Supabase<br/>
            4. <b>✓ Aprobar</b> → WhatsApp automático
          </div>
        </div>
      </div>

      {/* PROSPECTOS */}
      <div style={{marginTop:'16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
          <div style={{fontSize:'13px',fontWeight:700,color:'#111'}}>🗂 Prospectos en Supabase ({prospectos.length})</div>
          <button style={{...S.btn('s'),padding:'5px 12px',fontSize:'10px',background:'rgba(0,0,0,.07)',color:'#111'}} onClick={loadProspectos}>↻ Actualizar</button>
        </div>
        {prospectos.map(p=>{
          const stColors:Record<string,string> = { prospecto_pendiente:'#996000', invitado:'#276EF1', en_revision:'#7356BF', aprobado:'#05944F', rechazado:'#E11900' };
          const stIcons:Record<string,string>  = { prospecto_pendiente:'⏳', invitado:'📨', en_revision:'⭐', aprobado:'✅', rechazado:'❌' };
          return (
            <div key={p.id} style={{...S.card,display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px',marginBottom:'8px'}}>
              <div style={{width:'36px',height:'36px',borderRadius:'50%',background:`${stColors[p.estado]||'#999'}18`,border:`1.5px solid ${stColors[p.estado]||'#999'}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>{stIcons[p.estado]||'⏳'}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:'12px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nombre}</div>
                <div style={{fontSize:'10px',color:'rgba(0,0,0,.45)',marginTop:'2px'}}>{p.categoria} · {p.ciudad}{p.telefono?` · 📱 ${p.telefono}`:''}</div>
              </div>
              <div style={{display:'flex',gap:'6px',flexShrink:0,alignItems:'center'}}>
                <span style={{fontSize:'9px',fontWeight:700,padding:'2px 8px',borderRadius:'20px',border:`1px solid ${stColors[p.estado]||'#999'}`,color:stColors[p.estado]||'#999',background:`${stColors[p.estado]||'#999'}12`}}>{(p.estado||'').replace('_',' ').toUpperCase()}</span>
                {p.estado==='prospecto_pendiente'&&(
                  <button style={{...S.btn(),padding:'5px 12px',fontSize:'10px',whiteSpace:'nowrap'}} onClick={()=>aprobar(p.id)} disabled={approving===p.id}>
                    {approving===p.id?'⏳':'✓ Aprobar'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {prospectos.length===0&&<div style={{...S.card,textAlign:'center',padding:'20px',color:'rgba(0,0,0,.4)',fontSize:'12px'}}>Sin prospectos aún. Buscá y pulsá "+ Hugo" para agregar.</div>}
      </div>
    </div>
  );
}

export default SecScout;
