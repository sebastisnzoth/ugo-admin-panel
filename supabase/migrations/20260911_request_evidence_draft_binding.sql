-- UGO · P0 request evidence draft binding
-- Evita que una solicitud nueva herede todas las evidencias pendientes del cliente.
-- Cada formulario usa un request_draft_id explícito y sólo esas evidencias se vinculan.

alter table public.evidencias_solicitud
  add column if not exists draft_id uuid null;

create index if not exists idx_evidencias_solicitud_cliente_draft_pending
  on public.evidencias_solicitud(cliente_id,draft_id,created_at asc)
  where servicio_id is null;

-- Desde esta migración, las nuevas evidencias pendientes creadas por clientes
-- deben pertenecer a un draft explícito. Las filas históricas con draft_id null
-- se conservan pero no se vinculan automáticamente a nuevos servicios.
drop policy if exists evidencia_solicitud_cliente_insert on public.evidencias_solicitud;
create policy evidencia_solicitud_cliente_insert on public.evidencias_solicitud
for insert to authenticated
with check (
  auth.uid()=cliente_id
  and servicio_id is null
  and draft_id is not null
);

create or replace function public.vincular_evidencias_solicitud()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_draft_raw text;
  v_draft_id uuid;
  v_attached integer := 0;
begin
  v_draft_raw := nullif(btrim(coalesce(new.metadata->>'request_draft_id','')), '');

  -- Canales alternativos (Admin/WhatsApp/importaciones) pueden no usar
  -- evidencia previa. En ese caso no se vincula nada implícitamente.
  if v_draft_raw is null then
    return new;
  end if;

  begin
    v_draft_id := v_draft_raw::uuid;
  exception when invalid_text_representation then
    raise exception 'request_draft_id inválido';
  end;

  update public.evidencias_solicitud
  set servicio_id=new.id,
      vinculada_at=now()
  where cliente_id=new.cliente_id
    and servicio_id is null
    and draft_id=v_draft_id;

  get diagnostics v_attached = row_count;

  -- Si el servicio declara un draft, la evidencia debe existir realmente.
  -- La excepción revierte también el INSERT del servicio.
  if v_attached < 1 then
    raise exception 'La solicitud no tiene evidencia asociada al draft indicado';
  end if;

  return new;
end;
$$;

revoke all on function public.vincular_evidencias_solicitud() from public;
revoke all on function public.vincular_evidencias_solicitud() from anon;
revoke all on function public.vincular_evidencias_solicitud() from authenticated;

comment on column public.evidencias_solicitud.draft_id is
  'Identificador del borrador de solicitud que agrupa evidencias antes de crear el servicio.';
