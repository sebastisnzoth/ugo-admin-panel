-- UGO TEST · Public development dashboard without exposing private readiness data.
-- Base tables remain protected by Admin RLS. Anonymous viewers receive only
-- sanitized read-only views plus a tiny realtime signal used to refresh them.

-- Netlify is no longer part of the active UGO release path and must not block readiness.
delete from public.development_checklist
where code = 'NETLIFY-MAIN-SYNC';

create or replace view public.development_checklist_public
with (security_invoker = false)
as
select
  id,
  code,
  area,
  title,
  description,
  priority,
  status,
  weight,
  position,
  test_required,
  completed_at,
  updated_at,
  (nullif(trim(coalesce(evidence, '')), '') is not null) as has_evidence
from public.development_checklist;

create or replace view public.development_checklist_events_public
with (security_invoker = false)
as
select
  id,
  checklist_id,
  code,
  old_status,
  new_status,
  changed_at
from public.development_checklist_events;

create or replace view public.development_incidents_public
with (security_invoker = false)
as
select
  id,
  severity,
  source_role,
  event_type,
  status,
  route,
  action,
  checklist_code,
  regexp_replace(
    regexp_replace(
      regexp_replace(
        left(message, 300),
        '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}',
        '[dato protegido]',
        'g'
      ),
      '(https?://|www\\.)[^[:space:]]+',
      '[enlace protegido]',
      'gi'
    ),
    '\\+?[0-9][0-9 ()\\-.]{7,}[0-9]',
    '[contacto protegido]',
    'g'
  ) as message,
  occurrences,
  first_seen_at,
  last_seen_at,
  runtime_revision
from public.development_incidents;

revoke all on table public.development_checklist_public from public;
revoke all on table public.development_checklist_events_public from public;
revoke all on table public.development_incidents_public from public;
grant select on table public.development_checklist_public to anon, authenticated;
grant select on table public.development_checklist_events_public to anon, authenticated;
grant select on table public.development_incidents_public to anon, authenticated;

create table if not exists public.development_dashboard_signal (
  id smallint primary key check (id = 1),
  revision bigint not null default 0,
  changed_at timestamptz not null default now()
);

insert into public.development_dashboard_signal(id, revision, changed_at)
values (1, 0, now())
on conflict (id) do nothing;

alter table public.development_dashboard_signal enable row level security;

drop policy if exists development_dashboard_signal_public_select
  on public.development_dashboard_signal;
create policy development_dashboard_signal_public_select
  on public.development_dashboard_signal
  for select
  to anon, authenticated
  using (true);

revoke all on table public.development_dashboard_signal from public;
grant select on table public.development_dashboard_signal to anon, authenticated;

create or replace function private.touch_development_dashboard_signal()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  update public.development_dashboard_signal
  set revision = revision + 1,
      changed_at = now()
  where id = 1;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.touch_development_dashboard_signal() from public;

drop trigger if exists trg_development_dashboard_signal_checklist on public.development_checklist;
create trigger trg_development_dashboard_signal_checklist
after insert or update or delete on public.development_checklist
for each statement execute function private.touch_development_dashboard_signal();

drop trigger if exists trg_development_dashboard_signal_events on public.development_checklist_events;
create trigger trg_development_dashboard_signal_events
after insert or update or delete on public.development_checklist_events
for each statement execute function private.touch_development_dashboard_signal();

drop trigger if exists trg_development_dashboard_signal_incidents on public.development_incidents;
create trigger trg_development_dashboard_signal_incidents
after insert or update or delete on public.development_incidents
for each statement execute function private.touch_development_dashboard_signal();

alter table public.development_dashboard_signal replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'development_dashboard_signal'
     ) then
    alter publication supabase_realtime add table public.development_dashboard_signal;
  end if;
end $$;

comment on view public.development_checklist_public is
  'Sanitized read-only readiness feed for the public UGO Development dashboard.';
comment on view public.development_incidents_public is
  'Sanitized read-only Sentinel feed. Service IDs, stack traces, metadata and reporter IDs are intentionally omitted.';
comment on table public.development_dashboard_signal is
  'Non-sensitive realtime invalidation signal for the public Development dashboard.';
