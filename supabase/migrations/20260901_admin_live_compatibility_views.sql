create or replace view public.vista_admin_dashboard
with (security_invoker=true) as
select
  count(*) filter (where s.estado::text in ('buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion'))::bigint as servicios_activos,
  coalesce((select sum(p.monto_bruto) from public.pagos p where p.estado::text='retenido' and coalesce(p.mp_payment_id,p.pix_e2e_id) is not null),0)::numeric as boveda_total,
  coalesce((select count(*) from public.perfiles_proveedor pp join public.usuarios u on u.id=pp.usuario_id where u.activo and pp.online),0)::bigint as proveedores_online,
  coalesce((select count(*) from public.usuarios u where u.tipo::text='proveedor' and u.activo),0)::bigint as proveedores_total,
  coalesce((select count(*) from public.disputas d where d.estado::text in ('abierta','en_revision')),0)::bigint as disputas_abiertas,
  coalesce((select sum(coalesce(p.monto_bruto,s2.tarifa,0)) from public.disputas d join public.servicios s2 on s2.id=d.servicio_id left join public.pagos p on p.servicio_id=s2.id where d.estado::text in ('abierta','en_revision')),0)::numeric as monto_disputado,
  coalesce((select count(*) from public.perfiles_proveedor pp join public.usuarios u on u.id=pp.usuario_id where u.activo and pp.estado_verificacion::text not in ('aprobado','verificado')),0)::bigint as docs_pendientes,
  coalesce((select sum(p.monto_bruto) from public.pagos p where p.created_at::date=current_date and p.estado::text in ('retenido','liberado') and coalesce(p.mp_payment_id,p.pix_e2e_id) is not null),0)::numeric as ingresos_hoy,
  coalesce((select sum(p.comision_ugo) from public.pagos p where p.created_at::date=current_date and p.estado::text in ('retenido','liberado') and coalesce(p.mp_payment_id,p.pix_e2e_id) is not null),0)::numeric as comision_hoy,
  coalesce((select sum(p.monto_bruto) from public.pagos p where p.created_at>=date_trunc('month',now()) and p.estado::text in ('retenido','liberado') and coalesce(p.mp_payment_id,p.pix_e2e_id) is not null),0)::numeric as ingresos_mes,
  coalesce((select count(*) from public.usuarios u where u.tipo::text='cliente' and u.activo),0)::bigint as clientes_total,
  now() as snapshot_at
from public.servicios s
where private.is_admin(auth.uid());

create or replace view public.vista_kpis_conversion
with (security_invoker=true) as
with svc as (
  select * from public.servicios
  where created_at>=now()-interval '30 days' and private.is_admin(auth.uid())
), agg as (
  select count(*)::numeric total,
         count(*) filter (where estado::text in ('asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado','disputado'))::numeric confirmados,
         count(*) filter (where estado::text='cancelado')::numeric cancelados,
         avg(extract(epoch from (aceptado_at-created_at))/60.0) filter (where aceptado_at is not null) tiempo_respuesta_prom_min
  from svc
), pay as (
  select avg(monto_bruto)::numeric ticket_prom, coalesce(sum(comision_ugo),0)::numeric comision_total
  from public.pagos
  where created_at>=now()-interval '30 days' and estado::text in ('retenido','liberado')
    and coalesce(mp_payment_id,pix_e2e_id) is not null and private.is_admin(auth.uid())
)
select round(case when agg.total>0 then agg.confirmados*100/agg.total else 0 end,1) tasa_conversion_pct,
       agg.confirmados::bigint confirmados,
       round(coalesce(agg.tiempo_respuesta_prom_min,0)::numeric,1) tiempo_respuesta_prom_min,
       round(case when agg.total>0 then agg.cancelados*100/agg.total else 0 end,1) tasa_abandono_pct,
       agg.cancelados::bigint cancelados,
       round(coalesce(pay.ticket_prom,0),2) ticket_prom,
       round(coalesce(pay.comision_total,0),2) comision_total
from agg cross join pay;

