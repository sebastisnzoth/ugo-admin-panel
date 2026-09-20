-- UGO · Reparación P0 Admin mapa + Scout
-- 2026-09-20

create or replace view public.mapa_operativo_usuarios
with (security_invoker=true) as
select
  u.id,u.nombre,u.apellido,u.tipo::text as tipo,u.email,
  coalesce(pp.telefono_profesional,u.telefono) as telefono,
  coalesce(c.slug,u.categoria) as categoria,u.karma,u.activo,
  case when u.tipo::text='proveedor' then coalesce(pp.online,u.online,false) else coalesce(u.online,false) end as online,
  case when u.tipo::text='proveedor' and pp.ubicacion is not null then st_y(pp.ubicacion::geometry) else u.lat end::double precision as lat,
  case when u.tipo::text='proveedor' and pp.ubicacion is not null then st_x(pp.ubicacion::geometry) else u.lng end::double precision as lng,
  coalesce(nullif(pp.ciudad_base,''),u.zona) as zona,u.endereco,coalesce(pp.bio,u.bio) as bio
from public.usuarios u
left join public.perfiles_proveedor pp on pp.usuario_id=u.id and u.tipo::text='proveedor'
left join public.categorias c on c.id=pp.categoria_principal_id
where private.is_admin(auth.uid()) and u.tipo::text in ('cliente','proveedor');

create or replace view public.mapa_operativo_servicios
with (security_invoker=true) as
select s.id,s.estado::text as estado,s.descripcion,s.tarifa,s.created_at,
  case when s.ubicacion_cliente is not null then st_y(s.ubicacion_cliente::geometry) else cu.lat end::double precision as lat_cliente,
  case when s.ubicacion_cliente is not null then st_x(s.ubicacion_cliente::geometry) else cu.lng end::double precision as lng_cliente,
  case when pp.ubicacion is not null then st_y(pp.ubicacion::geometry) else pu.lat end::double precision as proveedor_lat,
  case when pp.ubicacion is not null then st_x(pp.ubicacion::geometry) else pu.lng end::double precision as proveedor_lng
from public.servicios s
left join public.usuarios cu on cu.id=s.cliente_id
left join public.usuarios pu on pu.id=s.proveedor_id
left join public.perfiles_proveedor pp on pp.usuario_id=s.proveedor_id
where private.is_admin(auth.uid());

create or replace view public.vista_todos_proveedores
with (security_invoker=true) as
select u.id,u.nombre,u.apellido,u.karma,
  case when pp.ubicacion is not null then st_y(pp.ubicacion::geometry) else u.lat end::double precision as lat,
  case when pp.ubicacion is not null then st_x(pp.ubicacion::geometry) else u.lng end::double precision as lng,
  u.zona,u.pais,coalesce(pp.telefono_profesional,u.telefono) as telefono,
  coalesce(c.slug,u.categoria) as categoria,coalesce(c.emoji,'🛠️') as cat_emoji,
  case when not u.activo then '#E11900' when coalesce(pp.online,u.online,false) then '#05944F' else '#F59E0B' end as pin_color,
  case when not u.activo then 'inactivo' when coalesce(pp.online,u.online,false) then 'online' else 'offline' end as estado_mapa,
  u.activo,coalesce(pp.online,u.online,false) as online,u.servicios_completados
from public.usuarios u
join public.perfiles_proveedor pp on pp.usuario_id=u.id
left join public.categorias c on c.id=pp.categoria_principal_id
where private.is_admin(auth.uid()) and u.tipo::text='proveedor';

revoke all on public.mapa_operativo_usuarios,public.mapa_operativo_servicios,public.vista_todos_proveedores from anon;
grant select on public.mapa_operativo_usuarios,public.mapa_operativo_servicios,public.vista_todos_proveedores to authenticated;

create table if not exists public.prospectos_scouts(
  id uuid primary key default gen_random_uuid(),
  external_id text,
  nombre text not null,
  categoria text not null,
  telefono text,email text,website text,direccion text,ciudad text,
  pais char(2) not null default 'BR',
  latitud double precision,longitud double precision,
  fuente text not null default 'scout',
  score_confianza integer not null default 0 check(score_confianza between 0 and 100),
  estado text not null default 'prospecto_pendiente' check(estado in ('prospecto_pendiente','invitado','aprobado','rechazado')),
  notas_hugo text,creado_por uuid default auth.uid(),
  contactado_at timestamptz,aprobado_at timestamptz,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);

create unique index if not exists prospectos_scouts_external_uidx on public.prospectos_scouts(external_id) where external_id is not null;
create index if not exists prospectos_scouts_estado_created_idx on public.prospectos_scouts(estado,created_at desc);
alter table public.prospectos_scouts enable row level security;
drop policy if exists prospectos_scouts_admin_select on public.prospectos_scouts;
create policy prospectos_scouts_admin_select on public.prospectos_scouts for select to authenticated using(private.is_admin(auth.uid()));
drop policy if exists prospectos_scouts_admin_insert on public.prospectos_scouts;
create policy prospectos_scouts_admin_insert on public.prospectos_scouts for insert to authenticated with check(private.is_admin(auth.uid()));
drop policy if exists prospectos_scouts_admin_update on public.prospectos_scouts;
create policy prospectos_scouts_admin_update on public.prospectos_scouts for update to authenticated using(private.is_admin(auth.uid())) with check(private.is_admin(auth.uid()));
drop policy if exists prospectos_scouts_admin_delete on public.prospectos_scouts;
create policy prospectos_scouts_admin_delete on public.prospectos_scouts for delete to authenticated using(private.is_admin(auth.uid()));
grant select,insert,update,delete on public.prospectos_scouts to authenticated;
revoke all on public.prospectos_scouts from anon;

create or replace function private.touch_prospectos_scouts()
returns trigger language plpgsql set search_path=public,private,pg_temp as $$
begin
  new.updated_at=now();
  if new.estado='invitado' and old.estado is distinct from new.estado and new.contactado_at is null then new.contactado_at=now(); end if;
  if new.estado='aprobado' and old.estado is distinct from new.estado and new.aprobado_at is null then new.aprobado_at=now(); end if;
  return new;
end $$;

drop trigger if exists trg_touch_prospectos_scouts on public.prospectos_scouts;
create trigger trg_touch_prospectos_scouts before update on public.prospectos_scouts
for each row execute function private.touch_prospectos_scouts();

notify pgrst,'reload schema';
