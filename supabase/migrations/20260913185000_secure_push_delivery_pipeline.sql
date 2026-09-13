create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- P0 Web Push: runtime secrets live only in private schema and are seeded out of band.
create table if not exists private.push_runtime_config (
  singleton boolean primary key default true check (singleton),
  vapid_public text not null,
  vapid_private text not null,
  dispatch_token text not null,
  edge_url text not null,
  vapid_subject text not null default 'mailto:admin@ugo.app',
  updated_at timestamptz not null default now()
);
revoke all on private.push_runtime_config from public, anon, authenticated;

alter table public.push_suscripciones enable row level security;
alter table public.push_entregas enable row level security;
revoke all on public.push_suscripciones from anon, authenticated;
revoke all on public.push_entregas from anon, authenticated;
grant select, insert, update, delete on public.push_suscripciones to service_role;
grant select, insert, update, delete on public.push_entregas to service_role;

-- Re-assert endpoint ownership. No authenticated user can claim another
-- account's existing browser endpoint, including a concurrent registration.
create or replace function public.guardar_push_suscripcion(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_owner uuid;
  v_endpoint text := btrim(p_endpoint);
begin
  if v_uid is null then
    raise exception 'Sesión requerida';
  end if;
  if coalesce(length(v_endpoint),0) < 20 or length(v_endpoint) > 2048
     or coalesce(length(btrim(p_p256dh)),0) < 20 or length(p_p256dh) > 512
     or coalesce(length(btrim(p_auth)),0) < 8 or length(p_auth) > 256 then
    raise exception 'Suscripción push inválida';
  end if;

  select usuario_id
    into v_owner
    from public.push_suscripciones
   where endpoint = v_endpoint
   for update;

  if v_owner is not null and v_owner <> v_uid then
    raise exception 'El endpoint push ya pertenece a otra cuenta';
  end if;

  insert into public.push_suscripciones(
    usuario_id,endpoint,p256dh,auth,user_agent,activa,updated_at
  ) values(
    v_uid,v_endpoint,btrim(p_p256dh),btrim(p_auth),left(nullif(btrim(p_user_agent),''),500),true,now()
  )
  on conflict(endpoint) do update set
    p256dh=excluded.p256dh,
    auth=excluded.auth,
    user_agent=excluded.user_agent,
    activa=true,
    updated_at=now()
  where public.push_suscripciones.usuario_id = v_uid
  returning id into v_id;

  if v_id is null then
    raise exception 'El endpoint push ya pertenece a otra cuenta';
  end if;
  return v_id;
end;
$function$;
revoke all on function public.guardar_push_suscripcion(text,text,text,text) from public, anon;
grant execute on function public.guardar_push_suscripcion(text,text,text,text) to authenticated;

create or replace function public.desactivar_push_suscripcion(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then raise exception 'Sesión requerida'; end if;
  update public.push_suscripciones
     set activa=false,updated_at=now()
   where usuario_id=v_uid and endpoint=btrim(p_endpoint) and activa=true;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$function$;
revoke all on function public.desactivar_push_suscripcion(text) from public, anon;
grant execute on function public.desactivar_push_suscripcion(text) to authenticated;

-- Only the service role used by the Edge Function can read runtime secrets.
create or replace function public.push_backend_config()
returns table(vapid_public text,vapid_private text,dispatch_token text,edge_url text,vapid_subject text)
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
begin
  if auth.role() <> 'service_role' then raise exception 'Acceso denegado'; end if;
  return query
    select c.vapid_public,c.vapid_private,c.dispatch_token,c.edge_url,c.vapid_subject
    from private.push_runtime_config c
    where c.singleton=true;
end;
$function$;
revoke all on function public.push_backend_config() from public, anon, authenticated;
grant execute on function public.push_backend_config() to service_role;

-- Queue one delivery per active browser and dispatch through pg_net.
create or replace function private.enqueue_push_for_notification()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','extensions','net','pg_temp'
as $function$
declare
  v_token text;
  v_url text;
  v_count integer;
begin
  insert into public.push_entregas(notificacion_id,suscripcion_id,estado)
  select new.id,s.id,'pendiente'
    from public.push_suscripciones s
   where s.usuario_id=new.usuario_id and s.activa=true
  on conflict(notificacion_id,suscripcion_id) do nothing;
  get diagnostics v_count = row_count;

  if v_count > 0 then
    select dispatch_token,edge_url into v_token,v_url
      from private.push_runtime_config
     where singleton=true;
    if nullif(v_token,'') is not null and nullif(v_url,'') is not null then
      perform net.http_post(
        url := v_url,
        headers := jsonb_build_object('Content-Type','application/json','x-ugo-push-token',v_token),
        body := jsonb_build_object('notification_id',new.id),
        timeout_milliseconds := 5000
      );
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_enqueue_push_for_notification on public.notificaciones;
create trigger trg_enqueue_push_for_notification
after insert on public.notificaciones
for each row execute function private.enqueue_push_for_notification();

-- A new provider opportunity becomes an in-app notification and therefore a push.
create or replace function private.notify_provider_new_offer()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_numero bigint;
  v_programado timestamptz;
begin
  if new.estado::text <> 'pendiente' then return new; end if;
  select numero,programado_para
    into v_numero,v_programado
    from public.servicios
   where id=new.servicio_id;

  perform private.crear_notificacion_unica(
    new.proveedor_id,
    'nueva_oferta',
    'Nuevo servicio en tu zona',
    case when v_programado is not null
      then 'Tenés una oportunidad programada para revisar.'
      else 'Hay un servicio disponible para revisar ahora.' end,
    jsonb_build_object(
      'oferta_id',new.id,
      'servicio_id',new.servicio_id,
      'numero',v_numero,
      'programado_para',v_programado
    ),
    'oferta:'||new.id::text
  );
  return new;
end;
$function$;

drop trigger if exists trg_notify_provider_new_offer on public.ofertas_servicio;
create trigger trg_notify_provider_new_offer
after insert on public.ofertas_servicio
for each row execute function private.notify_provider_new_offer();

-- Provider agenda reminders are idempotent through crear_notificacion_unica.
create or replace function private.create_provider_schedule_reminders()
returns void
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  r record;
  v_local_date date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  for r in
    select s.id,s.numero,s.proveedor_id,s.programado_para
      from public.servicios s
     where s.proveedor_id is not null
       and s.programado_para is not null
       and s.estado::text in ('asignado','en_camino','llegado','en_progreso')
       and s.programado_para between now()+interval '50 minutes' and now()+interval '70 minutes'
  loop
    perform private.crear_notificacion_unica(
      r.proveedor_id,'agenda_recordatorio','Trabajo en aproximadamente 1 hora',
      'Revisá tu agenda y prepará lo necesario para llegar puntual.',
      jsonb_build_object('servicio_id',r.id,'numero',r.numero,'programado_para',r.programado_para),
      'agenda:60:'||r.id::text||':'||r.programado_para::text
    );
  end loop;

  for r in
    select s.id,s.numero,s.proveedor_id,s.programado_para
      from public.servicios s
     where s.proveedor_id is not null
       and s.programado_para is not null
       and s.estado::text in ('asignado','en_camino','llegado','en_progreso')
       and s.programado_para between now()+interval '20 minutes' and now()+interval '40 minutes'
  loop
    perform private.crear_notificacion_unica(
      r.proveedor_id,'agenda_salida','Tu próximo trabajo se acerca',
      'Revisá el trayecto y salí con tiempo para llegar puntual.',
      jsonb_build_object('servicio_id',r.id,'numero',r.numero,'programado_para',r.programado_para),
      'agenda:30:'||r.id::text||':'||r.programado_para::text
    );
  end loop;

  for r in
    select s.proveedor_id,count(*)::int as total,min(s.programado_para) as primero
      from public.servicios s
     where s.proveedor_id is not null
       and s.programado_para is not null
       and s.estado::text in ('asignado','en_camino','llegado','en_progreso')
       and (s.programado_para at time zone 'America/Sao_Paulo')::date=v_local_date
     group by s.proveedor_id
  loop
    perform private.crear_notificacion_unica(
      r.proveedor_id,'agenda_diaria','Tu agenda de hoy',
      format('Hoy tenés %s trabajo%s agendado%s.',r.total,case when r.total=1 then '' else 's' end,case when r.total=1 then '' else 's' end),
      jsonb_build_object('total',r.total,'primero',r.primero),
      'agenda:dia:'||r.proveedor_id::text||':'||v_local_date::text
    );
  end loop;
end;
$function$;

do $block$
declare
  v_job record;
begin
  for v_job in select jobid from cron.job where jobname='ugo-provider-schedule-reminders'
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;
  perform cron.schedule(
    'ugo-provider-schedule-reminders',
    '*/10 * * * *',
    $cron$select private.create_provider_schedule_reminders();$cron$
  );
end;
$block$;
