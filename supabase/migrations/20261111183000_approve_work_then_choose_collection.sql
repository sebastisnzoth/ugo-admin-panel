-- Approval and collection choice are operational states, not payment settlements.
-- Approval never writes to pagos. Cash selection creates only a pending payment.
create or replace function public.aprobar_trabajo_sin_pago(p_servicio_id uuid)
returns public.servicios
language plpgsql security definer
set search_path = 'public','private','pg_temp'
as $ugo$
declare
 v_service public.servicios%rowtype;
 v_uid uuid := auth.uid();
begin
 if v_uid is null then raise exception 'Autenticación requerida'; end if;
 select * into v_service from public.servicios where id=p_servicio_id for update;
 if not found then raise exception 'Servicio inexistente'; end if;
 if v_service.cliente_id is distinct from v_uid then raise exception 'No autorizado'; end if;
 if v_service.estado not in ('esperando_aprobacion','completado') then
   raise exception 'El servicio todavía no está listo para aprobación';
 end if;
 if coalesce(v_service.metadata->>'trabajo_aprobado_at','') <> '' then return v_service; end if;
 if v_service.estado='completado' then return v_service; end if;
 if not exists(
  select 1 from public.evidencias_servicio e
  where e.servicio_id=v_service.id and e.usuario_id=v_service.proveedor_id
  and e.tipo='despues' and nullif(trim(coalesce(e.storage_path,'')),'') is not null
 ) then raise exception 'Falta la evidencia final del proveedor'; end if;
 update public.servicios set
  metadata=jsonb_set(coalesce(metadata,'{}'::jsonb),'{trabajo_aprobado_at}',to_jsonb(now()::text),true),
  updated_at=now()
 where id=p_servicio_id returning * into v_service;
 return v_service;
end;
$ugo$;

revoke all on function public.aprobar_trabajo_sin_pago(uuid) from PUBLIC,anon;
grant execute on function public.aprobar_trabajo_sin_pago(uuid) to authenticated;

create or replace function public.elegir_cobro_post_servicio(p_servicio_id uuid,p_metodo text)
returns public.servicios
language plpgsql security definer
set search_path = 'public','private','pg_temp'
as $ugo$
declare
 v_service public.servicios%rowtype;
 v_uid uuid := auth.uid();
 v_method text:=lower(trim(coalesce(p_metodo,'')));
 v_previous text;
 v_existing public.pagos%rowtype;
 v_total numeric(12,2);
 v_comission numeric(12,2);
begin
 if v_uid is null then raise exception 'Autenticación requerida'; end if;
 if v_method not in ('pix','efectivo') then raise exception 'Forma de cobro no válida'; end if;
 select * into v_service from public.servicios where id=p_servicio_id for update;
 if not found then raise exception 'Servicio inexistente'; end if;
 if v_service.proveedor_id is distinct from v_uid then raise exception 'No autorizado'; end if;
 if v_service.estado<>'esperando_aprobacion' then raise exception 'El servicio no está en etapa de cobro'; end if;
 if coalesce(v_service.metadata->>'trabajo_aprobado_at','')='' then raise exception 'El cliente todavía no aprobó el trabajo'; end if;
 if coalesce(v_service.tarifa,0)<=0 then raise exception 'Importe del servicio inválido'; end if;
 if v_method='pix' and coalesce(v_service.moneda,'BRL')<>'BRL' then raise exception 'Pix requiere BRL'; end if;
 if exists (select 1 from public.pagos p where p.servicio_id=p_servicio_id
    and p.ambiente=v_service.ambiente and p.estado in ('retenido','liberado'))
 then raise exception 'Existe un pago confirmado: no se puede cambiar el método'; end if;
 v_previous:=coalesce(v_service.metadata->>'cobro_metodo','');
 -- A Pix choice without any issued charge can be changed to cash.
 -- Once a payment attempt exists the method is locked for reconciliation.
 if v_previous<>'' and v_previous<>v_method and exists(
   select 1 from public.pagos p where p.servicio_id=v_service.id
 ) then raise exception 'Existe un cobro previo; solicitá revisión antes de cambiarlo'; end if;
 if v_method='efectivo' then
  if not exists(select 1 from public.config_sistema where clave='pago_efectivo_activo'
      and lower(trim(both '"' from valor::text)) in ('true','1','si','sí','on'))
      and exists(select 1 from public.config_sistema where clave='pago_efectivo_activo') then
    raise exception 'El efectivo está deshabilitado';
  end if;
  if coalesce(v_service.moneda,'BRL')='BRL' and exists(
     select 1 from public.config_sistema where clave='pago_efectivo_br_activo'
     and lower(trim(both '"' from valor::text)) not in ('true','1','si','sí','on')
    ) then raise exception 'El efectivo está deshabilitado para Brasil'; end if;
  if coalesce(v_service.moneda,'BRL')='ARS' and exists(
     select 1 from public.config_sistema where clave='pago_efectivo_ar_activo'
     and lower(trim(both '"' from valor::text)) not in ('true','1','si','sí','on')
    ) then raise exception 'El efectivo está deshabilitado para Argentina'; end if;
  if (select count(*) from public.pagos p where p.servicio_id=v_service.id)>1 then
   raise exception 'Varios intentos de pago: requiere conciliación';
  end if;
  select * into v_existing from public.pagos where servicio_id=v_service.id for update;
  if found and not (v_existing.metodo='efectivo' and v_existing.estado='pendiente') then
    raise exception 'Existe otro intento de cobro; requiere conciliación';
  end if;
  if not found then
   v_total:=round(v_service.tarifa::numeric,2);
   v_comission:=round(coalesce(v_service.comision_ugo,v_total*0.15)::numeric,2);
   insert into public.pagos(
    servicio_id,cliente_id,proveedor_id,procesador,metodo,modelo_pago,ambiente,
    monto_bruto,comision_ugo,ganancia_proveedor,moneda,estado
   ) values(
    v_service.id,v_service.cliente_id,v_service.proveedor_id,'efectivo','efectivo',
    'presencial',v_service.ambiente,v_total,v_comission,
    round(coalesce(v_service.ganancia_proveedor,v_total-v_comission)::numeric,2),
    coalesce(v_service.moneda,'BRL'),'pendiente'
   );
  end if;
 end if;
 if v_previous=v_method then return v_service; end if;
 update public.servicios
 set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
    'cobro_metodo',v_method,'cobro_elegido_at',now()::text),
    updated_at=now()
 where id=p_servicio_id returning * into v_service;
 return v_service;
end;
$ugo$;

revoke all on function public.elegir_cobro_post_servicio(uuid,text) from PUBLIC,anon;
grant execute on function public.elegir_cobro_post_servicio(uuid,text) to authenticated;
notify pgrst,'reload schema';
