create or replace function private.aceptar_oferta_impl(p_oferta_id uuid)
returns public.servicios
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_oferta public.ofertas_servicio%rowtype;
  v_servicio public.servicios%rowtype;
  v_total numeric;
  v_comision numeric;
  v_neto numeric;
begin
  if auth.uid() is null then
    raise exception 'Autenticación requerida';
  end if;

  select * into v_oferta
  from public.ofertas_servicio
  where id = p_oferta_id
  for update;

  if not found or v_oferta.proveedor_id <> auth.uid() then
    raise exception 'Oferta inexistente o no autorizada';
  end if;

  if v_oferta.estado <> 'pendiente' then
    raise exception 'La oferta ya fue respondida';
  end if;

  if v_oferta.expira_at is not null and v_oferta.expira_at <= now() then
    update public.ofertas_servicio
    set estado = 'expirada', respondida_at = now()
    where id = p_oferta_id and estado = 'pendiente';
    raise exception 'La oferta venció';
  end if;

  if not exists (
    select 1
    from public.usuarios u
    join public.perfiles_proveedor pp on pp.usuario_id = u.id
    where u.id = auth.uid()
      and u.tipo = 'proveedor'
      and u.activo = true
      and pp.online = true
      and pp.disponible = true
  ) then
    raise exception 'Debés estar online y disponible para aceptar';
  end if;

  update public.servicios
  set proveedor_id = auth.uid(),
      estado = 'asignado',
      aceptado_at = now()
  where id = v_oferta.servicio_id
    and proveedor_id is null
    and estado in ('buscando','ofrecido')
  returning * into v_servicio;

  if not found then
    update public.ofertas_servicio
    set estado = 'expirada', respondida_at = now()
    where id = p_oferta_id and estado = 'pendiente';
    raise exception 'El servicio ya fue asignado';
  end if;

  update public.ofertas_servicio
  set estado = case
        when id = p_oferta_id then 'aceptada'::public.oferta_estado
        else 'rechazada'::public.oferta_estado
      end,
      respondida_at = now()
  where servicio_id = v_servicio.id
    and estado = 'pendiente';

  v_total := coalesce(v_oferta.tarifa_ofrecida, v_servicio.tarifa, 0);
  if v_total > 0 then
    v_comision := round(v_total * 0.15, 2);
    v_neto := v_total - v_comision;

    update public.servicios
    set tarifa = v_total,
        comision_ugo = v_comision,
        ganancia_proveedor = v_neto
    where id = v_servicio.id
    returning * into v_servicio;
  end if;

  return v_servicio;
end;
$function$;
