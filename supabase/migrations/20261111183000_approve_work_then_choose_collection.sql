-- Approval and collection choice are operational states, not payment settlements.
-- Safe to run independently of the legacy payment lifecycle. No writes to pagos.
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
 if v_previous<>'' and v_previous<>v_method then
  raise exception 'Ya se eligió un método de cobro; para cambiarlo solicitá revisión';
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
