-- UGO Hive TEST: allow only trusted Edge service_role to access the isolated queue.
-- The browser never receives a service key. All end-user authorization remains in
-- ugo-hive-local-jobs (JWT + active superadmin role); anon/authenticated stay denied.
grant select on table public.hive_local_inference_jobs to service_role;
grant select, insert, update on table public.hive_local_worker_credentials to service_role;
revoke all on table public.hive_local_inference_jobs from anon, authenticated;
revoke all on table public.hive_local_worker_credentials from anon, authenticated;
