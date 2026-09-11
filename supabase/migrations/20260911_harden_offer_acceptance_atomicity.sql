-- UGO · P0 atomicidad de aceptación de oportunidades.
--
-- La implementación histórica bloqueaba primero la oferta individual y luego el
-- servicio. Dos proveedores aceptando ofertas distintas del mismo servicio podían
-- terminar esperando locks en orden inverso: uno retenía la oferta A + servicio y
-- el otro la oferta B, mientras el primero intentaba cerrar B.
--
-- Regla nueva: todas las aceptaciones del mismo servicio se serializan bloqueando
-- primero `servicios` y recién después la oferta objetivo. Una aceptación ganadora
-- cierra el resto de ofertas pendientes; las siguientes observan el servicio ya
-- asignado y devuelven NULL sin mutar la asignación.
--
-- También evitamos `UPDATE ...; RAISE EXCEPTION` para expiraciones: un exception
-- revierte la sentencia completa y deshacía el estado `expirada`. Ahora esos casos
-- persisten la expiración y devuelven NULL; el cliente traduce NULL a una respuesta
-- de oportunidad no disponible.

create or replace function private.aceptar_oferta_impl(p_oferta_id uuid)
returns public.servicios
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_oferta public.ofertas_servicio%rowtype;
  v_servicio public.servicios%rowtype;
  v_total numeric;
  v_comision numeric;
  v_neto numeric;
begin
  if v_uid is null then
    raise exception 'Autenticación requerida';
  end if;

  -- Lectura inicial sólo para descubrir el servicio. La autorización se valida
  -- aquí y nuevamente después de adquirir los locks canónicos.
  select * into v_oferta
  from public.ofertas_servicio
  where id = p_oferta_id;

  if not found or v_oferta.proveedor_id <> v_uid then
    raise exception 'Oferta inexistente o no autorizada';
  end if;

  -- Lock canónico #1: servicio. Todas las aceptaciones competidoras pasan por
  -- esta misma fila antes de bloquear su oferta individual.
  select * into v_servicio
  from public.servicios
  where id = v_oferta.servicio_id
  for update;

  if not found then
    raise exception 'Servicio inexistente';
  end if;

  -- Lock canónico #2: oferta objetivo y relectura del estado real.
  select * into v_oferta
  from public.ofertas_servicio
  where id = p_oferta_id
  for update;

  if not found or v_oferta.proveedor_id <> v_uid or v_oferta.servicio_id <> v_servicio.id then
    raise exception 'Oferta inexistente o no autorizada';
  end if;

  -- Reintento idempotente del proveedor ganador.
  if v_oferta.estado = 'aceptada'
     and v_servicio.proveedor_id = v_uid
     and v_servicio.estado not in ('cancelado','disputado') then
    return v_servicio;
  end if;

  if v_oferta.estado <> 'pendiente' then
    return null;
  end if;

  if v_oferta.expira_at is not null and v_oferta.expira_at <= now() then
    update public.ofertas_servicio
       set estado = 'expirada', respondida_at = coalesce(respondida_at, now())
     where id = p_oferta_id and estado = 'pendiente';
    return null;
  end if;

  if not exists (
    select 1
    from public.usuarios u
    join public.perfiles_proveedor pp on pp.usuario_id = u.id
    where u.id = v_uid
      and u.tipo = 'proveedor'
      and u.activo = true
      and pp.estado_verificacion = 'verificado'
      and pp.online = true
      and pp.disponible = true
  ) then
    raise exception 'Debés estar verificado, online y disponible para aceptar';
  end if;

  -- El lock del servicio hace que esta comprobación sea definitiva para esta
  -- transacción: sólo un proveedor puede atravesarla.
  if v_servicio.proveedor_id is not null
     or v_servicio.estado not in ('buscando','ofrecido') then
    update public.ofertas_servicio
       set estado = 'expirada', respondida_at = coalesce(respondida_at, now())
     where id = p_oferta_id and estado = 'pendiente';
    return null;
  end if;

  update public.servicios
     set proveedor_id = v_uid,
         estado = 'asignado',
         aceptado_at = coalesce(aceptado_at, now()),
         updated_at = now()
   where id = v_servicio.id
     and proveedor_id is null
     and estado in ('buscando','ofrecido')
  returning * into v_servicio;

  if not found then
    -- Defensa adicional ante cualquier transición externa inesperada mientras
    -- la fila estaba bloqueada. No se reemplaza una asignación existente.
    update public.ofertas_servicio
       set estado = 'expirada', respondida_at = coalesce(respondida_at, now())
     where id = p_oferta_id and estado = 'pendiente';
    return null;
  end if;

  update public.ofertas_servicio
     set estado = case
                    when id = p_oferta_id then 'aceptada'::public.oferta_estado
                    else 'rechazada'::public.oferta_estado
                  end,
         respondida_at = coalesce(respondida_at, now())
   where servicio_id = v_servicio.id
     and estado = 'pendiente';

  v_total := coalesce(v_oferta.tarifa_ofrecida, v_servicio.tarifa, 0);
  if v_total > 0 then
    v_comision := round(v_total * 0.15, 2);
    v_neto := v_total - v_comision;
    update public.servicios
       set tarifa = v_total,
           comision_ugo = v_comision,
           ganancia_proveedor = v_neto,
           updated_at = now()
     where id = v_servicio.id
    returning * into v_servicio;
  end if;

  return v_servicio;
end;
$$;

-- El helper sigue fuera del API expuesto. El wrapper público es el contrato RPC.
revoke execute on function private.aceptar_oferta_impl(uuid) from public, anon;
grant execute on function private.aceptar_oferta_impl(uuid) to authenticated, service_role;
