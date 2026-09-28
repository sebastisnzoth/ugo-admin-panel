-- P0 harness is executable only by service_role; SECURITY DEFINER changes current_user to the owner,
-- so browser roles are blocked by EXECUTE grants rather than an unreliable request.jwt.claim.role setting.
revoke all on function public.autonomous_qa_run_p0_test_service() from public,anon,authenticated;
grant execute on function public.autonomous_qa_run_p0_test_service() to service_role;
