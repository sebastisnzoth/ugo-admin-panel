-- The protected TEST worker reads only QA run evidence needed for deterministic
-- judge correlation. Public and authenticated users retain their RLS policy.
grant select on public.autonomous_qa_runs to service_role;
