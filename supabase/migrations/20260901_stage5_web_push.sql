create table if not exists public.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.push_entregas (
  id uuid primary key default gen_random_uuid(),
  notificacion_id uuid not null references public.notificaciones(id) on delete cascade,
  suscripcion_id uuid not null references public.push_suscripciones(id) on delete cascade,
  estado text not null default 'pendiente',
  ultimo_error text,
  created_at timestamptz not null default now(),
  unique(notificacion_id,suscripcion_id)
);
alter table public.push_suscripciones enable row level security;
alter table public.push_entregas enable row level security;
drop policy if exists push_suscripciones_select_own on public.push_suscripciones;
create policy push_suscripciones_select_own on public.push_suscripciones for select to authenticated using (usuario_id=auth.uid());
drop policy if exists push_suscripciones_insert_own on public.push_suscripciones;
create policy push_suscripciones_insert_own on public.push_suscripciones for insert to authenticated with check (usuario_id=auth.uid());
drop policy if exists push_suscripciones_update_own on public.push_suscripciones;
create policy push_suscripciones_update_own on public.push_suscripciones for update to authenticated using (usuario_id=auth.uid()) with check (usuario_id=auth.uid());
drop policy if exists push_suscripciones_delete_own on public.push_suscripciones;
create policy push_suscripciones_delete_own on public.push_suscripciones for delete to authenticated using (usuario_id=auth.uid());
grant select,insert,update,delete on public.push_suscripciones to authenticated;
revoke all on public.push_entregas from anon, authenticated;
create index if not exists push_suscripciones_usuario_idx on public.push_suscripciones(usuario_id) where activa=true;
create index if not exists push_entregas_notificacion_idx on public.push_entregas(notificacion_id);

create or replace function public.guardar_push_suscripcion(p_endpoint text,p_p256dh text,p_auth text,p_user_agent text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sesión requerida'; end if;
  if coalesce(length(p_endpoint),0)<20 or coalesce(length(p_p256dh),0)<20 or coalesce(length(p_auth),0)<8 then raise exception 'Suscripción push inválida'; end if;
  insert into public.push_suscripciones(usuario_id,endpoint,p256dh,auth,user_agent,activa,updated_at)
  values(auth.uid(),p_endpoint,p_p256dh,p_auth,left(p_user_agent,500),true,now())
  on conflict(endpoint) do update set usuario_id=auth.uid(),p256dh=excluded.p256dh,auth=excluded.auth,user_agent=excluded.user_agent,activa=true,updated_at=now()
  returning id into v_id;
  return v_id;
end;$$;
revoke all on function public.guardar_push_suscripcion(text,text,text,text) from public;
grant execute on function public.guardar_push_suscripcion(text,text,text,text) to authenticated;

create or replace function public.disparar_web_push_ugo()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform net.http_post(url := 'https://trfsjuseqjxlhrxuvdsm.supabase.co/functions/v1/ugo-push-worker',headers := jsonb_build_object('Content-Type','application/json'),body := jsonb_build_object('notification_id',new.id));
  return new;
exception when others then return new;
end;$$;
drop trigger if exists trg_disparar_web_push_ugo on public.notificaciones;
create trigger trg_disparar_web_push_ugo after insert on public.notificaciones for each row execute function public.disparar_web_push_ugo();

do $$ begin
  if exists(select 1 from cron.job where jobname='ugo-push-retry') then perform cron.unschedule('ugo-push-retry'); end if;
  perform cron.schedule('ugo-push-retry','* * * * *',$cmd$select net.http_post(url := 'https://trfsjuseqjxlhrxuvdsm.supabase.co/functions/v1/ugo-push-worker',headers := '{"Content-Type":"application/json"}'::jsonb,body := '{}'::jsonb);$cmd$);
end $$;

create or replace function private.crear_notificacion_unica(p_usuario_id uuid,p_tipo text,p_titulo text,p_cuerpo text,p_datos jsonb,p_dedupe_key text)
returns void language plpgsql security definer set search_path='public','private','pg_temp' as $$
declare v_tipo text;
begin
  if p_usuario_id is null then return; end if;
  select tipo::text into v_tipo from public.usuarios where id=p_usuario_id;
  insert into public.notificaciones(usuario_id,tipo,titulo,cuerpo,datos,dedupe_key)
  values(p_usuario_id,p_tipo,p_titulo,p_cuerpo,coalesce(p_datos,'{}'::jsonb)||jsonb_build_object('role',case when v_tipo='proveedor' then 'provider' else 'client' end),p_dedupe_key)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
end;$$;
