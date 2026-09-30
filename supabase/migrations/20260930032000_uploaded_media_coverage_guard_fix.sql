-- Allow protected uploaded-media coverage only when the dedicated runtime proof exists.
-- Physical GPS and real-customer acceptance remain human/physical gates and cannot self-promote.

create or replace function public.guard_autonomous_protected_quality_coverage()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  if new.status <> 'COVERED' then
    return new;
  end if;

  if new.coverage_key in ('physical-gps-device','real-customer-acceptance') then
    new.status := 'UNCOVERED';
    new.updated_at := now();
    return new;
  end if;

  if new.coverage_key='uploaded-media-bytes' then
    if not exists(
      select 1
      from public.autonomous_jobs aj
      where aj.capability='qa.uploaded_media_bytes_runtime'
        and aj.status='SUCCEEDED'
        and aj.verification_result->>'source'='PROTECTED_STORAGE_RUNTIME'
        and aj.verification_result->>'passed'='true'
        and aj.verification_result->>'private_bucket'='true'
        and aj.verification_result->>'public_access_denied'='true'
        and coalesce((aj.verification_result->'before'->>'bytes')::bigint,0)>0
        and coalesce((aj.verification_result->'after'->>'bytes')::bigint,0)>0
        and length(coalesce(aj.verification_result->'before'->>'sha256',''))=64
        and length(coalesce(aj.verification_result->'after'->>'sha256',''))=64
        and exists(
          select 1 from public.autonomous_evidence_ledger e
          where e.job_id=aj.id and e.evidence_type='QA_PROTECTED_STORAGE_BYTES'
        )
    ) then
      new.status := 'UNCOVERED';
      new.updated_at := now();
    end if;
  end if;

  return new;
end
$$;

revoke all on function public.guard_autonomous_protected_quality_coverage() from public,anon,authenticated;
