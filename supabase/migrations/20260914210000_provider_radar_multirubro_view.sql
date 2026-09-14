-- Keep Hugo, radar cards and directed matching on the same provider-category truth.
-- The public map remains redacted; this only adds category ids derived from
-- the provider's principal category plus active provider_subcategorias.
create or replace view public.proveedores_mapa as
select
  p.id,
  p.nombre,
  p.foto_url,
  p.karma::numeric(3,2) as karma,
  p.servicios_completados,
  p.tarifa_base::numeric(12,2) as tarifa_base,
  p.online,
  p.disponible,
  p.estado_verificacion,
  p.categoria_principal_id,
  p.categoria_nombre,
  p.categoria_emoji,
  p.lat,
  p.lng,
  p.pais::character(2) as pais,
  p.zona,
  p.bio,
  p.experiencia_anos,
  p.especialidades,
  p.idiomas,
  p.disponibilidad_horaria,
  p.telefono_profesional,
  p.ciudad_base,
  array(
    select distinct category_id
    from (
      select p.categoria_principal_id as category_id
      union all
      select s.categoria_id
      from public.proveedor_subcategorias ps
      join public.subcategorias s on s.id = ps.subcategoria_id
      where ps.proveedor_id = p.id
        and ps.activa = true
        and s.activa = true
    ) categories
    where category_id is not null
  )::uuid[] as categoria_ids
from private.proveedores_mapa_publicos() p;

comment on view public.proveedores_mapa is
  'Redacted provider radar with principal and active category ids for client matching.';
