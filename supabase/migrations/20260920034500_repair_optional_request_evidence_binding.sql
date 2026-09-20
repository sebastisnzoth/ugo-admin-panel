-- UGO · Reparar vinculación de fotos opcionales de solicitud al serviceId.
create or replace function private.vincular_evidencias_solicitud()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_draft_raw text;
  v_draft_id uuid;
begin
  v_draft_raw := nullif(btrim(coalesce(new.metadata->>'request_draft_id','')), '');

  -- La evidencia de solicitud es opcional. Sin draft válido no se vincula nada.
  if v_draft_raw is null then
    return new;
  end if;

  begin
    v_draft_id := v_draft_raw::uuid;
  exception when invalid_text_representation then
    raise exception 'request_draft_id inválido';
  end;

  update public.evidencias_solicitud
     set servicio_id = new.id,
         vinculada_at = coalesce(vinculada_at, now())
   where cliente_id = new.cliente_id
     and servicio_id is null
     and draft_id = v_draft_id;

  return new;
end;
$$;

drop trigger if exists trg_vincular_evidencias_solicitud on public.servicios;
create trigger trg_vincular_evidencias_solicitud
after insert on public.servicios
for each row execute function private.vincular_evidencias_solicitud();

-- Backfill seguro: sólo Cliente + draft_id exacto.
update public.evidencias_solicitud e
   set servicio_id = s.id,
       vinculada_at = coalesce(e.vinculada_at, now())
  from public.servicios s
 where e.servicio_id is null
   and e.draft_id is not null
   and e.cliente_id = s.cliente_id
   and nullif(btrim(coalesce(s.metadata->>'request_draft_id','')), '') = e.draft_id::text;
