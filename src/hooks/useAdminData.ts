import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type {
  AdminDashboard, Servicio, Disputa, Documento,
  Usuario, MetricasDia,
} from '../lib/database.types';

// ─── Canal realtime único (reduce WebSocket connections) ─────
let globalChannel: ReturnType<typeof supabase.channel> | null = null;
const listeners: Record<string, Set<() => void>> = {};

function subscribe(table: string, cb: () => void) {
  if (!listeners[table]) listeners[table] = new Set();
  listeners[table].add(cb);

  if (!globalChannel) {
    globalChannel = supabase.channel('ugo-admin-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'servicios' },
        () => listeners['servicios']?.forEach(f => f()))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disputas' },
        () => listeners['disputas']?.forEach(f => f()))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escrow' },
        () => listeners['escrow']?.forEach(f => f()))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documentos' },
        () => listeners['documentos']?.forEach(f => f()))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' },
        () => listeners['usuarios']?.forEach(f => f()))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_log' },
        () => listeners['audit_log']?.forEach(f => f()))
      .subscribe();
  }

  return () => {
    listeners[table]?.delete(cb);
  };
}

// ─── Dashboard metrics (30s polling + realtime) ──────────────
export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('vista_admin_dashboard')
      .select('*')
      .single();
    if (data) setMetrics(data as AdminDashboard);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const timer = setInterval(fetch, 30_000);
    const unsub1 = subscribe('servicios', fetch);
    const unsub2 = subscribe('escrow', fetch);
    const unsub3 = subscribe('disputas', fetch);
    const unsub4 = subscribe('documentos', fetch);
    const unsub5 = subscribe('usuarios', fetch);
    return () => {
      clearInterval(timer);
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5();
    };
  }, [fetch]);

  return { metrics, loading, refetch: fetch };
}

// ─── KPIs de conversión (30 días, polling 5min) ─────────────
export function useConversionKPIs() {
  const [kpis, setKpis] = useState<Record<string, number> | null>(null);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('vista_kpis_conversion')
      .select('*')
      .single();
    if (data) setKpis(data as Record<string, number>);
  }, []);

  useEffect(() => {
    fetch();
    const timer = setInterval(fetch, 300_000); // 5 min
    const unsub = subscribe('servicios', fetch);
    return () => { clearInterval(timer); unsub(); };
  }, [fetch]);

  return kpis;
}

// ─── Alertas del sistema (polling 60s) ──────────────────────
export function useSystemAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('vista_alertas_sistema')
      .select('*');
    if (data) setAlerts(data);
  }, []);

  useEffect(() => {
    fetch();
    const timer = setInterval(fetch, 60_000);
    const unsub1 = subscribe('usuarios', fetch);
    const unsub2 = subscribe('disputas', fetch);
    const unsub3 = subscribe('escrow', fetch);
    return () => { clearInterval(timer); unsub1(); unsub2(); unsub3(); };
  }, [fetch]);

  const criticalCount = alerts.filter(a => a.severidad === 'critical').length;
  const warningCount  = alerts.filter(a => a.severidad === 'warning').length;

  return { alerts, criticalCount, warningCount, refetch: fetch };
}

// ─── Proveedores para mapa (lat/lng + disponibilidad) ────────
export function useMapProviders() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('vista_proveedores_online')
      .select('id,nombre,apellido,karma,lat,lng,zona,disponible,servicio_estado,categoria_nombre,categoria_emoji,servicios_completados');
    if (data) setProviders(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const unsub1 = subscribe('usuarios', fetch);
    const unsub2 = subscribe('servicios', fetch);
    return () => { unsub1(); unsub2(); };
  }, [fetch]);

  return { providers, loading, refetch: fetch };
}

// ─── Servicios activos ───────────────────────────────────────
export function useActiveServices() {
  const [services, setServices] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('servicios')
      .select(`
        id, estado, zona, tarifa, created_at, descripcion,
        categorias:categoria_id(nombre, emoji),
        clientes:cliente_id(nombre),
        proveedores:proveedor_id(nombre, karma)
      `)
      .not('estado', 'in', '(completado,cancelado)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setServices(data as any);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const unsub = subscribe('servicios', fetch);
    return unsub;
  }, [fetch]);

  return { services, loading };
}

// ─── Disputas abiertas ───────────────────────────────────────
export function useOpenDisputes() {
  const [disputes, setDisputes] = useState<Disputa[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('disputas')
      .select(`
        id, numero, estado, monto_disputado, motivo, created_at, evidencias,
        clientes:cliente_id(nombre),
        proveedores:proveedor_id(nombre)
      `)
      .in('estado', ['abierta', 'en_revision'])
      .order('created_at', { ascending: true });
    if (data) setDisputes(data as any);
    setLoading(false);
  }, []);

  const resolverDisputa = useCallback(async (
    id: string, resolucion: string, favorDe: 'cliente' | 'proveedor'
  ) => {
    await (supabase as any).rpc('admin_resolver_disputa', {
      p_disputa_id: id,
      p_resolucion: resolucion,
      p_favor_de: favorDe,
    });
    await fetch();
  }, [fetch]);

  useEffect(() => {
    fetch();
    const unsub = subscribe('disputas', fetch);
    return unsub;
  }, [fetch]);

  return { disputes, loading, resolverDisputa };
}

