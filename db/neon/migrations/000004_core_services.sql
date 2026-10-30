-- UGO schema derived from read-only Supabase PROD metadata. Neon TEST only. No user data.
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='verificacion_estado') THEN CREATE TYPE public.verificacion_estado AS ENUM ('registrado','pendiente','verificado','rechazado','suspendido'); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='servicio_estado') THEN CREATE TYPE public.servicio_estado AS ENUM ('borrador','buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado','cancelado','disputado'); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='oferta_estado') THEN CREATE TYPE public.oferta_estado AS ENUM ('pendiente','aceptada','rechazada','expirada'); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='evidencia_tipo') THEN CREATE TYPE public.evidencia_tipo AS ENUM ('antes','durante','despues','documento'); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='mensaje_rol') THEN CREATE TYPE public.mensaje_rol AS ENUM ('cliente','proveedor','hugo','sistema','admin'); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='hugo_rol') THEN CREATE TYPE public.hugo_rol AS ENUM ('cliente','proveedor','admin'); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='pago_estado') THEN CREATE TYPE public.pago_estado AS ENUM ('pendiente','autorizado','retenido','liberado','reembolsado','fallido','disputado'); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='retiro_estado') THEN CREATE TYPE public.retiro_estado AS ENUM ('pendiente','procesando','pagado','fallido'); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='disputa_estado') THEN CREATE TYPE public.disputa_estado AS ENUM ('abierta','en_revision','resuelta_cliente','resuelta_proveedor','cerrada'); END IF; END $$;

CREATE TABLE IF NOT EXISTS public."perfiles_cliente" (
  "usuario_id" uuid NOT NULL,
  "telefono" text,
  "direccion" text,
  "barrio" text,
  "ciudad" text,
  "idioma_preferido" text DEFAULT 'pt-BR'::text NOT NULL,
  "contacto_preferido" text DEFAULT 'whatsapp'::text NOT NULL,
  "horarios_preferidos" text,
  "instrucciones_acceso" text,
  "preferencias_servicio" text,
  "observaciones" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "termos_aceitos_at" timestamptz,
  "termos_versao" text,
  "onboarding_completo_at" timestamptz,
  "ubicacion" geography,
  "foto_perfil_path" text,
  PRIMARY KEY ("usuario_id")
);

ALTER TABLE public."perfiles_cliente" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."perfiles_cliente" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."perfiles_proveedor" (
  "usuario_id" uuid NOT NULL,
  "bio" text,
  "tarifa_base" numeric DEFAULT 0 NOT NULL CHECK (tarifa_base >= 0::numeric),
  "online" boolean DEFAULT false NOT NULL,
  "disponible" boolean DEFAULT false NOT NULL,
  "zona_radio_km" numeric DEFAULT 15 NOT NULL CHECK (zona_radio_km > 0::numeric),
  "ubicacion" geography,
  "estado_verificacion" public.verificacion_estado DEFAULT 'registrado'::verificacion_estado NOT NULL,
  "cuenta_pago_externa" text,
  "onboarding_paso" integer DEFAULT 0 NOT NULL CHECK (onboarding_paso >= 0),
  "motivo_rechazo" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "categoria_principal_id" uuid,
  "experiencia_anos" integer,
  "especialidades" text,
  "idiomas" text,
  "disponibilidad_horaria" text,
  "telefono_profesional" text,
  "ciudad_base" text,
  "cpf" text,
  "pix_chave" text,
  "pix_tipo" text,
  "termos_aceitos_at" timestamptz,
  "termos_versao" text,
  "onboarding_completo_at" timestamptz,
  "foto_perfil_path" text,
  "ubicacion_updated_at" timestamptz,
  "ubicacion_accuracy_m" double precision,
  PRIMARY KEY ("usuario_id")
);

