-- Remediate only leaked isolated governance TEST fixtures from prior runtime runs.
-- Historical rows are preserved and made non-executable.
update public.autonomous_jobs
set status='CANCELLED',
    failure_reason='CANCELLED: leaked isolated governance runtime fixture remediated',
    blocked_reason='QA_FIXTURE_COMPLETE',
    finished_at=coalesce(finished_at,now()),
    lease_owner=null,
    lease_expires_at=null
where trigger_type='TEST'
  and (idempotency_key like 'ugo-autonomy-yellow-%'
       or idempotency_key like 'ugo-autonomy-red-%')
  and status in('QUEUED','RUNNING','WAITING_APPROVAL','BLOCKED');
