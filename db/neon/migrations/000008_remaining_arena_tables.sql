-- UGO Arena TEST verified table metadata 2026-10-30. Schema-only. Neon br-tiny-field-b6v07tb3 only.
-- Auth-dependent source defaults intentionally omitted pending Better Auth identity bridge; no data copied.
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='hugo_rol') THEN CREATE TYPE public."hugo_rol" AS ENUM ('cliente','proveedor','admin'); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='servicio_estado') THEN CREATE TYPE public."servicio_estado" AS ENUM ('borrador','buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado','cancelado','disputado'); END IF; END $$;

CREATE TABLE IF NOT EXISTS public."disputa_mensajes" (
 "id" bigint NOT NULL,
 "disputa_id" uuid NOT NULL,
 "autor_id" uuid NOT NULL,
 "autor_rol" text NOT NULL CHECK (autor_rol = ANY (ARRAY['cliente'::text, 'proveedor'::text, 'admin'::text])),
 "mensaje" text NOT NULL CHECK (char_length(TRIM(BOTH FROM mensaje)) >= 2 AND char_length(TRIM(BOTH FROM mensaje)) <= 2000),
 "evidencias" jsonb DEFAULT '[]'::jsonb NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."disputa_mensajes" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."disputa_mensajes" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."hugo_chat" (
 "id" bigint NOT NULL,
 "session_id" uuid NOT NULL,
 "usuario_id" uuid,
 "rol_mensaje" text NOT NULL CHECK (rol_mensaje = ANY (ARRAY['user'::text, 'hugo'::text, 'system'::text])),
 "contenido" text NOT NULL,
 "accion" text,
 "ui_action" text,
 "datos" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."hugo_chat" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."hugo_chat" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."hugo_sessions" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "usuario_id" uuid NOT NULL,
 "servicio_id" uuid,
 "rol" public."hugo_rol" NOT NULL,
 "activa" bool DEFAULT true NOT NULL,
 "contexto" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."hugo_sessions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."hugo_sessions" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."push_entregas" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "notificacion_id" uuid NOT NULL,
 "suscripcion_id" uuid NOT NULL,
 "estado" text DEFAULT 'pendiente'::text NOT NULL,
 "ultimo_error" text,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."push_entregas" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."push_entregas" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."push_suscripciones" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "usuario_id" uuid NOT NULL,
 "endpoint" text NOT NULL,
 "p256dh" text NOT NULL,
 "auth" text NOT NULL,
 "user_agent" text,
 "activa" bool DEFAULT true NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."push_suscripciones" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."push_suscripciones" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."whatsapp_conversaciones" (
 "telefono" text NOT NULL,
 "usuario_id" uuid,
 "nombre" text,
 "idioma" text DEFAULT 'pt-BR'::text NOT NULL,
 "estado" text DEFAULT 'idle'::text NOT NULL,
 "borrador" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "ultimo_mensaje_id" text,
 "ultimo_servicio_id" uuid,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("telefono")
);

ALTER TABLE public."whatsapp_conversaciones" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."whatsapp_conversaciones" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."whatsapp_notificaciones" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "servicio_id" uuid NOT NULL,
 "telefono" text NOT NULL,
 "evento" text NOT NULL,
 "estado_servicio" text NOT NULL,
 "mensaje" text NOT NULL,
 "estado" text DEFAULT 'pendiente'::text NOT NULL CHECK (estado = ANY (ARRAY['pendiente'::text, 'enviando'::text, 'enviada'::text, 'fallida'::text])),
 "intentos" integer DEFAULT 0 NOT NULL,
 "ultimo_error" text,
 "meta_message_id" text,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "sent_at" timestamptz,
 PRIMARY KEY ("id")
);

ALTER TABLE public."whatsapp_notificaciones" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."whatsapp_notificaciones" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."development_checklist" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "code" text NOT NULL,
 "area" text NOT NULL,
 "title" text NOT NULL,
 "description" text DEFAULT ''::text NOT NULL,
 "priority" text NOT NULL CHECK (priority = ANY (ARRAY['P0'::text, 'P1'::text, 'P2'::text, 'P3'::text])),
 "status" text DEFAULT 'pending'::text NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'implemented'::text, 'validated'::text, 'blocked'::text, 'failed'::text, 'approved'::text])),
 "weight" smallint DEFAULT 1 NOT NULL CHECK (weight >= 1 AND weight <= 10),
 "position" integer DEFAULT 0 NOT NULL,
 "evidence" text,
 "test_required" bool DEFAULT true NOT NULL,
 "completed_at" timestamptz,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 "updated_by" uuid,
 PRIMARY KEY ("id")
);

ALTER TABLE public."development_checklist" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."development_checklist" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."development_checklist_events" (
 "id" bigint NOT NULL,
 "checklist_id" uuid NOT NULL,
 "code" text NOT NULL,
 "old_status" text,
 "new_status" text NOT NULL,
 "evidence" text,
 "changed_at" timestamptz DEFAULT now() NOT NULL,
 "changed_by" uuid,
 PRIMARY KEY ("id")
);

ALTER TABLE public."development_checklist_events" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."development_checklist_events" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."development_incidents" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "fingerprint" text NOT NULL,
 "severity" text NOT NULL CHECK (severity = ANY (ARRAY['P0'::text, 'P1'::text, 'P2'::text, 'P3'::text])),
 "source_role" text DEFAULT 'unknown'::text NOT NULL CHECK (source_role = ANY (ARRAY['client'::text, 'provider'::text, 'admin'::text, 'system'::text, 'unknown'::text])),
 "event_type" text NOT NULL,
 "status" text DEFAULT 'open'::text NOT NULL CHECK (status = ANY (ARRAY['open'::text, 'acknowledged'::text, 'resolved'::text])),
 "route" text,
 "action" text,
 "service_id" uuid,
 "reporter_id" uuid,
 "checklist_code" text,
 "message" text NOT NULL,
 "stack" text,
 "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "occurrences" integer DEFAULT 1 NOT NULL CHECK (occurrences > 0),
 "first_seen_at" timestamptz DEFAULT now() NOT NULL,
 "last_seen_at" timestamptz DEFAULT now() NOT NULL,
 "resolved_at" timestamptz,
 "runtime_revision" text,
 PRIMARY KEY ("id")
);

