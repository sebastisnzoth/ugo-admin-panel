alter table public.servicios add column if not exists zona text;
create index if not exists servicios_zona_idx on public.servicios(zona);

create or replace function public.cotizar_tarifa_servicio(
  p_categoria_id uuid,
  p_zona text default null,
  p_direccion text default null
)
returns table(
  tarifa_id uuid,
  zona text,
  precio_base numeric,
  precio_hora numeric,
  precio_min numeric,
  precio_max numeric,
  precio_referencia numeric,
  moneda char(3)
)
language sql
stable
security definer
set search_path to 'public','private','pg_temp'
as $$
  select
    t.id,
    t.zona,
    t.precio_base,
    t.precio_hora,
    t.precio_min,
    t.precio_max,
    case
      when t.precio_min>0 then t.precio_min
      when t.precio_base>0 then t.precio_base
      else t.precio_hora
    end as precio_referencia,
    t.moneda
  from public.tarifas t
  where auth.uid() is not null
    and t.activa=true
    and t.categoria_id=p_categoria_id
    and (
      (nullif(btrim(coalesce(p_zona,'')),'') is not null and lower(btrim(t.zona))=lower(btrim(p_zona)))
      or (lower(coalesce(p_direccion,'')) like '%'||lower(btrim(t.zona))||'%' and lower(btrim(t.zona)) not in ('general','global','todas'))
      or lower(btrim(t.zona)) in ('general','global','todas')
    )
  order by
    case
      when nullif(btrim(coalesce(p_zona,'')),'') is not null and lower(btrim(t.zona))=lower(btrim(p_zona)) then 0
      when lower(coalesce(p_direccion,'')) like '%'||lower(btrim(t.zona))||'%' and lower(btrim(t.zona)) not in ('general','global','todas') then 1
      else 2
    end,
    t.updated_at desc
  limit 1;
$$;

revoke all on function public.cotizar_tarifa_servicio(uuid,text,text) from public,anon;
grant execute on function public.cotizar_tarifa_servicio(uuid,text,text) to authenticated;
notify pgrst,'reload schema';
