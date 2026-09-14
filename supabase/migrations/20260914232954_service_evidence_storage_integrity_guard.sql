create or replace function private.service_evidence_object_exists(p_path text,p_user_id uuid,p_service_id uuid)
returns boolean
language sql
stable
security definer
set search_path = storage, public, private, pg_temp
as $$
  select exists(
    select 1
    from storage.objects o
    where o.bucket_id = 'service-evidence'
      and o.name = p_path
      and split_part(o.name, '/', 1) = p_service_id::text
      and split_part(o.name, '/', 2) = p_user_id::text
  );
$$;

revoke all on function private.service_evidence_object_exists(text,uuid,uuid) from public;
grant execute on function private.service_evidence_object_exists(text,uuid,uuid) to authenticated;

drop policy if exists evidencias_insert on public.evidencias_servicio;
create policy evidencias_insert
on public.evidencias_servicio
for insert
to authenticated
with check (
  usuario_id = (select auth.uid())
  and private.es_participante_servicio(servicio_id, (select auth.uid()))
  and private.service_evidence_object_exists(storage_path, usuario_id, servicio_id)
);
