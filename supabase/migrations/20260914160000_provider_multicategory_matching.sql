-- UGO · proveedor multirubro sobre el matching canónico.
--
-- Mantiene categoria_principal_id por compatibilidad/UI, pero permite que un
-- profesional habilite rubros secundarios sin crear otro perfil ni otro flujo.
-- El matching, la tarifa y la asignación siguen usando el mismo serviceId y las
-- mismas funciones canónicas.

create table if not exists public.proveedor_categorias (
  proveedor_id uuid not null references public.perfiles_proveedor(usuario_id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  es_principal boolean not null default false,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (proveedor_id, categoria_id)
);

create unique index if not exists proveedor_categorias_unica_principal_idx
  on public.proveedor_categorias(proveedor_id)
  where es_principal = true and activa = true;

create index if not exists proveedor_categorias_matching_idx
  on public.proveedor_categorias(categoria_id, proveedor_id)
  where activa = true;

alter table public.proveedor_categorias enable row level security;

drop policy if exists proveedor_categorias_select on public.proveedor_categorias;
create policy proveedor_categorias_select
on public.proveedor_categorias
for select
to authenticated
using (proveedor_id = auth.uid() or private.is_admin(auth.uid()));

drop policy if exists proveedor_categorias_insert on public.proveedor_categorias;
create policy proveedor_categorias_insert
on public.proveedor_categorias
for insert
to authenticated
with check (proveedor_id = auth.uid() or private.is_admin(auth.uid()));

drop policy if exists proveedor_categorias_update on public.proveedor_categorias;
create policy proveedor_categorias_update
on public.proveedor_categorias
for update
to authenticated
using (proveedor_id = auth.uid() or private.is_admin(auth.uid()))
with check (proveedor_id = auth.uid() or private.is_admin(auth.uid()));

drop policy if exists proveedor_categorias_delete on public.proveedor_categorias;
create policy proveedor_categorias_delete
on public.proveedor_categorias
for delete
to authenticated
using (proveedor_id = auth.uid() or private.is_admin(auth.uid()));

-- Backfill: todo proveedor actual conserva exactamente el rubro que ya tenía.
insert into public.proveedor_categorias(proveedor_id,categoria_id,es_principal,activa)
select pp.usuario_id,pp.categoria_principal_id,true,true
from public.perfiles_proveedor pp
where pp.categoria_principal_id is not null
on conflict (proveedor_id,categoria_id)
do update set es_principal=true,activa=true,updated_at=now();

-- categoria_principal_id sigue siendo la categoría preferida/visible. Este
-- trigger garantiza que cambiarla nunca deja el catálogo multirubro desalineado.
create or replace function public.sync_provider_primary_category()
returns trigger
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $function$
begin
  if new.categoria_principal_id is null then
    update public.proveedor_categorias
       set es_principal=false,updated_at=now()
     where proveedor_id=new.usuario_id and es_principal=true;
    return new;
  end if;

  update public.proveedor_categorias
     set es_principal=false,updated_at=now()
   where proveedor_id=new.usuario_id
     and categoria_id<>new.categoria_principal_id
     and es_principal=true;

  insert into public.proveedor_categorias(proveedor_id,categoria_id,es_principal,activa)
  values(new.usuario_id,new.categoria_principal_id,true,true)
  on conflict (proveedor_id,categoria_id)
  do update set es_principal=true,activa=true,updated_at=now();

  return new;
end;
$function$;

revoke all on function public.sync_provider_primary_category() from public,anon,authenticated;

drop trigger if exists trg_sync_provider_primary_category on public.perfiles_proveedor;
create trigger trg_sync_provider_primary_category
after insert or update of categoria_principal_id
on public.perfiles_proveedor
for each row
execute function public.sync_provider_primary_category();

-- Un único criterio de elegibilidad para matching automático y dirigido.
create or replace function private.proveedor_trabaja_categoria(p_proveedor_id uuid,p_categoria_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $function$
  select exists(
    select 1
    from public.proveedor_categorias pc
    join public.categorias c on c.id=pc.categoria_id
    where pc.proveedor_id=p_proveedor_id
      and pc.categoria_id=p_categoria_id
      and pc.activa=true
      and c.activa=true
  ) or exists(
    select 1
    from public.perfiles_proveedor pp
    join public.categorias c on c.id=pp.categoria_principal_id
    where pp.usuario_id=p_proveedor_id
      and pp.categoria_principal_id=p_categoria_id
      and c.activa=true
  );
$function$;

revoke execute on function private.proveedor_trabaja_categoria(uuid,uuid) from public,anon;
grant execute on function private.proveedor_trabaja_categoria(uuid,uuid) to authenticated,service_role;

-- RPC pequeño y atómico para que el Proveedor pueda mantener un rubro principal
-- y varios rubros secundarios sin hacer deletes parciales desde la UI.
create or replace function public.guardar_categorias_proveedor(
  p_categoria_principal_id uuid,
  p_categorias uuid[]
)
returns void
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $function$
declare
  v_uid uuid:=auth.uid();
  v_ids uuid[];
begin
  if v_uid is null then raise exception 'Autenticación requerida'; end if;
  if p_categoria_principal_id is null then raise exception 'Elegí una categoría principal'; end if;

  select array_agg(distinct x)
    into v_ids
  from unnest(coalesce(p_categorias,array[]::uuid[]) || array[p_categoria_principal_id]) x;

  if exists(
    select 1
    from unnest(v_ids) x
    left join public.categorias c on c.id=x and c.activa=true
    where c.id is null
  ) then
    raise exception 'Una de las categorías elegidas no está disponible';
  end if;

  if not exists(
    select 1 from public.perfiles_proveedor pp
    where pp.usuario_id=v_uid
  ) then
    raise exception 'Perfil de proveedor inexistente';
  end if;

  update public.proveedor_categorias
     set activa=false,es_principal=false,updated_at=now()
   where proveedor_id=v_uid
     and not (categoria_id=any(v_ids));

  update public.proveedor_categorias
     set es_principal=false,updated_at=now()
   where proveedor_id=v_uid and es_principal=true;

  insert into public.proveedor_categorias(proveedor_id,categoria_id,es_principal,activa)
  select v_uid,x,(x=p_categoria_principal_id),true
  from unnest(v_ids) x
  on conflict (proveedor_id,categoria_id)
  do update set
    es_principal=excluded.es_principal,
    activa=true,
    updated_at=now();

  update public.perfiles_proveedor
     set categoria_principal_id=p_categoria_principal_id,
         updated_at=now()
   where usuario_id=v_uid;
end;
$function$;

revoke execute on function public.guardar_categorias_proveedor(uuid,uuid[]) from public,anon;
grant execute on function public.guardar_categorias_proveedor(uuid,uuid[]) to authenticated;

-- Conserva el contrato de tarifa real del matching vigente; sólo cambia la
-- elegibilidad para que también entren los rubros secundarios activos.
create or replace function private.iniciar_matching_impl(p_servicio_id uuid)
returns table(oferta_id uuid, proveedor_id uuid, proveedor_nombre text, karma numeric, distancia_km numeric, tarifa_ofrecida numeric, ranking integer)
language plpgsql
security definer
set search_path to 'public','private','extensions','pg_temp'
as $function$
declare
  v_servicio public.servicios%rowtype;
  v_count integer;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;

  select * into v_servicio
  from public.servicios
  where id=p_servicio_id
  for update;

  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.cliente_id<>auth.uid() and not private.is_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;
  if v_servicio.estado not in ('borrador','buscando','ofrecido') then
    raise exception 'El servicio ya no admite matching';
  end if;

  update public.ofertas_servicio
     set estado='expirada',respondida_at=now()
   where servicio_id=p_servicio_id and estado='pendiente';

  with candidatos as (
    select
      u.id as candidato_proveedor_id,
      u.nombre,
      u.karma,
      case
        when v_servicio.ubicacion_cliente is not null and pp.ubicacion is not null
          then round((extensions.st_distance(v_servicio.ubicacion_cliente,pp.ubicacion)/1000.0)::numeric,2)
        else null
      end as candidato_distancia_km,
      case
        when v_servicio.tarifa is not null and v_servicio.tarifa>0 then v_servicio.tarifa
        when pp.tarifa_base is not null and pp.tarifa_base>0 then pp.tarifa_base
        else null
      end as candidato_tarifa,
      row_number() over(
        order by
          case when pp.categoria_principal_id=v_servicio.categoria_id then 0 else 1 end,
          u.karma desc,
          pp.updated_at desc
      )::integer as candidato_ranking
    from public.usuarios u
    join public.perfiles_proveedor pp on pp.usuario_id=u.id
    where u.tipo='proveedor'
      and u.activo=true
      and pp.disponible=true
      and pp.online=true
      and pp.estado_verificacion='verificado'
      and u.id<>v_servicio.cliente_id
      and private.proveedor_trabaja_categoria(u.id,v_servicio.categoria_id)
      and (
        (v_servicio.tarifa is not null and v_servicio.tarifa>0)
        or (pp.tarifa_base is not null and pp.tarifa_base>0)
      )
    limit 3
  ), inserted as (
    insert into public.ofertas_servicio as os(
      servicio_id,proveedor_id,estado,ranking,distancia_km,tarifa_ofrecida,expira_at
    )
    select
      p_servicio_id,c.candidato_proveedor_id,'pendiente'::public.oferta_estado,
      c.candidato_ranking,c.candidato_distancia_km,c.candidato_tarifa,
      now()+interval '5 minutes'
    from candidatos c
    where c.candidato_tarifa is not null and c.candidato_tarifa>0
    on conflict on constraint ofertas_servicio_servicio_id_proveedor_id_key
    do update set
      estado='pendiente',ranking=excluded.ranking,
      distancia_km=excluded.distancia_km,
      tarifa_ofrecida=excluded.tarifa_ofrecida,
      expira_at=excluded.expira_at,
      respondida_at=null
    returning os.id,os.proveedor_id,os.distancia_km,os.tarifa_ofrecida,os.ranking
  )
  select count(*) into v_count from inserted;

  update public.servicios
     set estado=case when v_count>0 then 'ofrecido'::public.servicio_estado else 'buscando'::public.servicio_estado end,
         updated_at=now()
   where id=p_servicio_id;

  return query
  select o.id,o.proveedor_id,u.nombre,u.karma,o.distancia_km,o.tarifa_ofrecida,o.ranking
  from public.ofertas_servicio o
  join public.usuarios u on u.id=o.proveedor_id
  where o.servicio_id=p_servicio_id and o.estado='pendiente'
  order by o.ranking;
end;
$function$;

create or replace function public.iniciar_matching_dirigido(p_servicio_id uuid,p_proveedor_id uuid)
returns table(oferta_id uuid, proveedor_id uuid, proveedor_nombre text, karma numeric, distancia_km numeric, tarifa_ofrecida numeric, ranking integer)
language plpgsql
security definer
set search_path to 'public','private','extensions','pg_temp'
as $function$
declare
  v_servicio public.servicios%rowtype;
  v_provider record;
  v_distancia numeric;
  v_tarifa numeric;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;

  select * into v_servicio
  from public.servicios
  where id=p_servicio_id
  for update;

  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.cliente_id<>auth.uid() and not private.is_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;
  if v_servicio.estado not in ('borrador','buscando','ofrecido') then
    raise exception 'El servicio ya no admite matching';
  end if;

  select
    u.id,u.nombre,u.karma,pp.ubicacion,pp.disponible,pp.online,
    pp.categoria_principal_id,pp.estado_verificacion,pp.tarifa_base
  into v_provider
  from public.usuarios u
  join public.perfiles_proveedor pp on pp.usuario_id=u.id
  where u.id=p_proveedor_id
    and u.tipo='proveedor'
    and u.activo=true
    and pp.disponible=true
    and pp.online=true
    and pp.estado_verificacion='verificado';

  if not found then raise exception 'El proveedor está offline, no disponible o no verificado'; end if;
  if not private.proveedor_trabaja_categoria(p_proveedor_id,v_servicio.categoria_id) then
    raise exception 'El proveedor no trabaja en esta categoría';
  end if;

  v_tarifa:=case
    when v_servicio.tarifa is not null and v_servicio.tarifa>0 then v_servicio.tarifa
    when v_provider.tarifa_base is not null and v_provider.tarifa_base>0 then v_provider.tarifa_base
    else null
  end;

  if v_tarifa is null or v_tarifa<=0 then
    raise exception 'El profesional debe definir una tarifa válida antes de recibir este pedido';
  end if;

  if v_servicio.ubicacion_cliente is not null and v_provider.ubicacion is not null then
    v_distancia:=round((extensions.st_distance(v_servicio.ubicacion_cliente,v_provider.ubicacion)/1000.0)::numeric,2);
  else
    v_distancia:=null;
  end if;

  update public.ofertas_servicio
     set estado='expirada',respondida_at=now()
   where servicio_id=p_servicio_id and estado='pendiente';

  insert into public.ofertas_servicio(
    servicio_id,proveedor_id,estado,ranking,distancia_km,tarifa_ofrecida,expira_at
  ) values(
    p_servicio_id,p_proveedor_id,'pendiente'::public.oferta_estado,1,v_distancia,v_tarifa,now()+interval '5 minutes'
  )
  on conflict on constraint ofertas_servicio_servicio_id_proveedor_id_key
  do update set
    estado='pendiente',ranking=1,distancia_km=excluded.distancia_km,
    tarifa_ofrecida=excluded.tarifa_ofrecida,expira_at=excluded.expira_at,
    respondida_at=null;

  update public.servicios
     set estado='ofrecido',updated_at=now()
   where id=p_servicio_id;

  return query
  select o.id,o.proveedor_id,u.nombre,u.karma,o.distancia_km,o.tarifa_ofrecida,o.ranking
  from public.ofertas_servicio o
  join public.usuarios u on u.id=o.proveedor_id
  where o.servicio_id=p_servicio_id
    and o.proveedor_id=p_proveedor_id
    and o.estado='pendiente';
end;
$function$;

revoke execute on function private.iniciar_matching_impl(uuid) from public,anon;
grant execute on function private.iniciar_matching_impl(uuid) to authenticated,service_role;