ALTER TABLE public."development_incidents" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."development_incidents" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."development_dashboard_signal" (
 "id" smallint NOT NULL CHECK (id = 1),
 "revision" bigint DEFAULT 0 NOT NULL,
 "changed_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."development_dashboard_signal" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."development_dashboard_signal" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."preferencias_pago_cliente" (
 "usuario_id" uuid NOT NULL,
 "metodo" text NOT NULL CHECK (metodo = ANY (ARRAY['pix'::text, 'efectivo'::text])),
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("usuario_id")
);

ALTER TABLE public."preferencias_pago_cliente" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."preferencias_pago_cliente" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."servicio_estado_eventos" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "servicio_id" uuid NOT NULL,
 "actor_id" uuid,
 "actor_role" text DEFAULT 'system'::text NOT NULL,
 "estado_anterior" public."servicio_estado",
 "estado_nuevo" public."servicio_estado" NOT NULL,
 "motivo" text,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."servicio_estado_eventos" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."servicio_estado_eventos" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."prospectos_scouts" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "external_id" text,
 "nombre" text NOT NULL,
 "categoria" text NOT NULL,
 "telefono" text,
 "email" text,
 "website" text,
 "direccion" text,
 "ciudad" text,
 "pais" character DEFAULT 'BR'::bpchar NOT NULL,
 "latitud" double precision,
 "longitud" double precision,
 "fuente" text DEFAULT 'scout'::text NOT NULL,
 "score_confianza" integer DEFAULT 0 NOT NULL CHECK (score_confianza >= 0 AND score_confianza <= 100),
 "estado" text DEFAULT 'prospecto_pendiente'::text NOT NULL CHECK (estado = ANY (ARRAY['prospecto_pendiente'::text, 'invitado'::text, 'aprobado'::text, 'rechazado'::text])),
 "notas_hugo" text,
 "creado_por" uuid,
 "contactado_at" timestamptz,
 "aprobado_at" timestamptz,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 "pipeline_etapa" text DEFAULT 'nuevo'::text NOT NULL CHECK (pipeline_etapa = ANY (ARRAY['nuevo'::text, 'listo'::text, 'contactado'::text, 'respondio'::text, 'interesado'::text, 'registro_iniciado'::text, 'documentos_pendientes'::text, 'aprobado'::text, 'activo'::text, 'no_interesado'::text])),
 "recruitment_score" integer DEFAULT 0 NOT NULL CHECK (recruitment_score >= 0 AND recruitment_score <= 100),
 "contactos_intentos" integer DEFAULT 0 NOT NULL CHECK (contactos_intentos >= 0),
 "ultimo_canal" text,
 "ultimo_contacto_at" timestamptz,
 "proximo_contacto_at" timestamptz,
 "no_contactar" bool DEFAULT false NOT NULL,
 "invitation_token" uuid DEFAULT gen_random_uuid(),
 "invitation_expires_at" timestamptz,
 "invitation_revoked_at" timestamptz,
 "invitation_opened_at" timestamptz,
 "invitation_claimed_at" timestamptz,
 "converted_user_id" uuid,
 "source_campaign_id" uuid,
 "email_source" text,
 "email_verified" bool DEFAULT false NOT NULL,
 "email_last_seen_at" timestamptz,
 PRIMARY KEY ("id")
);

ALTER TABLE public."prospectos_scouts" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."prospectos_scouts" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."deudas_ugo_proveedor" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "pago_id" uuid NOT NULL,
 "servicio_id" uuid NOT NULL,
 "proveedor_id" uuid NOT NULL,
 "monto_servicio" numeric NOT NULL CHECK (monto_servicio >= 0::numeric),
 "comision_ugo" numeric NOT NULL CHECK (comision_ugo >= 0::numeric),
 "monto_pagado_ugo" numeric DEFAULT 0 NOT NULL CHECK (monto_pagado_ugo >= 0::numeric),
 "saldo_pendiente" numeric DEFAULT GREATEST((comision_ugo - monto_pagado_ugo), (0)::numeric),
 "moneda" character DEFAULT 'BRL'::bpchar NOT NULL,
 "ambiente" text DEFAULT 'real'::text NOT NULL CHECK (ambiente = ANY (ARRAY['real'::text, 'demo'::text])),
 "estado" text DEFAULT 'pendiente'::text NOT NULL CHECK (estado = ANY (ARRAY['pendiente'::text, 'informado'::text, 'parcial'::text, 'pagado'::text, 'anulado'::text])),
 "referencia_pago" text,
 "pago_informado_at" timestamptz,
 "pagado_at" timestamptz,
 "notas" text,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."deudas_ugo_proveedor" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."deudas_ugo_proveedor" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."proveedor_calendar_conexiones" (
 "proveedor_id" uuid NOT NULL,
 "google_email" text,
 "calendar_id" text DEFAULT 'primary'::text NOT NULL,
 "refresh_token" text NOT NULL,
 "scope" text,
 "connected_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("proveedor_id")
);

ALTER TABLE public."proveedor_calendar_conexiones" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."proveedor_calendar_conexiones" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."proveedor_calendar_eventos" (
 "servicio_id" uuid NOT NULL,
 "proveedor_id" uuid NOT NULL,
 "google_event_id" text NOT NULL,
 "event_etag" text,
 "last_action" text DEFAULT 'created'::text NOT NULL CHECK (last_action = ANY (ARRAY['created'::text, 'updated'::text, 'deleted'::text, 'error'::text])),
 "last_error" text,
 "synced_at" timestamptz DEFAULT now() NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("servicio_id")
);

