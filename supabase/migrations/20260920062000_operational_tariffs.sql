-- UGO · Tarifas operativas por categoría y zona
create table if not exists public.tarifas (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  zona text not null default 'General',
  precio_base numeric(12,2) not null default 0 check (precio_base >= 0),
  precio_hora numeric(12,2) not null default 0 check (precio_hora >= 0),
  precio_min numeric(12,2) not null default 0 check (precio_min >= 0),
  precio_max numeric(12,2) null check (precio_max is null or precio_max >= 0),
  moneda char(3) not null default 'BRL',
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tarifas_categoria_zona_lower_uidx
  on public.tarifas(categoria_id, lower(btrim(zona)));

alter table public.tarifas enable row level security;

drop policy if exists tarifas_admin_select on public.tarifas;
create policy tarifas_admin_select on public.tarifas
for select to authenticated
using (private.is_admin(auth.uid()));

revoke all on table public.tarifas from anon;
grant select on table public.tarifas to authenticated;

create or replace function public.admin_upsert_tarifa(
  p_categoria_id uuid,
  p_zona text,
  p_precio_base numeric,
  p_precio_hora numeric,
  p_precio_min numeric,
  p_precio_max numeric
)
returns public.tarifas
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_row public.tarifas%rowtype;
  v_zona text := nullif(btrim(coalesce(p_zona,'')),'');
begin
  if auth.uid() is null or not private.is_admin(auth.uid()) then
    raise exception 'Acceso Admin requerido';
  end if;
  if v_zona is null then v_zona := 'General'; end if;
  if p_categoria_id is null or not exists(select 1 from public.categorias where id=p_categoria_id) then
    raise exception 'Categoría inválida';
  end if;
  if greatest(coalesce(p_precio_base,0),coalesce(p_precio_hora,0),coalesce(p_precio_min,0)) <= 0 then
    raise exception 'Definí al menos un valor positivo';
  end if;
  if coalesce(p_precio_base,0)<0 or coalesce(p_precio_hora,0)<0 or coalesce(p_precio_min,0)<0 or coalesce(p_precio_max,0)<0 then
    raise exception 'Los importes no pueden ser negativos';
  end if;
  if p_precio_max is not null and p_precio_max>0 and p_precio_min is not null and p_precio_min>0 and p_precio_max<p_precio_min then
    raise exception 'El máximo no puede ser menor que el mínimo';
  end if;

  select * into v_row
  from public.tarifas
  where categoria_id=p_categoria_id and lower(btrim(zona))=lower(v_zona)
  for update;

  if found then
    update public.tarifas
       set zona=v_zona,
           precio_base=coalesce(p_precio_base,0),
           precio_hora=coalesce(p_precio_hora,0),
           precio_min=coalesce(p_precio_min,0),
           precio_max=nullif(coalesce(p_precio_max,0),0),
           activa=true,
           updated_at=now()
     where id=v_row.id
     returning * into v_row;
  else
    insert into public.tarifas(categoria_id,zona,precio_base,precio_hora,precio_min,precio_max,activa)
    values(p_categoria_id,v_zona,coalesce(p_precio_base,0),coalesce(p_precio_hora,0),coalesce(p_precio_min,0),nullif(coalesce(p_precio_max,0),0),true)
    returning * into v_row;
  end if;

  insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles)
  values('admin.tarifa.upsert',auth.uid(),'tarifa',v_row.id,jsonb_build_object(
    'categoria_id',v_row.categoria_id,'zona',v_row.zona,'precio_base',v_row.precio_base,
    'precio_hora',v_row.precio_hora,'precio_min',v_row.precio_min,'precio_max',v_row.precio_max
  ));
  return v_row;
end;
$$;

create or replace function public.admin_set_tarifa_activa(p_tarifa_id uuid,p_activa boolean)
returns public.tarifas
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare v_row public.tarifas%rowtype;
begin
  if auth.uid() is null or not private.is_admin(auth.uid()) then
    raise exception 'Acceso Admin requerido';
  end if;
  update public.tarifas set activa=coalesce(p_activa,false),updated_at=now()
  where id=p_tarifa_id returning * into v_row;
  if not found then raise exception 'Tarifa inexistente'; end if;
  insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles)
  values('admin.tarifa.estado',auth.uid(),'tarifa',v_row.id,jsonb_build_object('activa',v_row.activa));
  return v_row;
end;
$$;

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
  order by
    case
      when nullif(btrim(coalesce(p_zona,'')),'') is not null and lower(btrim(t.zona))=lower(btrim(p_zona)) then 0
      when lower(coalesce(p_direccion,'')) like '%'||lower(btrim(t.zona))||'%' and lower(btrim(t.zona)) not in ('general','global','todas') then 1
      when lower(btrim(t.zona)) in ('general','global','todas') then 2
      else 3
    end,
    t.updated_at desc
  limit 1;
$$;

revoke all on function public.admin_upsert_tarifa(uuid,text,numeric,numeric,numeric,numeric) from public,anon;
grant execute on function public.admin_upsert_tarifa(uuid,text,numeric,numeric,numeric,numeric) to authenticated;
revoke all on function public.admin_set_tarifa_activa(uuid,boolean) from public,anon;
grant execute on function public.admin_set_tarifa_activa(uuid,boolean) to authenticated;
revoke all on function public.cotizar_tarifa_servicio(uuid,text,text) from public,anon;
grant execute on function public.cotizar_tarifa_servicio(uuid,text,text) to authenticated;

notify pgrst,'reload schema';
