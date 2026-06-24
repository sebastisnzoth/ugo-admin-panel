// MapaOperativo.tsx — Mapa Live con todos los proveedores + filtros + teardrop pins
import React from 'react';

const SB_URL  = 'https://byajcqrgetloavrgyqak.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs';

declare const L: any;

// ── Slugs reales de la DB ──────────────────────────────────────
const CATS = [
  {slug:'todos',   label:'Todos',        emoji:'📍'},
  {slug:'electricista', label:'Electricista', emoji:'⚡'},
  {slug:'plomero',      label:'Plomero',      emoji:'🔧'},
  {slug:'limpeza',      label:'Limpeza',      emoji:'🧹'},
  {slug:'chaveiro',     label:'Chaveiro',     emoji:'🔑'},
  {slug:'pintura',      label:'Pintura',      emoji:'🎨'},
  {slug:'carpintaria',  label:'Carpintaria',  emoji:'🪚'},
  {slug:'jardinagem',   label:'Jardinagem',   emoji:'🌿'},
  {slug:'climatizacao', label:'Climatização', emoji:'❄️'},
  {slug:'ti_redes',     label:'TI & Redes',   emoji:'💻'},
  {slug:'reformas',     label:'Reformas',     emoji:'🏠'},
];
const CAT_EMOJI: Record<string,string> = Object.fromEntries(CATS.map(c=>[c.slug,c.emoji]));

// ── Teardrop pin (igual que Scout y Mapa Admin) ───────────────
function makePin(color:string, emoji:string, sz=32) {
  const tail = Math.round(sz*0.4);
  return L.divIcon({
    html:`<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,.28));">
      <div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${color};border:2.5px solid #FFF;
        display:flex;align-items:center;justify-content:center;font-size:${Math.round(sz*.43)}px;">${emoji}</div>
      <div style="width:0;height:0;border-left:${tail}px solid transparent;border-right:${tail}px solid transparent;
        border-top:${Math.round(tail*1.4)}px solid ${color};margin-top:-2px;"></div>
    </div>`,
    className:'',
    iconSize:[sz, sz+Math.round(tail*1.4)+2],
    iconAnchor:[sz/2, sz+Math.round(tail*1.4)+2],
    popupAnchor:[0, -(sz+Math.round(tail*1.4)+2)],
  });
}

function pinColor(online:boolean, activo:boolean) {
  return online&&activo?'#05944F':activo?'#F59E0B':'#E11900';
}

function clientPin() {
  return L.divIcon({
    html:`<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 5px rgba(0,0,0,.25));">
      <div style="width:26px;height:26px;border-radius:50%;background:#276EF1;border:2.5px solid #FFF;
        display:flex;align-items:center;justify-content:center;font-size:12px;">👤</div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
        border-top:8px solid #276EF1;margin-top:-1px;"></div>
    </div>`,
    className:'', iconSize:[26,35], iconAnchor:[13,35], popupAnchor:[0,-35],
  });
}

function sbFetch(path:string) {
  return fetch(`${SB_URL}/rest/v1/${path}`,{
    headers:{apikey:SB_ANON,Authorization:`Bearer ${SB_ANON}`}
  }).then(r=>r.json());
}

// ── Panel de detalle helper ───────────────────────────────────
function DField({label,val,mono,small}:{label:string;val:any;mono?:boolean;small?:boolean}) {
  return (
    <div style={{marginBottom:9}}>
      <div style={{fontSize:9,fontWeight:700,color:'#bbb',textTransform:'uppercase',letterSpacing:.5,marginBottom:2}}>{label}</div>
      <div style={{fontSize:small?10:12,fontWeight:600,color:'#111',wordBreak:'break-all',fontFamily:mono?'monospace':'inherit',lineHeight:1.4}}>{val||'—'}</div>
    </div>
  );
}

