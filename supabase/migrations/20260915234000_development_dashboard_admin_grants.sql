grant select, insert, update, delete on table public.development_checklist to authenticated;
grant select on table public.development_checklist_events to authenticated;

revoke all on table public.development_checklist from anon;
revoke all on table public.development_checklist_events from anon;
