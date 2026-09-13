-- UGO TEST / canonical provider opportunity context.
-- Pending providers receive only decision-safe context: approximate zone, schedule,
-- client preferences and optional estimated duration. Exact client address remains redacted.

create or replace function public.obtener_ofertas_proveedor()
returns table(
  id uuid,
  servicio_id uuid,
  proveedor_id uuid,
  estado text,
  ranking integer,
  distancia_km numeric,
  tarifa_ofrecida numeric,
  expira_at timestamptz,
  created_at timestamptz,
  servicio jsonb
)
language sql
stable
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
  select
    o.id,
    o.servicio_id,
    o.proveedor_id,
    o.estado::text,
    o.ranking,
    o.distancia_km,
    o.tarifa_ofrecida,
    o.expira_at,
    o.created_at,
    jsonb_build_object(
      'id', s.id,
      'numero', s.numero,
      'categoria_id', s.categoria_id,
      'estado', s.estado::text,
      'descripcion', s.descripcion,
      'urgencia', s.urgencia,
      'direccion_cliente', null,
      'zona_cliente', nullif(concat_ws(', ', pc.barrio, pc.ciudad), ''),
      'programado_para', s.programado_para,
      'tarifa', s.tarifa,
      'moneda', s.moneda,
      'created_at', s.created_at,
      'metadata', jsonb_build_object(
        'requested_when', nullif(s.metadata->>'requested_when', ''),
        'preferences', nullif(s.metadata->>'preferences', ''),
        'estimated_duration_minutes', case
          when coalesce(s.metadata->>'estimated_duration_minutes', '') ~ '^\d+$'
            then (s.metadata->>'estimated_duration_minutes')::integer
          else null
        end
      ),
      'cliente', jsonb_build_object('nombre', 'Cliente UGO'),
      'categoria', jsonb_build_object('nombre', c.nombre, 'emoji', c.emoji)
    ) as servicio
  from public.ofertas_servicio o
  join public.servicios s on s.id = o.servicio_id
  left join public.categorias c on c.id = s.categoria_id
  left join public.perfiles_cliente pc on pc.usuario_id = s.cliente_id
  where auth.uid() is not null
    and o.proveedor_id = auth.uid()
    and o.estado = 'pendiente'
    and (o.expira_at is null or o.expira_at > now())
  order by o.created_at desc;
$function$;
