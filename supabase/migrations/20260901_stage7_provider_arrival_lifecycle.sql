alter type public.servicio_estado add value if not exists 'llegado' before 'en_progreso';

create or replace function private.avanzar_servicio_impl(p_servicio_id uuid, p_estado public.servicio_estado)
returns public.servicios
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_servicio public.servicios%rowtype;
  v_dist_m double precision;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  select * into v_servicio from public.servicios where id=p_servicio_id for update;
  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.proveedor_id <> auth.uid() and not private.is_admin(auth.uid()) then raise exception 'No autorizado'; end if;

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
         and p.estado='retenido'
         and nullif(btrim(coalesce(p.mp_payment_id,'')),'') is not null
    ) then
      raise exception 'El pago todavía no está protegido';
    end if;
  end if;

  if v_servicio.estado='en_camino' and p_estado='llegado' and not private.is_admin(auth.uid()) and v_servicio.ubicacion_cliente is not null then
    select st_distance(pp.ubicacion, v_servicio.ubicacion_cliente)
      into v_dist_m
      from public.perfiles_proveedor pp
     where pp.usuario_id=auth.uid() and pp.ubicacion is not null;
    if v_dist_m is null then raise exception 'Actualizá tu ubicación antes de confirmar llegada'; end if;
    if v_dist_m > 200 then raise exception 'Todavía estás demasiado lejos del cliente para confirmar llegada'; end if;
  end if;

  if v_servicio.estado='en_progreso' and p_estado='esperando_aprobacion' and not private.is_admin(auth.uid()) then
    if not exists (
      select 1 from public.evidencias_servicio e
       where e.servicio_id=p_servicio_id and e.usuario_id=auth.uid() and e.tipo='despues'
    ) then
      raise exception 'Agregá al menos una foto final antes de pedir aprobación';
    end if;
  end if;

  update public.servicios
     set estado=p_estado,
         iniciado_at=case when p_estado='en_progreso' then coalesce(iniciado_at,now()) else iniciado_at end
   where id=p_servicio_id
  returning * into v_servicio;
  return v_servicio;
end;
$$;

create or replace function private.notificar_llegada_servicio()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if new.estado::text='llegado' and old.estado is distinct from new.estado then
    perform private.crear_notificacion_unica(
      new.cliente_id,
      'proveedor_llego',
      'Tu proveedor llegó',
      'El profesional ya llegó al lugar del servicio #'||coalesce(new.numero::text,''),
      jsonb_build_object('servicio_id',new.id,'estado','llegado'),
      'servicio:'||new.id||':llegado:cliente'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notificar_llegada_servicio on public.servicios;
create trigger trg_notificar_llegada_servicio
after update of estado on public.servicios
for each row execute function private.notificar_llegada_servicio();

create or replace function private.queue_whatsapp_service_notification()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_phone text;
  v_event text;
  v_message text;
  v_num bigint;
begin
  if new.metadata->>'source' <> 'whatsapp' then return new; end if;
  if tg_op <> 'UPDATE' or new.estado::text = old.estado::text then return new; end if;
  v_phone := regexp_replace(coalesce(new.metadata->>'telefono',''),'\D','','g');
  if length(v_phone) < 10 then return new; end if;
  v_num := new.numero;
  v_event := 'estado:'||new.estado::text;
  v_message := case new.estado::text
    when 'ofrecido' then format('🔎 UGO: seu serviço #%s foi enviado aos profissionais disponíveis.',v_num)
    when 'asignado' then format('✅ UGO: um profissional aceitou o serviço #%s. Agora aguardamos a confirmação do pagamento.',v_num)
    when 'en_camino' then format('🚗 UGO: o profissional do serviço #%s está a caminho.',v_num)
    when 'llegado' then format('📍 UGO: o profissional do serviço #%s chegou ao local.',v_num)
    when 'en_progreso' then format('🛠️ UGO: o serviço #%s foi iniciado.',v_num)
    when 'esperando_aprobacion' then format('📸 UGO: o serviço #%s foi finalizado pelo profissional e aguarda sua aprovação.',v_num)
    when 'completado' then format('✅ UGO: o serviço #%s foi concluído. Obrigado por usar UGO.',v_num)
    when 'cancelado' then format('❌ UGO: o serviço #%s foi cancelado.',v_num)
    else null end;
  if v_message is null then return new; end if;
  insert into public.whatsapp_notificaciones(servicio_id,telefono,evento,estado_servicio,mensaje)
  values(new.id,v_phone,v_event,new.estado::text,v_message)
  on conflict(servicio_id,evento) do nothing;
  return new;
end;
$$;
