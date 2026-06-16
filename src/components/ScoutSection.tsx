import React, { useState, useEffect, useRef, useCallback } from 'react';

declare const L: any;

const SB_URL = 'https://byajcqrgetloavrgyqak.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs';

const SC_TAGS: Record<string,string[][]> = {
  electrician:[['craft','electrician'],['shop','electrician']],
  plumber:[['craft','plumber'],['craft','plumbing']],
  cleaning:[['craft','cleaning'],['shop','dry_cleaning']],
  locksmith:[['craft','locksmith']],
  painter:[['craft','painter'],['craft','decorator']],
  carpenter:[['craft','carpenter'],['craft','joiner']],
  gardener:[['craft','gardener'],['craft','landscaping']],
  hvac:[['craft','hvac'],['craft','refrigeration']],
  it:[['shop','computer'],['craft','electronics_repair']],
  appliance:[['craft','electronics_repair']],
};

const CAT_LABELS: Record<string,string> = {
  electrician:'Electricista',plumber:'Plomero',cleaning:'Limpieza',
  locksmith:'Cerrajero',painter:'Pintor',carpenter:'Carpintero',
  gardener:'Jardinero',hvac:'Climatización',it:'Técnico TI',appliance:'Electrodomésticos'
};

const DIST_COLORS = ['#05944F','#F59E0B','#E11900'];
const distColor = (d:number) => d<1000?DIST_COLORS[0]:d<3000?DIST_COLORS[1]:DIST_COLORS[2];
const fmtD = (d:number) => d<1000?Math.round(d)+'m':(d/1000).toFixed(1)+'km';

type Provider = { id:string; name:string; phone?:string; address?:string; lat:number; lng:number; dist:number; tags:any; };

const S = {
  card: {background:'#FFF',border:'1px solid rgba(0,0,0,.1)',borderRadius:'14px',padding:'14px',marginBottom:'10px',boxShadow:'0 1px 4px rgba(0,0,0,.06)'},
  label: {fontSize:'10px',fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'.6px',color:'rgba(0,0,0,.5)',marginBottom:'5px',display:'block'},
  input: {width:'100%',padding:'9px 12px',border:'2px solid rgba(0,0,0,.15)',borderRadius:'9px',fontSize:'12px',fontFamily:'Inter,sans-serif',outline:'none',color:'#111',background:'#F8F9FA',transition:'border .2s'},
  select: {width:'100%',padding:'9px 12px',border:'2px solid rgba(0,0,0,.15)',borderRadius:'9px',fontSize:'12px',fontFamily:'Inter,sans-serif',outline:'none',color:'#111',background:'#F8F9FA',cursor:'pointer'},
  btn: (v='p') => ({padding:'8px 16px',borderRadius:'50px',border:'none',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:'11px',fontWeight:700,background:v==='p'?'#05944F':v==='d'?'rgba(225,25,0,.1)':'rgba(0,0,0,.07)',color:v==='p'?'#FFF':v==='d'?'#E11900':'#111',transition:'opacity .15s'} as React.CSSProperties),
  pill: (c='g') => ({display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:'20px',fontSize:'9px',fontWeight:700,background:c==='g'?'rgba(5,148,79,.09)':'rgba(245,158,11,.09)',color:c==='g'?'#05944F':'#996000',border:`1px solid ${c==='g'?'rgba(5,148,79,.2)':'rgba(245,158,11,.2)'}`} as React.CSSProperties),
};