ALTER TABLE public."proveedor_calendar_eventos" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."proveedor_calendar_eventos" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."reglas_motivos_disputa" (
 "codigo" text NOT NULL,
 "actor" text NOT NULL CHECK (actor = ANY (ARRAY['cliente'::text, 'proveedor'::text, 'ambos'::text])),
 "etiqueta" text NOT NULL,
 "severidad" text NOT NULL CHECK (severidad = ANY (ARRAY['baja'::text, 'media'::text, 'alta'::text])),
 "requiere_humano" bool DEFAULT false NOT NULL,
 "ventana_horas" integer DEFAULT 48 NOT NULL CHECK (ventana_horas >= 1 AND ventana_horas <= 720),
 "evidencia_sugerida" text,
 "activo" bool DEFAULT true NOT NULL,
 "criterio_resolucion" text DEFAULT 'Revisar evidencia verificable del mismo serviceId y pedir información adicional cuando falte contexto.'::text NOT NULL,
 "resultado_preferido" text DEFAULT 'solicitar_evidencia'::text NOT NULL CHECK (resultado_preferido = ANY (ARRAY['confirmar_servicio'::text, 'retrabajo'::text, 'reagendar'::text, 'ajuste_financiero'::text, 'reembolso'::text, 'penalizacion'::text, 'revision_humana'::text, 'solicitar_evidencia'::text, 'acuerdo'::text])),
 "auto_aplicar" bool DEFAULT false NOT NULL CHECK (auto_aplicar = false),
 PRIMARY KEY ("codigo")
);

ALTER TABLE public."reglas_motivos_disputa" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."reglas_motivos_disputa" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."acuerdos_previos_disputa" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "servicio_id" uuid NOT NULL,
 "propuesto_por" uuid NOT NULL,
 "tipo" text NOT NULL CHECK (tipo = ANY (ARRAY['retrabajo'::text, 'ajuste_precio'::text, 'reagendar'::text, 'otro'::text])),
 "detalle" text NOT NULL CHECK (length(TRIM(BOTH FROM detalle)) >= 8 AND length(TRIM(BOTH FROM detalle)) <= 1200),
 "monto" numeric CHECK (monto IS NULL OR monto >= 0::numeric),
 "estado" text DEFAULT 'propuesto'::text NOT NULL CHECK (estado = ANY (ARRAY['propuesto'::text, 'aceptado'::text, 'rechazado'::text, 'cancelado'::text, 'escalado'::text])),
 "respondido_por" uuid,
 "respuesta" text,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "responded_at" timestamptz,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."acuerdos_previos_disputa" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."acuerdos_previos_disputa" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."disputa_ai_analisis" (
 "disputa_id" uuid NOT NULL,
 "modelo" text NOT NULL,
 "resultado" jsonb NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("disputa_id")
);

ALTER TABLE public."disputa_ai_analisis" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."disputa_ai_analisis" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."scout_campaigns" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "nombre" text NOT NULL,
 "categoria" text,
 "zona" text,
 "canal" text DEFAULT 'mixto'::text NOT NULL CHECK (canal = ANY (ARRAY['whatsapp'::text, 'email'::text, 'mixto'::text])),
 "asunto" text,
 "mensaje" text DEFAULT ''::text NOT NULL,
 "estado" text DEFAULT 'borrador'::text NOT NULL CHECK (estado = ANY (ARRAY['borrador'::text, 'activa'::text, 'pausada'::text, 'completada'::text])),
 "created_by" uuid,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."scout_campaigns" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."scout_campaigns" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."scout_campaign_members" (
 "campaign_id" uuid NOT NULL,
 "prospecto_id" uuid NOT NULL,
 "estado" text DEFAULT 'pendiente'::text NOT NULL CHECK (estado = ANY (ARRAY['pendiente'::text, 'enviado'::text, 'respondio'::text, 'interesado'::text, 'convertido'::text, 'omitido'::text, 'error'::text])),
 "ultimo_envio_at" timestamptz,
 "respuesta_at" timestamptz,
 "conversion_at" timestamptz,
 "error" text,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("campaign_id", "prospecto_id")
);

ALTER TABLE public."scout_campaign_members" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."scout_campaign_members" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."scout_contact_events" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "prospecto_id" uuid NOT NULL,
 "campaign_id" uuid,
 "canal" text DEFAULT 'sistema'::text NOT NULL,
 "tipo" text NOT NULL,
 "direccion" text DEFAULT 'system'::text NOT NULL CHECK (direccion = ANY (ARRAY['out'::text, 'in'::text, 'system'::text])),
 "estado" text,
 "mensaje" text,
 "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "actor_id" uuid,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."scout_contact_events" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."scout_contact_events" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."scout_gmail_conexiones" (
 "id" text DEFAULT 'primary'::text NOT NULL CHECK (id = 'primary'::text),
 "google_email" text NOT NULL,
 "refresh_token" text NOT NULL,
 "scope" text,
 "connected_by" uuid,
 "connected_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."scout_gmail_conexiones" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."scout_gmail_conexiones" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."scout_email_envios" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "prospecto_id" uuid,
 "to_email" text NOT NULL,
 "subject" text NOT NULL,
 "gmail_message_id" text,
 "gmail_thread_id" text,
 "estado" text DEFAULT 'sent'::text NOT NULL CHECK (estado = ANY (ARRAY['sent'::text, 'failed'::text])),
 "error" text,
 "sent_by" uuid,
 "sent_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."scout_email_envios" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."scout_email_envios" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."ip_innovations" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "title" text NOT NULL CHECK (btrim(title) <> ''::text),
 "description" text DEFAULT ''::text NOT NULL,
 "department_id" integer NOT NULL CHECK (department_id = ANY (ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14])),
 "creator_id" uuid NOT NULL,
 "contributors" jsonb DEFAULT '[]'::jsonb NOT NULL,
 "innovation_type" text DEFAULT 'OTHER'::text NOT NULL,
 "possible_protection" text NOT NULL CHECK (possible_protection = ANY (ARRAY['TRADEMARK'::text, 'COPYRIGHT'::text, 'SOFTWARE_REGISTRATION'::text, 'PATENTABILITY_REVIEW'::text, 'TRADE_SECRET'::text, 'CONTRACT'::text, 'NONE'::text, 'LEGAL_REVIEW'::text])),
 "confidentiality" text DEFAULT 'INTERNAL'::text NOT NULL CHECK (confidentiality = ANY (ARRAY['PUBLIC'::text, 'INTERNAL'::text, 'CONFIDENTIAL'::text, 'STRICTLY_CONFIDENTIAL'::text])),
 "status" text DEFAULT 'DRAFT'::text NOT NULL CHECK (status = ANY (ARRAY['DRAFT'::text, 'IP_REVIEW_REQUIRED'::text, 'UNDER_REVIEW'::text, 'PROTECTION_RECOMMENDED'::text, 'CONFIDENTIAL'::text, 'CLEARED_FOR_DISCLOSURE'::text, 'EXTERNAL_COUNSEL_REQUIRED'::text, 'REJECTED'::text, 'ARCHIVED'::text])),
 "legal_protection_status" text DEFAULT 'POTENTIAL'::text NOT NULL CHECK (legal_protection_status = ANY (ARRAY['POTENTIAL'::text, 'RECOMMENDED'::text, 'FILED'::text, 'REGISTERED'::text, 'GRANTED'::text])),
 "target_jurisdictions" text[] DEFAULT ARRAY['BR'::text] NOT NULL,
 "repository" text,
 "commit_sha" text,
 "technical_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "product_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "legal_notes" text,
 "decision_reason" text,
 "reviewed_by" uuid,
 "reviewed_at" timestamptz,
 "version" bigint DEFAULT 1 NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."ip_innovations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."ip_innovations" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."ip_evidence_ledger" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "innovation_id" uuid NOT NULL,
 "evidence_type" text NOT NULL,
 "reference" text NOT NULL,
 "evidence_hash" text,
 "version" text,
 "author_id" uuid,
 "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "evidence_key" text DEFAULT COALESCE(evidence_hash, ''::text),
 PRIMARY KEY ("id")
);

