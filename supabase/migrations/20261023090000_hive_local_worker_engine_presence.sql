-- UGO Hive TEST only: separate worker heartbeat from a recent local engine check.
-- No credential material, provider payload, inference result or production table is changed.
alter table public.hive_local_worker_credentials
 add column if not exists engine_status text,
 add column if not exists engine_checked_at timestamptz;

update public.hive_local_worker_credentials
set engine_status='UNKNOWN'
where engine_status is null;

alter table public.hive_local_worker_credentials
 alter column engine_status set default 'UNKNOWN',
 alter column engine_status set not null;

alter table public.hive_local_worker_credentials
 drop constraint if exists hive_local_worker_engine_status_allowed;
alter table public.hive_local_worker_credentials
 add constraint hive_local_worker_engine_status_allowed
 check (engine_status in (
  'UNKNOWN','AVAILABLE','MODEL_UNAVAILABLE','UNREACHABLE','AUTH_REJECTED',
  'RATE_LIMITED','HTTP_ERROR','INVALID_CATALOG','CATALOG_TOO_LARGE'
 ));

-- Authenticated browser roles remain denied. The existing TEST Edge uses service_role
-- only after validating the dedicated worker bearer or an active Super Admin JWT.
revoke all on table public.hive_local_worker_credentials from anon,authenticated;
grant select,insert,update on table public.hive_local_worker_credentials to service_role;
