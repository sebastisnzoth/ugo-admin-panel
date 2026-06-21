import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { AdminDashboard, Servicio, Disputa, Documento, Usuario, MetricasDia } from '../lib/database.types';

// ─── Canal realtime autenticado ──────────────────────────────
let globalChannel: any = null;
const listeners: Record<string, Set<() => void>> = {};
const eventListeners: Array<(event: {table: string, type: string, row: any}) => void> = [];

function initChannel() {
  if (globalChannel) return;
  const TABLES = ['servicios','disputas','escrow','documentos','usuarios','audit_log','categorias','tarifas','notificaciones'];
  const ch = (supabase as any).channel('ugo-admin-rt-' + Date.now());
  TABLES.forEach(table => {
    ch.on('postgres_changes', { event: '*', schema: 'public', table }, (payload: any) => {
      listeners[table]?.forEach(f => f());
      eventListeners.forEach(f => f({ table, type: payload.eventType, row: payload.new || payload.old }));
    });
  });
  globalChannel = ch.subscribe((status: string) => {
    console.log('[RT] status:', status);
  });
}

export function resetRealtimeChannel() {
  if (globalChannel) { (supabase as any).removeChannel(globalChannel); globalChannel = null; }
  initChannel();
}

export function onRealtimeEvent(cb: (e: {table: string, type: string, row: any}) => void) {
  eventListeners.push(cb);
  return () => { const i = eventListeners.indexOf(cb); if (i >= 0) eventListeners.splice(i, 1); };
}

function subscribe(table: string, cb: () => void) {
  if (!listeners[table]) listeners[table] = new Set();
  listeners[table].add(cb);
  initChannel();
  return () => { listeners[table]?.delete(cb); };
}

// ─── Dashboard ───────────────────────────────────────────────
export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    const { data } = await (supabase as any).from('vista_admin_dashboard').select('*').single();
    if (data) setMetrics(data); setLoading(false);
  }, []);
  useEffect(() => {
    fetch();
    const t = setInterval(fetch, 30_000);
    const u = ['servicios','escrow','disputas','documentos','usuarios'].map(tb => subscribe(tb, fetch));
    return () => { clearInterval(t); u.forEach(f => f()); };
  }, [fetch]);
  return { metrics, loading, refetch: fetch };
}

// ─── KPIs conversión ─────────────────────────────────────────
export function useConversionKPIs() {
  const [kpis, setKpis] = useState<any>(null);
  const fetch = useCallback(async () => {
    const { data } = await (supabase as any).from('vista_kpis_conversion').select('*').single();
    if (data) setKpis(data);
  }, []);
  useEffect(() => { fetch(); const t = setInterval(fetch, 300_000); const u = subscribe('servicios', fetch); return () => { clearInterval(t); u(); }; }, [fetch]);
  return kpis;
}

// ─── Alertas ─────────────────────────────────────────────────
export function useSystemAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const fetch = useCallback(async () => {
    const { data } = await (supabase as any).from('vista_alertas_sistema').select('*');
    if (data) setAlerts(data);
  }, []);
  useEffect(() => {
    fetch();
    const t = setInterval(fetch, 60_000);
    const u = ['usuarios','disputas','escrow'].map(tb => subscribe(tb, fetch));
    return () => { clearInterval(t); u.forEach(f => f()); };
  }, [fetch]);
  return { alerts, criticalCount: alerts.filter(a => a.severidad === 'critical').length, warningCount: alerts.filter(a => a.severidad === 'warning').length, refetch: fetch };
}

// ─── Proveedores para mapa ────────────────────────────────────
export function useMapProviders() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    const { data } = await (supabase as any).from('vista_proveedores_online').select('id,nombre,apellido,karma,lat,lng,zona,disponible,servicio_estado,categoria_nombre,categoria_emoji,servicios_completados');
    if (data) setProviders(data); setLoading(false);
  }, []);
  useEffect(() => { fetch(); const u = ['usuarios','servicios'].map(tb => subscribe(tb, fetch)); return () => u.forEach(f => f()); }, [fetch]);
  return { providers, loading, refetch: fetch };
}

// ─── Servicios activos ────────────────────────────────────────
export function useActiveServices() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    const { data } = await (supabase as any).from('servicios')
      .select('id,estado,zona,tarifa,created_at,descripcion,categorias:categoria_id(nombre,emoji),clientes:cliente_id(nombre),proveedores:proveedor_id(nombre,karma)')
      .order('created_at', { ascending: false }).limit(100);
    if (data) setServices(data); setLoading(false);
  }, []);
  useEffect(() => { fetch(); const u = subscribe('servicios', fetch); return u; }, [fetch]);
  return { services, loading, refetch: fetch };
}