ALTER TABLE public."ip_evidence_ledger" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."ip_evidence_ledger" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."ip_gate_decisions" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "innovation_id" uuid NOT NULL,
 "intended_action" text NOT NULL CHECK (intended_action = ANY (ARRAY['PUBLIC_RELEASE'::text, 'PUBLIC_DOCUMENTATION'::text, 'MARKETING_DISCLOSURE'::text, 'EXTERNAL_DEMO'::text, 'OPEN_SOURCE_PUBLICATION'::text, 'EXTERNAL_PARTNER_DISCLOSURE'::text])),
 "decision" text NOT NULL CHECK (decision = ANY (ARRAY['ALLOW'::text, 'REVIEW_REQUIRED'::text, 'BLOCK_DISCLOSURE'::text, 'EXTERNAL_COUNSEL_REQUIRED'::text])),
 "reason" text NOT NULL,
 "policy_version" text DEFAULT 'IP_GATE_V1'::text NOT NULL,
 "evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
 "evaluated_by" uuid,
 "idempotency_key" text NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."ip_gate_decisions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."ip_gate_decisions" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."ip_audit_findings" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "innovation_id" uuid,
 "finding_type" text NOT NULL,
 "severity" text NOT NULL CHECK (severity = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])),
 "description" text NOT NULL,
 "status" text DEFAULT 'OPEN'::text NOT NULL CHECK (status = ANY (ARRAY['OPEN'::text, 'REMEDIATING'::text, 'CLOSED'::text])),
 "detected_by" uuid,
 "closed_by" uuid,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "closed_at" timestamptz,
 PRIMARY KEY ("id")
);

ALTER TABLE public."ip_audit_findings" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."ip_audit_findings" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_company_state" (
 "singleton" bool DEFAULT true NOT NULL CHECK (singleton),
 "mode" text DEFAULT 'OFF'::text NOT NULL CHECK (mode = ANY (ARRAY['OFF'::text, 'SHADOW'::text, 'ON'::text, 'SAFE_MODE'::text])),
 "reason" text,
 "policy_version" text DEFAULT 'AUTONOMOUS_CORP_V1'::text NOT NULL,
 "updated_by" uuid,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("singleton")
);

ALTER TABLE public."autonomous_company_state" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_company_state" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_departments" (
 "department_id" integer NOT NULL CHECK (department_id = ANY (ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14])),
 "name" text NOT NULL,
 "objective" text NOT NULL,
 "status" text DEFAULT 'IDLE'::text NOT NULL CHECK (status = ANY (ARRAY['IDLE'::text, 'ACTIVE'::text, 'DEGRADED'::text, 'BLOCKED'::text, 'SAFE_MODE'::text])),
 "sla_minutes" integer,
 "health" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "last_action_at" timestamptz,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("department_id")
);

