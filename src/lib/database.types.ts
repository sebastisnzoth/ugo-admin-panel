// ============================================================
// U.GO QUANTUM OS — TypeScript Types for Supabase
// Auto-sincronizado con migrations/001_ugo_schema.sql
// ============================================================

// ── ENUMS ──────────────────────────────────────────────────
export type UserTipo      = 'cliente' | 'proveedor' | 'admin';
export type ServicioEstado =
  | 'negociando' | 'confirmado' | 'en_camino'
  | 'ejecutando' | 'completado' | 'cancelado' | 'disputa';
export type EscrowEstado  = 'retenido' | 'liberado' | 'reembolsado' | 'disputa';
export type DisputaEstado =
  | 'abierta' | 'en_revision'
  | 'resuelta_cliente' | 'resuelta_proveedor' | 'reembolsada';
export type DocumentoEstado =
  | 'pendiente' | 'procesando' | 'aprobado'
  | 'rechazado' | 'reenvio_solicitado';
export type HugoRol = 'cliente' | 'proveedor' | 'admin';

// ── INTERFACES ─────────────────────────────────────────────
export interface Categoria {
  id:         string;
  slug:       string;
  nombre:     string;
  emoji:      string;
  activa:     boolean;
  created_at: string;
}

export interface Usuario {
  id:                    string;
  auth_id?:              string;
  email:                 string;
  nombre:                string;
  apellido?:             string;
  telefono?:             string;
  tipo:                  UserTipo;
  activo:                boolean;
  online:                boolean;
  karma:                 number;
  foto_url?:             string;
  lat?:                  number;
  lng?:                  number;
  zona?:                 string;
  pais:                  string;
  servicios_completados: number;
  categorias_ids?:       string[];
  fcm_token?:            string;
  stripe_customer_id?:   string;
  stripe_account_id?:    string;
  fecha_registro:        string;
  updated_at:            string;
}

export interface Servicio {
  id:                  string;
  numero:              number;
  cliente_id?:         string;
  proveedor_id?:       string;
  categoria_id?:       string;
  estado:              ServicioEstado;
  descripcion?:        string;
  zona?:               string;
  direccion_cliente?:  string;
  lat_cliente?:        number;
  lng_cliente?:        number;
  lat_proveedor?:      number;
  lng_proveedor?:      number;
  tarifa?:             number;
  comision_ugo?:       number;
  ganancia_proveedor?: number;
  distancia_km?:       number;
  rating_cliente?:     number;
  rating_proveedor?:   number;
  hugo_session_id?:    string;
  created_at:          string;
  updated_at:          string;
  confirmado_at?:      string;
  completado_at?:      string;
  duracion_minutos?:   number;
  // JOIN fields
  cliente?:   Pick<Usuario, 'id' | 'nombre' | 'apellido'> | null;
  proveedor?: Pick<Usuario, 'id' | 'nombre' | 'apellido'> | null;
  categoria?: Pick<Categoria, 'id' | 'nombre' | 'emoji'> | null;
}

export interface Escrow {
  id:                    string;
  servicio_id?:          string;
  cliente_id?:           string;
  proveedor_id?:         string;
  monto_total:           number;
  comision_ugo?:         number;
  monto_proveedor?:      number;
  estado:                EscrowEstado;
  stripe_payment_intent?: string;
  stripe_transfer_id?:   string;
  created_at:            string;
  updated_at:            string;
  liberado_at?:          string;
}

export interface Disputa {
  id:              string;
  numero:          string;
  servicio_id?:    string;
  cliente_id?:     string;
  proveedor_id?:   string;
  monto_disputado?: number;
  motivo?:         string;
  evidencias:      Record<string, unknown>[];
  estado:          DisputaEstado;
  resolucion?:     string;
  admin_notas?:    string;
  created_at:      string;
  updated_at:      string;
  resuelta_at?:    string;
  // JOINs
  cliente?:  Pick<Usuario, 'id' | 'nombre'> | null;
  proveedor?: Pick<Usuario, 'id' | 'nombre'> | null;
  servicio?: Pick<Servicio, 'id' | 'numero'> | null;
}

