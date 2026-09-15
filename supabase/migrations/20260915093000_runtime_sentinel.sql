-- UGO TEST · Runtime Sentinel.
-- Captures real client/provider runtime failures, deduplicates them and can move
-- a mapped readiness item back to failed automatically.

create table if not exists public.development_incidents (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  severity text not null check (severity in ('P0','P1','P2','P3')),
  source_role text not null default 'unknown' check (source_role in ('client','provider','admin','system','unknown')),
  event_type text not null,
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  route text,
  action text,
  service_id uuid references public.servicios(id) on delete set null,
  reporter_id uuid references auth.users(id) on delete set null,
  checklist_code text references public.development_checklist(code) on update cascade on delete set null,
  message text not null,
  stack text,
  metadata jsonb not null default '{}'::jsonb,
  occurrences integer not null default 1 check (occurrences > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists development_incidents_status_seen_idx
  on public.development_incidents(status,severity,last_seen_at desc);
create index if not exists development_incidents_service_idx
  on public.development_incidents(service_id,last_seen_at desc)
  where service_id is not null;

alter table public.development_incidents enable row level security;

drop policy if exists development_incidents_admin_select on public.development_incidents;
create policy development_incidents_admin_select
  on public.development_incidents for select
  to authenticated
  using (private.is_admin(auth.uid()));

drop policy if exists development_incidents_admin_update on public.development_incidents;
create policy development_incidents_admin_update
  on public.development_incidents for update
  to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

revoke all on public.development_incidents from anon;
revoke insert, delete on public.development_incidents from authenticated;
grant select, update on public.development_incidents to authenticated;

create or replace function public.report_development_incident(
  p_event_type text,
  p_message text,
  p_severity text default 'P1',
  p_source_role text default 'unknown',
  p_route text default null,
  p_action text default null,
  p_service_id uuid default null,
  p_checklist_code text default null,
  p_stack text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_id uuid;
  v_fingerprint text;
  v_evidence text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_severity not in ('P0','P1','P2','P3') then
    raise exception 'INVALID_SEVERITY';
  end if;
  if p_source_role not in ('client','provider','admin','system','unknown') then
    raise exception 'INVALID_SOURCE_ROLE';
  end if;
  if nullif(trim(p_event_type),'') is null or nullif(trim(p_message),'') is null then
    raise exception 'INCIDENT_DETAILS_REQUIRED';
  end if;

  v_fingerprint := md5(concat_ws('|',
    p_source_role,
    p_event_type,
    coalesce(p_route,''),
    coalesce(p_action,''),
    coalesce(p_service_id::text,''),
    left(trim(p_message),240)
  ));

  insert into public.development_incidents(
    fingerprint,severity,source_role,event_type,status,route,action,service_id,
    reporter_id,checklist_code,message,stack,metadata
  ) values (
    v_fingerprint,p_severity,p_source_role,trim(p_event_type),'open',p_route,p_action,p_service_id,
    auth.uid(),p_checklist_code,left(trim(p_message),2000),left(p_stack,12000),coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict (fingerprint) do update set
    severity = excluded.severity,
    status = 'open',
    reporter_id = excluded.reporter_id,
    checklist_code = coalesce(excluded.checklist_code,public.development_incidents.checklist_code),
    message = excluded.message,
    stack = coalesce(excluded.stack,public.development_incidents.stack),
    metadata = public.development_incidents.metadata || excluded.metadata,
    occurrences = public.development_incidents.occurrences + 1,
    last_seen_at = now(),
    resolved_at = null
  returning id into v_id;

  if p_checklist_code is not null and p_severity in ('P0','P1') then
    v_evidence := format(
      '[SENTINEL %s] %s · %s%s%s',
      to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM-DD HH24:MI'),
      p_event_type,
      left(trim(p_message),600),
      case when p_service_id is not null then ' · serviceId=' || p_service_id::text else '' end,
      case when p_action is not null then ' · action=' || p_action else '' end
    );

    update public.development_checklist
    set status = 'failed',
        evidence = right(concat_ws(E'\n',nullif(evidence,''),v_evidence),4000),
        updated_by = auth.uid()
    where code = p_checklist_code
      and status <> 'failed';
  end if;

  return v_id;
end;
$$;

revoke all on function public.report_development_incident(text,text,text,text,text,text,uuid,text,text,jsonb) from public;
grant execute on function public.report_development_incident(text,text,text,text,text,text,uuid,text,text,jsonb) to authenticated;

alter table public.development_incidents replica identity full;
do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname='supabase_realtime' and schemaname='public' and tablename='development_incidents'
     ) then
    alter publication supabase_realtime add table public.development_incidents;
  end if;
end $$;

insert into public.development_checklist(code,area,title,description,priority,status,weight,position,evidence,test_required)
values
  ('CLIENT-ORDER-OPEN','Cliente','Abrir pedido activo sin romper la app','Desde Actividad, Abrir pedido debe conservar el contexto del serviceId y mostrar detalle + chat aunque falle un módulo secundario.','P0','failed',5,105,'Fallo real confirmado en Servicio #31: Actividad → Abrir pedido termina en “No pudimos cargar esta pantalla”.',true),
  ('CLIENT-ACTIVITY-UX','Cliente','Actividad clara por estado','Actividad debe separar visualmente en curso, próximos y finalizados y mostrar el estado operativo sin ambigüedad.','P1','failed',3,106,'Prueba real: la jerarquía y estados de la pantalla Actividad no permiten reconocer con claridad qué está activo o en espera.',true),
  ('SENTINEL-RUNTIME','QA','Sentinela automático de errores','Errores de render, promesas no controladas, fallos de apertura y problemas de chat quedan registrados con rol, ruta, acción y serviceId y alimentan el checklist.','P1','implemented',3,205,'Pipeline de incidentes implementado en main; requiere validación disparando un error controlado en UGO TEST.',true)
on conflict (code) do update set
  area=excluded.area,
  title=excluded.title,
  description=excluded.description,
  priority=excluded.priority,
  weight=excluded.weight,
  position=excluded.position,
  test_required=excluded.test_required;

comment on table public.development_incidents is
  'UGO TEST Sentinel incident stream. Runtime failures are deduplicated and can automatically fail mapped readiness items.';
