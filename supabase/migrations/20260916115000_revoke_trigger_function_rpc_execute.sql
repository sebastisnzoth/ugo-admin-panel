-- UGO TEST · Trigger-only SECURITY DEFINER functions must not be callable as RPCs.
-- These functions are invoked by database triggers; API roles do not need EXECUTE.

revoke execute on function public.audit_document_admin_review() from public, anon, authenticated;
revoke execute on function public.guard_document_review_fields() from public, anon, authenticated;
revoke execute on function public.guard_legacy_provider_document_insert() from public, anon, authenticated;
revoke execute on function public.guard_provider_self_verification() from public, anon, authenticated;
revoke execute on function public.guard_usuario_sensitive_fields() from public, anon, authenticated;

-- Fail the migration if any of these trigger functions becomes directly executable
-- again by an API role.
do $$
declare
  v_name text;
begin
  foreach v_name in array array[
    'audit_document_admin_review',
    'guard_document_review_fields',
    'guard_legacy_provider_document_insert',
    'guard_provider_self_verification',
    'guard_usuario_sensitive_fields'
  ]
  loop
    if has_function_privilege('anon', format('public.%I()', v_name), 'EXECUTE')
       or has_function_privilege('authenticated', format('public.%I()', v_name), 'EXECUTE') then
      raise exception 'Trigger function % must not be executable by API roles', v_name;
    end if;
  end loop;
end
$$;