ALTER TABLE public."autonomous_departments" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_departments" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_agents" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "department_id" integer NOT NULL,
 "agent_key" text NOT NULL,
 "name" text NOT NULL,
 "capability" text NOT NULL,
 "authority_class" text NOT NULL CHECK (authority_class = ANY (ARRAY['GREEN'::text, 'YELLOW'::text, 'RED'::text])),
 "status" text DEFAULT 'IDLE'::text NOT NULL CHECK (status = ANY (ARRAY['IDLE'::text, 'QUEUED'::text, 'RUNNING'::text, 'BLOCKED'::text, 'SAFE_MODE'::text, 'DISABLED'::text])),
 "model_provider" text,
 "model_id" text,
 "permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
 "last_action_at" timestamptz,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_agents" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_agents" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_jobs" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "department_id" integer NOT NULL,
 "agent_id" uuid,
 "objective" text NOT NULL,
 "trigger_type" text DEFAULT 'MANUAL'::text NOT NULL,
 "target_type" text,
 "target_id" text,
 "service_id" uuid,
 "authority_class" text NOT NULL CHECK (authority_class = ANY (ARRAY['GREEN'::text, 'YELLOW'::text, 'RED'::text])),
 "status" text DEFAULT 'QUEUED'::text NOT NULL CHECK (status = ANY (ARRAY['QUEUED'::text, 'RUNNING'::text, 'WAITING_APPROVAL'::text, 'BLOCKED'::text, 'SUCCEEDED'::text, 'FAILED'::text, 'CANCELLED'::text])),
 "idempotency_key" text NOT NULL,
 "correlation_id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "input_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
 "result" jsonb,
 "blocked_reason" text,
 "created_by" uuid,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "started_at" timestamptz,
 "finished_at" timestamptz,
 "data_quality_status" text DEFAULT 'PENDING'::text NOT NULL CHECK (data_quality_status = ANY (ARRAY['PENDING'::text, 'TRUSTED'::text, 'DATA_UNTRUSTED'::text])),
 "lease_owner" text,
 "lease_expires_at" timestamptz,
 "attempt_count" integer DEFAULT 0 NOT NULL CHECK (attempt_count >= 0),
 "max_attempts" integer DEFAULT 3 NOT NULL CHECK (max_attempts >= 1 AND max_attempts <= 20),
 "failure_reason" text,
 "next_attempt_at" timestamptz,
 "capability" text,
 "data_quality_assessment" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "action_id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "policy_version" text DEFAULT 'AUTONOMOUS_CORP_V1'::text NOT NULL,
 "model_provider" text,
 "model_id" text,
 "estimated_cost" numeric DEFAULT 0 NOT NULL CHECK (estimated_cost >= 0::numeric),
 "actual_cost" numeric DEFAULT 0 NOT NULL CHECK (actual_cost >= 0::numeric),
 "authorization_decision" text,
 "execution_result" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "verification_result" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "approval_count" integer DEFAULT 0 NOT NULL CHECK (approval_count >= 0),
 "first_approved_by" uuid,
 "first_approved_at" timestamptz,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_jobs" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_jobs" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_decision_ledger" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "job_id" uuid,
 "department_id" integer NOT NULL,
 "agent_id" uuid,
 "decision" text NOT NULL,
 "reason" text NOT NULL,
 "authority_class" text NOT NULL CHECK (authority_class = ANY (ARRAY['GREEN'::text, 'YELLOW'::text, 'RED'::text])),
 "policy_version" text NOT NULL,
 "evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
 "authorization_result" text NOT NULL,
 "correlation_id" uuid NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_decision_ledger" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_decision_ledger" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_evidence_ledger" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "job_id" uuid,
 "evidence_type" text NOT NULL,
 "reference" text NOT NULL,
 "evidence_hash" text,
 "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "correlation_id" uuid NOT NULL,
 "created_by" uuid,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_evidence_ledger" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_evidence_ledger" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_kill_switches" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "scope_type" text NOT NULL CHECK (scope_type = ANY (ARRAY['GLOBAL'::text, 'DEPARTMENT'::text, 'AGENT'::text, 'CAPABILITY'::text])),
 "scope_key" text NOT NULL,
 "enabled" bool DEFAULT false NOT NULL,
 "reason" text,
 "activated_by" uuid,
 "activated_at" timestamptz,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_kill_switches" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_kill_switches" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_audit_findings" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "department_id" integer,
 "job_id" uuid,
 "finding_type" text NOT NULL,
 "severity" text NOT NULL CHECK (severity = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])),
 "description" text NOT NULL,
 "status" text DEFAULT 'OPEN'::text NOT NULL CHECK (status = ANY (ARRAY['OPEN'::text, 'REMEDIATING'::text, 'CLOSED'::text])),
 "detected_by_department" integer DEFAULT 14 NOT NULL CHECK (detected_by_department = 14),
 "owner_department" integer,
 "closure_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
 "closed_by" uuid,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "closed_at" timestamptz,
 "remediation_deadline" timestamptz,
 "remediation_summary" text,
 "reaudit_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
 "reaudit_by_agent" uuid,
 "re_audited_by" uuid,
 "re_audited_at" timestamptz,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_audit_findings" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_audit_findings" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_qa_scenarios" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "scenario_key" text NOT NULL,
 "source_type" text NOT NULL CHECK (source_type = ANY (ARRAY['CHANGE'::text, 'INCIDENT'::text, 'INDUSTRY_CASE'::text, 'REGRESSION'::text])),
 "title" text NOT NULL,
 "description" text NOT NULL,
 "target_role" text NOT NULL CHECK (target_role = ANY (ARRAY['CLIENT'::text, 'PROVIDER'::text, 'ADMIN'::text, 'SYSTEM'::text, 'CROSS_ROLE'::text])),
 "service_id" uuid,
 "deterministic_judge" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "chaos_profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "seeded_defect" bool DEFAULT false NOT NULL,
 "status" text DEFAULT 'ACTIVE'::text NOT NULL CHECK (status = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'RETIRED'::text])),
 "created_by" uuid,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 "coverage_key" text,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_qa_scenarios" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_qa_scenarios" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_qa_runs" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "scenario_id" uuid NOT NULL,
 "correlation_id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "status" text DEFAULT 'QUEUED'::text NOT NULL CHECK (status = ANY (ARRAY['QUEUED'::text, 'RUNNING'::text, 'PASSED'::text, 'FAILED'::text, 'BLOCKED'::text])),
 "simulator_results" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "chaos_result" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "judge_result" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "diagnosis" text,
 "remediation_request" text,
 "permanent_regression" bool DEFAULT false NOT NULL,
 "started_at" timestamptz,
 "finished_at" timestamptz,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "judge_agent_id" uuid,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_qa_runs" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_qa_runs" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_quality_coverage" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "coverage_key" text NOT NULL,
 "domain" text NOT NULL,
 "requirement" text NOT NULL,
 "scenario_id" uuid,
 "last_run_id" uuid,
 "status" text DEFAULT 'UNCOVERED'::text NOT NULL CHECK (status = ANY (ARRAY['UNCOVERED'::text, 'COVERED'::text, 'FAILING'::text, 'BLOCKED'::text])),
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_quality_coverage" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_quality_coverage" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_release_gate" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "gate_key" text NOT NULL,
 "status" text DEFAULT 'BLOCKED'::text NOT NULL CHECK (status = ANY (ARRAY['BLOCKED'::text, 'READY'::text])),
 "blockers" jsonb DEFAULT '[]'::jsonb NOT NULL,
 "evaluated_at" timestamptz DEFAULT now() NOT NULL,
 "evaluated_by" uuid,
 "meta_qa_validated" bool DEFAULT false NOT NULL,
 "meta_qa_run_id" uuid,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_release_gate" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_release_gate" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_qa_simulators" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "simulator_key" text NOT NULL,
 "role" text NOT NULL CHECK (role = ANY (ARRAY['CLIENT'::text, 'PROVIDER'::text, 'ADMIN'::text, 'SYSTEM'::text])),
 "name" text NOT NULL,
 "capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
 "status" text DEFAULT 'ACTIVE'::text NOT NULL CHECK (status = ANY (ARRAY['ACTIVE'::text, 'DISABLED'::text])),
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_qa_simulators" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_qa_simulators" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_enterprise_risks" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "risk_key" text NOT NULL,
 "domain" text NOT NULL,
 "description" text NOT NULL,
 "likelihood" text NOT NULL CHECK (likelihood = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text])),
 "impact" text NOT NULL CHECK (impact = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])),
 "owner_department" integer,
 "mitigation" text,
 "status" text DEFAULT 'OPEN'::text NOT NULL CHECK (status = ANY (ARRAY['OPEN'::text, 'MITIGATING'::text, 'ACCEPTED'::text, 'CLOSED'::text])),
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_enterprise_risks" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_enterprise_risks" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_control_coverage" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "control_key" text NOT NULL,
 "domain" text NOT NULL,
 "control_description" text NOT NULL,
 "owner_department" integer,
 "auditor_agent_id" uuid,
 "status" text DEFAULT 'UNVERIFIED'::text NOT NULL CHECK (status = ANY (ARRAY['UNVERIFIED'::text, 'EFFECTIVE'::text, 'INEFFECTIVE'::text, 'BLOCKED'::text])),
 "last_verified_at" timestamptz,
 "evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_control_coverage" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_control_coverage" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_challenges" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "challenge_type" text NOT NULL CHECK (challenge_type = ANY (ARRAY['DIGITAL_TWIN'::text, 'RED_TEAM'::text, 'META_AUDIT'::text, 'FOUNDER_CHALLENGE'::text])),
 "title" text NOT NULL,
 "hypothesis" text NOT NULL,
 "scenario" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "status" text DEFAULT 'PLANNED'::text NOT NULL CHECK (status = ANY (ARRAY['PLANNED'::text, 'RUNNING'::text, 'PASSED'::text, 'FAILED'::text, 'BLOCKED'::text])),
 "result" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "correlation_id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "finished_at" timestamptz,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_challenges" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_challenges" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_experience_signals" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "actor_role" text NOT NULL CHECK (actor_role = ANY (ARRAY['CLIENT'::text, 'PROVIDER'::text])),
 "service_id" uuid,
 "signal_type" text NOT NULL,
 "privacy_safe_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "source" text NOT NULL,
 "correlation_id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_experience_signals" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_experience_signals" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_experience_patterns" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "pattern_key" text NOT NULL,
 "actor_role" text NOT NULL CHECK (actor_role = ANY (ARRAY['CLIENT'::text, 'PROVIDER'::text, 'BOTH'::text])),
 "hypothesis" text NOT NULL,
 "signal_count" integer DEFAULT 0 NOT NULL,
 "qa_scenario_id" uuid,
 "status" text DEFAULT 'OBSERVED'::text NOT NULL CHECK (status = ANY (ARRAY['OBSERVED'::text, 'TESTING'::text, 'CONFIRMED'::text, 'REJECTED'::text, 'REMEDIATING'::text, 'MEASURING'::text, 'CLOSED'::text])),
 "pre_metric" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "post_metric" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_experience_patterns" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_experience_patterns" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_model_candidates" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "provider" text NOT NULL,
 "model_id" text NOT NULL,
 "free_tier" bool DEFAULT false NOT NULL,
 "eligible" bool DEFAULT false NOT NULL,
 "benchmark_score" numeric,
 "benchmark_threshold" numeric DEFAULT 0.8 NOT NULL,
 "availability" text DEFAULT 'UNKNOWN'::text NOT NULL CHECK (availability = ANY (ARRAY['UNKNOWN'::text, 'AVAILABLE'::text, 'DEGRADED'::text, 'UNAVAILABLE'::text])),
 "last_benchmarked_at" timestamptz,
 "last_error" text,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_model_candidates" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_model_candidates" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_model_routes" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "task_class" text NOT NULL,
 "primary_candidate_id" uuid,
 "fallback_candidate_id" uuid,
 "max_cost" numeric DEFAULT 0 NOT NULL CHECK (max_cost >= 0::numeric),
 "status" text DEFAULT 'UNCONFIGURED'::text NOT NULL CHECK (status = ANY (ARRAY['UNCONFIGURED'::text, 'READY'::text, 'DEGRADED'::text, 'DISABLED'::text])),
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_model_routes" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_model_routes" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_model_metrics" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "candidate_id" uuid NOT NULL,
 "task_class" text NOT NULL,
 "correlation_id" uuid NOT NULL,
 "quality_score" numeric,
 "latency_ms" integer CHECK (latency_ms >= 0),
 "success" bool NOT NULL,
 "cost" numeric DEFAULT 0 NOT NULL CHECK (cost >= 0::numeric),
 "failure_code" text,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_model_metrics" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_model_metrics" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."ugo_empresas_readiness" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "product_key" text DEFAULT 'UGO_EMPRESAS'::text NOT NULL,
 "owner_department_id" integer DEFAULT 12 NOT NULL CHECK (owner_department_id = 12),
 "stage" text DEFAULT 'SPEC'::text NOT NULL CHECK (stage = ANY (ARRAY['SPEC'::text, 'ISOLATED_IMPLEMENTATION'::text, 'TEST_LOAD'::text, 'CROSS_FUNCTION_VALIDATION'::text, 'QA_GATE'::text, 'PILOT_READY'::text, 'PILOT'::text, 'PRODUCTION_AUTHORIZED'::text])),
 "status" text DEFAULT 'BLOCKED'::text NOT NULL CHECK (status = ANY (ARRAY['BLOCKED'::text, 'IN_PROGRESS'::text, 'READY'::text])),
 "blockers" jsonb DEFAULT '["CUSTOMER_1_CORE_NOT_STABLE"]'::jsonb NOT NULL,
 "metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 "updated_by" uuid,
 PRIMARY KEY ("id")
);