ALTER TABLE public."perfiles_proveedor" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."perfiles_proveedor" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."servicios" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "numero" bigint NOT NULL,
  "cliente_id" uuid NOT NULL,
  "proveedor_id" uuid,
  "categoria_id" uuid NOT NULL,
  "subcategoria_id" uuid,
  "estado" public.servicio_estado DEFAULT 'borrador'::servicio_estado NOT NULL,
  "descripcion" text NOT NULL,
  "urgencia" boolean DEFAULT false NOT NULL,
  "direccion_cliente" text,
  "ubicacion_cliente" geography,
  "programado_para" timestamptz,
  "tarifa" numeric CHECK (tarifa IS NULL OR tarifa >= 0::numeric),
  "comision_ugo" numeric CHECK (comision_ugo IS NULL OR comision_ugo >= 0::numeric),
  "ganancia_proveedor" numeric CHECK (ganancia_proveedor IS NULL OR ganancia_proveedor >= 0::numeric),
  "moneda" character DEFAULT 'BRL'::bpchar NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "aceptado_at" timestamptz,
  "iniciado_at" timestamptz,
  "completado_at" timestamptz,
  "cancelado_at" timestamptz,
  "ambiente" text DEFAULT 'real'::text NOT NULL CHECK (ambiente = ANY (ARRAY['real'::text, 'demo'::text])),
  "matching_expires_at" timestamptz,
  PRIMARY KEY ("id")
);

ALTER TABLE public."servicios" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."servicios" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."ofertas_servicio" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "servicio_id" uuid NOT NULL,
  "proveedor_id" uuid NOT NULL,
  "estado" public.oferta_estado DEFAULT 'pendiente'::oferta_estado NOT NULL,
  "ranking" integer,
  "distancia_km" numeric CHECK (distancia_km IS NULL OR distancia_km >= 0::numeric),
  "tarifa_ofrecida" numeric CHECK (tarifa_ofrecida IS NULL OR tarifa_ofrecida >= 0::numeric),
  "expira_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "respondida_at" timestamptz,
  PRIMARY KEY ("id")
);

ALTER TABLE public."ofertas_servicio" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."ofertas_servicio" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."eventos_servicio" (
  "id" bigint NOT NULL,
  "servicio_id" uuid NOT NULL,
  "actor_id" uuid,
  "evento" text NOT NULL,
  "estado_anterior" public.servicio_estado,
  "estado_nuevo" public.servicio_estado,
  "detalles" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE public."eventos_servicio" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."eventos_servicio" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."evidencias_servicio" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "servicio_id" uuid NOT NULL,
  "usuario_id" uuid NOT NULL,
  "tipo" public.evidencia_tipo NOT NULL,
  "storage_path" text NOT NULL,
  "descripcion" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE public."evidencias_servicio" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."evidencias_servicio" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."pagos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "servicio_id" uuid NOT NULL,
  "cliente_id" uuid NOT NULL,
  "proveedor_id" uuid NOT NULL,
  "procesador" text DEFAULT 'mercadopago'::text NOT NULL,
  "pago_externo_id" text,
  "monto_bruto" numeric NOT NULL CHECK (monto_bruto > 0::numeric),
  "comision_ugo" numeric DEFAULT 0 NOT NULL CHECK (comision_ugo >= 0::numeric),
  "ganancia_proveedor" numeric DEFAULT 0 NOT NULL CHECK (ganancia_proveedor >= 0::numeric),
  "moneda" character DEFAULT 'BRL'::bpchar NOT NULL,
  "estado" public.pago_estado DEFAULT 'pendiente'::pago_estado NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "autorizado_at" timestamptz,
  "liberado_at" timestamptz,
  "reembolsado_at" timestamptz,
  "mp_preference_id" text,
  "mp_init_point" text,
  "mp_payment_id" text,
  "mp_status" text,
  "metodo" text DEFAULT 'mercadopago'::text NOT NULL,
  "pix_txid" text,
  "pix_copia_cola" text,
  "pix_qr_code" text,
  "pix_expira_at" timestamptz,
  "pix_e2e_id" text,
  "pix_informado_at" timestamptz,
  "pix_conciliado_at" timestamptz,
  "pix_conciliado_por" uuid,
  "pix_conciliacion_nota" text,
  "modelo_pago" text DEFAULT 'custodia_ugo'::text NOT NULL CHECK (modelo_pago = ANY (ARRAY['custodia_ugo'::text, 'split_1_1'::text, 'presencial'::text])),
  "ambiente" text DEFAULT 'real'::text NOT NULL CHECK (ambiente = ANY (ARRAY['real'::text, 'demo'::text])),
  "fecha_confirmacion" timestamptz,
  PRIMARY KEY ("id")
);

ALTER TABLE public."pagos" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."pagos" FROM PUBLIC;
