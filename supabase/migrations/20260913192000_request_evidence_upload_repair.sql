-- UGO · Repair de evidencia previa de solicitud.
--
-- La UI Cliente agrupa las fotos por draft_id antes de crear el servicio. TEST
-- había quedado sin esa columna aunque el frontend ya la escribía, por lo que el
-- objeto podía subir a Storage pero la fila de evidencia fallaba. Esta migración
-- vuelve a alinear schema, RLS, bucket y trigger de vinculación.

alter table public.evidencias_solicitud
  add column if not exists draft_id uuid null;

create index if not exists idx_evidencias_solicitud_cliente_draft_pending
  on public.evidencias_solicitud(cliente_id,draft_id,created_at asc)
  where servicio_id is null;

drop policy if exists evidencia_solicitud_cliente_insert on public.evidencias_solicitud;
create policy evidencia_solicitud_cliente_insert on public.evidencias_solicitud
for insert to authenticated
with check (
  auth.uid()=cliente_id
  and servicio_id is null
  and draft_id is not null
);

update storage.buckets
set file_size_limit=10485760,
    allowed_mime_types=array[
      'image/jpeg',
      'image/jpg',
      'image/pjpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif'
    ]
where id='request-evidence';

create or replace function private.vincular_evidencias_solicitud()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_draft_raw text;
  v_draft_id uuid;
  v_attached integer := 0;
begin
  v_draft_raw := nullif(btrim(coalesce(new.metadata->>'request_draft_id','')), '');
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
  if v_attached < 1 then
    raise exception 'La solicitud no tiene evidencia asociada al draft indicado';
  end if;

  return new;
end;
$$;

comment on column public.evidencias_solicitud.draft_id is
  'Identificador del borrador de solicitud que agrupa evidencias antes de crear el servicio.';

comment on function private.vincular_evidencias_solicitud() is
  'Trigger-only helper: binds optional request evidence by exact request_draft_id and client.';