ALTER TABLE public."ugo_empresas_readiness" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."ugo_empresas_readiness" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."ugo_empresas_demands" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "company_ref" text NOT NULL,
 "skill" text NOT NULL,
 "quantity" integer NOT NULL CHECK (quantity > 0),
 "place" text NOT NULL,
 "starts_at" timestamptz NOT NULL,
 "duration_minutes" integer NOT NULL CHECK (duration_minutes > 0),
 "requirements" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "status" text DEFAULT 'DRAFT'::text NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."ugo_empresas_demands" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."ugo_empresas_demands" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."ugo_empresas_slots" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "demand_id" uuid NOT NULL,
 "slot_index" integer NOT NULL,
 "provider_id" uuid,
 "backup_provider_id" uuid,
 "status" text DEFAULT 'OPEN'::text NOT NULL,
 "reconfirmed_at" timestamptz,
 "checked_in_at" timestamptz,
 "validated_minutes" integer,
 "replacement_reason" text,
 PRIMARY KEY ("id")
);

ALTER TABLE public."ugo_empresas_slots" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."ugo_empresas_slots" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_recovery_audits" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "scope_type" text NOT NULL,
 "scope_key" text NOT NULL,
 "verification" jsonb NOT NULL,
 "re_audited_by" uuid NOT NULL,
 "decision" text NOT NULL CHECK (decision = ANY (ARRAY['RECOVER'::text, 'KEEP_CONTAINED'::text])),
 "reason" text NOT NULL,
 "evidence_hash" text NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_recovery_audits" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_recovery_audits" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_ip_evidence_links" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "innovation_id" uuid NOT NULL,
 "department_id" integer NOT NULL CHECK (department_id = ANY (ARRAY[8, 12, 14])),
 "evidence_type" text NOT NULL,
 "reference" text NOT NULL,
 "evidence_hash" text NOT NULL,
 "legal_claim" bool DEFAULT false NOT NULL CHECK (legal_claim = false),
 "created_by" uuid,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_ip_evidence_links" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_ip_evidence_links" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_service_event_bindings" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "service_id" uuid NOT NULL,
 "event_type" text NOT NULL,
 "department_id" integer NOT NULL,
 "agent_id" uuid,
 "job_id" uuid,
 "source_reference" text NOT NULL,
 "correlation_id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_service_event_bindings" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_service_event_bindings" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_qa_remediations" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "scenario_id" uuid NOT NULL,
 "failed_run_id" uuid NOT NULL,
 "status" text DEFAULT 'OPEN'::text NOT NULL CHECK (status = ANY (ARRAY['OPEN'::text, 'FIXED'::text, 'VERIFIED'::text])),
 "owner_department" integer NOT NULL,
 "diagnosis" text NOT NULL,
 "requested_fix" text NOT NULL,
 "rerun_id" uuid,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "verified_at" timestamptz,
 "correlation_id" uuid,
 "fix_applied_at" timestamptz,
 "fix_evidence" jsonb,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_qa_remediations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_qa_remediations" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_capability_registry" (
 "capability_key" text NOT NULL,
 "department_id" integer NOT NULL,
 "authority_class" text NOT NULL CHECK (authority_class = ANY (ARRAY['GREEN'::text, 'YELLOW'::text, 'RED'::text])),
 "executor_kind" text NOT NULL CHECK (executor_kind = 'DETERMINISTIC'::text),
 "safe_mode_allowed" bool DEFAULT false NOT NULL,
 "enabled" bool DEFAULT true NOT NULL,
 "input_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "verification_policy" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("capability_key")
);

