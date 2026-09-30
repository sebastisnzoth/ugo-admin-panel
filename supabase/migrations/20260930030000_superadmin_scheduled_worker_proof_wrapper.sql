-- Governed authenticated entrypoint for the scheduled worker proof.
-- Keeps the service-only implementation private while preserving auth.uid()
-- so nested worker policy checks can verify the caller is a real Super Admin.
create or replace function public.superadmin_run_scheduled_worker_proof(
  p_source_sha text,
  p_run_id text
) returns jsonb
language plpgsql
security definer
set search_path to 'public','private','auth','extensions','pg_temp'
as $function$
begin
  if auth.uid() is null or not private.is_superadmin() then
    raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';
  end if;
  return public.autonomous_run_scheduled_worker_proof(p_source_sha,p_run_id);
end
$function$;

revoke all on function public.superadmin_run_scheduled_worker_proof(text,text) from public,anon,authenticated;
grant execute on function public.superadmin_run_scheduled_worker_proof(text,text) to authenticated;
notify pgrst, 'reload schema';
