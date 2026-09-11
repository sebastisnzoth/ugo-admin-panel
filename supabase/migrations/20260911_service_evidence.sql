-- UGO · Evidencias de servicio
-- Registro trazable Antes / Durante / Después con almacenamiento privado.

create table if not exists public.evidencias_servicio (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  tipo text not null check (tipo in ('antes','durante','despues','documento')),
  storage_path text not null,
  descripcion text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_evidencias_servicio_servicio
  on public.evidencias_servicio(servicio_id, created_at asc);
create index if not exists idx_evidencias_servicio_usuario
  on public.evidencias_servicio(usuario_id, created_at desc);

alter table public.evidencias_servicio enable row level security;

drop policy if exists evidencias_participantes_select on public.evidencias_servicio;
create policy evidencias_participantes_select on public.evidencias_servicio
for select using (
  exists (
    select 1 from public.servicios s
    where s.id = evidencias_servicio.servicio_id
      and (s.cliente_id = auth.uid() or s.proveedor_id = auth.uid())
  )
);

drop policy if exists evidencias_proveedor_insert on public.evidencias_servicio;
create policy evidencias_proveedor_insert on public.evidencias_servicio
for insert with check (
  usuario_id = auth.uid()
  and exists (
    select 1 from public.servicios s
    where s.id = evidencias_servicio.servicio_id
      and s.proveedor_id = auth.uid()
      and s.estado in ('llegado','en_progreso','esperando_aprobacion')
  )
);

revoke all on public.evidencias_servicio from anon;
grant select,insert on public.evidencias_servicio to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('service-evidence','service-evidence',false,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set
  public=false,
  file_size_limit=10485760,
  allowed_mime_types=excluded.allowed_mime_types;

-- Ruta esperada: <servicio_id>/<usuario_id>/<archivo>
drop policy if exists service_evidence_provider_upload on storage.objects;
create policy service_evidence_provider_upload on storage.objects
for insert to authenticated
with check (
  bucket_id='service-evidence'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1 from public.servicios s
    where s.id::text = (storage.foldername(name))[1]
      and s.proveedor_id = auth.uid()
      and s.estado in ('llegado','en_progreso','esperando_aprobacion')
  )
);

drop policy if exists service_evidence_participants_read on storage.objects;
create policy service_evidence_participants_read on storage.objects
for select to authenticated
using (
  bucket_id='service-evidence'
  and exists (
    select 1 from public.servicios s
    where s.id::text = (storage.foldername(name))[1]
      and (s.cliente_id = auth.uid() or s.proveedor_id = auth.uid())
  )
);

-- Realtime para que Cliente y Proveedor vean cambios sin recargar.
do $$ begin
  alter publication supabase_realtime add table public.evidencias_servicio;
exception when duplicate_object then null;
end $$;
