-- UGO TEST: Allow service_role to UPDATE autonomous_evidence_ledger for cleanup/hygiene
-- Add missing trigger for evidence hash on insert

-- 1. Add UPDATE policy for service_role on autonomous_evidence_ledger
drop policy if exists autonomous_evidence_service_role_update on public.autonomous_evidence_ledger;
create policy autonomous_evidence_service_role_update
  on public.autonomous_evidence_ledger
  for update
  to service_role
  using (true)
  with check (true);

-- 2. Add UPDATE policy for service_role on autonomous_jobs
drop policy if exists autonomous_jobs_service_role_update on public.autonomous_jobs;
create policy autonomous_jobs_service_role_update
  on public.autonomous_jobs
  for update
  to service_role
  using (true)
  with check (true);

-- 3. Recreate trigger for evidence hash on insert (may have been dropped)
drop trigger if exists autonomous_evidence_hash_insert on public.autonomous_evidence_ledger;
create trigger autonomous_evidence_hash_insert
before insert on public.autonomous_evidence_ledger
for each row execute function private.autonomous_evidence_hash_on_insert();
