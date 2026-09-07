-- UGO pre-production hardening: privacy, lifecycle invariants and REAL-only admin metrics.

-- 1) Provider base profiles are private. Public discovery must go through proveedores_mapa.
drop policy if exists proveedor_select on public.perfiles_proveedor;
drop policy if exists proveedor_select_private on public.perfiles_proveedor;
create policy proveedor_select_private on public.perfiles_proveedor
for select to authenticated
using (usuario_id = auth.uid() or private.is_admin(auth.uid()));

-- Keep the public provider view shape compatible, but never expose payment/onboarding fields,
-- phone, or exact live coordinates. Offline providers do not expose a map point.
create or replace view public.proveedores_mapa as
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
  case when pp.online and pp.disponible and pp.ubicacion is not null
    then (round((st_y(pp.ubicacion::geometry) / 0.02)::numeric) * 0.02)::double precision
    else null::double precision end as lat,
  case when pp.online and pp.disponible and pp.ubicacion is not null
    then (round((st_x(pp.ubicacion::geometry) / 0.02)::numeric) * 0.02)::double precision
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
join public.usuarios u on u.id = pp.usuario_id
left join public.categorias c on c.id = pp.categoria_principal_id
where u.activo = true
  and pp.estado_verificacion = 'verificado';

alter view public.proveedores_mapa set (security_invoker = false);
revoke all on public.proveedores_mapa from anon, authenticated;
grant select on public.proveedores_mapa to authenticated;

-- 2) Server-side lifecycle checks: the UI is never the only enforcement layer.
create or replace function private.aprobar_servicio_impl(p_servicio_id uuid)
returns public.servicios
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_servicio public.servicios%rowtype;
  v_pago public.pagos%rowtype;
  v_completed_count integer;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  select * into v_servicio from public.servicios where id=p_servicio_id for update;
  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.cliente_id <> auth.uid() and not private.is_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  if v_servicio.estado <> 'esperando_aprobacion' then raise exception 'El servicio todavía no puede aprobarse'; end if;

  if not exists (
    select 1 from public.evidencias_servicio e
    where e.servicio_id=p_servicio_id
      and e.tipo='despues'
      and e.usuario_id=v_servicio.proveedor_id
      and nullif(trim(coalesce(e.storage_path,'')),'') is not null
  ) then
    raise exception 'Falta la evidencia final del proveedor';
  end if;

  select * into v_pago from public.pagos
   where servicio_id=p_servicio_id
     and ambiente=v_servicio.ambiente
   order by created_at desc
   limit 1 for update;
  if not found or v_pago.estado <> 'retenido' or
     (nullif(btrim(coalesce(v_pago.mp_payment_id,'')),'') is null and
      nullif(btrim(coalesce(v_pago.pix_e2e_id,'')),'') is null and
      nullif(btrim(coalesce(v_pago.pago_externo_id,'')),'') is null) then
    raise exception 'El pago todavía no está confirmado y protegido';
  end if;

  update public.servicios set estado='completado', completado_at=now(), updated_at=now()
   where id=p_servicio_id returning * into v_servicio;
  update public.pagos set estado='liberado', liberado_at=now(), updated_at=now() where id=v_pago.id;

  select count(*)::integer into v_completed_count from public.servicios s
   where s.proveedor_id=v_servicio.proveedor_id and s.estado='completado';
  update public.usuarios set servicios_completados=v_completed_count where id=v_servicio.proveedor_id;
  return v_servicio;
end;
$$;

