-- REST service-role calls enter this SECURITY DEFINER function as its owner; reject browser roles explicitly.
revoke all on function public.autonomous_run_qa_service_scenario(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.autonomous_run_qa_service_scenario(uuid,jsonb,jsonb) to service_role;
