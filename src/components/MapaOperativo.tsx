import React from 'react';

const SB_URL = 'https://byajcqrgetloavrgyqak.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs';
const API = (path: string) => `${SB_URL}/rest/v1/${path}`;
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
const get = (path: string) => fetch(API(path), { headers: H as any }).then(r => r.json());

const CATS = ['Todos','Pintor','Plomero','Electricista','Limpieza','Carpintero','Cerrajero','Jardinero','AC/Clima','Geral'];
const CAT_IC: Record<string,string> = {Pintor:'🎨',Plomero:'🔧',Electricista:'⚡',Limpieza:'🧹',Carpintero:'🪚',Cerrajero:'🔑',Jardinero:'🌿','AC/Clima':'❄️',Geral:'🔨'};

declare const L: any;

export function SecMapaOperativo() {
  const mapRef = React.useRef<any>(null);
  const mapEl  = React.useRef<HTMLDivElement>(null);
  const markersRef = React.useRef<any[]>([]);
  const linesRef   = React.useRef<any[]>([]);

  const [users,    setUsers]    = React.useState<any[]>([]);
  const [services, setServices] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<any>(null);
  const [loading,  setLoading]  = React.useState(true);
  const [lastUpd,  setLastUpd]  = React.useState('');

  // Filters
  const [showProv,   setShowProv]   = React.useState(true);
  const [showCli,    setShowCli]    = React.useState(true);
  const [showOnline, setShowOnline] = React.useState(false); // false = todos
  const [catFilter,  setCatFilter]  = React.useState('Todos');
  const [autoRefresh,setAutoRefresh]= React.useState(true);

  // Load Leaflet dynamically
  React.useEffect(() => {
    if (typeof L !== 'undefined') return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js';
    script.onload = () => initMap();
    document.head.appendChild(script);
  }, []);

  function initMap() {
    if (mapRef.current || !mapEl.current) return;
    mapRef.current = L.map(mapEl.current, { zoomControl: true, attributionControl: false })
      .setView([-27.5969, -48.5495], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 })
      .addTo(mapRef.current);
    loadData();
  }

  React.useEffect(() => {
    if (typeof L !== 'undefined' && !mapRef.current && mapEl.current) initMap();
  });

  async function loadData() {
    setLoading(true);
    try {
      const [u, s] = await Promise.all([
        get('usuarios?select=id,nombre,tipo,email,telefono,categoria,karma,activo,online,lat,lng,endereco,bio&tipo=in.(proveedor,cliente)&lat=not.is.null&limit=200'),
        get('servicios?select=id,estado,cliente_id,proveedor_id,descripcion,tarifa,created_at,lat_cliente,lng_cliente,proveedor:proveedor_id(lat,lng)&estado=in.(negociando,confirmado,en_camino,ejecutando)&limit=50'),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setServices(Array.isArray(s) ? s : []);
      setLastUpd(new Date().toLocaleTimeString('es-AR'));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  // Auto-refresh
  React.useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(loadData, 15000);
    return () => clearInterval(t);
  }, [autoRefresh]);

  // Render markers when data or filters change
  React.useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;
    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    linesRef.current.forEach(l => l.remove());
    markersRef.current = [];
    linesRef.current = [];

    const filtered = users.filter(u => {
      if (!u.lat || !u.lng) return false;
      if (u.tipo === 'proveedor' && !showProv) return false;
      if (u.tipo === 'cliente' && !showCli) return false;
      if (showOnline && u.tipo === 'proveedor' && !u.online) return false;
      if (catFilter !== 'Todos' && u.tipo === 'proveedor' && u.categoria !== catFilter) return false;
      return true;
    });

    filtered.forEach(u => {
      const isOnline = u.online;
      const isProv   = u.tipo === 'proveedor';
      const ic = isProv ? (CAT_IC[u.categoria] || '🔧') : '👤';
      const color = isProv ? (isOnline ? '#22C55E' : '#9CA3AF') : '#3B82F6';
      const size  = isProv ? 38 : 32;
      const ring  = isProv && isOnline ? `box-shadow:0 0 0 3px rgba(34,197,94,.3);` : '';
      const html = `
        <div style="width:${size}px;height:${size}px;border-radius:50%;
          background:${color};border:2.5px solid #fff;
          display:flex;align-items:center;justify-content:center;
          font-size:${isProv?16:14}px;cursor:pointer;
          box-shadow:0 2px 8px rgba(0,0,0,.25);${ring}
          transition:transform .15s;" 
          onmouseover="this.style.transform='scale(1.2)'"
          onmouseout="this.style.transform='scale(1)'">
          ${ic}
        </div>`;
      const icon = L.divIcon({ className: '', html, iconSize: [size, size], iconAnchor: [size/2, size/2] });
      const m = L.marker([u.lat, u.lng], { icon }).addTo(mapRef.current);
      m.on('click', () => setSelected(u));
      markersRef.current.push(m);
    });

    // Draw lines for active services (uses provider coords from JOIN or fallback)
    services.forEach(s => {
      const provLat = s.proveedor?.lat;
      const provLng = s.proveedor?.lng;
      if (!s.lat_cliente || !s.lng_cliente || !provLat || !provLng) return;
      const color = s.estado === 'en_camino' ? '#F59E0B' : '#EF4444';
      const line = L.polyline(
        [[s.lat_cliente, s.lng_cliente],[provLat, provLng]],
        { color, weight: 2.5, opacity: 0.8, dashArray: '6 4' }
      ).addTo(mapRef.current);
      line.on('click', () => setSelected({ _service: true, ...s }));
      linesRef.current.push(line);
    });

  }, [users, services, showProv, showCli, showOnline, catFilter]);

  // Stats
  const stats = React.useMemo(() => {
    const provs   = users.filter(u => u.tipo === 'proveedor');
    const clis    = users.filter(u => u.tipo === 'cliente');
    const online  = provs.filter(u => u.online);
    return { provs: provs.length, clis: clis.length, online: online.length, svcs: services.length };
  }, [users, services]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── HEADER ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderBottom:'1px solid var(--border)', flexShrink:0, flexWrap:'wrap' }}>
        <div style={{ fontWeight:800, fontSize:15 }}>🗺 Mapa Operativo</div>
        {/* Stats chips */}
        {[
          { label:'Proveedores', val:stats.provs, color:'#6366F1' },
          { label:'Online ahora', val:stats.online, color:'#22C55E' },
          { label:'Clientes', val:stats.clis, color:'#3B82F6' },
          { label:'Servicios activos', val:stats.svcs, color:'#F59E0B' },
        ].map(s => (
          <div key={s.label} style={{ display:'flex', alignItems:'center', gap:5, background: s.color+'14', borderRadius:20, padding:'4px 10px' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:s.color, display:'inline-block' }}/>
            <span style={{ fontSize:11, fontWeight:700, color:s.color }}>{s.val} {s.label}</span>
          </div>
        ))}
        <div style={{ flex:1 }}/>
        {lastUpd && <span style={{ fontSize:11, color:'#aaa' }}>Actualizado: {lastUpd}</span>}
        <button onClick={loadData} disabled={loading}
          style={{ padding:'5px 12px', background:'#111', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
          {loading ? '⏳' : '↺ Actualizar'}
        </button>
        <label style={{ fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}>
          <input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)} style={{ accentColor:'#22C55E' }}/>
          Auto (15s)
        </label>
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* ── FILTERS SIDEBAR ── */}
        <div style={{ width:200, flexShrink:0, borderRight:'1px solid var(--border)', padding:14, overflowY:'auto', background:'#fafafa' }}>
          <div style={{ fontWeight:700, fontSize:12, color:'#555', marginBottom:10, textTransform:'uppercase', letterSpacing:.5 }}>Filtros</div>

          {/* Tipo */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#888', marginBottom:6 }}>TIPO</div>
            {[
              { label:'Proveedores', val:showProv, set:setShowProv, color:'#6366F1', ic:'🔧' },
              { label:'Clientes', val:showCli, set:setShowCli, color:'#3B82F6', ic:'👤' },
            ].map(f => (
              <label key={f.label} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6, cursor:'pointer', fontSize:12, fontWeight:600 }}>
                <input type="checkbox" checked={f.val} onChange={e=>f.set(e.target.checked)} style={{ accentColor:f.color }}/>
                {f.ic} {f.label}
              </label>
            ))}
          </div>

          {/* Online */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#888', marginBottom:6 }}>ESTADO</div>
            {[
              { label:'Todos', val:false },
              { label:'Solo online', val:true },
            ].map(opt => (
              <label key={opt.label} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6, cursor:'pointer', fontSize:12, fontWeight:600 }}>
                <input type="radio" checked={showOnline===opt.val} onChange={()=>setShowOnline(opt.val)} style={{ accentColor:'#22C55E' }}/>
                {opt.val ? '🟢' : '⚫'} {opt.label}
              </label>
            ))}
          </div>

          {/* Categoría */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#888', marginBottom:6 }}>CATEGORÍA</div>
            {CATS.map(cat => (
              <div key={cat} onClick={() => setCatFilter(cat)}
                style={{ padding:'6px 10px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600,
                  background:catFilter===cat?'rgba(0,200,215,.12)':'transparent',
                  color:catFilter===cat?'#0080AA':'#555',
                  borderLeft:catFilter===cat?'3px solid #00C8D7':'3px solid transparent',
                  marginBottom:2 }}>
                {CAT_IC[cat]||'•'} {cat}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginTop:4 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#888', marginBottom:8 }}>LEYENDA</div>
            {[
              { color:'#22C55E', label:'Proveedor online' },
              { color:'#9CA3AF', label:'Proveedor offline' },
              { color:'#3B82F6', label:'Cliente' },
              { color:'#F59E0B', label:'Servicio en camino', dash:true },
              { color:'#EF4444', label:'Servicio activo', dash:true },
            ].map(l => (
              <div key={l.label} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                {l.dash ? (
                  <div style={{ width:18, height:2, borderTop:`2.5px dashed ${l.color}`, flexShrink:0 }}/>
                ) : (
                  <div style={{ width:12, height:12, borderRadius:'50%', background:l.color, flexShrink:0 }}/>
                )}
                <span style={{ fontSize:10, color:'#666' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── MAP ── */}
        <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
          <div ref={mapEl} style={{ width:'100%', height:'100%' }}/>

          {/* Loading overlay */}
          {loading && (
            <div style={{ position:'absolute', top:12, left:'50%', transform:'translateX(-50%)', background:'rgba(255,255,255,.95)', padding:'8px 16px', borderRadius:20, fontSize:12, fontWeight:700, boxShadow:'0 2px 10px rgba(0,0,0,.15)', zIndex:999 }}>
              ⏳ Cargando datos...
            </div>
          )}
        </div>

        {/* ── DETAIL PANEL ── */}
        {selected && (
          <div style={{ width:240, flexShrink:0, borderLeft:'1px solid var(--border)', overflowY:'auto', background:'#fff' }}>
            <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontWeight:800, fontSize:13 }}>{selected._service ? '🔗 Servicio' : (selected.tipo==='proveedor'?'🔧 Proveedor':'👤 Cliente')}</span>
              <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'#bbb' }}>✕</button>
            </div>
            <div style={{ padding:'12px 14px' }}>
              {selected._service ? (
                /* Service detail */
                <>
                  <Field label="Estado" val={<StatusBadge e={selected.estado}/>}/>
                  <Field label="Descripción" val={selected.descripcion||'—'}/>
                  <Field label="Tarifa" val={selected.tarifa?`R$${selected.tarifa}`:'—'}/>
                  <Field label="Creado" val={selected.created_at?new Date(selected.created_at).toLocaleString('es-AR'):'—'}/>
                </>
              ) : (
                /* User detail */
                <>
                  <div style={{ textAlign:'center', marginBottom:14 }}>
                    <div style={{ width:52, height:52, borderRadius:'50%', background:selected.tipo==='proveedor'?'linear-gradient(135deg,#00C8D7,#0080AA)':'linear-gradient(135deg,#3B82F6,#1D4ED8)', margin:'0 auto 8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'#fff', fontWeight:800 }}>
                      {(selected.nombre||'U')[0].toUpperCase()}
                    </div>
                    <div style={{ fontWeight:800, fontSize:14 }}>{selected.nombre}</div>
                    {selected.tipo==='proveedor' && (
                      <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:selected.online?'rgba(34,197,94,.1)':'rgba(0,0,0,.05)', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700, color:selected.online?'#22C55E':'#888', marginTop:5 }}>
                        {selected.online?'🟢 En línea':'⚫ Offline'}
                      </div>
                    )}
                  </div>
                  {selected.tipo==='proveedor' && <Field label="Categoría" val={`${CAT_IC[selected.categoria]||'🔧'} ${selected.categoria||'—'}`}/>}
                  <Field label="Email" val={selected.email||'—'} small/>
                  <Field label="Teléfono" val={selected.telefono||'—'}/>
                  {selected.tipo==='proveedor' && <Field label="Karma" val={`★ ${(selected.karma||5).toFixed(1)}`}/>}
                  <Field label="Dirección" val={selected.endereco||'—'} small/>
                  {selected.bio && <Field label="Bio/Web" val={selected.bio} small/>}
                  <Field label="GPS" val={`${(selected.lat||0).toFixed(4)}, ${(selected.lng||0).toFixed(4)}`} small mono/>
                  <div style={{ marginTop:12, display:'flex', gap:6 }}>
                    {selected.telefono && (
                      <a href={`tel:${selected.telefono}`} style={{ flex:1, padding:'8px 0', background:'#111', color:'#fff', borderRadius:10, fontSize:12, fontWeight:700, textAlign:'center', textDecoration:'none' }}>
                        📞 Llamar
                      </a>
                    )}
                    {selected.lat && (
                      <a href={`https://www.google.com/maps?q=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer"
                        style={{ flex:1, padding:'8px 0', background:'rgba(0,200,215,.1)', color:'#0080AA', borderRadius:10, fontSize:12, fontWeight:700, textAlign:'center', textDecoration:'none' }}>
                        🗺 Maps
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, val, small, mono }: { label:string; val:any; small?:boolean; mono?:boolean }) {
  return (
    <div style={{ marginBottom:9 }}>
      <div style={{ fontSize:9, fontWeight:700, color:'#999', textTransform:'uppercase', letterSpacing:.5, marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:small?10:12, fontWeight:600, color:'#111', wordBreak:'break-all', fontFamily:mono?'monospace':'inherit' }}>{val}</div>
    </div>
  );
}

function StatusBadge({ e }: { e:string }) {
  const map: Record<string,[string,string]> = {
    negociando:  ['#F59E0B','🤝 Negociando'],
    confirmado:  ['#3B82F6','✅ Confirmado'],
    en_camino:   ['#F59E0B','🚗 En camino'],
    ejecutando:  ['#8B5CF6','🔧 Ejecutando'],
    completado:  ['#22C55E','✓ Completado'],
    cancelado:   ['#EF4444','✕ Cancelado'],
  };
  const [color, label] = map[e] || ['#888','—'];
  return <span style={{ background:color+'18', color, borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:700 }}>{label}</span>;
}
