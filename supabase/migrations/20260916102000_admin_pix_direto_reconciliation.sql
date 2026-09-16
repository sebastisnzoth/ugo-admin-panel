-- UGO · Admin reconciliation for manual/direct PIX deposits.
-- A provider may only start travelling when the service has an accepted payment.
-- Direct PIX is treated as protected/retained only after an active admin confirms
-- the deposit in UGO's account and records the bank E2E/reference.

create or replace function public.conciliar_pix_direto(
  p_pago_id uuid,
  p_aprobar boolean,
  p_referencia text default null,
  p_nota text default null
)
returns public.pagos
language plpgsql
security definer
set search_path to 'public','private','auth','pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_pago public.pagos%rowtype;
  v_ref text := nullif(btrim(coalesce(p_referencia,'')), '');
  v_nota text := nullif(btrim(coalesce(p_nota,'')), '');
  v_servicio_numero text;
begin
  if v_uid is null or not private.is_admin(v_uid) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_pago_id is null then
    raise exception 'PAYMENT_REQUIRED' using errcode = '22023';
  end if;

  select * into v_pago
  from public.pagos
  where id = p_pago_id
  for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_pago.ambiente <> 'real' then
    raise exception 'PIX_REAL_ONLY' using errcode = '22023';
  end if;
  if v_pago.metodo <> 'pix_direto' then
    raise exception 'PIX_DIRECT_ONLY' using errcode = '22023';
  end if;
  if v_pago.pix_informado_at is null then
    raise exception 'PIX_NOT_REPORTED' using errcode = '22023';
  end if;

  -- Make repeat calls safe after a successful reconciliation.
  if v_pago.pix_conciliado_at is not null then
    if p_aprobar and v_pago.estado = 'retenido' and v_ref is not null and v_pago.pix_e2e_id = v_ref then
      return v_pago;
    end if;
    raise exception 'PIX_ALREADY_RECONCILED' using errcode = '55000';
  end if;

  if v_pago.estado <> 'pendiente' then
    raise exception 'PIX_NOT_PENDING' using errcode = '55000';
  end if;

  if p_aprobar then
    if v_ref is null or length(v_ref) < 6 or length(v_ref) > 160 then
      raise exception 'PIX_REFERENCE_REQUIRED' using errcode = '22023';
    end if;
    if v_nota is not null and length(v_nota) > 1000 then
      raise exception 'PIX_NOTE_TOO_LONG' using errcode = '22023';
    end if;

    update public.pagos
       set estado = 'retenido',
           pix_e2e_id = v_ref,
           pix_conciliado_at = now(),
           pix_conciliado_por = v_uid,
           pix_conciliacion_nota = v_nota,
           autorizado_at = coalesce(autorizado_at, now()),
           fecha_confirmacion = coalesce(fecha_confirmacion, now()),
           updated_at = now()
     where id = v_pago.id
       and estado = 'pendiente'
       and pix_conciliado_at is null
    returning * into v_pago;

    if not found then
      raise exception 'PIX_STATE_CHANGED' using errcode = '40001';
    end if;

    select coalesce(s.numero::text,left(s.id::text,8)) into v_servicio_numero
      from public.servicios s where s.id = v_pago.servicio_id;

    insert into public.notificaciones(usuario_id,tipo,titulo,cuerpo,datos)
    values
      (v_pago.cliente_id,'pix_conciliado','Pix confirmado',format('UGO confirmó o Pix do serviço #%s.',coalesce(v_servicio_numero,left(v_pago.servicio_id::text,8))),jsonb_build_object('servicio_id',v_pago.servicio_id,'pago_id',v_pago.id,'estado','retenido','metodo','pix_direto')),
      (v_pago.proveedor_id,'pix_conciliado','Pagamento confirmado',format('O Pix do serviço #%s foi conciliado e o trabalho já pode seguir.',coalesce(v_servicio_numero,left(v_pago.servicio_id::text,8))),jsonb_build_object('servicio_id',v_pago.servicio_id,'pago_id',v_pago.id,'estado','retenido','metodo','pix_direto'));

    insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles)
    values ('admin.pix_direto.approved',v_uid,'pagos',v_pago.id,jsonb_build_object('servicio_id',v_pago.servicio_id,'referencia',v_ref,'nota',v_nota,'monto',v_pago.monto_bruto,'moneda',v_pago.moneda));
  else
    if v_nota is null or length(v_nota) < 8 then
      raise exception 'PIX_REJECTION_REASON_REQUIRED' using errcode = '22023';
    end if;
    if length(v_nota) > 1000 then
      raise exception 'PIX_NOTE_TOO_LONG' using errcode = '22023';
    end if;

    update public.pagos
       set estado = 'fallido',
           pix_e2e_id = null,
           pix_conciliado_at = now(),
           pix_conciliado_por = v_uid,
           pix_conciliacion_nota = v_nota,
           updated_at = now()
     where id = v_pago.id
       and estado = 'pendiente'
       and pix_conciliado_at is null
    returning * into v_pago;

    if not found then
      raise exception 'PIX_STATE_CHANGED' using errcode = '40001';
    end if;

    insert into public.notificaciones(usuario_id,tipo,titulo,cuerpo,datos)
    values (v_pago.cliente_id,'pix_rechazado','Pix não localizado','UGO não conseguiu localizar este Pix. Revise os dados antes de informar um novo pagamento.',jsonb_build_object('servicio_id',v_pago.servicio_id,'pago_id',v_pago.id,'estado','fallido','metodo','pix_direto'));

    insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles)
    values ('admin.pix_direto.rejected',v_uid,'pagos',v_pago.id,jsonb_build_object('servicio_id',v_pago.servicio_id,'nota',v_nota,'monto',v_pago.monto_bruto,'moneda',v_pago.moneda));
  end if;

  return v_pago;
end;
$function$;

revoke all on function public.conciliar_pix_direto(uuid,boolean,text,text) from public, anon;
grant execute on function public.conciliar_pix_direto(uuid,boolean,text,text) to authenticated, service_role;
