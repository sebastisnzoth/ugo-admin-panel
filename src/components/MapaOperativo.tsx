import React from 'react';

const SB_URL = 'https://byajcqrgetloavrgyqak.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs';

function getAuthHeaders(): Record<string, string> {
  // Try to get the admin session token from Supabase localStorage
  try {
    const key = `sb-byajcqrgetloavrgyqak-auth-token`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const session = JSON.parse(raw);
      const token = session?.access_token || session?.session?.access_token;
      if (token) return { apikey: SB_ANON, Authorization: `Bearer ${token}` };
    }
  } catch {}
  return { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` };
}

const get = (path: string) =>
  fetch(`${SB_URL}/rest/v1/${path}`, { headers: getAuthHeaders() }).then(r => r.json());

const CATS = ['Todos', 'Pintor', 'Plomero', 'Electricista', 'Limpieza', 'Carpintero', 'Cerrajero', 'Jardinero', 'AC/Clima', 'Geral'];
const CAT_IC: Record<string, string> = {
  Pintor: '🎨', Plomero: '🔧', Electricista: '⚡', Limpieza: '🧹',
  Carpintero: '🪚', Cerrajero: '🔑', Jardinero: '🌿', 'AC/Clima': '❄️', Geral: '🔨'
};

declare const L: any;

export function SecMapaOperativo() {
  const mapRef    = React.useRef<any>(null);
  const mapEl     = React.useRef<HTMLDivElement>(null);
  const markersRef = React.useRef<any[]>([]);
  const linesRef   = React.useRef<any[]>([]);

  const [users,    setUsers]    = React.useState<any[]>([]);
  const [services, setServices] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<any>(null);
  const [loading,  setLoading]  = React.useState(true);
  const [lastUpd,  setLastUpd]  = React.useState('—');
  const [error,    setError]    = React.useState('');

  // Filters
  const [showProv,    setShowProv]    = React.useState(true);
  const [showCli,     setShowCli]     = React.useState(true);
  const [onlyOnline,  setOnlyOnline]  = React.useState(false);
  const [catFilter,   setCatFilter]   = React.useState('Todos');
  const [autoRefresh, setAutoRefresh] = React.useState(true);

  // Load Leaflet
  React.useEffect(() => {
    const loadLeaflet = () => {
      if ((window as any).L) { initMap(); return; }
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css';
      document.head.appendChild(css);
      const js = document.createElement('script');
      js.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js';
      js.onload = () => initMap();
      document.head.appendChild(js);
    };
    loadLeaflet();
  }, []);

  function initMap() {
    if (mapRef.current || !mapEl.current) return;
    mapRef.current = (window as any).L.map(mapEl.current, {
      zoomControl: true, attributionControl: false
    }).setView([-27.5969, -48.5495], 12);
    (window as any).L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 })
      .addTo(mapRef.current);
    loadData();
  }

  React.useEffect(() => {
    if ((window as any).L && !mapRef.current && mapEl.current) initMap();
  });

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [u, s] = await Promise.all([
        get('usuarios?select=id,nombre,tipo,email,telefono,categoria,karma,activo,online,lat,lng,endereco,bio,auth_id&tipo=in.(proveedor,cliente)&lat=not.is.null&limit=300'),
        get('servicios?select=id,estado,cliente_id,proveedor_id,descripcion,tarifa,created_at,lat_cliente,lng_cliente,proveedor:proveedor_id(lat,lng)&estado=in.(negociando,confirmado,en_camino,ejecutando)&limit=50'),
      ]);

      const usersArr = Array.isArray(u) ? u : [];
      const svcsArr  = Array.isArray(s) ? s : [];

      if (!usersArr.length && u?.message) {
        setError(`API: ${u.message}`);
      }

      setUsers(usersArr);
      setServices(svcsArr);
      setLastUpd(new Date().toLocaleTimeString('es-AR'));
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  // Auto-refresh
  React.useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(loadData, 15000);
    return () => clearInterval(t);
  }, [autoRefresh]);

  // Render markers
  React.useEffect(() => {
    const Lmap = (window as any).L;
    if (!mapRef.current || !Lmap) return;

    markersRef.current.forEach(m => m.remove());
    linesRef.current.forEach(l => l.remove());
    markersRef.current = [];
    linesRef.current   = [];

    const filtered = users.filter(u => {
      if (!u.lat || !u.lng) return false;
      if (u.tipo === 'proveedor' && !showProv) return false;
      if (u.tipo === 'cliente'   && !showCli)  return false;
      if (onlyOnline && u.tipo === 'proveedor' && !u.online) return false;
      if (catFilter !== 'Todos' && u.tipo === 'proveedor' && u.categoria !== catFilter) return false;
      return true;
    });

    filtered.forEach(u => {
      const isProv   = u.tipo === 'proveedor';
      const isOnline = u.online;
      const ic       = isProv ? (CAT_IC[u.categoria] || '🔧') : '👤';
      const bg       = isProv ? (isOnline ? '#22C55E' : '#9CA3AF') : '#3B82F6';
      const sz       = isProv ? 40 : 32;
      const pulse    = isProv && isOnline ? `animation:mapPulse 2s infinite;` : '';
      const html     = `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${bg};
        border:2.5px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.28);
        display:flex;align-items:center;justify-content:center;
        font-size:${isProv ? 17 : 14}px;cursor:pointer;${pulse}
        transition:transform .15s;">${ic}</div>`;
      const icon = Lmap.divIcon({ className: '', html, iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] });
      const m = Lmap.marker([u.lat, u.lng], { icon }).addTo(mapRef.current);
      m.on('click', () => setSelected(u));
      markersRef.current.push(m);
    });

    // Lines for active services
    services.forEach(s => {
      const pLat = s.proveedor?.lat;
      const pLng = s.proveedor?.lng;
      if (!s.lat_cliente || !s.lng_cliente || !pLat || !pLng) return;
      const color = s.estado === 'en_camino' ? '#F59E0B' : '#EF4444';
      const line = Lmap.polyline(
        [[s.lat_cliente, s.lng_cliente], [pLat, pLng]],
        { color, weight: 2.5, opacity: 0.85, dashArray: '6 4' }
      ).addTo(mapRef.current);
      line.on('click', () => setSelected({ _svc: true, ...s }));
      linesRef.current.push(line);
    });

  }, [users, services, showProv, showCli, onlyOnline, catFilter]);

  // Stats
  const stats = React.useMemo(() => ({
    provs:  users.filter(u => u.tipo === 'proveedor').length,
    clis:   users.filter(u => u.tipo === 'cliente').length,
    online: users.filter(u => u.tipo === 'proveedor' && u.online).length,
    svcs:   services.length,
    shown:  users.filter(u => {
      if (u.tipo === 'proveedor' && !showProv) return false;
      if (u.tipo === 'cliente'   && !showCli)  return false;
      if (onlyOnline && u.tipo === 'proveedor' && !u.online) return false;
      if (catFilter !== 'Todos' && u.tipo === 'proveedor' && u.categoria !== catFilter) return false;
      return !!u.lat;
    }).length,
  }), [users, services, showProv, showCli, onlyOnline, catFilter]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`@keyframes mapPulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.5)}50%{box-shadow:0 0 0 6px rgba(34,197,94,0)}}`}</style>

      {/* ── HEADER ── */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#fff' }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>🗺 Mapa Operativo</span>

        {/* Stat chips */}
        {[
          { ic: '🔧', label: 'Proveedores', val: stats.provs, c: '#6366F1' },
          { ic: '🟢', label: 'Online',      val: stats.online, c: '#22C55E' },
          { ic: '👤', label: 'Clientes',    val: stats.clis,  c: '#3B82F6' },
          { ic: '🔗', label: 'Activos',     val: stats.svcs,  c: '#F59E0B' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: s.c + '14', borderRadius: 20, padding: '3px 10px' }}>
            <span style={{ fontSize: 10 }}>{s.ic}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: s.c }}>{s.val} {s.label}</span>
          </div>
        ))}

        <div style={{ flex: 1 }} />

        {error && <span style={{ fontSize: 11, color: '#EF4444', maxWidth: 200 }}>⚠️ {error}</span>}
        <span style={{ fontSize: 11, color: '#aaa' }}>
          {stats.shown} visibles · {lastUpd}
        </span>
        <button onClick={loadData} disabled={loading}
          style={{ padding: '5px 12px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          {loading ? '⏳' : '↺ Actualizar'}
        </button>
        <label style={{ fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ accentColor: '#22C55E' }} />
          Auto (15s)
        </label>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── FILTERS ── */}
        <div style={{ width: 185, flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', background: '#fafafa', padding: '12px 10px' }}>

          <Fsec title="TIPO">
            <Fcheck label="🔧 Proveedores" color="#6366F1" val={showProv} set={setShowProv} />
            <Fcheck label="👤 Clientes"    color="#3B82F6" val={showCli}  set={setShowCli}  />
          </Fsec>

          <Fsec title="ESTADO">
            {[
              { label: '⚫ Todos',       val: false },
              { label: '🟢 Solo online', val: true },
            ].map(opt => (
              <label key={String(opt.val)} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                <input type="radio" checked={onlyOnline === opt.val} onChange={() => setOnlyOnline(opt.val)} style={{ accentColor: '#22C55E' }} />
                {opt.label}
              </label>
            ))}
          </Fsec>

          <Fsec title="CATEGORÍA">
            {CATS.map(cat => (
              <div key={cat} onClick={() => setCatFilter(cat)}
                style={{
                  padding: '5px 9px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: catFilter === cat ? 'rgba(0,200,215,.12)' : 'transparent',
                  color: catFilter === cat ? '#0080AA' : '#555',
                  borderLeft: catFilter === cat ? '3px solid #00C8D7' : '3px solid transparent',
                  marginBottom: 2, transition: 'all .15s'
                }}>
                {CAT_IC[cat] || '•'} {cat}
              </div>
            ))}
          </Fsec>

          <Fsec title="LEYENDA">
            {[
              { color: '#22C55E', label: 'Proveedor online', dot: true },
              { color: '#9CA3AF', label: 'Proveedor offline', dot: true },
              { color: '#3B82F6', label: 'Cliente', dot: true },
              { color: '#F59E0B', label: 'En camino', dash: true },
              { color: '#EF4444', label: 'Ejecutando', dash: true },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                {l.dash
                  ? <div style={{ width: 18, height: 0, borderTop: `2.5px dashed ${l.color}`, flexShrink: 0 }} />
                  : <div style={{ width: 11, height: 11, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                }
                <span style={{ fontSize: 10, color: '#666' }}>{l.label}</span>
              </div>
            ))}
          </Fsec>
        </div>

        {/* ── MAP ── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div ref={mapEl} style={{ width: '100%', height: '100%' }} />

          {loading && (
            <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,.95)', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, boxShadow: '0 2px 10px rgba(0,0,0,.15)', zIndex: 999, whiteSpace: 'nowrap' }}>
              ⏳ Cargando datos...
            </div>
          )}

          {!loading && stats.shown === 0 && !error && (
            <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,.97)', padding: '10px 18px', borderRadius: 12, fontSize: 12, fontWeight: 600, boxShadow: '0 2px 10px rgba(0,0,0,.15)', zIndex: 999, textAlign: 'center' }}>
              📍 Sin marcadores visibles con los filtros actuales<br/>
              <span style={{ fontSize: 11, color: '#888' }}>Verificá que los filtros estén correctos</span>
            </div>
          )}
        </div>

        {/* ── DETAIL PANEL ── */}
        {selected && (
          <div style={{ width: 230, flexShrink: 0, borderLeft: '1px solid var(--border)', overflowY: 'auto', background: '#fff', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>
                {selected._svc ? '🔗 Servicio' : selected.tipo === 'proveedor' ? '🔧 Proveedor' : '👤 Cliente'}
              </span>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#bbb', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
              {selected._svc ? (
                /* Service */
                <>
                  <StatusBadge e={selected.estado} />
                  <div style={{ marginTop: 10 }}>
                    <DField label="Descripción" val={selected.descripcion || '—'} />
                    <DField label="Tarifa"       val={selected.tarifa ? `R$${selected.tarifa}` : '—'} />
                    <DField label="Creado"        val={selected.created_at ? new Date(selected.created_at).toLocaleString('es-AR') : '—'} small />
                  </div>
                </>
              ) : (
                /* User */
                <>
                  {/* Avatar */}
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%', margin: '0 auto 8px',
                      background: selected.tipo === 'proveedor' ? 'linear-gradient(135deg,#00C8D7,#0080AA)' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff', fontWeight: 800
                    }}>
                      {(selected.nombre || 'U')[0].toUpperCase()}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{selected.nombre}</div>
                    {selected.tipo === 'proveedor' && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 20, padding: '3px 10px',
                        background: selected.online ? 'rgba(34,197,94,.1)' : 'rgba(0,0,0,.05)',
                        fontSize: 11, fontWeight: 700, color: selected.online ? '#22C55E' : '#888'
                      }}>
                        {selected.online ? '🟢 En línea' : '⚫ Offline'}
                      </div>
                    )}
                  </div>

                  {selected.tipo === 'proveedor' && (
                    <DField label="Categoría" val={`${CAT_IC[selected.categoria] || '🔧'} ${selected.categoria || '—'}`} />
                  )}
                  <DField label="Email"     val={selected.email || '—'} small />
                  <DField label="Teléfono"  val={selected.telefono || '—'} />
                  {selected.tipo === 'proveedor' && (
                    <DField label="Karma" val={`★ ${(selected.karma || 5).toFixed(1)}`} />
                  )}
                  <DField label="Dirección" val={selected.endereco || '—'} small />
                  {selected.bio && <DField label="Web/Bio" val={selected.bio} small />}
                  <DField label="GPS" val={`${(selected.lat || 0).toFixed(5)}, ${(selected.lng || 0).toFixed(5)}`} small mono />

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                    {selected.telefono && (
                      <a href={`tel:${selected.telefono}`}
                        style={{ flex: 1, minWidth: 80, padding: '8px 4px', background: '#111', color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
                        📞 Llamar
                      </a>
                    )}
                    {selected.lat && (
                      <a href={`https://www.google.com/maps?q=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer"
                        style={{ flex: 1, minWidth: 80, padding: '8px 4px', background: 'rgba(0,200,215,.1)', color: '#0080AA', borderRadius: 10, fontSize: 11, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
                        🗺 Maps
                      </a>
                    )}
                    {selected.email && (
                      <a href={`mailto:${selected.email}`}
                        style={{ flex: 1, minWidth: 80, padding: '8px 4px', background: '#f5f5f5', color: '#555', borderRadius: 10, fontSize: 11, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
                        ✉️ Email
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

/* ── SUB-COMPONENTS ── */
function Fsec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>{title}</div>
      {children}
    </div>
  );
}

function Fcheck({ label, color, val, set }: { label: string; color: string; val: boolean; set: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
      <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} style={{ accentColor: color }} />
      {label}
    </label>
  );
}

function DField({ label, val, small, mono }: { label: string; val: any; small?: boolean; mono?: boolean }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: small ? 10 : 12, fontWeight: 600, color: '#111', wordBreak: 'break-all', fontFamily: mono ? 'monospace' : 'inherit', lineHeight: 1.4 }}>
        {val}
      </div>
    </div>
  );
}

function StatusBadge({ e }: { e: string }) {
  const MAP: Record<string, [string, string]> = {
    negociando: ['#F59E0B', '🤝 Negociando'],
    confirmado: ['#3B82F6', '✅ Confirmado'],
    en_camino:  ['#F59E0B', '🚗 En camino'],
    ejecutando: ['#8B5CF6', '🔧 Ejecutando'],
    completado: ['#22C55E', '✓ Completado'],
    cancelado:  ['#EF4444', '✕ Cancelado'],
  };
  const [c, l] = MAP[e] || ['#888', e];
  return (
    <div style={{ background: c + '18', color: c, borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
      {l}
    </div>
  );
}
