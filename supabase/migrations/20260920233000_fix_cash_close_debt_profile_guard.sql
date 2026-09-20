-- UGO · fix cash close when provider reaches the UGO debt limit.
--
-- A client confirming cash can create the provider's third pending UGO commission.
-- The debt trigger must then force the provider offline. That nested, internal
-- availability update was being rejected by the provider self-profile guard
-- because auth.uid() still belongs to the client who confirmed the payment.
--
-- Keep the ownership guard strict for direct writes, but allow nested trigger
-- updates that ONLY change operational availability fields.

create or replace function public.guard_provider_self_verification()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := false;
  v_nested_availability_only boolean := false;
begin
  if v_uid is null then return new; end if;
  v_admin := private.is_admin(v_uid);
  if v_admin then return new; end if;

  if tg_op = 'UPDATE' and pg_trigger_depth() > 1 then
    v_nested_availability_only :=
      new.usuario_id is not distinct from old.usuario_id
      and new.estado_verificacion is not distinct from old.estado_verificacion
      and new.motivo_rechazo is not distinct from old.motivo_rechazo
      and (
        to_jsonb(new) - array['online','disponible','updated_at']::text[]
      ) = (
        to_jsonb(old) - array['online','disponible','updated_at']::text[]
      );

    if v_nested_availability_only then
      return new;
    end if;
  end if;

  if new.usuario_id <> v_uid then
    raise exception 'PROVIDER_PROFILE_OWNER_REQUIRED' using errcode='42501';
  end if;

  if tg_op = 'INSERT' then
    new.estado_verificacion := 'registrado';
    new.motivo_rechazo := null;
    new.online := false;
    new.disponible := false;
    return new;
  end if;

  if new.usuario_id is distinct from old.usuario_id then
    raise exception 'PROVIDER_ID_IMMUTABLE' using errcode='42501';
  end if;
  if new.motivo_rechazo is distinct from old.motivo_rechazo then
    raise exception 'PROVIDER_REVIEW_FIELDS_ADMIN_ONLY' using errcode='42501';
  end if;
  if new.estado_verificacion is distinct from old.estado_verificacion then
    if new.estado_verificacion <> 'pendiente' or old.estado_verificacion not in ('registrado','rechazado') then
      raise exception 'PROVIDER_VERIFICATION_ADMIN_ONLY' using errcode='42501';
    end if;
    new.online := false;
    new.disponible := false;
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_provider_self_verification() from public, anon, authenticated;

comment on function public.guard_provider_self_verification() is
'Protege KYC/perfil proveedor. Permite únicamente updates internos anidados de online/disponible para automatizaciones operativas como el bloqueo por deuda UGO.';

notify pgrst,'reload schema';
