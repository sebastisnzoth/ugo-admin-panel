-- UGO TEST QA · provider active jobs must never be assigned without payment context.
create or replace function public.autonomous_qa_prepare_provider_active_job(p_provider_id uuid,p_client_id uuid)
returns jsonb
language plpgsql
security definer
set search_path='public','private','auth','extensions','pg_temp'
as $$
declare
  cat uuid;
  invalid_blocked boolean:=false;
  invalid_message text:='';
  sid uuid;
  invalid_sid uuid;
  payid uuid;
  loc extensions.geography:=extensions.st_setsrid(extensions.st_makepoint(-48.5482,-27.5949),4326)::extensions.geography;
begin
  select id into cat from public.categorias where activa=true order by nombre limit 1;
  if cat is null then raise exception 'ACTIVE_CATEGORY_REQUIRED'; end if;

  insert into public.usuarios(id,nombre,tipo,activo,es_demo)
  values(p_provider_id,'UGO Provider Active Runtime','proveedor',true,true)
  on conflict(id) do update set nombre=excluded.nombre,tipo='proveedor',activo=true,es_demo=true;

  insert into public.usuarios(id,nombre,tipo,activo,es_demo)
  values(p_client_id,'UGO Client Active Runtime','cliente',true,true)
  on conflict(id) do update set nombre=excluded.nombre,tipo='cliente',activo=true,es_demo=true;

  insert into public.perfiles_proveedor(usuario_id,estado_verificacion,online,disponible,onboarding_completo_at,termos_aceitos_at,termos_versao,categoria_principal_id,tarifa_base,zona_radio_km)
  values(p_provider_id,'verificado',true,true,now(),now(),'2026-09-04',cat,100,20)
  on conflict(usuario_id) do update set estado_verificacion='verificado',online=true,disponible=true,onboarding_completo_at=coalesce(public.perfiles_proveedor.onboarding_completo_at,now()),termos_aceitos_at=coalesce(public.perfiles_proveedor.termos_aceitos_at,now()),termos_versao='2026-09-04',categoria_principal_id=cat,tarifa_base=100,zona_radio_km=20;

  insert into public.servicios(numero,cliente_id,categoria_id,estado,descripcion,direccion_cliente,ubicacion_cliente,tarifa,comision_ugo,ganancia_proveedor,metadata,ambiente)
  values(nextval('public.servicios_numero_seq'),p_client_id,cat,'borrador','UGO TEST invalid active job','Rua UGO TEST sem pagamento',loc,120,18,102,'{}'::jsonb,'demo')
  returning id into invalid_sid;

  -- Simulate a legacy/corrupt row that lost the payment preference after creation.
  update public.servicios
     set metadata='{}'::jsonb
   where id=invalid_sid;

  begin
    update public.servicios
       set proveedor_id=p_provider_id
     where id=invalid_sid;
  exception when others then
    invalid_message:=sqlerrm;
    invalid_blocked:=position('forma de pago' in lower(sqlerrm))>0;
  end;
  if not invalid_blocked then raise exception 'ACTIVE_JOB_WITHOUT_PAYMENT_MUST_BE_BLOCKED: %',invalid_message; end if;
  delete from public.servicios where id=invalid_sid;
  invalid_sid:=null;

  insert into public.servicios(numero,cliente_id,proveedor_id,categoria_id,estado,descripcion,direccion_cliente,ubicacion_cliente,tarifa,comision_ugo,ganancia_proveedor,metadata,ambiente)
  values(nextval('public.servicios_numero_seq'),p_client_id,p_provider_id,cat,'asignado','Arreglar canilla de cocina','Rua UGO TEST 100, Florianópolis',loc,120,18,102,
    '{"requested_payment_method":"efectivo","payment_method":"efectivo","payment_selected_before_order":true,"provider_active_job_runtime":true}'::jsonb,'demo')
  returning id into sid;

  insert into public.pagos(servicio_id,cliente_id,proveedor_id,procesador,monto_bruto,comision_ugo,ganancia_proveedor,moneda,estado,metodo,modelo_pago,ambiente)
  values(sid,p_client_id,p_provider_id,'efectivo',120,18,102,'BRL','pendiente','efectivo','presencial','demo')
  returning id into payid;

  return jsonb_build_object(
    'invalid_assignment_blocked',invalid_blocked,
    'invalid_message',invalid_message,
    'service_id',sid,
    'payment_id',payid,
    'state','asignado',
    'payment_method','efectivo',
    'description','Arreglar canilla de cocina',
    'address','Rua UGO TEST 100, Florianópolis'
  );
end
$$;
revoke all on function public.autonomous_qa_prepare_provider_active_job(uuid,uuid) from public,anon,authenticated;
grant execute on function public.autonomous_qa_prepare_provider_active_job(uuid,uuid) to service_role;
notify pgrst,'reload schema';
