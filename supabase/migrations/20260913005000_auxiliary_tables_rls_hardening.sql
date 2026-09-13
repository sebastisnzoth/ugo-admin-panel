-- UGO P0 · hardening de tablas auxiliares expuestas por PostgREST.
-- Diseñado para UGO TEST primero. No aplicar a producción sin gate aislado verde.
-- Principio: clientes/proveedores sólo ven datos propios o de servicios donde participan;
-- operaciones backend/SECURITY DEFINER conservan escritura privilegiada.

begin;

-- Helpers usados sólo por políticas RLS.
create or replace function private.is_service_participant(p_servicio_id uuid, p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists(
    select 1
    from public.servicios s
    where s.id = p_servicio_id
      and p_uid is not null
      and (s.cliente_id = p_uid or s.proveedor_id = p_uid or private.is_admin(p_uid))
  );
$$;

revoke all on function private.is_service_participant(uuid, uuid) from public;
grant execute on function private.is_service_participant(uuid, uuid) to authenticated;

-- audit_log: sólo Admin/Super Admin puede leer. Escritura queda en backend/RPC.
alter table public.audit_log enable row level security;
drop policy if exists audit_log_admin_select on public.audit_log;
create policy audit_log_admin_select on public.audit_log
for select to authenticated
using (private.is_admin(auth.uid()));

-- documentos: dueño puede ver/crear; Admin revisa. Campos de revisión no se actualizan directo.
alter table public.documentos enable row level security;
drop policy if exists documentos_owner_select on public.documentos;
drop policy if exists documentos_owner_insert on public.documentos;
drop policy if exists documentos_admin_all on public.documentos;
create policy documentos_owner_select on public.documentos
for select to authenticated
using (usuario_id = auth.uid() or private.is_admin(auth.uid()));
create policy documentos_owner_insert on public.documentos
for insert to authenticated
with check (usuario_id = auth.uid());
create policy documentos_admin_all on public.documentos
for all to authenticated
using (private.is_admin(auth.uid()))
with check (private.is_admin(auth.uid()));

-- documentos_proveedor: mismo contrato, acotado al proveedor dueño + Admin.
alter table public.documentos_proveedor enable row level security;
drop policy if exists documentos_proveedor_owner_select on public.documentos_proveedor;
drop policy if exists documentos_proveedor_owner_insert on public.documentos_proveedor;
drop policy if exists documentos_proveedor_admin_all on public.documentos_proveedor;
create policy documentos_proveedor_owner_select on public.documentos_proveedor
for select to authenticated
using (usuario_id = auth.uid() or private.is_admin(auth.uid()));
create policy documentos_proveedor_owner_insert on public.documentos_proveedor
for insert to authenticated
with check (usuario_id = auth.uid());
create policy documentos_proveedor_admin_all on public.documentos_proveedor
for all to authenticated
using (private.is_admin(auth.uid()))
with check (private.is_admin(auth.uid()));

-- eventos_servicio: timeline inmutable visible sólo a participantes/Admin.
alter table public.eventos_servicio enable row level security;
drop policy if exists eventos_servicio_participant_select on public.eventos_servicio;
create policy eventos_servicio_participant_select on public.eventos_servicio
for select to authenticated
using (private.is_service_participant(servicio_id, auth.uid()));

-- Hugo sessions/chat: cada usuario sólo ve y mantiene su propia conversación; Admin observa.
alter table public.hugo_sessions enable row level security;
drop policy if exists hugo_sessions_owner_all on public.hugo_sessions;
drop policy if exists hugo_sessions_admin_all on public.hugo_sessions;
create policy hugo_sessions_owner_all on public.hugo_sessions
for all to authenticated
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());
create policy hugo_sessions_admin_all on public.hugo_sessions
for all to authenticated
using (private.is_admin(auth.uid()))
with check (private.is_admin(auth.uid()));

