-- Keep physical/human final QA gates fail-closed even when machine evidence exists.
-- Machine evidence may be persisted independently, but these readiness gates remain
-- UNCOVERED until the explicit final physical/human verification stage.

create or replace function public.guard_autonomous_protected_quality_coverage()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.coverage_key in ('physical-gps-device','uploaded-media-bytes','real-customer-acceptance')
     and new.status = 'COVERED' then
    new.status := 'UNCOVERED';
    new.updated_at := now();
  end if;
  return new;
end
$$;

revoke all on function public.guard_autonomous_protected_quality_coverage()
from public, anon, authenticated;

drop trigger if exists trg_guard_autonomous_protected_quality_coverage
on public.autonomous_quality_coverage;

create trigger trg_guard_autonomous_protected_quality_coverage
before insert or update of status
on public.autonomous_quality_coverage
for each row
execute function public.guard_autonomous_protected_quality_coverage();

update public.autonomous_quality_coverage
set status='UNCOVERED', updated_at=now()
where coverage_key in ('physical-gps-device','uploaded-media-bytes','real-customer-acceptance')
  and status <> 'UNCOVERED';
