-- UGO · P0 hardening del catálogo público de proveedores.
--
-- `public.proveedores_mapa` es un contrato de lectura del cliente: expone sólo
-- campos sanitizados y una ubicación aproximada. La vista histórica fue creada
-- con permisos del owner (security definer), por lo que Supabase la marca como
-- una superficie que puede eludir RLS.
--
-- No podemos convertir la consulta original directamente a security_invoker:
-- la RLS de `perfiles_proveedor` permite leer sólo el propio perfil o a Admin,
-- y eso rompería el radar del cliente. El catálogo sanitizado vive entonces en
-- una función SECURITY DEFINER fuera del schema expuesto y la vista pública pasa
-- a ser SECURITY INVOKER sin cambiar su contrato de columnas.

create or replace function private.proveedores_mapa_publicos()
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
set search_path = ''
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
    case
      when pp.online and pp.disponible and pp.ubicacion is not null
        then (
          round((extensions.st_y(pp.ubicacion::extensions.geometry) / 0.02)::numeric) * 0.02
        )::double precision
      else null::double precision
    end as lat,
    case
      when pp.online and pp.disponible and pp.ubicacion is not null
        then (
          round((extensions.st_x(pp.ubicacion::extensions.geometry) / 0.02)::numeric) * 0.02
        )::double precision
      else null::double precision
    end as lng,
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
  join public.usuarios u on u.id = pp.usuario_id
  left join public.categorias c on c.id = pp.categoria_principal_id
  where u.activo = true
    and pp.estado_verificacion = 'verificado'::public.verificacion_estado;
$$;

-- Las funciones reciben EXECUTE para PUBLIC por defecto en PostgreSQL. Este
-- helper no forma parte de la API RPC y sólo debe ser consumido por el rol
-- autenticado a través de la vista o por procesos internos.
revoke execute on function private.proveedores_mapa_publicos() from public, anon;
grant execute on function private.proveedores_mapa_publicos() to authenticated, service_role;

create or replace view public.proveedores_mapa
with (security_invoker = true)
as
select *
from private.proveedores_mapa_publicos();

revoke all on table public.proveedores_mapa from public, anon;
grant select on table public.proveedores_mapa to authenticated, service_role;

comment on view public.proveedores_mapa is
  'Catálogo sanitizado de proveedores verificados para clientes autenticados; ubicación aproximada y sin datos sensibles.';