create or replace view public.vista_alertas_sistema with (security_invoker=true) as
select 'disputa:'||d.id::text id,'critical'::text severidad,
       'Disputa abierta en servicio #'||coalesce(s.numero::text,'')||': '||left(coalesce(d.motivo,'Sin motivo'),120) descripcion,d.created_at
from public.disputas d join public.servicios s on s.id=d.servicio_id
where d.estado::text in ('abierta','en_revision') and private.is_admin(auth.uid())
union all
select 'pago:'||p.id::text,'warning','Pago fallido en servicio #'||coalesce(s.numero::text,'')||' · '||coalesce(p.metodo,p.procesador,'pago'),p.updated_at
from public.pagos p join public.servicios s on s.id=p.servicio_id
where p.estado::text='fallido' and p.updated_at>=now()-interval '7 days' and private.is_admin(auth.uid())
union all
select 'retiro:'||r.id::text,'warning','Retiro fallido por R$ '||to_char(r.monto,'FM999999990.00'),coalesce(r.procesado_at,r.created_at)
from public.retiros r where r.estado::text='fallido' and r.created_at>=now()-interval '30 days' and private.is_admin(auth.uid())
union all
select 'verificacion:'||pp.usuario_id::text,'info','Proveedor pendiente de verificación: '||u.nombre,pp.updated_at
from public.perfiles_proveedor pp join public.usuarios u on u.id=pp.usuario_id
where u.activo and pp.estado_verificacion::text not in ('aprobado','verificado') and private.is_admin(auth.uid());

create or replace view public.metricas_dia with (security_invoker=true) as
with dias as (select generate_series(current_date-interval '29 days',current_date,interval '1 day')::date fecha),
svc as (
  select created_at::date fecha,count(*)::int servicios_totales,
         count(*) filter (where estado::text='completado')::int servicios_completados,
         count(*) filter (where estado::text='cancelado')::int servicios_cancelados
  from public.servicios where created_at>=current_date-interval '29 days' and private.is_admin(auth.uid()) group by 1
), pay as (
  select created_at::date fecha,coalesce(sum(monto_bruto),0)::numeric ingresos_brutos,coalesce(sum(comision_ugo),0)::numeric comision_ugo
  from public.pagos where created_at>=current_date-interval '29 days' and estado::text in ('retenido','liberado')
    and coalesce(mp_payment_id,pix_e2e_id) is not null and private.is_admin(auth.uid()) group by 1
)
select d.fecha,coalesce(pay.ingresos_brutos,0)::numeric ingresos_brutos,coalesce(pay.comision_ugo,0)::numeric comision_ugo,
       coalesce(svc.servicios_completados,0)::int servicios_completados,coalesce(svc.servicios_totales,0)::int servicios_totales,
       coalesce(svc.servicios_cancelados,0)::int servicios_cancelados
from dias d left join svc using(fecha) left join pay using(fecha)
where private.is_admin(auth.uid());

create or replace view public.vista_todos_proveedores with (security_invoker=true) as
select pp.usuario_id id,u.nombre,u.apellido,u.karma,
       case when pp.ubicacion is null then null::double precision else st_y(pp.ubicacion::geometry) end lat,
       case when pp.ubicacion is null then null::double precision else st_x(pp.ubicacion::geometry) end lng,
       u.zona,u.pais,pp.telefono_profesional telefono,coalesce(c.slug,c.nombre) categoria,c.emoji cat_emoji,
       case when not u.activo then '#E11900' when pp.online then '#05944F' else '#F59E0B' end pin_color,
       case when not u.activo then 'inactivo' when pp.online then 'online' else 'offline' end estado_mapa,
       u.activo,pp.online,u.servicios_completados
from public.perfiles_proveedor pp join public.usuarios u on u.id=pp.usuario_id
left join public.categorias c on c.id=pp.categoria_principal_id
where private.is_admin(auth.uid());

grant select on public.vista_admin_dashboard,public.vista_kpis_conversion,public.vista_alertas_sistema,public.metricas_dia,public.vista_todos_proveedores to authenticated;
revoke all on public.vista_admin_dashboard,public.vista_kpis_conversion,public.vista_alertas_sistema,public.metricas_dia,public.vista_todos_proveedores from anon;