ALTER TABLE public."autonomous_capability_registry" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_capability_registry" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_meta_qa_calibrations" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "scenario_id" uuid NOT NULL,
 "service_id" uuid NOT NULL,
 "baseline_run_id" uuid NOT NULL,
 "seeded_run_id" uuid NOT NULL,
 "rerun_id" uuid NOT NULL,
 "job_id" uuid NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_meta_qa_calibrations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_meta_qa_calibrations" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_agent_consultations" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "agent_id" uuid NOT NULL,
 "actor_id" uuid NOT NULL,
 "correlation_id" uuid NOT NULL,
 "task_class" text NOT NULL CHECK (task_class = 'AGENT_CONSULTATION'::text),
 "question_hash" text NOT NULL CHECK (length(question_hash) = 64),
 "answer_hash" text CHECK (answer_hash IS NULL OR length(answer_hash) = 64),
 "evidence_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "provider" text,
 "model_id" text,
 "success" bool NOT NULL,
 "failure_code" text,
 "latency_ms" integer CHECK (latency_ms IS NULL OR latency_ms >= 0),
 "cost" numeric DEFAULT 0 NOT NULL CHECK (cost >= 0::numeric),
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_agent_consultations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_agent_consultations" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_qa_assertion_evidence" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "scenario_id" uuid NOT NULL,
 "run_id" uuid NOT NULL,
 "service_id" uuid NOT NULL,
 "assertion_key" text NOT NULL,
 "expected" jsonb NOT NULL,
 "observed" jsonb NOT NULL,
 "passed" bool NOT NULL,
 "source" text NOT NULL CHECK (source = ANY (ARRAY['AUTHENTICATED_RUNTIME'::text, 'PERSISTED_STATE'::text, 'REALTIME_RUNTIME'::text])),
 "evidence_hash" text NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_qa_assertion_evidence" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_qa_assertion_evidence" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_runtime_revisions" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "workflow" text NOT NULL,
 "source_sha" text NOT NULL CHECK (source_sha ~ '^[0-9a-f]{40}$'::text),
 "source_ref" text,
 "run_id" text,
 "run_attempt" integer,
 "environment" text NOT NULL CHECK (environment = 'UGO_TEST'::text),
 "verification" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_runtime_revisions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_runtime_revisions" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_qa_actor_actions" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "service_id" uuid NOT NULL,
 "simulator_id" uuid NOT NULL,
 "simulator_key" text NOT NULL,
 "simulator_role" text NOT NULL CHECK (simulator_role = ANY (ARRAY['CLIENT'::text, 'PROVIDER'::text, 'ADMIN'::text])),
 "actor_user_id" uuid NOT NULL,
 "actor_user_type" text NOT NULL,
 "action_key" text NOT NULL,
 "result_snapshot" jsonb NOT NULL,
 "correlation_id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_qa_actor_actions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_qa_actor_actions" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."autonomous_action_artifacts" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "job_id" uuid NOT NULL,
 "department_id" integer NOT NULL,
 "agent_id" uuid NOT NULL,
 "action_type" text NOT NULL,
 "execution_channel" text NOT NULL,
 "effect_scope" text DEFAULT 'INTERNAL_WORK_ORDER'::text NOT NULL,
 "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "status" text DEFAULT 'DISPATCHED'::text NOT NULL CHECK (status = ANY (ARRAY['DISPATCHED'::text, 'COMPLETED'::text, 'FAILED'::text, 'CANCELLED'::text])),
 "correlation_id" uuid NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "completed_at" timestamptz,
 PRIMARY KEY ("id")
);

