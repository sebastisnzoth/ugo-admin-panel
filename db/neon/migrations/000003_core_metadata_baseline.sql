-- UGO core schema: reconstructed from read-only Supabase PROD structural metadata.
-- TEST only; no user data. Supabase auth.users FK deferred until identity migration.
CREATE TYPE public.usuario_tipo AS ENUM ('cliente','proveedor','admin','superadmin');
CREATE TABLE public.categorias (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "slug" text NOT NULL,
 "nombre" text NOT NULL,
 "emoji" text DEFAULT '🔧'::text NOT NULL,
 "activa" boolean DEFAULT true NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.categorias FROM PUBLIC;
CREATE TABLE public.subcategorias (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "categoria_id" uuid NOT NULL,
 "slug" text NOT NULL,
 "nombre" text NOT NULL,
 "descripcion" text,
 "activa" boolean DEFAULT true NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);
ALTER TABLE public.subcategorias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.subcategorias FROM PUBLIC;
CREATE TABLE public.usuarios (
 "id" uuid NOT NULL,
 "nombre" text DEFAULT ''::text NOT NULL,
 "apellido" text,
 "tipo" public.usuario_tipo DEFAULT 'cliente'::usuario_tipo NOT NULL,
 "activo" boolean DEFAULT true NOT NULL,
 "foto_url" text,
 "pais" character DEFAULT 'BR'::bpchar NOT NULL,
 "zona" text,
 "karma" numeric DEFAULT 5.00 NOT NULL CHECK (karma >= 0::numeric AND karma <= 5::numeric),
 "servicios_completados" integer DEFAULT 0 NOT NULL CHECK (servicios_completados >= 0),
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 "email" text,
 "online" boolean DEFAULT false NOT NULL,
 "telefono" text,
 "fecha_registro" timestamptz,
 "lat" double precision,
 "lng" double precision,
 "categoria" text,
 "categorias_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
 "bio" text,
 "endereco" text,
 "tarifa_base" numeric,
 "georef" text,
 "subcategoria_id" uuid,
 "prospecto_id" uuid,
 "es_demo" boolean DEFAULT false NOT NULL,
 PRIMARY KEY ("id")
);
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.usuarios FROM PUBLIC;
