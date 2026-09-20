-- UGO · Congelar tarifa cotizada y bloquear oportunidades por deuda UGO.

create or replace function private.freeze_ugo_quoted_tariff()
returns trigger
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_frozen numeric;
begin
  if old.tarifa is null or old.tarifa <= 0 then
    return new;
  end if;

  if coalesce(old.metadata,'{}'::jsonb) ? 'tariff_quote'
     or nullif(old.metadata->>'pricing_zone','') is not null then
    v_frozen := round(old.tarifa::numeric,2);
    new.tarifa := v_frozen;
    new.comision_ugo := round(v_frozen * 0.15,2);
    new.ganancia_proveedor := round(v_frozen - new.comision_ugo,2);
    new.metadata := jsonb_set(
      coalesce(new.metadata,'{}'::jsonb),
      '{pricing_frozen}',
      'true'::jsonb,
      true
    );
  end if;

  return new;
end;
$$;

revoke all on function private.freeze_ugo_quoted_tariff() from public,anon,authenticated;

drop trigger if exists trg_freeze_ugo_quoted_tariff on public.servicios;
create trigger trg_freeze_ugo_quoted_tariff
before update of proveedor_id,tarifa,comision_ugo,ganancia_proveedor
on public.servicios
for each row execute function private.freeze_ugo_quoted_tariff();

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
set search_path to 'public','private','pg_temp'
as $$
  select
    o.id,o.servicio_id,o.proveedor_id,o.estado::text,o.ranking,o.distancia_km,
    o.tarifa_ofrecida,o.expira_at,o.created_at,
    jsonb_build_object(
      'id',s.id,'numero',s.numero,'categoria_id',s.categoria_id,'estado',s.estado::text,
      'descripcion',s.descripcion,'urgencia',s.urgencia,'direccion_cliente',null,
      'zona_cliente',nullif(concat_ws(', ',pc.barrio,pc.ciudad),''),
      'programado_para',s.programado_para,'tarifa',s.tarifa,'moneda',s.moneda,'created_at',s.created_at,
      'metadata',jsonb_build_object(
        'requested_when',nullif(s.metadata->>'requested_when',''),
        'preferences',nullif(s.metadata->>'preferences',''),
        'estimated_duration_minutes',case
          when coalesce(s.metadata->>'estimated_duration_minutes','') ~ '^\d+$'
            then (s.metadata->>'estimated_duration_minutes')::integer
          else null
        end
      ),
      'cliente',jsonb_build_object('nombre','Cliente UGO'),
      'categoria',jsonb_build_object('nombre',c.nombre,'emoji',c.emoji)
    ) as servicio
  from public.ofertas_servicio o
  join public.servicios s on s.id=o.servicio_id
  left join public.categorias c on c.id=s.categoria_id
  left join public.perfiles_cliente pc on pc.usuario_id=s.cliente_id
  where auth.uid() is not null
    and o.proveedor_id=auth.uid()
    and not private.proveedor_bloqueado_por_deuda_ugo(auth.uid())
    and o.estado='pendiente'
    and (o.expira_at is null or o.expira_at>now())
  order by o.created_at desc;
$$;

revoke all on function public.obtener_ofertas_proveedor() from public,anon;
grant execute on function public.obtener_ofertas_proveedor() to authenticated;

notify pgrst,'reload schema';
