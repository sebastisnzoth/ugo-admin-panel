-- UGO · El radar/voz debe usar los mismos rubros que el matching.
-- Conserva una fila sanitizada por proveedor y agrega category_ids para que
-- Cliente/Hugo encuentren profesionales por cualquiera de sus rubros activos.

drop view if exists public.proveedores_mapa;
drop function if exists private.proveedores_mapa_publicos();

create function private.proveedores_mapa_publicos()
returns table(
  id uuid,
  nombre text,
  foto_url text,
  karma numeric(3,2),
  servicios_completados integer,
  tarifa_base numeric(12,2),
  online boolean,
  disponible boolean,
  estado_verificacion public.verificacion_estado,
  categoria_principal_id uuid,
  categoria_nombre text,
  categoria_emoji text,
  categoria_ids uuid[],
  lat double precision,
  lng double precision,
  pais character(2),
  zona text,
  bio text,
  experiencia_anos integer,
  especialidades text,
  idiomas text,
  disponibilidad_horaria text,
  telefono_profesional text,
  ciudad_base text
)
language sql
stable
security definer
set search_path=''
as $$
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
    coalesce(
      (
        select array_agg(pc.categoria_id order by pc.es_principal desc,pc.created_at)
        from public.proveedor_categorias pc
        join public.categorias active_c on active_c.id=pc.categoria_id and active_c.activa=true
        where pc.proveedor_id=pp.usuario_id and pc.activa=true
      ),
      case when pp.categoria_principal_id is not null then array[pp.categoria_principal_id]::uuid[] else array[]::uuid[] end
    ) as categoria_ids,
    case when pp.online and pp.disponible and pp.ubicacion is not null
      then (round((extensions.st_y(pp.ubicacion::extensions.geometry)/0.02)::numeric)*0.02)::double precision
      else null::double precision end as lat,
    case when pp.online and pp.disponible and pp.ubicacion is not null
      then (round((extensions.st_x(pp.ubicacion::extensions.geometry)/0.02)::numeric)*0.02)::double precision
      else null::double precision end as lng,
    u.pais,
    u.zona,
    pp.bio,
    pp.experiencia_anos,
    pp.especialidades,
    pp.idiomas,
    pp.disponibilidad_horaria,
    null::text as telefono_profesional,
    pp.ciudad_base
  from public.perfiles_proveedor pp
  join public.usuarios u on u.id=pp.usuario_id
  left join public.categorias c on c.id=pp.categoria_principal_id
  where u.activo=true
    and pp.estado_verificacion='verificado'::public.verificacion_estado;
$$;

revoke execute on function private.proveedores_mapa_publicos() from public,anon;
grant execute on function private.proveedores_mapa_publicos() to authenticated,service_role;

create view public.proveedores_mapa
with (security_invoker=true)
as
select
  p.id,p.nombre,p.foto_url,p.karma::numeric(3,2) as karma,p.servicios_completados,
  p.tarifa_base::numeric(12,2) as tarifa_base,p.online,p.disponible,p.estado_verificacion,
  p.categoria_principal_id,p.categoria_nombre,p.categoria_emoji,p.categoria_ids,p.lat,p.lng,
  p.pais::character(2) as pais,p.zona,p.bio,p.experiencia_anos,p.especialidades,p.idiomas,
  p.disponibilidad_horaria,p.telefono_profesional,p.ciudad_base
from private.proveedores_mapa_publicos() p;

revoke all on table public.proveedores_mapa from public,anon;
grant select on table public.proveedores_mapa to authenticated,service_role;

comment on view public.proveedores_mapa is
  'Catálogo sanitizado de proveedores verificados; category_ids refleja todos los rubros activos del proveedor para radar, tarjetas y voz.';
