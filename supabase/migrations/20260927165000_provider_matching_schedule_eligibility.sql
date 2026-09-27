-- UGO P0 · Matching must only alert providers who could actually accept the service.
-- Reuses the same scheduling invariants enforced at aceptar_oferta_impl:
-- immediate work is blocked by live/unplanned work; compatible future work remains eligible.

create or replace function private.proveedor_puede_recibir_oferta(
  p_proveedor_id uuid,
  p_servicio_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_target public.servicios%rowtype;
  v_target_start timestamptz;
  v_target_end timestamptz;
  v_target_duration integer;
  v_buffer interval := interval '30 minutes';
begin
  select * into v_target
  from public.servicios
  where id=p_servicio_id;

  if not found or v_target.proveedor_id is not null
     or v_target.estado not in ('borrador','buscando','ofrecido') then
    return false;
  end if;

  v_target_start := v_target.programado_para;
  v_target_duration := private.service_duration_minutes(v_target.metadata);
  v_target_end := coalesce(v_target_start,now()) + make_interval(mins=>v_target_duration);

  if v_target_start is not null and v_target_start < now() - interval '15 minutes' then
    return false;
  end if;

  if exists(
    select 1
    from public.servicios existing
    where existing.proveedor_id=p_proveedor_id
      and existing.id<>p_servicio_id
      and existing.estado in ('en_camino','llegado','en_progreso')
  ) then
    if v_target_start is null then return false; end if;

    if exists(
      select 1
      from public.servicios existing
      where existing.proveedor_id=p_proveedor_id
        and existing.id<>p_servicio_id
        and existing.estado in ('en_camino','llegado','en_progreso')
        and v_target_start < (
          case
            when existing.estado='en_progreso' and existing.iniciado_at is not null then
              greatest(
                existing.iniciado_at
                  + make_interval(mins=>private.service_duration_minutes(existing.metadata))
                  + v_buffer,
                now()+v_buffer
              )
            else
              greatest(coalesce(existing.programado_para,now()),now())
                + make_interval(mins=>private.service_duration_minutes(existing.metadata))
                + v_buffer
          end
        )
    ) then
      return false;
    end if;
  end if;

  if v_target_start is null then
    if exists(
      select 1 from public.servicios existing
      where existing.proveedor_id=p_proveedor_id
        and existing.id<>p_servicio_id
        and existing.estado='asignado'
        and existing.programado_para is null
    ) then
      return false;
    end if;

    if exists(
      select 1 from public.servicios existing
      where existing.proveedor_id=p_proveedor_id
        and existing.id<>p_servicio_id
        and existing.estado='asignado'
        and existing.programado_para is not null
        and existing.programado_para < v_target_end + v_buffer
        and existing.programado_para
              + make_interval(mins=>private.service_duration_minutes(existing.metadata))
            > now() - v_buffer
    ) then
      return false;
    end if;
  else
    if exists(
      select 1 from public.servicios existing
      where existing.proveedor_id=p_proveedor_id
        and existing.id<>p_servicio_id
        and existing.estado='asignado'
        and existing.programado_para is null
    ) then
      return false;
    end if;

    if exists(
      select 1 from public.servicios existing
      where existing.proveedor_id=p_proveedor_id
        and existing.id<>p_servicio_id
        and existing.estado='asignado'
        and existing.programado_para is not null
        and existing.programado_para < v_target_end + v_buffer
        and existing.programado_para
              + make_interval(mins=>private.service_duration_minutes(existing.metadata))
            > v_target_start - v_buffer
    ) then
      return false;
    end if;
  end if;

  return true;
end;
$$;

revoke all on function private.proveedor_puede_recibir_oferta(uuid,uuid) from public,anon,authenticated;

do $$
declare
  v_def text;
begin
  select pg_get_functiondef('private.iniciar_matching_impl(uuid)'::regprocedure) into v_def;

  if position('private.proveedor_puede_recibir_oferta(o.proveedor_id,p_servicio_id)' in v_def)=0 then
    if position('and not private.proveedor_bloqueado_por_deuda_ugo(o.proveedor_id)' in v_def)=0 then
      raise exception 'No se encontró el guard de deuda de ofertas pendientes';
    end if;
    v_def := replace(
      v_def,
      'and not private.proveedor_bloqueado_por_deuda_ugo(o.proveedor_id)',
      E'and not private.proveedor_bloqueado_por_deuda_ugo(o.proveedor_id)\n          and private.proveedor_puede_recibir_oferta(o.proveedor_id,p_servicio_id)'
    );
  end if;

  if position('private.proveedor_puede_recibir_oferta(u.id,p_servicio_id)' in v_def)=0 then
    if position('and not private.proveedor_bloqueado_por_deuda_ugo(u.id)' in v_def)=0 then
      raise exception 'No se encontró el guard de deuda de candidatos';
    end if;
    v_def := replace(
      v_def,
      'and not private.proveedor_bloqueado_por_deuda_ugo(u.id)',
      E'and not private.proveedor_bloqueado_por_deuda_ugo(u.id)\n      and private.proveedor_puede_recibir_oferta(u.id,p_servicio_id)'
    );
  end if;

  execute v_def;
end
$$;

notify pgrst,'reload schema';