create or replace function private.avanzar_servicio_impl(p_servicio_id uuid, p_estado public.servicio_estado)
returns public.servicios
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_servicio public.servicios%rowtype;
  v_dist_m double precision;
  v_demo boolean := false;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  select * into v_servicio from public.servicios where id=p_servicio_id for update;
  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.proveedor_id <> auth.uid() and not private.is_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  v_demo := private.is_demo_service(p_servicio_id) and private.is_demo_account(auth.uid(),'proveedor');

  if not (
    (v_servicio.estado='asignado' and p_estado='en_camino') or
    (v_servicio.estado='en_camino' and p_estado='llegado') or
    (v_servicio.estado='llegado' and p_estado='en_progreso') or
    (v_servicio.estado='en_progreso' and p_estado='esperando_aprobacion')
  ) then raise exception 'Transición de estado no permitida'; end if;

  if v_servicio.estado='asignado' and p_estado='en_camino' and not private.is_admin(auth.uid()) then
    if not exists (
      select 1 from public.pagos p
       where p.servicio_id=p_servicio_id
         and p.ambiente=v_servicio.ambiente
         and p.estado='retenido'
         and (
           nullif(btrim(coalesce(p.mp_payment_id,'')),'') is not null or
           nullif(btrim(coalesce(p.pix_e2e_id,'')),'') is not null or
           nullif(btrim(coalesce(p.pago_externo_id,'')),'') is not null
         )
    ) then raise exception 'El pago todavía no está protegido'; end if;
  end if;

  if v_servicio.estado='en_camino' and p_estado='llegado' and not private.is_admin(auth.uid()) and not v_demo and v_servicio.ubicacion_cliente is not null then
    select st_distance(pp.ubicacion, v_servicio.ubicacion_cliente) into v_dist_m
      from public.perfiles_proveedor pp where pp.usuario_id=auth.uid() and pp.ubicacion is not null;
    if v_dist_m is null then raise exception 'Actualizá tu ubicación antes de confirmar llegada'; end if;
    if v_dist_m > 200 then raise exception 'Todavía estás demasiado lejos del cliente para confirmar llegada'; end if;
  end if;

  if v_servicio.estado='en_progreso' and p_estado='esperando_aprobacion' and not private.is_admin(auth.uid()) then
    if not exists (
      select 1 from public.evidencias_servicio e
       where e.servicio_id=p_servicio_id
         and e.usuario_id=auth.uid()
         and e.tipo='despues'
         and nullif(trim(coalesce(e.storage_path,'')),'') is not null
    ) then raise exception 'Agregá al menos una foto final antes de pedir aprobación'; end if;
  end if;

  update public.servicios set estado=p_estado,
    iniciado_at=case when p_estado='en_progreso' then coalesce(iniciado_at,now()) else iniciado_at end,
    updated_at=now()
  where id=p_servicio_id returning * into v_servicio;
  return v_servicio;
end;
$$;

-- 3) Admin analytics must never mix DEMO money/operations into REAL KPIs.
create or replace view public.vista_admin_dashboard with (security_invoker=true) as
select
  (select count(*) from public.servicios s where s.ambiente='real' and s.estado in ('buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion') and private.is_admin(auth.uid())) as servicios_activos,
  coalesce((select sum(p.monto_bruto) from public.pagos p where p.ambiente='real' and p.estado='retenido' and coalesce(p.mp_payment_id,p.pix_e2e_id,p.pago_externo_id) is not null and private.is_admin(auth.uid())),0) as boveda_total,
  (select count(*) from public.perfiles_proveedor pp join public.usuarios u on u.id=pp.usuario_id where u.activo and coalesce(u.es_demo,false)=false and pp.online and private.is_admin(auth.uid())) as proveedores_online,
  (select count(*) from public.usuarios u where u.tipo='proveedor' and u.activo and coalesce(u.es_demo,false)=false and private.is_admin(auth.uid())) as proveedores_total,
  (select count(*) from public.disputas d join public.servicios s on s.id=d.servicio_id where s.ambiente='real' and d.estado in ('abierta','en_revision') and private.is_admin(auth.uid())) as disputas_abiertas,
  coalesce((select sum(coalesce(p.monto_bruto,s.tarifa,0)) from public.disputas d join public.servicios s on s.id=d.servicio_id left join public.pagos p on p.servicio_id=s.id and p.ambiente='real' where s.ambiente='real' and d.estado in ('abierta','en_revision') and private.is_admin(auth.uid())),0) as monto_disputado,
  (select count(*) from public.perfiles_proveedor pp join public.usuarios u on u.id=pp.usuario_id where u.activo and coalesce(u.es_demo,false)=false and pp.estado_verificacion not in ('aprobado','verificado') and private.is_admin(auth.uid())) as docs_pendientes,
  coalesce((select sum(p.monto_bruto) from public.pagos p where p.ambiente='real' and p.created_at::date=current_date and p.estado in ('retenido','liberado') and coalesce(p.mp_payment_id,p.pix_e2e_id,p.pago_externo_id) is not null and private.is_admin(auth.uid())),0) as ingresos_hoy,
  coalesce((select sum(p.comision_ugo) from public.pagos p where p.ambiente='real' and p.created_at::date=current_date and p.estado in ('retenido','liberado') and coalesce(p.mp_payment_id,p.pix_e2e_id,p.pago_externo_id) is not null and private.is_admin(auth.uid())),0) as comision_hoy,
  coalesce((select sum(p.monto_bruto) from public.pagos p where p.ambiente='real' and p.created_at>=date_trunc('month',now()) and p.estado in ('retenido','liberado') and coalesce(p.mp_payment_id,p.pix_e2e_id,p.pago_externo_id) is not null and private.is_admin(auth.uid())),0) as ingresos_mes,
  (select count(*) from public.usuarios u where u.tipo='cliente' and u.activo and coalesce(u.es_demo,false)=false and private.is_admin(auth.uid())) as clientes_total,
  now() as snapshot_at;