// ─── Disputas ────────────────────────────────────────────────
export function useOpenDisputes() {
  const [disputes, setDisputes] = useState<Disputa[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    const { data } = await (supabase as any).from('disputas')
      .select('id,numero,estado,monto_disputado,motivo,created_at,clientes:cliente_id(nombre),proveedores:proveedor_id(nombre)')
      .in('estado', ['abierta','en_revision']).order('created_at', { ascending: true });
    if (data) setDisputes(data as any); setLoading(false);
  }, []);
  const resolverDisputa = useCallback(async (id: string, resolucion: string, favorDe: 'cliente'|'proveedor') => {
    const sb = supabase as any;
    // Update disputa state
    const { error } = await sb.from('disputas').update({
      estado: 'resuelta', resolucion,
      resuelta_at: new Date().toISOString()
    }).eq('id', id);
    if (error) { console.error('resolverDisputa:', error.message); return; }
    // Update escrow
    const { data: d } = await sb.from('disputas').select('servicio_id').eq('id', id).single();
    if (d?.servicio_id) {
      await sb.from('escrow').update({
        estado: favorDe === 'proveedor' ? 'liberado' : 'reembolsado',
        liberado_at: new Date().toISOString()
      }).eq('servicio_id', d.servicio_id);
    }
    await fetch();
  }, [fetch]);
  useEffect(() => { fetch(); const u = subscribe('disputas', fetch); return u; }, [fetch]);
  return { disputes, loading, resolverDisputa };
}

// ─── Documentos ──────────────────────────────────────────────
export function usePendingDocuments() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    const { data } = await (supabase as any).from('documentos')
      .select('id,tipo,estado,created_at,url_storage,descripcion,notas,usuarios:usuario_id(nombre,apellido,email)')
      .in('estado', ['pendiente','procesando']).order('created_at', { ascending: true });
    if (data) setDocs(data); setLoading(false);
  }, []);
  const updateEstado = useCallback(async (id: string, estado: string, notas?: string) => {
    const sb = supabase as any;
    const { error } = await sb.from('documentos')
      .update({ estado, notas, revisado_at: new Date().toISOString() }).eq('id', id);
    if (error) { console.error('updateEstado:', error.message); return; }
    await fetch();
  }, [fetch]);
  const getSignedUrl = useCallback(async (path: string) => {
    if (!path) return null;
    const { data } = await (supabase as any).storage.from('documentos').createSignedUrl(path, 300);
    return data?.signedUrl ?? null;
  }, []);
  useEffect(() => { fetch(); const u = subscribe('documentos', fetch); return u; }, [fetch]);
  return { docs, loading, updateEstado, getSignedUrl };
}

// ─── Feed de actividad ────────────────────────────────────────
export function useActivityFeed() {
  const [feed, setFeed] = useState<any[]>([]);
  const fetch = useCallback(async () => {
    const { data } = await (supabase as any).from('audit_log').select('id,evento,actor_tipo,detalles,created_at').order('created_at', { ascending: false }).limit(20);
    if (data) setFeed(data);
  }, []);
  useEffect(() => { fetch(); const u = subscribe('audit_log', fetch); return u; }, [fetch]);
  return feed;
}

// ─── Métricas semanales ───────────────────────────────────────
export function useWeekMetrics() {
  const [data, setData] = useState<MetricasDia[]>([]);
  useEffect(() => {
    (supabase as any).from('metricas_dia').select('fecha,ingresos_brutos,comision_ugo,servicios_completados,servicios_totales')
      .gte('fecha', new Date(Date.now() - 7*86400_000).toISOString().split('T')[0])
      .order('fecha', { ascending: true })
      .then(({ data: d }: any) => { if (d) setData(d); });
  }, []);
  return data;
}

