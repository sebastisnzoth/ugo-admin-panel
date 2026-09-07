-- UGO Admin metrics must never mix DEMO into REAL operations or money.

create or replace view public.vista_admin_dashboard with (security_invoker=true) as
select
  (select count(*) from public.servicios s where s.ambiente='real' and s.estado in ('buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion') and private.is_admin(auth.uid())) as servicios_activos,
  coalesce((select sum(p.monto_bruto) from public.pagos p where p.ambiente='real' and p.estado='retenido' and coalesce(p.mp_payment_id,p.pix_e2e_id,p.pago_externo_id) is not null and private.is_admin(auth.uid())),0) as boveda_total,
  (select count(*) from public.perfiles_proveedor pp join public.usuarios u on u.id=pp.usuario_id where u.activo and coalesce(u.es_demo,false)=false and pp.online and private.is_admin(auth.uid())) as proveedores_online,
  (select count(*) from public.usuarios u where u.tipo='proveedor' and u.activo and coalesce(u.es_demo,false)=false and private.is_admin(auth.uid())) as proveedores_total,
  (select count(*) from public.disputas d join public.servicios s on s.id=d.servicio_id where s.ambiente='real' and d.estado in ('abierta','en_revision') and private.is_admin(auth.uid())) as disputas_abiertas,
  coalesce((select sum(coalesce(p.monto_bruto,s.tarifa,0)) from public.disputas d join public.servicios s on s.id=d.servicio_id left join public.pagos p on p.servicio_id=s.id and p.ambiente='real' where s.ambiente='real' and d.estado in ('abierta','en_revision') and private.is_admin(auth.uid())),0) as monto_disputado,
  (select count(*) from public.perfiles_proveedor pp join public.usuarios u on u.id=pp.usuario_id where u.activo and coalesce(u.es_demo,false)=false and pp.estado_verificacion <> 'verificado' and private.is_admin(auth.uid())) as docs_pendientes,
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
