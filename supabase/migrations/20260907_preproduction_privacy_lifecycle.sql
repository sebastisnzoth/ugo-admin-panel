-- UGO pre-production privacy + lifecycle hardening.

drop policy if exists proveedor_select on public.perfiles_proveedor;
drop policy if exists proveedor_select_private on public.perfiles_proveedor;
create policy proveedor_select_private on public.perfiles_proveedor
for select to authenticated
using (usuario_id = auth.uid() or private.is_admin(auth.uid()));

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
where u.activo = true and pp.estado_verificacion = 'verificado';

alter view public.proveedores_mapa set (security_invoker = false);
revoke all on public.proveedores_mapa from anon, authenticated;
grant select on public.proveedores_mapa to authenticated;

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
  ) then raise exception 'Falta la evidencia final del proveedor'; end if;

  select * into v_pago from public.pagos
   where servicio_id=p_servicio_id and ambiente=v_servicio.ambiente
   order by created_at desc limit 1 for update;
  if not found or v_pago.estado <> 'retenido' or
     (nullif(btrim(coalesce(v_pago.mp_payment_id,'')),'') is null and
      nullif(btrim(coalesce(v_pago.pix_e2e_id,'')),'') is null and
      nullif(btrim(coalesce(v_pago.pago_externo_id,'')),'') is null) then
    raise exception 'El pago todavía no está confirmado y protegido';
  end if;

  update public.servicios set estado='completado',completado_at=now(),updated_at=now()
   where id=p_servicio_id returning * into v_servicio;
  update public.pagos set estado='liberado',liberado_at=now(),updated_at=now() where id=v_pago.id;

  select count(*)::integer into v_completed_count from public.servicios s
   where s.proveedor_id=v_servicio.proveedor_id and s.estado='completado';
  update public.usuarios set servicios_completados=v_completed_count where id=v_servicio.proveedor_id;
  return v_servicio;
end;
$$;

create or replace function private.avanzar_servicio_impl(p_servicio_id uuid,p_estado public.servicio_estado)
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

  if not ((v_servicio.estado='asignado' and p_estado='en_camino') or
          (v_servicio.estado='en_camino' and p_estado='llegado') or
          (v_servicio.estado='llegado' and p_estado='en_progreso') or
          (v_servicio.estado='en_progreso' and p_estado='esperando_aprobacion')) then
    raise exception 'Transición de estado no permitida';
  end if;

  if v_servicio.estado='asignado' and p_estado='en_camino' and not private.is_admin(auth.uid()) then
    if not exists (
      select 1 from public.pagos p
       where p.servicio_id=p_servicio_id and p.ambiente=v_servicio.ambiente and p.estado='retenido'
         and (nullif(btrim(coalesce(p.mp_payment_id,'')),'') is not null or
              nullif(btrim(coalesce(p.pix_e2e_id,'')),'') is not null or
              nullif(btrim(coalesce(p.pago_externo_id,'')),'') is not null)
    ) then raise exception 'El pago todavía no está protegido'; end if;
  end if;

  if v_servicio.estado='en_camino' and p_estado='llegado' and not private.is_admin(auth.uid()) and not v_demo and v_servicio.ubicacion_cliente is not null then
    select st_distance(pp.ubicacion,v_servicio.ubicacion_cliente) into v_dist_m
      from public.perfiles_proveedor pp where pp.usuario_id=auth.uid() and pp.ubicacion is not null;
    if v_dist_m is null then raise exception 'Actualizá tu ubicación antes de confirmar llegada'; end if;
    if v_dist_m > 200 then raise exception 'Todavía estás demasiado lejos del cliente para confirmar llegada'; end if;
  end if;

  if v_servicio.estado='en_progreso' and p_estado='esperando_aprobacion' and not private.is_admin(auth.uid()) then
    if not exists (
      select 1 from public.evidencias_servicio e
       where e.servicio_id=p_servicio_id and e.usuario_id=auth.uid() and e.tipo='despues'
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
