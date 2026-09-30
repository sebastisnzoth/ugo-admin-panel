-- Allow the TEST service worker to read persisted release-gate state.
-- No mutation privilege is granted.
grant select on public.autonomous_release_gate to service_role;
