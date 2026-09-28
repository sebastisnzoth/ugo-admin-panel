-- Supabase REST exposes service_role through JWT claims; accept that authenticated execution context.
create or replace function public.autonomous_qa_service_role_guard()
returns boolean language sql stable security definer set search_path=auth,pg_temp as $$
 select coalesce(current_setting('request.jwt.claim.role',true),auth.jwt()->>'role','')='service_role'
$$;
revoke all on function public.autonomous_qa_service_role_guard() from public,anon,authenticated;
grant execute on function public.autonomous_qa_service_role_guard() to service_role;