ALTER TABLE public."autonomous_action_artifacts" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."autonomous_action_artifacts" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."proveedor_referencias_laborales" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "proveedor_id" uuid NOT NULL,
 "nombre" text NOT NULL CHECK (char_length(TRIM(BOTH FROM nombre)) >= 2 AND char_length(TRIM(BOTH FROM nombre)) <= 120),
 "relacion" text NOT NULL CHECK (char_length(TRIM(BOTH FROM relacion)) >= 2 AND char_length(TRIM(BOTH FROM relacion)) <= 80),
 "contacto" text NOT NULL CHECK (char_length(TRIM(BOTH FROM contacto)) >= 4 AND char_length(TRIM(BOTH FROM contacto)) <= 180),
 "autorizado_contacto" bool DEFAULT false NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."proveedor_referencias_laborales" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."proveedor_referencias_laborales" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."proveedor_zonas_activas" (
 "proveedor_id" uuid NOT NULL,
 "zona" text NOT NULL CHECK (length(zona) >= 2 AND length(zona) <= 100),
 "lat" double precision NOT NULL CHECK (lat >= '-90'::integer::double precision AND lat <= 90::double precision),
 "lng" double precision NOT NULL CHECK (lng >= '-180'::integer::double precision AND lng <= 180::double precision),
 "principal" bool DEFAULT false NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("proveedor_id", "zona")
);

ALTER TABLE public."proveedor_zonas_activas" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."proveedor_zonas_activas" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."config_validacion_pais" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "codigo_iso" text NOT NULL CHECK (codigo_iso ~ '^[A-Z]{2}$'::text),
 "pais" text NOT NULL,
 "activo" bool DEFAULT false NOT NULL,
 "docs_requeridos" text[] DEFAULT '{}'::text[] NOT NULL,
 "reglas_ocr" jsonb DEFAULT '{"docs": {}}'::jsonb NOT NULL CHECK (jsonb_typeof(reglas_ocr) = 'object'::text),
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("id")
);

ALTER TABLE public."config_validacion_pais" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."config_validacion_pais" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."hive_model_reservations" (
 "request_id" uuid NOT NULL,
 "actor_id" uuid NOT NULL,
 "mission_id" uuid NOT NULL,
 "provider" text NOT NULL CHECK (provider = ANY (ARRAY['freellmapi'::text, 'openrouter'::text])),
 "day" date DEFAULT ((now() AT TIME ZONE 'UTC'::text))::date NOT NULL,
 "tokens" integer NOT NULL CHECK (tokens >= 1 AND tokens <= 2048),
 "state" text DEFAULT 'RESERVED'::text NOT NULL CHECK (state = ANY (ARRAY['RESERVED'::text, 'SUCCEEDED'::text, 'FAILED'::text])),
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("request_id")
);

ALTER TABLE public."hive_model_reservations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."hive_model_reservations" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."hive_provider_circuits" (
 "provider" text NOT NULL CHECK (provider = ANY (ARRAY['freellmapi'::text, 'openrouter'::text])),
 "failures" integer DEFAULT 0 NOT NULL,
 "blocked_until" timestamptz,
 PRIMARY KEY ("provider")
);

ALTER TABLE public."hive_provider_circuits" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."hive_provider_circuits" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."hive_backup_versions" (
 "version" uuid NOT NULL,
 "object_key" text NOT NULL CHECK (object_key ~ '^snapshots/[0-9a-f-]{36}$'::text),
 "sha256" text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'::text),
 "bytes" integer NOT NULL CHECK (bytes >= 37 AND bytes <= 8388608),
 "sequence" bigint NOT NULL,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY ("version")
);

ALTER TABLE public."hive_backup_versions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."hive_backup_versions" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."hive_backup_cleanup" (
 "object_key" text NOT NULL CHECK (object_key ~ '^snapshots/[0-9a-f-]{36}$'::text),
 "not_before" timestamptz DEFAULT (now() + '01:00:00'::interval) NOT NULL,
 PRIMARY KEY ("object_key")
);

ALTER TABLE public."hive_backup_cleanup" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."hive_backup_cleanup" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."hive_local_inference_jobs" (
 "id" uuid DEFAULT gen_random_uuid() NOT NULL,
 "user_id" uuid NOT NULL,
 "prompt" text NOT NULL CHECK (length(TRIM(BOTH FROM prompt)) >= 1 AND length(TRIM(BOTH FROM prompt)) <= 4000),
 "status" text DEFAULT 'PENDING'::text NOT NULL CHECK (status = ANY (ARRAY['PENDING'::text, 'RUNNING'::text, 'SUCCEEDED'::text, 'FAILED'::text])),
 "idempotency_key" uuid NOT NULL,
 "attempts" integer DEFAULT 0 NOT NULL CHECK (attempts >= 0 AND attempts <= 3),
 "lease_token_hash" text,
 "lease_until" timestamptz,
 "answer" text CHECK (answer IS NULL OR length(answer) <= 12000),
 "model" text,
 "error_code" text,
 "created_at" timestamptz DEFAULT now() NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 "agent_id" text CHECK (agent_id IS NULL OR (agent_id = ANY (ARRAY['Hugo'::text, 'Architect'::text, 'Developer'::text, 'QA'::text, 'Security'::text, 'DevOps'::text, 'Judge'::text, 'Sentinel'::text, 'Research'::text]))),
 PRIMARY KEY ("id")
);

ALTER TABLE public."hive_local_inference_jobs" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."hive_local_inference_jobs" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."hive_local_worker_credentials" (
 "id" integer NOT NULL CHECK (id = 1),
 "token_hash" text NOT NULL CHECK (token_hash ~ '^[a-f0-9]{64}$'::text),
 "active" bool DEFAULT false NOT NULL,
 "updated_at" timestamptz DEFAULT now() NOT NULL,
 "last_seen_at" timestamptz,
 PRIMARY KEY ("id")
);

ALTER TABLE public."hive_local_worker_credentials" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."hive_local_worker_credentials" FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public."ugo_support_rate_limits" (
 "fingerprint" text NOT NULL,
 "window_start" timestamptz NOT NULL,
 "hits" integer DEFAULT 0 NOT NULL,
 PRIMARY KEY ("fingerprint", "window_start")
);

ALTER TABLE public."ugo_support_rate_limits" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."ugo_support_rate_limits" FROM PUBLIC;