// ─── Usuarios ─────────────────────────────────────────────────
export function useUsuarios() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    const { data } = await (supabase as any).from('usuarios')
      .select('id,nombre,apellido,email,tipo,activo,online,karma,zona,pais,telefono,servicios_completados,fecha_registro,updated_at,lat,lng,categoria,bio,endereco,tarifa_base,foto_url,georef,subcategoria_id,prospecto_id')
      .order('fecha_registro', { ascending: false }).limit(200);
    if (data) setUsers(data); setLoading(false);
  }, []);
  const suspenderProveedor = useCallback(async (id: string, motivo: string) => {
    await (supabase as any).rpc('admin_suspender_proveedor', { p_proveedor_id: id, p_motivo: motivo }); await fetch();
  }, [fetch]);
  const reactivarProveedor = useCallback(async (id: string) => {
    await (supabase as any).rpc('admin_reactivar_proveedor', { p_proveedor_id: id }); await fetch();
  }, [fetch]);
  const crearUsuario = useCallback(async (data: any) => {
    const res = await (supabase as any).rpc('admin_crear_usuario', {
      p_email: data.email, p_nombre: data.nombre, p_apellido: data.apellido,
      p_tipo: data.tipo, p_telefono: data.telefono, p_zona: data.zona, p_pais: data.pais,
    });
    await fetch(); return res.data;
  }, [fetch]);
  const updateUsuario = useCallback(async (id: string, data: any) => {
    const payload: Record<string,any> = {
      nombre:      data.nombre     || null,
      apellido:    data.apellido   || null,
      telefono:    data.telefono   || null,
      zona:        data.zona       || null,
      pais:        data.pais       || 'BR',
      activo:      data.activo,
      karma:       data.karma      ? parseFloat(data.karma)    : undefined,
      categoria:   data.categoria  || null,
      endereco:    data.endereco   || null,
      bio:         data.bio        || null,
      tarifa_base: data.tarifa_base? parseFloat(data.tarifa_base) : undefined,
      foto_url:    data.foto_url   || null,
      georef:      data.georef     || null,
      lat:         data.lat        ? parseFloat(data.lat) : null,
      lng:         data.lng        ? parseFloat(data.lng) : null,
    };
    // Remove undefined keys
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    await (supabase as any).from('usuarios').update(payload).eq('id', id);
    await fetch();
  }, [fetch]);
  useEffect(() => { fetch(); const u = subscribe('usuarios', fetch); return u; }, [fetch]);
  return { users, loading, suspenderProveedor, reactivarProveedor, crearUsuario, updateUsuario, refetch: fetch };
}

// ─── Auth Users ───────────────────────────────────────────────
export function useAuthUsers(enabled: boolean) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);
  useEffect(() => {
    if (!enabled || fetched.current) return;
    fetched.current = true; setLoading(true);
    (supabase as any).rpc('admin_get_auth_users').then(({ data }: any) => { if (data) setUsers(data); setLoading(false); });
  }, [enabled]);
  return { users, loading };
}

// ─── Categorías CRUD ─────────────────────────────────────────
export function useCategorias() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    const { data } = await (supabase as any).from('categorias').select('*').order('nombre');
    if (data) setCategorias(data); setLoading(false);
  }, []);
  const crear = useCallback(async (nombre: string, emoji: string) => {
    const res = await (supabase as any).rpc('admin_crear_categoria', { p_nombre: nombre, p_emoji: emoji });
    await fetch(); return res.data;
  }, [fetch]);
  const actualizar = useCallback(async (id: string, nombre: string, emoji: string, activa: boolean) => {
    await (supabase as any).rpc('admin_update_categoria', { p_id: id, p_nombre: nombre, p_emoji: emoji, p_activa: activa });
    await fetch();
  }, [fetch]);
  const toggleActiva = useCallback(async (id: string, activa: boolean) => {
    const cat = categorias.find(c => c.id === id);
    if (cat) await actualizar(id, cat.nombre, cat.emoji, activa);
  }, [categorias, actualizar]);
  useEffect(() => { fetch(); const u = subscribe('categorias', fetch); return u; }, [fetch]);
  return { categorias, loading, crear, actualizar, toggleActiva, refetch: fetch };
}

// ─── Tarifas CRUD ────────────────────────────────────────────
export function useTarifas() {
  const [tarifas, setTarifas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    const { data } = await (supabase as any).from('tarifas').select('*,categorias:categoria_id(nombre,emoji)').order('zona');
    if (data) setTarifas(data); setLoading(false);
  }, []);
  const upsert = useCallback(async (categoriaId: string, zona: string, precios: any) => {
    await (supabase as any).rpc('admin_upsert_tarifa', {
      p_categoria_id: categoriaId, p_zona: zona,
      p_precio_base: precios.base, p_precio_hora: precios.hora,
      p_precio_min: precios.min, p_precio_max: precios.max,
    }); await fetch();
  }, [fetch]);
  useEffect(() => { fetch(); const u = subscribe('tarifas', fetch); return u; }, [fetch]);
  return { tarifas, loading, upsert, refetch: fetch };
}

