import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const sb = supabase as any;

// ─── Zonas ───────────────────────────────────────────────────
export function useZonas() {
  const [zonas, setZonas] = useState<any[]>([]);
  const fetch = useCallback(async () => {
    const { data } = await sb.from('zonas_cobertura').select('*').order('nombre');
    if (data) setZonas(data);
  }, []);
  const upsert = useCallback(async (d: any) => {
    await sb.rpc('admin_upsert_zona', { p_id: d.id||null, p_nombre: d.nombre, p_lat: Number(d.lat), p_lng: Number(d.lng), p_radio_km: Number(d.radio_km), p_min_proveedores: Number(d.min_proveedores), p_activa: d.activa, p_hora_inicio: d.hora_inicio, p_hora_fin: d.hora_fin });
    await fetch();
  }, [fetch]);
  const toggle = useCallback(async (id: string, activa: boolean) => {
    await sb.from('zonas_cobertura').update({ activa }).eq('id', id); await fetch();
  }, [fetch]);
  useEffect(() => { fetch(); }, [fetch]);
  return { zonas, upsert, toggle, refetch: fetch };
}

// ─── Promos ───────────────────────────────────────────────────
export function usePromos() {
  const [promos, setPromos] = useState<any[]>([]);
  const fetch = useCallback(async () => {
    const { data } = await sb.from('codigos_promo').select('*,categorias:categoria_id(nombre)').order('created_at', { ascending: false });
    if (data) setPromos(data);
  }, []);
  const upsert = useCallback(async (d: any) => {
    await sb.rpc('admin_upsert_promo', { p_id: d.id||null, p_codigo: d.codigo, p_descripcion: d.descripcion, p_tipo: d.tipo, p_valor: Number(d.valor), p_usos_max: d.usos_max ? Number(d.usos_max) : null, p_solo_primer_servicio: d.solo_primer_servicio, p_activo: d.activo, p_expira_at: d.expira_at||null });
    await fetch();
  }, [fetch]);
  const toggle = useCallback(async (id: string, activo: boolean) => {
    await sb.from('codigos_promo').update({ activo }).eq('id', id); await fetch();
  }, [fetch]);
  useEffect(() => { fetch(); }, [fetch]);
  return { promos, upsert, toggle, refetch: fetch };
}

// ─── Surge ────────────────────────────────────────────────────
export function useSurge() {
  const [rules, setRules] = useState<any[]>([]);
  const fetch = useCallback(async () => {
    const { data } = await sb.from('surge_config').select('*').order('nombre');
    if (data) setRules(data);
  }, []);
  const upsert = useCallback(async (d: any) => {
    await sb.rpc('admin_upsert_surge', { p_id: d.id||null, p_nombre: d.nombre, p_multiplicador: Number(d.multiplicador), p_hora_inicio: d.hora_inicio||'', p_hora_fin: d.hora_fin||'', p_dias: d.dias, p_zona: d.zona||'global', p_activo: d.activo });
    await fetch();
  }, [fetch]);
  const toggle = useCallback(async (id: string, activo: boolean) => {
    await sb.from('surge_config').update({ activo }).eq('id', id); await fetch();
  }, [fetch]);
  useEffect(() => { fetch(); }, [fetch]);
  return { rules, upsert, toggle, refetch: fetch };
}

// ─── Horarios ─────────────────────────────────────────────────
export function useHorarios() {
  const [horarios, setHorarios] = useState<any[]>([]);
  const fetch = useCallback(async () => {
    const { data } = await sb.from('horarios_operacion').select('*').order('dia');
    if (data) setHorarios(data);
  }, []);
  const update = useCallback(async (dia: string, apertura: string, cierre: string, activo: boolean) => {
    await sb.rpc('admin_update_horario', { p_dia: dia, p_apertura: apertura, p_cierre: cierre, p_activo: activo });
    await fetch();
  }, [fetch]);
  useEffect(() => { fetch(); }, [fetch]);
  return { horarios, update };
}

// ─── Onboarding ───────────────────────────────────────────────
export function useOnboarding() {
  const [docs, setDocs] = useState<any[]>([]);
  const fetch = useCallback(async () => {
    const { data } = await sb.from('onboarding_docs').select('*,categorias:categoria_id(nombre,emoji)').order('orden');
    if (data) setDocs(data);
  }, []);
  const upsert = useCallback(async (categoriaId: string, tipoDoc: string, descripcion: string, obligatorio: boolean, orden: number) => {
    await sb.rpc('admin_upsert_onboarding_doc', { p_categoria_id: categoriaId, p_tipo_doc: tipoDoc, p_descripcion: descripcion, p_obligatorio: obligatorio, p_orden: orden });
    await fetch();
  }, [fetch]);
  const remove = useCallback(async (id: string) => {
    await sb.rpc('admin_delete_onboarding_doc', { p_id: id }); await fetch();
  }, [fetch]);
  useEffect(() => { fetch(); }, [fetch]);
  return { docs, upsert, remove, refetch: fetch };
}

// ─── Admin Roles ─────────────────────────────────────────────
export function useAdminRoles() {
  const [roles, setRoles] = useState<any[]>([]);
  const fetch = useCallback(async () => {
    const { data } = await sb.from('admin_roles').select('*').order('created_at', { ascending: false });
    if (data) setRoles(data);
  }, []);
  const upsert = useCallback(async (email: string, nombre: string, permisos: string[]) => {
    await sb.rpc('admin_upsert_role', { p_email: email, p_nombre: nombre, p_permisos: permisos }); await fetch();
  }, [fetch]);
  const toggle = useCallback(async (id: string, activo: boolean) => {
    await sb.from('admin_roles').update({ activo }).eq('id', id); await fetch();
  }, [fetch]);
  useEffect(() => { fetch(); }, [fetch]);
  return { roles, upsert, toggle };
}

// ─── Ratings ──────────────────────────────────────────────────
export function useRatings() {
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    const { data } = await sb.rpc('admin_get_ratings', { p_limit: 50 });
    if (data) setRatings(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);
  const flag = useCallback(async (servicioId: string, tipo: string, motivo: string) => {
    await sb.rpc('admin_flag_rating', { p_servicio_id: servicioId, p_tipo: tipo, p_motivo: motivo });
  }, []);
  const removeRating = useCallback(async (servicioId: string, tipo: 'rating_cliente'|'rating_proveedor') => {
    await sb.from('servicios').update({ [tipo]: null }).eq('id', servicioId); await fetch();
  }, [fetch]);
  useEffect(() => { fetch(); }, [fetch]);
  return { ratings, loading, flag, removeRating };
}

// ─── Config avanzada (desde config_sistema con prefijo) ───────
export function useAdvancedConfig(prefix: string) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const fetch = useCallback(async () => {
    const { data } = await sb.from('config_sistema').select('clave,valor,descripcion,tipo').like('clave', `${prefix}%`);
    if (data) { const m: Record<string,string> = {}; data.forEach((r: any) => { m[r.clave] = r.valor; }); setConfig(m); }
  }, [prefix]);
  const update = useCallback(async (clave: string, valor: string) => {
    await sb.rpc('admin_update_config', { p_clave: clave, p_valor: valor });
    setConfig(p => ({ ...p, [clave]: valor }));
  }, []);
  const getAll = useCallback(async () => {
    const { data } = await sb.from('config_sistema').select('*').like('clave', `${prefix}%`);
    return data || [];
  }, [prefix]);
  useEffect(() => { fetch(); }, [fetch]);
  return { config, update, getAll, refetch: fetch };
}
