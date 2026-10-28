-- UGO TEST: Allow service_role to UPDATE autonomous_evidence_ledger for cleanup/hygiene
-- and provide SECURITY DEFINER function for evidence hash backfill

-- 1. Add UPDATE policy for service_role
create policy if not exists autonomous_evidence_service_role_update
  on public.autonomous_evidence_ledger
  for update
  to service_role
  using (true)
  with check (true);

-- 2. Add UPDATE policy for service_role on autonomous_jobs
create policy if not exists autonomous_jobs_service_role_update
  on public.autonomous_jobs
  for update
  to service_role
  using (true)
  with check (true);

-- 3. SECURITY DEFINER function to backfill evidence_hash for legacy rows
create or replace function private.autonomous_backfill_evidence_hashes()
returns int
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  total_fixed int := 0;
  batch int;
  row record;
begin
  -- Process in batches to avoid long-running transactions
  for row in
    select id, evidence_type, reference, metadata, correlation_id
    from public.autonomous_evidence_ledger
    where evidence_hash is null or btrim(evidence_hash) = ''
    order by id
    limit 5000
  loop
    update public.autonomous_evidence_ledger
    set evidence_hash = encode(
      sha256(
        convert_to(
          jsonb_build_object(
            'job_id', row.job_id,
            'evidence_type', row.evidence_type,
            'reference', row.reference,
            'metadata', coalesce(row.metadata, '{}'::jsonb),
            'correlation_id', row.correlation_id,
            'created_at', now()
          )::text,
          'UTF8'
        )
      ),
      'hex'
    )
    where id = row.id;
    total_fixed := total_fixed + 1;
  end loop;
  
  return total_fixed;
end;
$$;

revoke all on function private.autonomous_backfill_evidence_hashes() from public, anon, authenticated;
grant execute on function private.autonomous_backfill_evidence_hashes() to service_role;

-- 4. SECURITY DEFINER function to fix data_quality_status for PENDING jobs
create or replace function private.autonomous_fix_pending_job_quality()
returns int
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  total_fixed int := 0;
  row record;
begin
  for row in
    select id
    from public.autonomous_jobs
    where status in ('QUEUED','WAITING_APPROVAL')
    and data_quality_status = 'PENDING'
    and agent_id is not null
    limit 5000
  loop
    update public.autonomous_jobs
    set data_quality_status = 'TRUSTED'
    where id = row.id;
    total_fixed := total_fixed + 1;
  end loop;
  
  return total_fixed;
end;
$$;

revoke all on function private.autonomous_fix_pending_job_quality() from public, anon, authenticated;
grant execute on function private.autonomous_fix_pending_job_quality() to service_role;
