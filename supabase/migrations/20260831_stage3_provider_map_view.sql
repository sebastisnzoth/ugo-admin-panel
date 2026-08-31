create or replace view public.proveedores_mapa
with (security_invoker = true)
as
select
  pp.usuario_id as id,
  u.nombre,
  u.foto_url,
  u.karma,
  u.servicios_completados,
  pp.tarifa_base,
  pp.online,
  pp.disponible,
  pp.estado_verificacion,
  pp.categoria_principal_id,
  c.nombre as categoria_nombre,
  c.emoji as categoria_emoji,
  case when pp.ubicacion is null then null else st_y(pp.ubicacion::geometry) end as lat,
  case when pp.ubicacion is null then null else st_x(pp.ubicacion::geometry) end as lng
from public.perfiles_proveedor pp
join public.usuarios u on u.id = pp.usuario_id
left join public.categorias c on c.id = pp.categoria_principal_id
where u.activo = true;

grant select on public.proveedores_mapa to authenticated;

comment on view public.proveedores_mapa is 'Safe authenticated map projection for UGO client discovery.';
