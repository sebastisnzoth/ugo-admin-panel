create or replace function public.guard_legacy_provider_document_insert()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
begin
  if auth.uid() is not null and not private.is_admin(auth.uid()) then
    if new.usuario_id <> auth.uid() then raise exception 'DOCUMENT_OWNER_REQUIRED' using errcode='42501'; end if;
    new.estado := 'pendiente';
    new.notas_revision := null;
    new.revisado_at := null;
    new.revisor_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_00_legacy_provider_document_guard on public.documentos_proveedor;
create trigger trg_00_legacy_provider_document_guard
before insert on public.documentos_proveedor
for each row execute function public.guard_legacy_provider_document_insert();

-- Disputes must be opened through abrir_disputa(), which derives parties, amount and
-- lifecycle state from the canonical service row and performs all side effects atomically.
drop policy if exists disputas_insert on public.disputas;
revoke insert on table public.disputas from authenticated;
revoke delete, truncate, references, trigger on table public.disputas from authenticated;
grant select, update on table public.disputas to authenticated;

revoke all on function public.abrir_disputa(uuid,text,jsonb) from public;
grant execute on function public.abrir_disputa(uuid,text,jsonb) to authenticated;
