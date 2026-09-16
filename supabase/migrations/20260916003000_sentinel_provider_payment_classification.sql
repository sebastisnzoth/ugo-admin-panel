-- UGO TEST · Extend Sentinel server-side classification for provider cash close.
-- Non-admin runtime reporters never decide readiness classification themselves.

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
    when p_action in ('client.order.payment','provider.payment.cash_confirm') then 'PAYMENT-CLOSE'
    when p_action = 'client.request.matching' then 'MATCH-ONLINE'
    when p_action = 'client.request.cancel' then 'CLIENT-CANCEL'
    when p_action = 'client.request.location' then 'MAP-GPS'
    when p_action = 'provider.offer.accept' then 'PROVIDER-ASSIGN'
    when p_action = 'provider.service.advance' then 'PROVIDER-STATES'
    when p_action = 'provider.service.location' then 'MAP-GPS'
    when p_action in ('client.rating.submit','provider.rating.submit') then 'RATING'
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

  return v_id;
end;
$$;

revoke all on function public.report_development_incident(text,text,text,text,text,text,uuid,text,text,jsonb) from public;
grant execute on function public.report_development_incident(text,text,text,text,text,text,uuid,text,text,jsonb) to authenticated;

comment on function public.report_development_incident(text,text,text,text,text,text,uuid,text,text,jsonb) is
  'UGO TEST Sentinel: authenticated service-scoped runtime incidents, server-classified by action and isolated by build revision; never mutates readiness checklist.';