alter table public.hugo_chat enable row level security;
drop policy if exists hugo_chat_owner_select on public.hugo_chat;
drop policy if exists hugo_chat_owner_insert on public.hugo_chat;
drop policy if exists hugo_chat_admin_all on public.hugo_chat;
create policy hugo_chat_owner_select on public.hugo_chat
for select to authenticated
using (usuario_id = auth.uid() or private.is_admin(auth.uid()));
create policy hugo_chat_owner_insert on public.hugo_chat
for insert to authenticated
with check (
  usuario_id = auth.uid()
  and exists(select 1 from public.hugo_sessions hs where hs.id = session_id and hs.usuario_id = auth.uid())
);
create policy hugo_chat_admin_all on public.hugo_chat
for all to authenticated
using (private.is_admin(auth.uid()))
with check (private.is_admin(auth.uid()));

-- Mensajes de servicio: participantes leen. Sólo el emisor autenticado inserta.
alter table public.mensajes enable row level security;
drop policy if exists mensajes_participant_select on public.mensajes;
drop policy if exists mensajes_sender_insert on public.mensajes;
drop policy if exists mensajes_participant_update on public.mensajes;
create policy mensajes_participant_select on public.mensajes
for select to authenticated
using (private.is_service_participant(servicio_id, auth.uid()));
create policy mensajes_sender_insert on public.mensajes
for insert to authenticated
with check (
  emisor_id = auth.uid()
  and private.is_service_participant(servicio_id, auth.uid())
);
create policy mensajes_participant_update on public.mensajes
for update to authenticated
using (private.is_service_participant(servicio_id, auth.uid()))
with check (private.is_service_participant(servicio_id, auth.uid()));

-- Push subscriptions: endpoint/keys son datos sensibles del dueño.
alter table public.push_suscripciones enable row level security;
drop policy if exists push_suscripciones_owner_all on public.push_suscripciones;
drop policy if exists push_suscripciones_admin_select on public.push_suscripciones;
create policy push_suscripciones_owner_all on public.push_suscripciones
for all to authenticated
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());
create policy push_suscripciones_admin_select on public.push_suscripciones
for select to authenticated
using (private.is_admin(auth.uid()));

-- Entregas push: sólo el dueño de la suscripción o Admin puede observar.
alter table public.push_entregas enable row level security;
drop policy if exists push_entregas_owner_select on public.push_entregas;
create policy push_entregas_owner_select on public.push_entregas
for select to authenticated
using (
  private.is_admin(auth.uid())
  or exists(
    select 1 from public.push_suscripciones ps
    where ps.id = suscripcion_id and ps.usuario_id = auth.uid()
  )
);

-- Retiros: dato financiero. Proveedor sólo lectura propia; mutación queda en backend/Admin.
alter table public.retiros enable row level security;
drop policy if exists retiros_provider_select on public.retiros;
drop policy if exists retiros_admin_all on public.retiros;
create policy retiros_provider_select on public.retiros
for select to authenticated
using (proveedor_id = auth.uid() or private.is_admin(auth.uid()));
create policy retiros_admin_all on public.retiros
for all to authenticated
using (private.is_admin(auth.uid()))
with check (private.is_admin(auth.uid()));

-- WhatsApp: infraestructura server-side. Usuarios finales no acceden directo.
-- Admin conserva lectura/operación desde el panel.
alter table public.whatsapp_conversaciones enable row level security;
drop policy if exists whatsapp_conversaciones_admin_all on public.whatsapp_conversaciones;
create policy whatsapp_conversaciones_admin_all on public.whatsapp_conversaciones
for all to authenticated
using (private.is_admin(auth.uid()))
with check (private.is_admin(auth.uid()));

alter table public.whatsapp_eventos enable row level security;
drop policy if exists whatsapp_eventos_admin_select on public.whatsapp_eventos;
create policy whatsapp_eventos_admin_select on public.whatsapp_eventos
for select to authenticated
using (private.is_admin(auth.uid()));

alter table public.whatsapp_notificaciones enable row level security;
drop policy if exists whatsapp_notificaciones_admin_all on public.whatsapp_notificaciones;
create policy whatsapp_notificaciones_admin_all on public.whatsapp_notificaciones
for all to authenticated
using (private.is_admin(auth.uid()))
with check (private.is_admin(auth.uid()));

commit;