create or replace view public.vista_kpis_conversion with (security_invoker=true) as
with svc as (
  select * from public.servicios where ambiente='real' and created_at>=now()-interval '30 days' and private.is_admin(auth.uid())
), agg as (
  select count(*)::numeric total,
    count(*) filter (where estado in ('asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado','disputado'))::numeric confirmados,
    count(*) filter (where estado='cancelado')::numeric cancelados,
    avg(extract(epoch from aceptado_at-created_at)/60.0) filter (where aceptado_at is not null) tiempo_respuesta_prom_min
  from svc
), pay as (
  select avg(monto_bruto) ticket_prom,coalesce(sum(comision_ugo),0) comision_total
  from public.pagos where ambiente='real' and created_at>=now()-interval '30 days' and estado in ('retenido','liberado') and coalesce(mp_payment_id,pix_e2e_id,pago_externo_id) is not null and private.is_admin(auth.uid())
)
select round(case when agg.total>0 then agg.confirmados*100/agg.total else 0 end,1) tasa_conversion_pct,
  agg.confirmados::bigint confirmados,
  round(coalesce(agg.tiempo_respuesta_prom_min,0),1) tiempo_respuesta_prom_min,
  round(case when agg.total>0 then agg.cancelados*100/agg.total else 0 end,1) tasa_abandono_pct,
  agg.cancelados::bigint cancelados,
  round(coalesce(pay.ticket_prom,0),2) ticket_prom,
  round(coalesce(pay.comision_total,0),2) comision_total
from agg cross join pay;

create or replace view public.metricas_dia with (security_invoker=true) as
with dias as (
  select generate_series(current_date-29,current_date,'1 day'::interval)::date fecha
), svc as (
  select created_at::date fecha,count(*)::integer servicios_totales,
    count(*) filter(where estado='completado')::integer servicios_completados,
    count(*) filter(where estado='cancelado')::integer servicios_cancelados
  from public.servicios where ambiente='real' and created_at>=current_date-interval '29 days' and private.is_admin(auth.uid()) group by created_at::date
), pay as (
  select created_at::date fecha,coalesce(sum(monto_bruto),0) ingresos_brutos,coalesce(sum(comision_ugo),0) comision_ugo
  from public.pagos where ambiente='real' and created_at>=current_date-interval '29 days' and estado in ('retenido','liberado') and coalesce(mp_payment_id,pix_e2e_id,pago_externo_id) is not null and private.is_admin(auth.uid()) group by created_at::date
)
select d.fecha,coalesce(pay.ingresos_brutos,0) ingresos_brutos,coalesce(pay.comision_ugo,0) comision_ugo,
  coalesce(svc.servicios_completados,0) servicios_completados,coalesce(svc.servicios_totales,0) servicios_totales,coalesce(svc.servicios_cancelados,0) servicios_cancelados
from dias d left join svc using(fecha) left join pay using(fecha) where private.is_admin(auth.uid());
