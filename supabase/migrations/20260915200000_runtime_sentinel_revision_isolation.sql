-- UGO TEST · Runtime Sentinel release isolation.
-- Runtime clients may report incidents, but they cannot mutate the release checklist.
-- Incidents are tagged with the emitting runtime revision so stale builds remain visible
-- without contaminating the readiness state of a newer candidate.

alter table public.development_incidents
  add column if not exists runtime_revision text;

create index if not exists development_incidents_revision_seen_idx
  on public.development_incidents(runtime_revision,last_seen_at desc)
  where runtime_revision is not null;

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
  v_checklist_code text;
  v_runtime_revision text;
  v_is_admin boolean := private.is_admin(auth.uid());
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

  if p_service_id is not null
     and not v_is_admin
     and not private.is_service_participant(p_service_id, auth.uid()) then
    raise exception 'NOT_SERVICE_PARTICIPANT';
  end if;

  v_checklist_code := case
    when v_is_admin then p_checklist_code
    when p_action = 'client.activity.open_order' then 'CLIENT-ORDER-OPEN'
    when p_action in ('client.service.chat','provider.service.chat','client.order.chat','provider.order.chat') then 'CHAT-REALTIME'
    when p_action = 'client.order.payment' then 'PAYMENT-CLOSE'
    else null
  end;

  v_runtime_revision := nullif(left(trim(coalesce(p_metadata->>'runtimeRevision','')),80),'');

  v_fingerprint := md5(concat_ws('|',
    coalesce(v_runtime_revision,'unversioned'),
    p_source_role,
    p_event_type,
    coalesce(p_route,''),
    coalesce(p_action,''),
    coalesce(p_service_id::text,''),
    left(trim(p_message),240)
  ));

  insert into public.development_incidents(
    fingerprint,severity,source_role,event_type,status,route,action,service_id,
    reporter_id,checklist_code,message,stack,metadata,runtime_revision
  ) values (
    v_fingerprint,p_severity,p_source_role,trim(p_event_type),'open',p_route,p_action,p_service_id,
    auth.uid(),v_checklist_code,left(trim(p_message),2000),left(p_stack,12000),coalesce(p_metadata,'{}'::jsonb),v_runtime_revision
  )
  on conflict (fingerprint) do update set
    severity = excluded.severity,
    status = 'open',
    reporter_id = excluded.reporter_id,
    checklist_code = coalesce(excluded.checklist_code,public.development_incidents.checklist_code),
    message = excluded.message,
    stack = coalesce(excluded.stack,public.development_incidents.stack),
    metadata = public.development_incidents.metadata || excluded.metadata,
    runtime_revision = coalesce(excluded.runtime_revision,public.development_incidents.runtime_revision),
    occurrences = public.development_incidents.occurrences + 1,
    last_seen_at = now(),
    resolved_at = null
  returning id into v_id;

  -- Deliberately do not update development_checklist here.
  -- The runtime incident stream is an independent blocking signal in the Development dashboard.
  -- Only an Admin/readiness workflow may mutate checklist state, so stale or spoofed browser
  -- reports cannot downgrade a newer release candidate.

  return v_id;
end;
$$;

revoke all on function public.report_development_incident(text,text,text,text,text,text,uuid,text,text,jsonb) from public;
grant execute on function public.report_development_incident(text,text,text,text,text,text,uuid,text,text,jsonb) to authenticated;

comment on column public.development_incidents.runtime_revision is
  'Build/release identifier emitted by the reporting runtime. Null means an older unversioned build.';

comment on function public.report_development_incident(text,text,text,text,text,text,uuid,text,text,jsonb) is
  'UGO TEST Sentinel: logs authenticated, service-scoped runtime incidents with build revision; runtime reporters never mutate release checklist state.';