export function SecScout() {
  const [lat, setLat] = useState<number|null>(null);
  const [lng, setLng] = useState<number|null>(null);
  const [locLabel, setLocLabel] = useState('Sin ubicación — usá GPS o ingresá dirección');
  const [addr, setAddr] = useState('');
  const [showAddr, setShowAddr] = useState(false);
  const [cat, setCat] = useState('electrician');
  const [radius, setRadius] = useState('2000');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [results, setResults] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<Provider|null>(null);
  const [outreach, setOutreach] = useState<{type:'wa'|'email';text:string}|null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [stats, setStats] = useState({found:0,contacted:0,interested:0,joined:0});
  const [exportData, setExportData] = useState<Provider[]>([]);
  const mapRef = useRef<any>(null);
  const mapInst = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const centerMark = useRef<any>(null);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInst.current || typeof L === 'undefined') return;
    const map = L.map(mapRef.current, { zoomControl:true, center:[-27.5954,-48.5480], zoom:13 });
    L.tileLayer('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/{s}/{z}/{x}/{y}.png', {attribution:'© OSM'});
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {attribution:'© CARTO', maxZoom:19}).addTo(map);
    mapInst.current = map;
    [100,400,800].forEach(t => setTimeout(()=>map.invalidateSize(),t));
  }, []);

  const setLocation = useCallback((la:number, ln:number, label?:string) => {
    setLat(la); setLng(ln);
    if (label) setLocLabel(label);
    const map = mapInst.current; if (!map) return;
    map.setView([la,ln],14);
    if (centerMark.current) map.removeLayer(centerMark.current);
    centerMark.current = L.marker([la,ln], {icon: L.divIcon({html:'<div style="width:16px;height:16px;border-radius:50%;background:#111;border:3px solid #FFF;box-shadow:0 2px 8px rgba(0,0,0,.3);"></div>',className:'',iconSize:[16,16],iconAnchor:[8,8]})}).addTo(map);
    if (!label) {
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${ln}&format=json`)
        .then(r=>r.json()).then(d=>{ const p=[d.address?.suburb||d.address?.neighbourhood,d.address?.city||d.address?.town].filter(Boolean); if(p.length) setLocLabel(p.join(', ')+` (${la.toFixed(4)}, ${ln.toFixed(4)})`); }).catch(()=>{});
    }
  }, []);

  const getGPS = () => {
    if (!navigator.geolocation) return setLocation(-27.5954,-48.5480,'Florianópolis, SC (demo)');
    navigator.geolocation.getCurrentPosition(
      p => setLocation(p.coords.latitude, p.coords.longitude),
      () => setLocation(-27.5954,-48.5480,'Florianópolis, SC (demo)'),
      {timeout:8000}
    );
  };

  const geocode = async () => {
    if (!addr.trim()) return;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`);
      const d = await r.json();
      if (!d.length) return alert('No encontrado. Probá con más detalle.');
      setLocation(parseFloat(d[0].lat), parseFloat(d[0].lon), d[0].display_name.split(',').slice(0,3).join(','));
      setShowAddr(false);
    } catch { alert('Error al buscar.'); }
  };

  const doSearch = async () => {
    if (lat === null) return alert('Primero detectá tu ubicación.');
    setLoading(true); setLoadingMsg('Consultando OpenStreetMap...'); setResults([]); setSelected(null); setOutreach(null);
    markersRef.current.forEach(m => mapInst.current?.removeLayer(m));
    markersRef.current = [];
    try {
      const tags = SC_TAGS[cat] || [['craft',cat]];
      const cond = tags.map(([k,v]) => `node["${k}"="${v}"](around:${radius},${lat},${lng});way["${k}"="${v}"](around:${radius},${lat},${lng});`).join('');
      const r = await fetch('https://overpass-api.de/api/interpreter', {
        method:'POST', body:'data='+encodeURIComponent(`[out:json][timeout:20];(${cond});out body;`)
      });
      const d = await r.json();
      const provs: Provider[] = (d.elements||[]).map((el:any) => {
        const eLat = el.lat ?? el.center?.lat; const eLng = el.lon ?? el.center?.lon;
        if (!eLat||!eLng) return null;
        const dist = haversine(lat!, lng!, eLat, eLng);
        return { id:String(el.id), name:el.tags?.name||el.tags?.['name:pt']||el.tags?.brand||`${CAT_LABELS[cat]} sin nombre`, phone:el.tags?.phone||el.tags?.['contact:phone'], address:el.tags?.['addr:street']?`${el.tags['addr:street']} ${el.tags['addr:housenumber']||''}`.trim():undefined, lat:eLat, lng:eLng, dist, tags:el.tags };
      }).filter(Boolean).sort((a:any,b:any)=>a.dist-b.dist).slice(0,30);
      setResults(provs); setExportData(provs);
      setStats(s => ({...s, found: provs.length}));
      // Map markers
      provs.forEach((p:Provider) => {
        const color = distColor(p.dist);
        const mk = L.marker([p.lat,p.lng], {icon:L.divIcon({html:`<div style="width:28px;height:28px;border-radius:50%;background:${color};border:2.5px solid #FFF;display:flex;align-items:center;justify-content:center;font-size:11px;color:#FFF;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.2);">${fmtD(p.dist)[0]}</div>`,className:'',iconSize:[28,28],iconAnchor:[14,14]})}).addTo(mapInst.current!);
        mk.bindPopup(`<b>${p.name}</b><br>${fmtD(p.dist)}${p.phone?'<br>📱 '+p.phone:''}`);
        mk.on('click', () => setSelected(p));
        markersRef.current.push(mk);
      });
      if (provs.length && mapInst.current) {
        const bounds = L.latLngBounds([[lat!,lng!], ...provs.map((p:Provider)=>[p.lat,p.lng])]);
        mapInst.current.fitBounds(bounds, {padding:[30,30]});
      }
    } catch(e:any) { alert('Error: '+e.message); }
    setLoading(false);
  };

  const genOutreach = async (type: 'wa'|'email') => {
    if (!selected) return;
    setGenLoading(true); setOutreach(null);
    const sys = type==='wa'
      ? 'You are Hugo Scout for U.GO marketplace in Latin America. Write a warm WhatsApp message (max 100 words) in Brazilian Portuguese inviting this service business to join U.GO. Use *bold* for key points, max 2 emojis. Benefits: receive nearby job requests via app, 85% of payment, zero fees, secure escrow. Be specific. NO brackets.'
      : 'You are Hugo Scout for U.GO marketplace in Latin America. Write a professional email in Brazilian Portuguese to invite this business to join U.GO. FIRST LINE must be exactly "Assunto: [subject]", then blank line, then body (150-200 words). Benefits: nearby job requests, 85% payment, zero fees, secure escrow. Be specific. NO brackets.';
    const q = `${type==='wa'?'WhatsApp':'Email'} outreach for: Business=${selected.name}, Service=${CAT_LABELS[cat]}, Distance=${fmtD(selected.dist)}${selected.phone?', Phone='+selected.phone:''}${selected.address?', Address='+selected.address:''}`;
    try {
      const r = await fetch('/api/proxy', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system:sys,messages:[{role:'user',content:q}],max_tokens:400})});
      const d = await r.json();
      const text = d.content?.[0]?.text || d.error || 'Error generando mensaje.';
      setOutreach({type,text});
      setStats(s => ({...s,contacted:s.contacted+1}));
    } catch(e:any) { setOutreach({type,text:'Error: '+e.message}); }
    setGenLoading(false);
  };

  const exportCSV = () => {
    const rows = [['Nombre','Teléfono','Email','Dirección','Distancia','Categoría'],...exportData.map(p=>[p.name,p.phone||'',p.tags?.email||p.tags?.['contact:email']||'',p.address||'',fmtD(p.dist),CAT_LABELS[cat]])];
    const csv = rows.map(r=>r.map(c=>'"'+(c||'').replace(/"/g,'""')+'"').join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`scout_${cat}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  return (
    <div style={{padding:'16px',overflowY:'auto',height:'100%'}}>
      <div style={{fontFamily:'Inter',fontSize:'18px',fontWeight:800,color:'#111',marginBottom:'4px',letterSpacing:'-.4px'}}>📡 Hugo Scout</div>
      <div style={{fontSize:'12px',color:'rgba(0,0,0,.5)',marginBottom:'14px'}}>Reclutamiento de proveedores por geolocalización · WhatsApp + Email outreach con Gemini</div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'12px'}}>
        {[['Encontrados',stats.found,'#276EF1'],['Contactados',stats.contacted,'#05944F'],['Interesados',stats.interested,'#996000'],['Incorporados',stats.joined,'#111']].map(([l,v,c])=>(
          <div key={l as string} style={{...S.card,padding:'10px 12px'}}>
            <div style={{fontSize:'9px',textTransform:'uppercase',letterSpacing:'.8px',color:'rgba(0,0,0,.45)',marginBottom:'3px'}}>{l}</div>
            <div style={{fontSize:'20px',fontWeight:800,color:c as string,fontFamily:'Inter'}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:'12px'}}>
        {/* LEFT */}
        <div>
          {/* Location */}
          <div style={S.card}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
              <div style={{width:'34px',height:'34px',borderRadius:'50%',background:'rgba(5,148,79,.08)',border:'1px solid rgba(5,148,79,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',flexShrink:0}}>📡</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'9px',color:'rgba(0,0,0,.45)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'1px'}}>Ubicación del cliente</div>
                <div style={{fontSize:'12px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{locLabel}</div>
              </div>
              <button style={S.btn()} onClick={getGPS}>📍 GPS</button>
              <button style={S.btn('s')} onClick={()=>setShowAddr(v=>!v)}>⌨</button>
            </div>
            {showAddr && (
              <div style={{display:'flex',gap:'7px',marginTop:'6px'}}>
                <input style={S.input} value={addr} onChange={e=>setAddr(e.target.value)} onKeyDown={e=>e.key==='Enter'&&geocode()} placeholder="Dirección, barrio o ciudad..."/>
                <button style={S.btn()} onClick={geocode}>🔍</button>
                <button style={S.btn('s')} onClick={()=>setShowAddr(false)}>✕</button>
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{...S.card,display:'grid',gridTemplateColumns:'1fr 120px auto auto',gap:'10px',alignItems:'flex-end'}}>
            <div><label style={S.label}>Categoría</label>
              <select style={S.select} value={cat} onChange={e=>setCat(e.target.value)}>
                {Object.entries(CAT_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label style={S.label}>Radio</label>
              <select style={S.select} value={radius} onChange={e=>setRadius(e.target.value)}>
                {[['1000','1 km'],['2000','2 km'],['5000','5 km'],['10000','10 km']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <button style={{...S.btn(),whiteSpace:'nowrap'}} onClick={doSearch} disabled={lat===null||loading}>🔎 Buscar</button>
            <button style={{...S.btn('s'),whiteSpace:'nowrap'}} onClick={exportCSV} disabled={!exportData.length}>⬇ CSV</button>
          </div>

          {/* Map */}
          <div style={{...S.card,padding:0,overflow:'hidden',height:'280px',position:'relative'}}>
            <div ref={mapRef} style={{width:'100%',height:'100%'}}/>
            {!lat && <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#F8F9FA',gap:'6px',color:'rgba(0,0,0,.4)',zIndex:1000,pointerEvents:'none'}}>
              <div style={{fontSize:'28px'}}>🗺</div>
              <div style={{fontSize:'11px'}}>Detectá GPS o ingresá dirección</div>
            </div>}
          </div>

          {/* Results */}
          {loading && <div style={{...S.card,textAlign:'center',padding:'20px',color:'rgba(0,0,0,.5)',fontSize:'12px'}}>
            <div style={{marginBottom:'6px'}}>⏳ {loadingMsg}</div>
          </div>}

          {!loading && results.length > 0 && (
            <div style={{marginTop:'8px'}}>
              <div style={{fontSize:'11px',fontWeight:700,marginBottom:'8px',color:'rgba(0,0,0,.6)'}}>{results.length} proveedores encontrados</div>
              {results.map(p=>(
                <div key={p.id} onClick={()=>setSelected(s=>s?.id===p.id?null:p)}
                  style={{...S.card,cursor:'pointer',borderColor:selected?.id===p.id?'#05944F':'rgba(0,0,0,.1)',background:selected?.id===p.id?'rgba(5,148,79,.03)':'#FFF',display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px'}}>
                  <div style={{width:'32px',height:'32px',borderRadius:'50%',background:distColor(p.dist),display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:800,color:'#FFF',flexShrink:0}}>{fmtD(p.dist)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:'12px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                    <div style={{fontSize:'10px',color:'rgba(0,0,0,.45)',marginTop:'2px'}}>{p.address||CAT_LABELS[cat]}{p.phone&&` · 📱 ${p.phone}`}</div>
                  </div>
                  <span style={S.pill(p.dist<2000?'g':'a')}>{fmtD(p.dist)}</span>
                </div>
              ))}
            </div>
          )}

          {!loading && results.length===0 && lat && (
            <div style={{...S.card,textAlign:'center',padding:'24px',color:'rgba(0,0,0,.4)'}}>
              <div style={{fontSize:'28px',marginBottom:'8px'}}>🔍</div>
              <div style={{fontSize:'12px'}}>Tocá "Buscar" para encontrar proveedores</div>
            </div>
          )}
        </div>

        {/* RIGHT — Outreach */}
        <div>
          <div style={S.card}>
            <div style={{fontSize:'11px',fontWeight:700,marginBottom:'12px'}}>✉️ Panel de Outreach</div>
            {!selected ? (
              <div style={{textAlign:'center',padding:'24px 0',color:'rgba(0,0,0,.35)'}}>
                <div style={{fontSize:'24px',marginBottom:'8px'}}>👆</div>
                <div style={{fontSize:'11px'}}>Seleccioná un proveedor del mapa o de la lista</div>
              </div>
            ) : (
              <>
                <div style={{background:'#F8F9FA',borderRadius:'10px',padding:'10px 12px',marginBottom:'12px'}}>
                  <div style={{fontWeight:700,fontSize:'13px',marginBottom:'3px'}}>{selected.name}</div>
                  <div style={{fontSize:'10px',color:'rgba(0,0,0,.5)'}}>{CAT_LABELS[cat]} · {fmtD(selected.dist)}</div>
                  {selected.phone && <div style={{fontSize:'11px',marginTop:'4px'}}>📱 {selected.phone}</div>}
                  {selected.address && <div style={{fontSize:'11px',marginTop:'2px',color:'rgba(0,0,0,.55)'}}>📍 {selected.address}</div>}
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px',marginBottom:'12px'}}>
                  <button style={S.btn()} onClick={()=>genOutreach('wa')} disabled={genLoading}>📲 WhatsApp</button>
                  <button style={S.btn('s')} onClick={()=>genOutreach('email')} disabled={genLoading}>📧 Email</button>
                </div>

                {genLoading && <div style={{textAlign:'center',padding:'12px',color:'rgba(0,0,0,.4)',fontSize:'11px'}}>Gemini generando mensaje...</div>}

                {outreach && (
                  <div style={{background:'#F8F9FA',border:'1px solid rgba(0,0,0,.1)',borderRadius:'10px',padding:'11px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                      <span style={{fontSize:'10px',fontWeight:700,color:'rgba(0,0,0,.5)',textTransform:'uppercase'}}>{outreach.type==='wa'?'📲 WhatsApp':'📧 Email'}</span>
                      <button style={{...S.btn('s'),padding:'3px 10px',fontSize:'9px'}} onClick={()=>navigator.clipboard.writeText(outreach.text)}>Copiar</button>
                    </div>
                    <div style={{fontSize:'12px',lineHeight:1.6,whiteSpace:'pre-wrap',color:'#111'}}>{outreach.text}</div>
                    {outreach.type==='wa' && selected.phone && (
                      <a href={`https://wa.me/${selected.phone.replace(/\D/g,'')}?text=${encodeURIComponent(outreach.text)}`} target="_blank"
                        style={{display:'block',marginTop:'10px',padding:'8px',background:'#25D366',color:'#FFF',borderRadius:'8px',textAlign:'center',textDecoration:'none',fontSize:'11px',fontWeight:700}}>
                        Enviar por WhatsApp →
                      </a>
                    )}
                    <div style={{display:'flex',gap:'7px',marginTop:'8px'}}>
                      <button style={{...S.btn('s'),flex:1,fontSize:'9px'}} onClick={()=>setStats(s=>({...s,interested:s.interested+1}))}>⭐ Interesado</button>
                      <button style={{...S.btn(),flex:1,fontSize:'9px'}} onClick={()=>setStats(s=>({...s,joined:s.joined+1}))}>✅ Incorporado</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Legend */}
          <div style={{...S.card,padding:'10px 12px'}}>
            <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.8px',color:'rgba(0,0,0,.4)',marginBottom:'8px'}}>Distancia</div>
            {[['#05944F','Menos de 1km'],['#996000','1–3 km'],['#E11900','Más de 3km']].map(([c,l])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'5px'}}>
                <div style={{width:'10px',height:'10px',borderRadius:'50%',background:c,flexShrink:0}}/>
                <span style={{fontSize:'10px',color:'rgba(0,0,0,.6)'}}>{l}</span>
              </div>
            ))}
          </div>
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
