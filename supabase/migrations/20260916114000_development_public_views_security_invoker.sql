-- UGO TEST · Remove SECURITY DEFINER public views without exposing raw readiness data.
-- Public views run with caller privileges. The only privileged reads live behind
-- tightly-scoped functions in a non-exposed helper schema and return sanitized rows.

create schema if not exists ugo_public_feed;

revoke all on schema ugo_public_feed from public;
grant usage on schema ugo_public_feed to anon, authenticated;

alter default privileges in schema ugo_public_feed
  revoke execute on functions from public;

create or replace function ugo_public_feed.development_checklist_rows()
returns table (
  id uuid,
  code text,
  area text,
  title text,
  description text,
  priority text,
  status text,
  weight smallint,
  "position" integer,
  test_required boolean,
  completed_at timestamptz,
  updated_at timestamptz,
  has_evidence boolean
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    c.id,
    c.code,
    c.area,
    c.title,
    c.description,
    c.priority,
    c.status,
    c.weight,
    c.position,
    c.test_required,
    c.completed_at,
    c.updated_at,
    (nullif(trim(coalesce(c.evidence, '')), '') is not null) as has_evidence
  from public.development_checklist as c;
$$;

create or replace function ugo_public_feed.development_checklist_event_rows()
returns table (
  id bigint,
  checklist_id uuid,
  code text,
  old_status text,
  new_status text,
  changed_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    e.id,
    e.checklist_id,
    e.code,
    e.old_status,
    e.new_status,
    e.changed_at
  from public.development_checklist_events as e;
$$;

create or replace function ugo_public_feed.development_incident_rows()
returns table (
  id uuid,
  severity text,
  source_role text,
  event_type text,
  status text,
  route text,
  action text,
  checklist_code text,
  message text,
  occurrences integer,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  runtime_revision text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    i.id,
    i.severity,
    i.source_role,
    i.event_type,
    i.status,
    i.route,
    i.action,
    i.checklist_code,
    regexp_replace(
      regexp_replace(
        regexp_replace(
          left(i.message, 300),
          '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}',
          '[dato protegido]',
          'g'
        ),
        '(https?://|www[.])[^[:space:]]+',
        '[enlace protegido]',
        'gi'
      ),
      '[+]?[0-9][0-9 ().-]{7,}[0-9]',
      '[contacto protegido]',
      'g'
    ) as message,
    i.occurrences,
    i.first_seen_at,
    i.last_seen_at,
    i.runtime_revision
  from public.development_incidents as i;
$$;

revoke all on function ugo_public_feed.development_checklist_rows() from public;
revoke all on function ugo_public_feed.development_checklist_event_rows() from public;
revoke all on function ugo_public_feed.development_incident_rows() from public;

grant execute on function ugo_public_feed.development_checklist_rows() to anon, authenticated;
grant execute on function ugo_public_feed.development_checklist_event_rows() to anon, authenticated;
grant execute on function ugo_public_feed.development_incident_rows() to anon, authenticated;

create or replace view public.development_checklist_public
with (security_invoker = true)
as
select *
from ugo_public_feed.development_checklist_rows();

create or replace view public.development_checklist_events_public
with (security_invoker = true)
as
select *
from ugo_public_feed.development_checklist_event_rows();

create or replace view public.development_incidents_public
with (security_invoker = true)
as
select *
from ugo_public_feed.development_incident_rows();

revoke all on table public.development_checklist_public from public;
revoke all on table public.development_checklist_events_public from public;
revoke all on table public.development_incidents_public from public;

grant select on table public.development_checklist_public to anon, authenticated;
grant select on table public.development_checklist_events_public to anon, authenticated;
grant select on table public.development_incidents_public to anon, authenticated;

comment on schema ugo_public_feed is
  'Internal helper schema for sanitized public feeds. Keep outside exposed PostgREST schemas.';
comment on function ugo_public_feed.development_checklist_rows() is
  'Privileged source for the sanitized Development checklist view; no parameters, no raw evidence.';
comment on function ugo_public_feed.development_checklist_event_rows() is
  'Privileged source for sanitized checklist status events; evidence and actor IDs are omitted.';
comment on function ugo_public_feed.development_incident_rows() is
  'Privileged source for sanitized Sentinel incidents; IDs, stack traces, metadata and contact data are omitted.';

do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'development_checklist_public',
        'development_checklist_events_public',
        'development_incidents_public'
      )
      and not ('security_invoker=true' = any(coalesce(c.reloptions, '{}'::text[])))
  ) then
    raise exception 'Development public views must remain SECURITY INVOKER';
  end if;
end
$$;
