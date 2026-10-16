-- Service-role only. The API validates the admin JWT and supplies its verified user id.
-- Changing KYC document status and authorizing an operational provider remain separate actions.
create or replace function public.admin_decide_provider_verification_atomic(
 p_actor_id uuid, p_provider_id uuid, p_state text, p_reason text default null
) returns jsonb language plpgsql security invoker
set search_path=public,pg_temp
as $$
declare
 v_role text; v_current text; v_account_active boolean;
 v_phone text; v_city text; v_category uuid; v_cpf text; v_pix text; v_terms timestamptz;
 v_missing text[];
begin
 select tipo::text into v_role from public.usuarios where id=p_actor_id and activo=true;
 if v_role is null or v_role not in ('admin','superadmin') then
  raise exception 'ADMIN_AUTHORIZATION_REQUIRED';
 end if;
 if p_state not in ('pendiente','verificado','rechazado','suspendido') or p_state is null then
  raise exception 'PROVIDER_STATE_INVALID';
 end if;
 if p_state in ('rechazado','suspendido') and length(trim(coalesce(p_reason,'')))<8 then
  raise exception 'AUDIT_REASON_REQUIRED';
 end if;
 select estado_verificacion::text,telefono_profesional,ciudad_base,categoria_principal_id,
        cpf,pix_chave,termos_aceitos_at
  into v_current,v_phone,v_city,v_category,v_cpf,v_pix,v_terms
  from public.perfiles_proveedor where usuario_id=p_provider_id for update;
 if not found then raise exception 'PROVIDER_NOT_FOUND'; end if;
 select activo into v_account_active from public.usuarios where id=p_provider_id;
 if p_state='verificado' then
  if v_current <> 'pendiente' then raise exception 'PROVIDER_NOT_SUBMITTED_FOR_REVIEW'; end if;
  if not coalesce(v_account_active,false) then raise exception 'PROVIDER_ACCOUNT_INACTIVE'; end if;
  if coalesce(trim(v_phone),'')='' or coalesce(trim(v_city),'')='' or v_category is null
    or coalesce(trim(v_cpf),'')='' or coalesce(trim(v_pix),'')='' or v_terms is null then
    raise exception 'PROVIDER_PROFILE_INCOMPLETE';
  end if;
  with latest as (
    select distinct on (tipo) tipo,estado
    from public.documentos
    where usuario_id=p_provider_id and tipo in
      ('identidad_frente','identidad_dorso','selfie','comprobante_domicilio')
    order by tipo,created_at desc,id desc
  )
  select array_agg(required.tipo) into v_missing
  from (values ('identidad_frente'),('identidad_dorso'),('selfie'),('comprobante_domicilio')) required(tipo)
  left join latest d on d.tipo=required.tipo
  where d.estado is distinct from 'aprobado';
  if cardinality(coalesce(v_missing,array[]::text[]))>0 then
    raise exception 'KYC_DOCUMENTS_NOT_APPROVED: %',array_to_string(v_missing,',');
  end if;
 end if;
 if p_state='rechazado' and v_current not in ('pendiente','registrado') then
  raise exception 'PROVIDER_NOT_IN_REVIEW';
 end if;
 if p_state='suspendido' and v_current <> 'verificado' then
  raise exception 'ONLY_VERIFIED_PROVIDERS_CAN_BE_SUSPENDED';
 end if;
 if p_state='pendiente' and v_current not in ('registrado','rechazado','suspendido','pendiente') then
  raise exception 'PROVIDER_INVALID_REVIEW_TRANSITION';
 end if;
 if p_state=v_current then
  return jsonb_build_object('saved',true,'unchanged',true,'state',v_current,'id',p_provider_id);
 end if;

 update public.perfiles_proveedor
 set estado_verificacion=p_state::public.verificacion_estado,
     motivo_rechazo=case when p_state='rechazado' then trim(p_reason) else null end,
     online=false,disponible=false,updated_at=now()
 where usuario_id=p_provider_id;

 insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles)
 values('admin.provider_verification.update',p_actor_id,'proveedor',p_provider_id,
  jsonb_build_object('estado_anterior',v_current,'estado_nuevo',p_state,'motivo',nullif(trim(coalesce(p_reason,'')),''),
  'source','admin-atomic-provider-verification'));

 return jsonb_build_object('saved',true,'state',p_state,'id',p_provider_id);
end
$$;
revoke all on function public.admin_decide_provider_verification_atomic(uuid,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.admin_decide_provider_verification_atomic(uuid,uuid,text,text)
  to service_role;
