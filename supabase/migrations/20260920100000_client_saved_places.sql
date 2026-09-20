-- UGO · lugares guardados del cliente.
create table if not exists public.direcciones_cliente(
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  etiqueta text not null,
  direccion text not null,
  complemento text,
  barrio text,
  ciudad text,
  latitud double precision,
  longitud double precision,
  es_predeterminada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint direcciones_cliente_etiqueta_not_blank check(length(trim(etiqueta))>0),
  constraint direcciones_cliente_direccion_not_blank check(length(trim(direccion))>=5),
  constraint direcciones_cliente_lat check(latitud is null or latitud between -90 and 90),
  constraint direcciones_cliente_lng check(longitud is null or longitud between -180 and 180)
);
create unique index if not exists direcciones_cliente_usuario_etiqueta_uidx on public.direcciones_cliente(usuario_id,lower(etiqueta));
create unique index if not exists direcciones_cliente_unica_predeterminada_uidx on public.direcciones_cliente(usuario_id) where es_predeterminada=true;
create index if not exists direcciones_cliente_usuario_idx on public.direcciones_cliente(usuario_id,created_at);
alter table public.direcciones_cliente enable row level security;
drop policy if exists direcciones_cliente_select_own on public.direcciones_cliente;
create policy direcciones_cliente_select_own on public.direcciones_cliente for select to authenticated using(usuario_id=auth.uid() or private.is_admin(auth.uid()));
drop policy if exists direcciones_cliente_insert_own on public.direcciones_cliente;
create policy direcciones_cliente_insert_own on public.direcciones_cliente for insert to authenticated with check(usuario_id=auth.uid() or private.is_admin(auth.uid()));
drop policy if exists direcciones_cliente_update_own on public.direcciones_cliente;
create policy direcciones_cliente_update_own on public.direcciones_cliente for update to authenticated using(usuario_id=auth.uid() or private.is_admin(auth.uid())) with check(usuario_id=auth.uid() or private.is_admin(auth.uid()));
drop policy if exists direcciones_cliente_delete_own on public.direcciones_cliente;
create policy direcciones_cliente_delete_own on public.direcciones_cliente for delete to authenticated using(usuario_id=auth.uid() or private.is_admin(auth.uid()));

create or replace function public.set_direccion_cliente_predeterminada(p_direccion_id uuid)
returns void language plpgsql security definer set search_path='public','private','pg_temp' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Autenticación requerida'; end if;
 if not exists(select 1 from public.direcciones_cliente where id=p_direccion_id and usuario_id=v_uid) then raise exception 'Lugar inexistente'; end if;
 update public.direcciones_cliente set es_predeterminada=false,updated_at=now() where usuario_id=v_uid and es_predeterminada=true and id<>p_direccion_id;
 update public.direcciones_cliente set es_predeterminada=true,updated_at=now() where id=p_direccion_id and usuario_id=v_uid;
end $$;
revoke all on function public.set_direccion_cliente_predeterminada(uuid) from public,anon;
grant execute on function public.set_direccion_cliente_predeterminada(uuid) to authenticated;

create or replace function private.normalize_client_default_place()
returns trigger language plpgsql security definer set search_path='public','private','pg_temp' as $$
begin
 if new.es_predeterminada then
   update public.direcciones_cliente set es_predeterminada=false,updated_at=now() where usuario_id=new.usuario_id and id<>new.id and es_predeterminada=true;
 end if;
 new.updated_at=now();
 return new;
end $$;
drop trigger if exists trg_normalize_client_default_place on public.direcciones_cliente;
create trigger trg_normalize_client_default_place before insert or update of es_predeterminada on public.direcciones_cliente for each row execute function private.normalize_client_default_place();

insert into public.direcciones_cliente(usuario_id,etiqueta,direccion,barrio,ciudad,es_predeterminada)
select pc.usuario_id,'Casa',trim(concat_ws(', ',nullif(trim(pc.direccion),''),nullif(trim(pc.barrio),''),nullif(trim(pc.ciudad),''))),pc.barrio,pc.ciudad,true
from public.perfiles_cliente pc
where nullif(trim(pc.direccion),'') is not null
  and not exists(select 1 from public.direcciones_cliente dc where dc.usuario_id=pc.usuario_id)
on conflict do nothing;
notify pgrst,'reload schema';
