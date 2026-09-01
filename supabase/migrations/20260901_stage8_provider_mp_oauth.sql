create table if not exists private.mp_oauth_states(
  state text primary key,
  proveedor_id uuid not null references public.usuarios(id) on delete cascade,
  code_verifier text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '15 minutes'),
  used_at timestamptz
);
create index if not exists mp_oauth_states_provider_idx on private.mp_oauth_states(proveedor_id,created_at desc);

create table if not exists private.mp_provider_oauth(
  proveedor_id uuid primary key references public.usuarios(id) on delete cascade,
  mp_user_id text,
  access_token text not null,
  refresh_token text,
  public_key text,
  scope text,
  token_type text,
  expires_in integer,
  expires_at timestamptz,
  live_mode boolean,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
revoke all on private.mp_oauth_states from public,anon,authenticated;
revoke all on private.mp_provider_oauth from public,anon,authenticated;

create or replace function public.mp_oauth_create_state(p_proveedor_id uuid,p_state text,p_code_verifier text default null) returns void language plpgsql security definer set search_path=public,private,pg_temp as $$
begin
 if p_state is null or length(p_state)<32 then raise exception 'state inválido'; end if;
 delete from private.mp_oauth_states where expires_at<now() or used_at is not null;
 insert into private.mp_oauth_states(state,proveedor_id,code_verifier) values(p_state,p_proveedor_id,p_code_verifier);
end;$$;

create or replace function public.mp_oauth_consume_state(p_state text) returns table(proveedor_id uuid,code_verifier text) language plpgsql security definer set search_path=public,private,pg_temp as $$
declare r private.mp_oauth_states%rowtype;
begin
 select * into r from private.mp_oauth_states where state=p_state for update;
 if not found or r.used_at is not null or r.expires_at<now() then raise exception 'state inválido o vencido'; end if;
 update private.mp_oauth_states set used_at=now() where state=p_state;
 proveedor_id:=r.proveedor_id;code_verifier:=r.code_verifier;return next;
end;$$;

create or replace function public.mp_oauth_store_credentials(p_proveedor_id uuid,p_mp_user_id text,p_access_token text,p_refresh_token text,p_public_key text,p_scope text,p_token_type text,p_expires_in integer,p_live_mode boolean) returns void language plpgsql security definer set search_path=public,private,pg_temp as $$
begin
 if coalesce(p_access_token,'')='' then raise exception 'access token requerido'; end if;
 insert into private.mp_provider_oauth(proveedor_id,mp_user_id,access_token,refresh_token,public_key,scope,token_type,expires_in,expires_at,live_mode,connected_at,updated_at)
 values(p_proveedor_id,p_mp_user_id,p_access_token,p_refresh_token,p_public_key,p_scope,p_token_type,p_expires_in,case when p_expires_in is null then null else now()+make_interval(secs=>p_expires_in) end,p_live_mode,now(),now())
 on conflict(proveedor_id) do update set mp_user_id=excluded.mp_user_id,access_token=excluded.access_token,refresh_token=excluded.refresh_token,public_key=excluded.public_key,scope=excluded.scope,token_type=excluded.token_type,expires_in=excluded.expires_in,expires_at=excluded.expires_at,live_mode=excluded.live_mode,updated_at=now();
end;$$;

create or replace function public.mp_oauth_get_private(p_proveedor_id uuid) returns table(mp_user_id text,access_token text,refresh_token text,public_key text,scope text,token_type text,expires_at timestamptz,live_mode boolean,connected_at timestamptz) language plpgsql security definer set search_path=public,private,pg_temp as $$
begin return query select o.mp_user_id,o.access_token,o.refresh_token,o.public_key,o.scope,o.token_type,o.expires_at,o.live_mode,o.connected_at from private.mp_provider_oauth o where o.proveedor_id=p_proveedor_id;end;$$;

create or replace function public.mp_oauth_status(p_proveedor_id uuid) returns table(connected boolean,mp_user_id text,expires_at timestamptz,live_mode boolean,connected_at timestamptz) language plpgsql security definer set search_path=public,private,pg_temp as $$
begin return query select true,o.mp_user_id,o.expires_at,o.live_mode,o.connected_at from private.mp_provider_oauth o where o.proveedor_id=p_proveedor_id;if not found then connected:=false;mp_user_id:=null;expires_at:=null;live_mode:=null;connected_at:=null;return next;end if;end;$$;

create or replace function public.mp_oauth_disconnect(p_proveedor_id uuid) returns void language plpgsql security definer set search_path=public,private,pg_temp as $$ begin delete from private.mp_provider_oauth where proveedor_id=p_proveedor_id;end;$$;

revoke all on function public.mp_oauth_create_state(uuid,text,text) from public,anon,authenticated;
revoke all on function public.mp_oauth_consume_state(text) from public,anon,authenticated;
revoke all on function public.mp_oauth_store_credentials(uuid,text,text,text,text,text,text,integer,boolean) from public,anon,authenticated;
revoke all on function public.mp_oauth_get_private(uuid) from public,anon,authenticated;
revoke all on function public.mp_oauth_status(uuid) from public,anon,authenticated;
revoke all on function public.mp_oauth_disconnect(uuid) from public,anon,authenticated;
grant execute on function public.mp_oauth_create_state(uuid,text,text) to service_role;
grant execute on function public.mp_oauth_consume_state(text) to service_role;
grant execute on function public.mp_oauth_store_credentials(uuid,text,text,text,text,text,text,integer,boolean) to service_role;
grant execute on function public.mp_oauth_get_private(uuid) to service_role;
grant execute on function public.mp_oauth_status(uuid) to service_role;
grant execute on function public.mp_oauth_disconnect(uuid) to service_role;

alter table public.pagos add column if not exists modelo_pago text not null default 'custodia_ugo';
alter table public.pagos drop constraint if exists pagos_modelo_pago_check;
alter table public.pagos add constraint pagos_modelo_pago_check check(modelo_pago in('custodia_ugo','split_1_1'));
