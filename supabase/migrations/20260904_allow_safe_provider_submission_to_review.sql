create or replace function private.proteger_verificacion_proveedor()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
begin
  if private.is_admin(auth.uid()) then return new; end if;

  -- The provider may submit their own complete onboarding for review,
  -- but can never approve or verify themselves.
  if auth.uid() = new.usuario_id
     and old.estado_verificacion in ('registrado','rechazado')
     and new.estado_verificacion = 'pendiente'
     and new.termos_aceitos_at is not null
     and nullif(trim(new.cpf),'') is not null
     and nullif(trim(new.pix_chave),'') is not null
     and nullif(trim(new.telefono_profesional),'') is not null
     and nullif(trim(new.ciudad_base),'') is not null
     and new.categoria_principal_id is not null
     and exists (
       select 1 from public.documentos d
       where d.usuario_id=new.usuario_id
         and d.tipo='identidad_frente'
         and d.estado in ('pendiente','procesando','aprobado')
     ) then
    new.motivo_rechazo := null;
    new.online := false;
    new.disponible := false;
    return new;
  end if;

  if new.estado_verificacion is distinct from old.estado_verificacion
     or new.motivo_rechazo is distinct from old.motivo_rechazo then
    raise exception 'Solo UGO puede modificar el estado de verificación';
  end if;
  return new;
end;
$function$;
