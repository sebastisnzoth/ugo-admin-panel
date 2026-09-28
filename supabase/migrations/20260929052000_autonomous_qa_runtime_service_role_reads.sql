-- Allow the isolated TEST runtime verifier to read persisted QA evidence only.
grant select on table public.autonomous_qa_scenarios to service_role;
grant select on table public.autonomous_quality_coverage to service_role;
