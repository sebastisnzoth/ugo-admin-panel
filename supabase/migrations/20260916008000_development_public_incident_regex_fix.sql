-- UGO TEST · Keep the public Development incident feed readable and sanitized.
-- The previous phone regex was over-escaped inside the view and PostgreSQL
-- evaluated it as an invalid character range when message rows were selected.

create or replace view public.development_incidents_public as
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
        $re$[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$re$,
        '[dato protegido]',
        'g'
      ),
      $re$(https?://|www\.)[^[:space:]]+$re$,
      '[enlace protegido]',
      'gi'
    ),
    $re$\+?[0-9][0-9 ().-]{7,}[0-9]$re$,
    '[contacto protegido]',
    'g'
  ) as message,
  occurrences,
  first_seen_at,
  last_seen_at,
  runtime_revision
from public.development_incidents;

alter view public.development_incidents_public set (security_invoker=false);
revoke all on public.development_incidents_public from public;
grant select on public.development_incidents_public to anon, authenticated;
