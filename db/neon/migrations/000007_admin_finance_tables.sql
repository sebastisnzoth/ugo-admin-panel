-- UGO TEST schema-only from read-only Supabase structural metadata, do not run on production.
CREATE TABLE IF NOT EXISTS public."audit_log" (
 "id" bigint NOT NULL,
 "evento" text NOT NULL,
 "actor_id" uuid,
 "entidad_tipo" text,
 "entidad_id" uuid,
 "detalles" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."audit_log" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."audit_log" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."config_sistema" (
 "clave" text NOT NULL,
 "valor" text NOT NULL,
 "descripcion" text,
 "grupo" text DEFAULT 'general'::text NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 "updated_by" uuid,
 PRIMARY KEY ("clave")
);

ALTER TABLE public."config_sistema" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."config_sistema" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."disputas" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "servicio_id" uuid NOT NULL,
 "abierta_por" uuid NOT NULL,
 "estado" public.disputa_estado DEFAULT 'abierta'::disputa_estado NOT NULL,
 "motivo" text NOT NULL,
 "evidencias" jsonb DEFAULT '[]'::jsonb NOT NULL,
 "resolucion" text,
 "resuelta_por" uuid,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 "resuelta_at" timestamptz,
 "numero" bigint NOT NULL,
 "cliente_id" uuid,
 "proveedor_id" uuid,
 "monto_disputado" numeric,
 "resolucion_favor" text CHECK (resolucion_favor = ANY (ARRAY['cliente'::text, 'proveedor'::text])),
 "estado_servicio_previo" public.servicio_estado,
 "ajuste_financiero_pendiente" boolean DEFAULT false NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."disputas" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."disputas" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."documentos" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "usuario_id" uuid NOT NULL,
 "tipo" text NOT NULL,
 "estado" text DEFAULT 'pendiente'::text NOT NULL,
 "url_storage" text NOT NULL,
 "descripcion" text,
 "notas" text,
 "notas_rechazo" text,
 "ocr_resultado" jsonb,
 "ocr_valido" boolean,
 "ocr_confianza" numeric,
 "ocr_validado_at" timestamptz,
 "intentos_resubmision" integer DEFAULT 0 NOT NULL,
 "version" integer DEFAULT 1 NOT NULL,
 "thumbnail_url" text,
 "revisor_id" uuid,
 "revisado_at" timestamptz,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."documentos" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."documentos" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."documentos_proveedor" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "usuario_id" uuid NOT NULL,
 "tipo" text NOT NULL CHECK (tipo = ANY (ARRAY['identidad_frente'::text, 'identidad_dorso'::text, 'selfie'::text, 'comprobante_domicilio'::text, 'otro'::text])),
 "storage_path" text NOT NULL,
 "nombre_archivo" text,
 "mime_type" text,
 "estado" text DEFAULT 'pendiente'::text NOT NULL CHECK (estado = ANY (ARRAY['pendiente'::text, 'aprobado'::text, 'rechazado'::text])),
 "notas_revision" text,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 "revisado_at" timestamptz,
 "revisor_id" uuid,
 PRIMARY KEY ("id")
);

ALTER TABLE public."documentos_proveedor" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."documentos_proveedor" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."mensajes" (
 "id" bigint NOT NULL,
 "servicio_id" uuid NOT NULL,
 "emisor_id" uuid,
 "emisor_rol" public.mensaje_rol NOT NULL,
 "contenido" text NOT NULL,
 "datos" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "leido_at" timestamptz,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."mensajes" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."mensajes" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."retiros" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "proveedor_id" uuid NOT NULL,
 "pago_id" uuid,
 "monto" numeric NOT NULL CHECK (monto > 0::numeric),
 "moneda" character DEFAULT 'BRL'::bpchar NOT NULL,
 "estado" public.retiro_estado DEFAULT 'pendiente'::retiro_estado NOT NULL,
 "transferencia_externa_id" text,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "procesado_at" timestamptz,
 "notas" text,
 "ambiente" text DEFAULT 'real'::text NOT NULL CHECK (ambiente = ANY (ARRAY['real'::text, 'demo'::text])),
 PRIMARY KEY ("id")
);

ALTER TABLE public."retiros" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."retiros" FROM PUBLIC;
