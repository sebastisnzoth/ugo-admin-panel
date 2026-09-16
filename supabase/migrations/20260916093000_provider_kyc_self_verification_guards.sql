create or replace function public.guard_provider_self_verification()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := false;
begin
  if v_uid is null then return new; end if;
  v_admin := private.is_admin(v_uid);
  if v_admin then return new; end if;

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

drop trigger if exists trg_00_provider_self_verification_guard on public.perfiles_proveedor;
create trigger trg_00_provider_self_verification_guard
before insert or update on public.perfiles_proveedor
for each row execute function public.guard_provider_self_verification();

create or replace function public.guard_document_review_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := false;
  v_reupload boolean := false;
begin
  if v_uid is null then return new; end if;
  v_admin := private.is_admin(v_uid);

  if tg_op='INSERT' then
    if not v_admin then
      if new.usuario_id <> v_uid then raise exception 'DOCUMENT_OWNER_REQUIRED' using errcode='42501'; end if;
      new.estado := 'pendiente';
      new.notas := null;
      new.notas_rechazo := null;
      new.ocr_resultado := null;
      new.ocr_valido := null;
      new.ocr_confianza := null;
      new.ocr_validado_at := null;
      new.revisor_id := null;
      new.revisado_at := null;
      new.intentos_resubmision := 0;
      new.version := 1;
    end if;
    return new;
  end if;

  if not v_admin then
    if old.usuario_id <> v_uid or new.usuario_id is distinct from old.usuario_id then
      raise exception 'DOCUMENT_OWNER_REQUIRED' using errcode='42501';
    end if;
    if new.tipo is distinct from old.tipo then raise exception 'DOCUMENT_TYPE_IMMUTABLE' using errcode='42501'; end if;
    v_reupload := new.url_storage is distinct from old.url_storage;
    if v_reupload then
      new.estado := 'pendiente';
      new.notas := null;
      new.notas_rechazo := null;
      new.ocr_resultado := null;
      new.ocr_valido := null;
      new.ocr_confianza := null;
      new.ocr_validado_at := null;
      new.revisor_id := null;
      new.revisado_at := null;
      new.version := greatest(coalesce(old.version,1)+1,2);
      new.intentos_resubmision := coalesce(old.intentos_resubmision,0);
    else
      if new.estado is distinct from old.estado
         or new.notas is distinct from old.notas
         or new.notas_rechazo is distinct from old.notas_rechazo
         or new.ocr_resultado is distinct from old.ocr_resultado
         or new.ocr_valido is distinct from old.ocr_valido
         or new.ocr_confianza is distinct from old.ocr_confianza
         or new.ocr_validado_at is distinct from old.ocr_validado_at
         or new.revisor_id is distinct from old.revisor_id
         or new.revisado_at is distinct from old.revisado_at
         or new.intentos_resubmision is distinct from old.intentos_resubmision
         or new.version is distinct from old.version then
        raise exception 'DOCUMENT_REVIEW_FIELDS_ADMIN_ONLY' using errcode='42501';
      end if;
    end if;
    new.updated_at := now();
    return new;
  end if;

  if new.estado is distinct from old.estado and new.estado in ('aprobado','rechazado','reenvio_solicitado') then
    new.revisor_id := v_uid;
    new.revisado_at := now();
    if new.estado='rechazado' and length(btrim(coalesce(new.notas_rechazo,new.notas,''))) < 8 then
      raise exception 'DOCUMENT_REJECTION_REASON_REQUIRED' using errcode='22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_00_document_review_guard on public.documentos;
create trigger trg_00_document_review_guard
before insert or update on public.documentos
for each row execute function public.guard_document_review_fields();

create or replace function public.audit_document_admin_review()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
begin
  if auth.uid() is not null and private.is_admin(auth.uid())
     and new.estado is distinct from old.estado
     and new.estado in ('aprobado','rechazado','reenvio_solicitado') then
    insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles)
    values(
      'admin.document.review',auth.uid(),'documento',new.id,
      jsonb_build_object('estado_anterior',old.estado,'estado_nuevo',new.estado,'usuario_id',new.usuario_id,'tipo',new.tipo,'motivo',coalesce(new.notas_rechazo,new.notas))
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_90_document_review_audit on public.documentos;
create trigger trg_90_document_review_audit
after update on public.documentos
for each row execute function public.audit_document_admin_review();
