-- UGO · Evidencia de solicitud previa al matching
-- El cliente puede documentar el trabajo antes de crear/enviar la solicitud.
-- Al crearse el servicio, las evidencias pendientes recientes del cliente se vinculan automáticamente.

create table if not exists public.evidencias_solicitud (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.usuarios(id) on delete cascade,
  servicio_id uuid null references public.servicios(id) on delete cascade,
  storage_path text not null,
  descripcion text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  vinculada_at timestamptz null
);

create index if not exists idx_evidencias_solicitud_cliente on public.evidencias_solicitud(cliente_id,created_at desc);
create index if not exists idx_evidencias_solicitud_servicio on public.evidencias_solicitud(servicio_id,created_at asc);

alter table public.evidencias_solicitud enable row level security;

drop policy if exists evidencia_solicitud_cliente_select on public.evidencias_solicitud;
create policy evidencia_solicitud_cliente_select on public.evidencias_solicitud
for select using (auth.uid()=cliente_id);

drop policy if exists evidencia_solicitud_cliente_insert on public.evidencias_solicitud;
create policy evidencia_solicitud_cliente_insert on public.evidencias_solicitud
for insert with check (auth.uid()=cliente_id and servicio_id is null);

drop policy if exists evidencia_solicitud_cliente_delete on public.evidencias_solicitud;
create policy evidencia_solicitud_cliente_delete on public.evidencias_solicitud
for delete using (auth.uid()=cliente_id and servicio_id is null);

-- El proveedor sólo ve evidencia de solicitudes que efectivamente le fueron ofrecidas.
drop policy if exists evidencia_solicitud_proveedor_select on public.evidencias_solicitud;
create policy evidencia_solicitud_proveedor_select on public.evidencias_solicitud
for select using (
  servicio_id is not null and exists(
    select 1 from public.ofertas_servicio o
    where o.servicio_id=evidencias_solicitud.servicio_id
      and o.proveedor_id=auth.uid()
  )
);

grant select,insert,delete on public.evidencias_solicitud to authenticated;

-- Bucket privado independiente de las evidencias operativas Antes/Durante/Después.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('request-evidence','request-evidence',false,10485760,array['image/jpeg','image/png','image/webp','image/heic'])
on conflict(id) do update set public=false,file_size_limit=10485760;

drop policy if exists request_evidence_client_insert on storage.objects;
create policy request_evidence_client_insert on storage.objects
for insert to authenticated with check(bucket_id='request-evidence' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists request_evidence_participant_select on storage.objects;
create policy request_evidence_participant_select on storage.objects
for select to authenticated using(
  bucket_id='request-evidence' and exists(
    select 1 from public.evidencias_solicitud e
    where e.storage_path=name and (
      e.cliente_id=auth.uid() or exists(
        select 1 from public.ofertas_servicio o where o.servicio_id=e.servicio_id and o.proveedor_id=auth.uid()
      )
    )
  )
);

drop policy if exists request_evidence_client_delete on storage.objects;
create policy request_evidence_client_delete on storage.objects
for delete to authenticated using(bucket_id='request-evidence' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.vincular_evidencias_solicitud()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  update public.evidencias_solicitud
  set servicio_id=new.id,vinculada_at=now()
  where cliente_id=new.cliente_id
    and servicio_id is null
    and created_at >= now()-interval '24 hours';
  return new;
end;
$$;

drop trigger if exists trg_vincular_evidencias_solicitud on public.servicios;
create trigger trg_vincular_evidencias_solicitud
after insert on public.servicios
for each row execute function public.vincular_evidencias_solicitud();