// ─── Documentos pendientes ───────────────────────────────────
export function usePendingDocuments() {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('documentos')
      .select(`
        id, tipo, estado, created_at, url_storage, descripcion, notas,
        usuarios:usuario_id(nombre, apellido, email)
      `)
      .in('estado', ['pendiente', 'procesando'])
      .order('created_at', { ascending: true });
    if (data) setDocs(data as any);
    setLoading(false);
  }, []);

  const updateEstado = useCallback(async (
    id: string,
    estado: 'aprobado' | 'rechazado' | 'reenvio_solicitado',
    notas?: string
  ) => {
    const sb = supabase as any;
    await sb
      .from('documentos')
      .update({ estado, notas, revisado_at: new Date().toISOString() })
      .eq('id', id);
    await fetch();
  }, [fetch]);

  const getSignedUrl = useCallback(async (path: string) => {
    if (!path) return null;
    const { data } = await supabase.storage
      .from('documentos')
      .createSignedUrl(path, 300);
    return data?.signedUrl ?? null;
  }, []);

  useEffect(() => {
    fetch();
    const unsub = subscribe('documentos', fetch);
    return unsub;
  }, [fetch]);

  return { docs, loading, updateEstado, getSignedUrl };
}

// ─── Feed de actividad (últimas 20 entradas) ─────────────────
export function useActivityFeed() {
  const [feed, setFeed] = useState<any[]>([]);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('audit_log')
      .select('id, evento, actor_tipo, detalles, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setFeed(data);
  }, []);

  useEffect(() => {
    fetch();
    const unsub = subscribe('audit_log', fetch);
    return unsub;
  }, [fetch]);

  return feed;
}

// ─── Métricas semanales (para gráfico) ──────────────────────
export function useWeekMetrics() {
  const [data, setData] = useState<MetricasDia[]>([]);

  useEffect(() => {
    supabase
      .from('metricas_dia')
      .select('fecha,ingresos_brutos,comision_ugo,servicios_completados,servicios_totales')
      .gte('fecha', new Date(Date.now() - 7 * 86400_000).toISOString().split('T')[0])
      .order('fecha', { ascending: true })
      .then(({ data: d }) => { if (d) setData(d as any); });
  }, []);

  return data;
}

// ─── Usuarios (con filtro por tipo) ─────────────────────────
export function useUsuarios() {
  const [users, setUsers]   = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('id,nombre,apellido,email,tipo,activo,online,karma,zona,servicios_completados,fecha_registro,updated_at')
      .order('fecha_registro', { ascending: false })
      .limit(100);
    if (data) setUsers(data as any);
    setLoading(false);
  }, []);

  const suspenderProveedor = useCallback(async (id: string, motivo: string) => {
    await (supabase as any).rpc('admin_suspender_proveedor', { p_proveedor_id: id, p_motivo: motivo } as any);
    await fetch();
  }, [fetch]);

  const reactivarProveedor = useCallback(async (id: string) => {
    await (supabase as any).rpc('admin_reactivar_proveedor', { p_proveedor_id: id } as any);
    await fetch();
  }, [fetch]);

  useEffect(() => {
    fetch();
    const unsub = subscribe('usuarios', fetch);
    return unsub;
  }, [fetch]);

  return { users, loading, suspenderProveedor, reactivarProveedor };
}

// ─── Auth users (RPC, solo cuando se solicita) ──────────────
export function useAuthUsers(enabled: boolean) {
  const [users, setUsers]     = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    if (!enabled || fetched.current) return;
    fetched.current = true;
    setLoading(true);
    (supabase as any).rpc('admin_get_auth_users' as any)
      .then(({ data }) => {
        if (data) setUsers(data);
        setLoading(false);
      });
  }, [enabled]);

  return { users, loading };
}

// ─── Bóveda / Escrow ─────────────────────────────────────────
export function useVault() {
  const [escrows, setEscrows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('escrow')
      .select(`
        id, monto_total, comision_ugo, monto_proveedor, estado, created_at,
        servicios:servicio_id(estado, zona),
        clientes:cliente_id(nombre),
        proveedores:proveedor_id(nombre)
      `)
      .eq('estado', 'retenido')
      .order('created_at', { ascending: true });
    if (data) setEscrows(data as any);
    setLoading(false);
  }, []);

  const liberarEscrow = useCallback(async (id: string) => {
    await (supabase as any).rpc('admin_liberar_escrow', { p_escrow_id: id } as any);
    await fetch();
  }, [fetch]);

  useEffect(() => {
    fetch();
    const unsub = subscribe('escrow', fetch);
    return unsub;
  }, [fetch]);

  return { escrows, loading, liberarEscrow };
}

// ─── Retiros pendientes ──────────────────────────────────────
export function usePendingWithdrawals() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('escrow')
      .select(`
        id, monto_proveedor, created_at, liberado_at,
        proveedores:proveedor_id(nombre, stripe_account_id)
      `)
      .eq('estado', 'liberado')
      .is('liberado_at', null)
      .order('created_at', { ascending: true })
      .limit(20)
      .then(({ data }) => { if (data) setItems(data as any); });
  }, []);

  return items;
}
