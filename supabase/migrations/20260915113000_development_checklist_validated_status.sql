-- Represent technical validation separately from implementation and final approval.
-- APPROVED remains the only status that counts toward launch readiness.

alter table public.development_checklist
  drop constraint if exists development_checklist_status_check;

alter table public.development_checklist
  add constraint development_checklist_status_check
  check (status in ('pending','in_progress','implemented','validated','blocked','failed','approved'));

comment on column public.development_checklist.status is
  'Lifecycle: pending -> in_progress -> implemented -> validated -> approved. blocked/failed are exceptional states. Only approved counts toward launch readiness.';
