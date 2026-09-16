create or replace function public.apply_document_approval_completion()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'private', 'auth', 'pg_temp'
as $$
begin
  if new.estado = 'aprobado' and new.estado is distinct from old.estado then
    if exists (
      select 1 from public.documentos d where d.usuario_id = new.usuario_id
    ) and not exists (
      select 1 from public.documentos d
      where d.usuario_id = new.usuario_id and d.estado <> 'aprobado'
    ) then
      update public.usuarios
      set activo = true, updated_at = now()
      where id = new.usuario_id and activo is distinct from true;

      insert into public.notificaciones(usuario_id, tipo, titulo, cuerpo, datos, dedupe_key)
      values (
        new.usuario_id,
        'kyc_aprobado',
        '¡Bienvenido a U.GO!',
        'Tu perfil ha sido verificado y aprobado.',
        jsonb_build_object('source','document_review_trigger','documentoId',new.id),
        'kyc_aprobado:' || new.usuario_id::text
      )
      on conflict (dedupe_key) where dedupe_key is not null do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_95_document_approval_completion on public.documentos;
create trigger trg_95_document_approval_completion
after update on public.documentos
for each row execute function public.apply_document_approval_completion();
