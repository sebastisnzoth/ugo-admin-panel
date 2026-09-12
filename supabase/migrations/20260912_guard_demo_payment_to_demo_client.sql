create or replace function public.crear_pago_demo_sebastian(p_servicio_id uuid)
returns public.pagos
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare
  v_servicio public.servicios%rowtype;
  v_proveedor public.usuarios%rowtype;
  v_pago public.pagos%rowtype;
  v_ref text;
  v_total numeric;
  v_fee numeric;
  v_net numeric;
begin
  if auth.uid() is null then raise exception 'Sesión requerida'; end if;

  select * into v_servicio
  from public.servicios
  where id=p_servicio_id
  for update;

  if not found then raise exception 'Servicio no encontrado'; end if;
  if v_servicio.cliente_id<>auth.uid() then raise exception 'Servicio no pertenece al cliente autenticado'; end if;
  if not private.is_demo_account(v_servicio.cliente_id,'cliente') then
    raise exception 'Pago DEMO disponible sólo para Cliente Demo';
  end if;
  if v_servicio.proveedor_id is null then raise exception 'Servicio sin proveedor asignado'; end if;

  select * into v_proveedor from public.usuarios where id=v_servicio.proveedor_id;
  if not found then raise exception 'Proveedor no encontrado'; end if;

  if lower(coalesce(v_proveedor.nombre,''))<>'sebastian' or coalesce(v_proveedor.es_demo,false)=false then
    raise exception 'NO_ES_DEMO_SEBASTIAN';
  end if;

  if v_servicio.estado not in ('asignado','en_camino','llegado','en_progreso','esperando_aprobacion') then
    raise exception 'Estado no admite pago demo: %',v_servicio.estado;
  end if;

  v_total:=coalesce(v_servicio.tarifa,120);
  if v_total<=0 then v_total:=120; end if;
  v_fee:=coalesce(v_servicio.comision_ugo,round(v_total*0.15,2));
  v_net:=coalesce(v_servicio.ganancia_proveedor,round(v_total-v_fee,2));
  v_ref:='DEMO-SEBASTIAN-'||replace(v_servicio.id::text,'-','');

  insert into public.pagos(
    servicio_id,cliente_id,proveedor_id,procesador,metodo,modelo_pago,pago_externo_id,
    monto_bruto,comision_ugo,ganancia_proveedor,moneda,estado,mp_payment_id,mp_status,
    autorizado_at,updated_at,pix_conciliacion_nota
  ) values (
    v_servicio.id,v_servicio.cliente_id,v_servicio.proveedor_id,'demo','demo_sebastian','custodia_ugo',v_ref,
    v_total,v_fee,v_net,coalesce(v_servicio.moneda,'BRL'),'retenido',v_ref,'approved_demo',
    now(),now(),'PAGO DEMO CLIENTE -> SEBASTIAN'
  )
  on conflict(servicio_id) do update set
    proveedor_id=excluded.proveedor_id,
    procesador='demo',metodo='demo_sebastian',modelo_pago='custodia_ugo',pago_externo_id=v_ref,
    monto_bruto=excluded.monto_bruto,comision_ugo=excluded.comision_ugo,ganancia_proveedor=excluded.ganancia_proveedor,
    moneda=excluded.moneda,estado='retenido',mp_payment_id=v_ref,mp_status='approved_demo',
    autorizado_at=now(),updated_at=now(),pix_conciliacion_nota='PAGO DEMO CLIENTE -> SEBASTIAN'
  returning * into v_pago;

  insert into public.notificaciones(usuario_id,tipo,titulo,cuerpo,datos)
  values(v_servicio.proveedor_id,'pago_retenido','Pago DEMO protegido','El pago demo del servicio #'||coalesce(v_servicio.numero::text,left(v_servicio.id::text,8))||' quedó retenido por UGO.',jsonb_build_object('servicio_id',v_servicio.id,'pago_id',v_pago.id,'demo',true))
  on conflict do nothing;

  return v_pago;
end;
$function$;
