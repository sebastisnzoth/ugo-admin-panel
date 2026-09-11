-- UGO · P0 follow-up: request evidence draft binding on the hardened private trigger.
-- The trigger helper was moved from public -> private by 20260911_harden_new_rpc_permissions.sql.
-- Keep that security boundary and make the actual trigger enforce exact draft ownership.

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

  -- Not every service channel requires request evidence. If a channel does not
  -- declare a draft, nothing is attached implicitly.
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
      vinculada_at = now()
  where cliente_id = new.cliente_id
    and servicio_id is null
    and draft_id = v_draft_id;

  get diagnostics v_attached = row_count;

  -- A service that explicitly claims request evidence must bind at least one
  -- row from that exact client/draft. Raising here rolls back the service INSERT.
  if v_attached < 1 then
    raise exception 'La solicitud no tiene evidencia asociada al draft indicado';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_vincular_evidencias_solicitud on public.servicios;
create trigger trg_vincular_evidencias_solicitud
after insert on public.servicios
for each row execute function private.vincular_evidencias_solicitud();

-- The public helper may have been created by an earlier draft-binding migration.
-- It is not an RPC surface and must not remain exposed or unused.
drop function if exists public.vincular_evidencias_solicitud();

comment on function private.vincular_evidencias_solicitud() is
  'Trigger-only helper: binds request evidence by exact request_draft_id and client.';