// ─── Config sistema ───────────────────────────────────────────
export function useConfigSistema() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    const { data } = await (supabase as any).from('config_sistema').select('*');
    if (data) {
      const m: Record<string, string> = {};
      data.forEach((r: any) => { m[r.clave] = r.valor; });
      setConfig(m);
    }
    setLoading(false);
  }, []);
  const update = useCallback(async (clave: string, valor: string) => {
    await (supabase as any).rpc('admin_update_config', { p_clave: clave, p_valor: valor });
    setConfig(prev => ({ ...prev, [clave]: valor }));
  }, []);
  useEffect(() => { fetch(); }, [fetch]);
  return { config, loading, update, refetch: fetch };
}

// ─── Notificaciones masivas ───────────────────────────────────
export function useNotificaciones() {
  const [hist, setHist] = useState<any[]>([]);
  const fetch = useCallback(async () => {
    const { data } = await (supabase as any).from('notificaciones')
      .select('id,titulo,cuerpo,tipo,created_at').eq('tipo','admin_broadcast')
      .order('created_at', { ascending: false }).limit(20);
    if (data) setHist(data);
  }, []);
  const enviar = useCallback(async (titulo: string, cuerpo: string, target: string, zona?: string) => {
    const res = await (supabase as any).rpc('admin_notificacion_masiva', {
      p_titulo: titulo, p_cuerpo: cuerpo, p_target: target, p_zona: zona ?? null,
    });
    await fetch(); return res.data;
  }, [fetch]);
  useEffect(() => { fetch(); const u = subscribe('notificaciones', fetch); return u; }, [fetch]);
  return { hist, enviar, refetch: fetch };
}

// ─── Servicios CRUD ───────────────────────────────────────────
export function useServiciosCRUD() {
  const crear = useCallback(async (data: any) => {
    const res = await (supabase as any).rpc('admin_crear_servicio', {
      p_cliente_id: data.cliente_id, p_proveedor_id: data.proveedor_id || null,
      p_categoria_id: data.categoria_id || null, p_descripcion: data.descripcion,
      p_zona: data.zona, p_tarifa: data.tarifa || null,
    });
    return res.data;
  }, []);
  const cancelar = useCallback(async (id: string, motivo: string) => {
    await (supabase as any).rpc('admin_cancelar_servicio', { p_servicio_id: id, p_motivo: motivo });
  }, []);
  return { crear, cancelar };
}

// ─── Export ───────────────────────────────────────────────────
export function useExport() {
  const exportServicios = useCallback(async (dias = 30) => {
    const { data } = await (supabase as any).rpc('admin_export_servicios', { p_dias: dias });
    return data as any[];
  }, []);
  const exportUsuarios = useCallback(async () => {
    const { data } = await (supabase as any).rpc('admin_export_usuarios');
    return data as any[];
  }, []);
  return { exportServicios, exportUsuarios };
}

// ─── Bóveda ──────────────────────────────────────────────────
export function useVault() {
  const [escrows, setEscrows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    const { data } = await (supabase as any).from('escrow')
      .select('id,monto_total,comision_ugo,monto_proveedor,estado,created_at,servicios:servicio_id(estado,zona),clientes:cliente_id(nombre),proveedores:proveedor_id(nombre)')
      .eq('estado','retenido').order('created_at', { ascending: true });
    if (data) setEscrows(data); setLoading(false);
  }, []);
  const liberarEscrow = useCallback(async (id: string) => {
    const { error } = await (supabase as any).from('escrow')
      .update({ estado:'liberado', liberado_at: new Date().toISOString() }).eq('id', id);
    if (!error) await fetch(); else console.error('liberarEscrow:', error.message);
  }, [fetch]);
  useEffect(() => { fetch(); const u = subscribe('escrow', fetch); return u; }, [fetch]);
  return { escrows, loading, liberarEscrow };
}

export function usePendingWithdrawals() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (supabase as any).from('escrow')
      .select('id,monto_proveedor,created_at,proveedores:proveedor_id(nombre,stripe_account_id)')
      .eq('estado','liberado').is('liberado_at', null).order('created_at', { ascending: true }).limit(20)
      .then(({ data }: any) => { if (data) setItems(data); });
  }, []);
  return items;
}