export interface Documento {
  id:           string;
  usuario_id:   string;
  tipo:         string;
  descripcion?: string;
  url_storage?: string;
  estado:       DocumentoEstado;
  ocr_resultado?: Record<string, unknown>;
  ocr_valido?:  boolean;
  revisor_id?:  string;
  notas?:       string;
  created_at:   string;
  updated_at:   string;
  revisado_at?: string;
  // JOIN
  usuario?: Pick<Usuario, 'id' | 'nombre' | 'apellido' | 'pais'> | null;
}

export interface AuditLog {
  id:           string;
  evento:       string;
  actor_id?:    string;
  actor_tipo?:  string;
  entidad_tipo?: string;
  entidad_id?:  string;
  detalles?:    Record<string, unknown>;
  ip?:          string;
  created_at:   string;
}

export interface HugoSession {
  id:         string;
  usuario_id: string;
  rol:        HugoRol;
  activa:     boolean;
  metadatos?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HugoMessage {
  id:          string;
  session_id:  string;
  usuario_id?: string;
  rol_mensaje: 'user' | 'hugo';
  contenido:   string;
  accion?:     string;
  ui_action?:  string;
  datos?:      Record<string, unknown>;
  created_at:  string;
}

export interface MetricasDia {
  id:                       string;
  fecha:                    string;
  servicios_totales:        number;
  servicios_completados:    number;
  servicios_cancelados:     number;
  ingresos_brutos:          number;
  comision_ugo:             number;
  nuevos_clientes:          number;
  nuevos_proveedores:       number;
  disputas_abiertas:        number;
  disputas_resueltas:       number;
  proveedores_online_pico:  number;
  tiempo_respuesta_prom_seg: number;
  ticket_promedio:          number;
  updated_at:               string;
}

// Vista sql: vista_admin_dashboard
export interface AdminDashboard {
  servicios_activos:  number;
  boveda_total:       number;
  proveedores_online: number;
  proveedores_total:  number;
  disputas_abiertas:  number;
  monto_disputado:    number;
  docs_pendientes:    number;
  ingresos_hoy:       number;
  comision_hoy:       number;
  ingresos_mes:       number;
  clientes_total:     number;
  snapshot_at:        string;
}

// ── SUPABASE DB TYPE (para createClient<Database>()) ───────
export type Database = {
  public: {
    Tables: {
      categorias:    { Row: Categoria;   Insert: Omit<Categoria, 'id' | 'created_at'>; Update: Partial<Categoria> };
      usuarios:      { Row: Usuario;     Insert: Omit<Usuario, 'id' | 'fecha_registro' | 'updated_at'>; Update: Partial<Usuario> };
      servicios:     { Row: Servicio;    Insert: Omit<Servicio, 'id' | 'numero' | 'created_at' | 'updated_at' | 'cliente' | 'proveedor' | 'categoria'>; Update: Partial<Servicio> };
      escrow:        { Row: Escrow;      Insert: Omit<Escrow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Escrow> };
      disputas:      { Row: Disputa;     Insert: Omit<Disputa, 'id' | 'numero' | 'created_at' | 'updated_at' | 'cliente' | 'proveedor' | 'servicio'>; Update: Partial<Disputa> };
      documentos:    { Row: Documento;   Insert: Omit<Documento, 'id' | 'created_at' | 'updated_at' | 'usuario'>; Update: Partial<Documento> };
      audit_log:     { Row: AuditLog;    Insert: Omit<AuditLog, 'id' | 'created_at'>; Update: never };
      hugo_sessions: { Row: HugoSession; Insert: Omit<HugoSession, 'id' | 'created_at' | 'updated_at'>; Update: Partial<HugoSession> };
      hugo_chat:     { Row: HugoMessage; Insert: Omit<HugoMessage, 'id' | 'created_at'>; Update: never };
      metricas_dia:  { Row: MetricasDia; Insert: Omit<MetricasDia, 'id' | 'updated_at'>; Update: Partial<MetricasDia> };
    };
    Views: {
      vista_admin_dashboard: { Row: AdminDashboard };
    };
    Functions: {
      is_admin:                  { Args: Record<never, never>; Returns: boolean };
      admin_suspender_proveedor: { Args: { p_proveedor_id: string; p_motivo?: string }; Returns: Record<string, unknown> };
      admin_liberar_escrow:      { Args: { p_escrow_id: string; p_notas?: string }; Returns: Record<string, unknown> };
      admin_resolver_disputa:    { Args: { p_disputa_id: string; p_resolucion: string; p_favor_de?: string }; Returns: Record<string, unknown> };
    };
  };
};