export function SecMapaOperativo() {
  const mapEl      = React.useRef<HTMLDivElement>(null);
  const mapInst    = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);
  const linesRef   = React.useRef<any[]>([]);

  const [users,      setUsers]      = React.useState<any[]>([]);
  const [services,   setServices]   = React.useState<any[]>([]);
  const [selected,   setSelected]   = React.useState<any>(null);
  const [loading,    setLoading]    = React.useState(true);
  const [lastUpd,    setLastUpd]    = React.useState('—');
  const [error,      setError]      = React.useState('');
  const [autoRefresh,setAutoRefresh]= React.useState(true);

  // Filtros
  const [showProv,  setShowProv]  = React.useState(true);
  const [showCli,   setShowCli]   = React.useState(true);
  const [statusFil, setStatusFil] = React.useState<'todos'|'online'|'offline'>('todos');
  const [catFil,    setCatFil]    = React.useState('todos');
  const [zonaFil,   setZonaFil]   = React.useState('');

  // Agregar proveedor
  const [showAdd,   setShowAdd]   = React.useState(false);
  const [addForm,   setAddForm]   = React.useState({nombre:'',categoria:'electricista',telefono:'',email:'',zona:'',lat:'',lng:''});
  const [addAddr,   setAddAddr]   = React.useState('');
  const [addLoading,setAddLoading]= React.useState(false);
  const [addGeo,    setAddGeo]    = React.useState(false);
  // Búsqueda por localidad
  const [geoSearch, setGeoSearch] = React.useState('');
  const [geoLoading,setGeoLoading]= React.useState(false);
  const [geoRadius, setGeoRadius] = React.useState(0); // 0 = sin filtro por radio
  const [geoCenter, setGeoCenter] = React.useState<[number,number]|null>(null);

  // ── Leaflet init ─────────────────────────────────────────────
  React.useEffect(() => {
    if ((window as any).L) { initMap(); return; }
    const css = document.createElement('link');
    css.rel='stylesheet'; css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload=()=>initMap();
    document.head.appendChild(js);
  },[]);

  function initMap() {
    if (mapInst.current||!mapEl.current) return;
    const map = L.map(mapEl.current,{zoomControl:true,attributionControl:false}).setView([-27.5969,-48.5495],12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
    mapInst.current = map;
    [100,400,800].forEach(t=>setTimeout(()=>map.invalidateSize(),t));
    loadData();
  }

  // ── Cargar datos ──────────────────────────────────────────────
  async function loadData() {
    setLoading(true); setError('');
    try {
      // Todos los proveedores y clientes con coordenadas (activos e inactivos)
      const [u,s] = await Promise.all([
        sbFetch('usuarios?select=id,nombre,apellido,tipo,email,telefono,categoria,karma,activo,online,lat,lng,zona,endereco,bio&tipo=in.(proveedor,cliente)&lat=not.is.null&limit=500'),
        sbFetch('servicios?select=id,estado,descripcion,tarifa,created_at,lat_cliente,lng_cliente,proveedor:proveedor_id(lat,lng)&estado=in.(negociando,confirmado,en_camino,ejecutando)&limit=100'),
      ]);
      if (!Array.isArray(u)) { setError(u?.message||'Error cargando usuarios'); setLoading(false); return; }
      setUsers(u); setServices(Array.isArray(s)?s:[]);
      setLastUpd(new Date().toLocaleTimeString('es-AR'));
      // Auto-fit mapa a los proveedores cargados
      if (mapInst.current && Array.isArray(u) && u.length > 0) {
        const pts = u.filter((x:any)=>x.lat&&x.lng).map((x:any)=>[x.lat,x.lng]);
        if (pts.length > 0) {
          try { mapInst.current.fitBounds(pts, {padding:[30,30], maxZoom:14, animate:false}); } catch{}
        }
      }
    } catch(e:any) { setError(e.message); }
    setLoading(false);
  }

  React.useEffect(()=>{ if(!autoRefresh)return; const t=setInterval(loadData,15000); return()=>clearInterval(t); },[autoRefresh]);

  // Filtro por radio desde geoCenter
  const visibleUsers = geoCenter && geoRadius > 0
    ? users.filter(u => {
        if (!u.lat||!u.lng) return false;
        const R=6371000,dL=(u.lat-geoCenter[0])*Math.PI/180,dN=(u.lng-geoCenter[1])*Math.PI/180;
        const a=Math.sin(dL/2)**2+Math.cos(geoCenter[0]*Math.PI/180)*Math.cos(u.lat*Math.PI/180)*Math.sin(dN/2)**2;
        const dist=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
        return dist <= geoRadius;
      })
    : users;

  // ── Render markers ────────────────────────────────────────────
  React.useEffect(() => {
    if (!mapInst.current||!L) return;
    markersRef.current.forEach(m=>m.remove()); markersRef.current=[];
    linesRef.current.forEach(l=>l.remove());   linesRef.current=[];

    const filtered = visibleUsers.filter(u => {
      if (!u.lat||!u.lng) return false;
      if (u.tipo==='proveedor'&&!showProv) return false;
      if (u.tipo==='cliente'&&!showCli) return false;
      if (u.tipo==='proveedor') {
        if (statusFil==='online'&&!u.online) return false;
        if (statusFil==='offline'&&u.online) return false;
        if (catFil!=='todos'&&u.categoria!==catFil) return false;
        if (zonaFil&&!(u.zona||'').toLowerCase().includes(zonaFil.toLowerCase())) return false;
      }
      return true;
    });

    filtered.forEach(u => {
      const isProv = u.tipo==='proveedor';
      let icon;
      if (isProv) {
        const color = pinColor(u.online,u.activo!==false);
        const emoji = CAT_EMOJI[u.categoria||'']||'🔧';
        icon = makePin(color,emoji,32);
      } else {
        icon = clientPin();
      }

      const m = L.marker([u.lat,u.lng],{icon}).addTo(mapInst.current);
      m.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:170px;padding:2px;">
          <div style="font-weight:700;font-size:13px;margin-bottom:3px;">${u.nombre} ${u.apellido||''}</div>
          <div style="font-size:10px;color:#6B7280;margin-bottom:4px;">${CAT_EMOJI[u.categoria||'']||''} ${u.categoria||u.tipo} · ⭐ ${u.karma||5}</div>
          ${u.telefono?`<div style="font-size:11px;color:#05944F;font-weight:600;">📱 ${u.telefono}</div>`:''}
          ${isProv?`<div style="font-size:11px;font-weight:600;color:${pinColor(u.online,u.activo!==false)};margin-top:3px;">${u.online?'🟢 Online':u.activo!==false?'🟡 Registrado':'🔴 Inactivo'}</div>`:''}
          ${u.zona?`<div style="font-size:10px;color:#9CA3AF;margin-top:3px;">📍 ${u.zona}</div>`:''}
        </div>`);
      m.on('click',()=>setSelected(u));
      markersRef.current.push(m);
    });

    // Líneas de servicios activos
    services.forEach(s => {
      if (!s.lat_cliente||!s.lng_cliente||!s.proveedor?.lat||!s.proveedor?.lng) return;
      const color = s.estado==='en_camino'?'#F59E0B':'#8B5CF6';
      const line = L.polyline([[s.lat_cliente,s.lng_cliente],[s.proveedor.lat,s.proveedor.lng]],
        {color,weight:2.5,opacity:.85,dashArray:'6 4'}).addTo(mapInst.current);
      linesRef.current.push(line);
    });

  },[users,services,showProv,showCli,statusFil,catFil,zonaFil]);

  // ── Stats ─────────────────────────────────────────────────────
  const provs   = visibleUsers.filter(u=>u.tipo==='proveedor');
  const online  = provs.filter(u=>u.online).length;
  const offline = provs.filter(u=>!u.online&&u.activo!==false).length;
  const clis    = users.filter(u=>u.tipo==='cliente').length;
  const shown   = markersRef.current.length;

  // ── Geocodificar dirección para agregar proveedor ─────────────
  const geocodeAdd = async () => {
    if (!addAddr.trim()) return;
    setAddGeo(true);
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addAddr+', Brasil')}&format=json&limit=1`,{headers:{'User-Agent':'ugo-admin/1.0'}});
    const d = await r.json();
    if (d[0]) { setAddForm(f=>({...f,lat:parseFloat(d[0].lat).toFixed(6),lng:parseFloat(d[0].lon).toFixed(6),zona:d[0].address?.city||d[0].address?.town||f.zona})); setAddAddr(''); }
    else alert('No encontrado. Probá con ciudad, barrio o dirección.');
    setAddGeo(false);
  };

  // ── Guardar proveedor nuevo ───────────────────────────────────
  const saveProvider = async () => {
    if (!addForm.nombre.trim()) return alert('Nombre requerido');
    setAddLoading(true);
    const email = addForm.email.trim()||`import_${Math.random().toString(36).slice(2)}@ugo.app`;
    const r = await fetch(`${SB_URL}/rest/v1/rpc/import_proveedores_csv`,{
      method:'POST',
      headers:{apikey:SB_ANON,Authorization:`Bearer ${SB_ANON}`,'Content-Type':'application/json'},
      body:JSON.stringify({p_rows:[{
        nombre:addForm.nombre, categoria:addForm.categoria, telefono:addForm.telefono,
        email, ciudad:addForm.zona||'Florianópolis', pais:'BR',
        latitud:addForm.lat, longitud:addForm.lng, notas_hugo:'Agregado manualmente desde Mapa Operativo',
      }]}),
    });
    const d = await r.json();
    if (d.ok) {
      alert(`✅ ${addForm.nombre} agregado como proveedor`);
      setAddForm({nombre:'',categoria:'electricista',telefono:'',email:'',zona:'',lat:'',lng:''});
      setShowAdd(false);
      loadData();
      // Mover mapa al nuevo proveedor
      if (addForm.lat&&addForm.lng&&mapInst.current) mapInst.current.setView([parseFloat(addForm.lat),parseFloat(addForm.lng)],15);
    } else alert('Error: '+(d.error||d.detalle?.[0]||'Revisar Supabase'));
    setAddLoading(false);
  };

  // ── Buscar por localidad + radio ─────────────────────────────
  const searchByLocation = async () => {
    if (!geoSearch.trim()) return;
    setGeoLoading(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(geoSearch)}&format=json&limit=1&addressdetails=1`,
        {headers:{'User-Agent':'ugo-admin/1.0'}}
      );
      const d = await r.json();
      if (!d[0]) { alert('Localidad no encontrada. Probá con ciudad, barrio o municipio.'); setGeoLoading(false); return; }
      const la = parseFloat(d[0].lat), lo = parseFloat(d[0].lon);
      setGeoCenter([la, lo]);
      if (mapInst.current) {
        const zoom = geoRadius > 0 ? Math.max(10, 14 - Math.log2(geoRadius/1000)) : 13;
        mapInst.current.setView([la, lo], Math.round(zoom));
        // Mostrar círculo de radio si está activado
        if (geoRadius > 0) {
          (mapInst.current as any)._geoCircle?.remove();
          const circle = L.circle([la,lo],{radius:geoRadius,color:'#276EF1',fillColor:'#276EF1',fillOpacity:.08,weight:1.5,dashArray:'6 4'}).addTo(mapInst.current);
          (mapInst.current as any)._geoCircle = circle;
        }
      }
    } catch(e:any) { alert('Error: '+e.message); }
    setGeoLoading(false);
  };

  const inp = {padding:'7px 10px',border:'1.5px solid rgba(0,0,0,.15)',borderRadius:'8px',fontSize:'12px',fontFamily:'Inter,sans-serif',outline:'none',background:'#F8F9FA',color:'#111',width:'100%'} as React.CSSProperties;
  const sel = {...inp,cursor:'pointer'};

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(5,148,79,.4)}50%{box-shadow:0 0 0 8px rgba(5,148,79,0)}}`}</style>

      {/* HEADER */}
      <div style={{padding:'8px 14px',borderBottom:'1px solid #e5e5e5',flexShrink:0,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',background:'#fff'}}>
        <span style={{fontWeight:800,fontSize:14}}>🗺 Mapa Operativo</span>

        {[
          {ic:'🔧',label:'Proveedores',val:provs.length,c:'#276EF1'},
          {ic:'🟢',label:'Online',val:online,c:'#05944F'},
          {ic:'🟡',label:'Offline',val:offline,c:'#F59E0B'},
          {ic:'👤',label:'Clientes',val:clis,c:'#276EF1'},
          {ic:'🔗',label:'Servicios',val:services.length,c:'#8B5CF6'},
        ].map(s=>(
          <div key={s.label} style={{display:'flex',alignItems:'center',gap:4,background:s.c+'14',borderRadius:20,padding:'3px 9px'}}>
            <span style={{fontSize:10}}>{s.ic}</span>
            <span style={{fontSize:10,fontWeight:700,color:s.c}}>{s.val} {s.label}</span>
          </div>
        ))}

        <div style={{flex:1}}/>
        {/* Búsqueda por localidad */}
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <input
            value={geoSearch} onChange={e=>setGeoSearch(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&searchByLocation()}
            placeholder="🔍 Buscar ciudad, barrio..."
            style={{padding:'6px 12px',border:'1.5px solid #e5e5e5',borderRadius:8,fontSize:12,fontFamily:'Inter,sans-serif',outline:'none',width:200,background:'#F8F9FA'}}
          />
          <select value={geoRadius} onChange={e=>{setGeoRadius(parseInt(e.target.value));if(e.target.value==='0'){(mapInst.current as any)?._geoCircle?.remove();setGeoCenter(null);}}}
            style={{padding:'6px 10px',border:'1.5px solid #e5e5e5',borderRadius:8,fontSize:11,fontFamily:'Inter,sans-serif',outline:'none',background:'#F8F9FA',cursor:'pointer'}}>
            <option value="0">Sin radio</option>
            <option value="2000">2 km</option>
            <option value="5000">5 km</option>
            <option value="10000">10 km</option>
            <option value="20000">20 km</option>
          </select>
          <button onClick={searchByLocation} disabled={geoLoading||!geoSearch.trim()}
            style={{padding:'6px 12px',background:'#276EF1',color:'#fff',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
            {geoLoading?'⏳':'🗺 Ir'}
          </button>
          {geoCenter&&<button onClick={()=>{setGeoCenter(null);setGeoSearch('');setGeoRadius(0);(mapInst.current as any)?._geoCircle?.remove();}}
            style={{padding:'6px 10px',background:'rgba(225,25,0,.1)',color:'#E11900',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer'}}>✕ Radio</button>}
        </div>
        {error&&<span style={{fontSize:11,color:'#E11900'}}>⚠️ {error}</span>}
        <span style={{fontSize:10,color:'#aaa'}}>{shown} visibles · {lastUpd}</span>
        <button onClick={()=>setShowAdd(a=>!a)}
          style={{padding:'6px 12px',background:showAdd?'#E11900':'#05944F',color:'#fff',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer'}}>
          {showAdd?'✕ Cerrar':'+ Proveedor'}
        </button>
        <button onClick={loadData} disabled={loading}
          style={{padding:'6px 12px',background:'#111',color:'#fff',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer'}}>
          {loading?'⏳':'↺'}
        </button>
        <label style={{fontSize:11,fontWeight:600,display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}>
          <input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)}/> Auto
        </label>
      </div>

      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* FILTROS */}
        <div style={{width:190,flexShrink:0,borderRight:'1px solid #e5e5e5',overflowY:'auto',background:'#FAFAFA',padding:'12px 10px'}}>

          {/* Agregar proveedor */}
          {showAdd&&(
            <div style={{background:'#fff',border:'1px solid #e5e5e5',borderRadius:10,padding:'10px',marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',color:'#111',marginBottom:8}}>+ Agregar Proveedor</div>
              <div style={{marginBottom:6}}>
                <div style={{fontSize:9,color:'#aaa',textTransform:'uppercase',marginBottom:3}}>Nombre *</div>
                <input style={inp} value={addForm.nombre} onChange={e=>setAddForm(f=>({...f,nombre:e.target.value}))} placeholder="Nombre del proveedor"/>
              </div>
              <div style={{marginBottom:6}}>
                <div style={{fontSize:9,color:'#aaa',textTransform:'uppercase',marginBottom:3}}>Categoría</div>
                <select style={sel} value={addForm.categoria} onChange={e=>setAddForm(f=>({...f,categoria:e.target.value}))}>
                  {CATS.filter(c=>c.slug!=='todos').map(c=><option key={c.slug} value={c.slug}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div style={{marginBottom:6}}>
                <div style={{fontSize:9,color:'#aaa',textTransform:'uppercase',marginBottom:3}}>Teléfono</div>
                <input style={inp} value={addForm.telefono} onChange={e=>setAddForm(f=>({...f,telefono:e.target.value}))} placeholder="+55 48 99999-0000"/>
              </div>
              <div style={{marginBottom:6}}>
                <div style={{fontSize:9,color:'#aaa',textTransform:'uppercase',marginBottom:3}}>Dirección → Geo</div>
                <div style={{display:'flex',gap:4}}>
                  <input style={{...inp,flex:1}} value={addAddr} onChange={e=>setAddAddr(e.target.value)} onKeyDown={e=>e.key==='Enter'&&geocodeAdd()} placeholder="Bairro, cidade..."/>
                  <button onClick={geocodeAdd} disabled={addGeo||!addAddr.trim()} style={{padding:'6px 8px',background:'#111',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:11}}>
                    {addGeo?'⏳':'🔍'}
                  </button>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginBottom:8}}>
                <div>
                  <div style={{fontSize:9,color:'#aaa',marginBottom:2}}>Lat</div>
                  <input style={{...inp,fontFamily:'monospace',fontSize:10}} value={addForm.lat} onChange={e=>setAddForm(f=>({...f,lat:e.target.value}))} placeholder="-27.59"/>
                </div>
                <div>
                  <div style={{fontSize:9,color:'#aaa',marginBottom:2}}>Lng</div>
                  <input style={{...inp,fontFamily:'monospace',fontSize:10}} value={addForm.lng} onChange={e=>setAddForm(f=>({...f,lng:e.target.value}))} placeholder="-48.54"/>
                </div>
              </div>
              <button onClick={saveProvider} disabled={addLoading||!addForm.nombre.trim()||!addForm.lat}
                style={{width:'100%',padding:'8px',background:addLoading||!addForm.nombre.trim()||!addForm.lat?'#ccc':'#05944F',color:'#fff',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>
                {addLoading?'⏳ Guardando...':'✅ Incluir en Supabase'}
              </button>
            </div>
          )}

          {/* Tipo */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9,fontWeight:700,color:'#aaa',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>TIPO</div>
            {[{v:showProv,s:setShowProv,l:'🔧 Proveedores',c:'#276EF1'},{v:showCli,s:setShowCli,l:'👤 Clientes',c:'#3B82F6'}].map(({v,s,l,c})=>(
              <label key={l} style={{display:'flex',alignItems:'center',gap:7,marginBottom:6,cursor:'pointer',fontSize:12,fontWeight:600}}>
                <input type="checkbox" checked={v} onChange={e=>s(e.target.checked)} style={{accentColor:c}}/>{l}
              </label>
            ))}
          </div>

          {/* Estado */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9,fontWeight:700,color:'#aaa',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>ESTADO</div>
            {[{v:'todos',l:'⚫ Todos'},{v:'online',l:'🟢 Online'},{v:'offline',l:'🟡 Offline / Importados'}].map(opt=>(
              <label key={opt.v} style={{display:'flex',alignItems:'center',gap:7,marginBottom:6,cursor:'pointer',fontSize:11,fontWeight:600}}>
                <input type="radio" checked={statusFil===opt.v} onChange={()=>setStatusFil(opt.v as any)}/>{opt.l}
              </label>
            ))}
          </div>

          {/* Categoría */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9,fontWeight:700,color:'#aaa',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>CATEGORÍA</div>
            {CATS.map(cat=>(
              <div key={cat.slug} onClick={()=>setCatFil(cat.slug)}
                style={{padding:'5px 8px',borderRadius:7,cursor:'pointer',fontSize:11,fontWeight:600,
                  background:catFil===cat.slug?'rgba(5,148,79,.1)':'transparent',
                  color:catFil===cat.slug?'#05944F':'#555',
                  borderLeft:catFil===cat.slug?'3px solid #05944F':'3px solid transparent',
                  marginBottom:2,transition:'all .15s'}}>
                {cat.emoji} {cat.label}
              </div>
            ))}
          </div>

          {/* Zona */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9,fontWeight:700,color:'#aaa',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>ZONA / BARRIO</div>
            <input style={{...inp,fontSize:11}} value={zonaFil} onChange={e=>setZonaFil(e.target.value)} placeholder="Filtrar por zona..."/>
          </div>

          {/* Leyenda */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9,fontWeight:700,color:'#aaa',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>LEYENDA</div>
            {[['#05944F','Online + activo'],['#F59E0B','Registrado / offline'],['#E11900','Inactivo'],['#276EF1','Cliente'],['#F59E0B','Servicio en camino (línea)'],['#8B5CF6','Ejecutando (línea)']].map(([c,l])=>(
              <div key={String(l)} style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:String(c),flexShrink:0}}/>
                <span style={{fontSize:10,color:'#666'}}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MAPA */}
        <div style={{flex:1,position:'relative',overflow:'hidden'}}>
          <div ref={mapEl} style={{width:'100%',height:'100%'}}/>
          {loading&&(
            <div style={{position:'absolute',top:12,left:'50%',transform:'translateX(-50%)',background:'rgba(255,255,255,.95)',padding:'8px 16px',borderRadius:20,fontSize:12,fontWeight:700,boxShadow:'0 2px 10px rgba(0,0,0,.15)',zIndex:999,whiteSpace:'nowrap'}}>
              ⏳ Cargando proveedores...
            </div>
          )}
          {!loading&&shown===0&&(
            <div style={{position:'absolute',top:12,left:'50%',transform:'translateX(-50%)',background:'rgba(255,255,255,.97)',padding:'10px 18px',borderRadius:12,fontSize:12,fontWeight:600,boxShadow:'0 2px 10px rgba(0,0,0,.15)',zIndex:999,textAlign:'center'}}>
              📍 Sin marcadores con los filtros actuales<br/>
              <span style={{fontSize:11,color:'#888'}}>Cambiá el estado a "Todos" o importá proveedores</span>
            </div>
          )}
        </div>

        {/* PANEL DETALLE */}
        {selected&&(
          <div style={{width:230,flexShrink:0,borderLeft:'1px solid #e5e5e5',overflowY:'auto',background:'#fff',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'10px 12px',borderBottom:'1px solid #e5e5e5',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontWeight:800,fontSize:13}}>{selected.tipo==='proveedor'?'🔧 Proveedor':'👤 Cliente'}</span>
              <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#bbb'}}>✕</button>
            </div>
            <div style={{padding:12,flex:1}}>
              <div style={{textAlign:'center',marginBottom:12}}>
                <div style={{width:52,height:52,borderRadius:'50%',margin:'0 auto 8px',
                  background:selected.tipo==='proveedor'?pinColor(selected.online,selected.activo!==false):'#276EF1',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,border:'3px solid #FFF',boxShadow:'0 2px 10px rgba(0,0,0,.15)'}}>
                  {CAT_EMOJI[selected.categoria||'']||'🔧'}
                </div>
                <div style={{fontWeight:800,fontSize:14,marginBottom:4}}>{selected.nombre} {selected.apellido||''}</div>
                <div style={{display:'inline-flex',alignItems:'center',gap:4,borderRadius:20,padding:'3px 10px',
                  background:pinColor(selected.online,selected.activo!==false)+'18',
                  fontSize:11,fontWeight:700,color:pinColor(selected.online,selected.activo!==false)}}>
                  {selected.online?'🟢 Online':selected.activo!==false?'🟡 Registrado':'🔴 Inactivo'}
                </div>
              </div>
              {selected.tipo==='proveedor'&&<DField label="Categoría" val={`${CAT_EMOJI[selected.categoria||'']||''} ${selected.categoria||'—'}`}/>}
              <DField label="Email"     val={selected.email} small/>
              <DField label="Teléfono"  val={selected.telefono}/>
              <DField label="Karma"     val={selected.karma?`★ ${Number(selected.karma).toFixed(1)}`:'—'}/>
              <DField label="Zona"      val={selected.zona}/>
              <DField label="Dirección" val={selected.endereco} small/>
              <DField label="GPS" val={`${Number(selected.lat||0).toFixed(5)}, ${Number(selected.lng||0).toFixed(5)}`} small mono/>
              <div style={{display:'flex',gap:6,marginTop:14,flexWrap:'wrap'}}>
                {selected.telefono&&<a href={`tel:${selected.telefono}`} style={{flex:1,minWidth:80,padding:'8px 4px',background:'#111',color:'#fff',borderRadius:10,fontSize:11,fontWeight:700,textAlign:'center',textDecoration:'none'}}>📞 Llamar</a>}
                {selected.telefono&&<a href={`https://wa.me/${(selected.telefono||'').replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{flex:1,minWidth:80,padding:'8px 4px',background:'#25D366',color:'#fff',borderRadius:10,fontSize:11,fontWeight:700,textAlign:'center',textDecoration:'none'}}>💬 WA</a>}
                {selected.lat&&<a href={`https://www.google.com/maps?q=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer" style={{flex:1,minWidth:80,padding:'8px 4px',background:'rgba(39,110,241,.1)',color:'#276EF1',borderRadius:10,fontSize:11,fontWeight:700,textAlign:'center',textDecoration:'none'}}>🗺 Maps</a>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
