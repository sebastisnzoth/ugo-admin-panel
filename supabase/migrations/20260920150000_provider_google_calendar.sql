-- UGO · Google Calendar como espejo operativo del Proveedor.
-- Los refresh tokens quedan server-only: RLS sin políticas para authenticated
-- y acceso exclusivo service_role desde /api/calendar/*.

create table if not exists public.proveedor_calendar_conexiones(
  proveedor_id uuid primary key references public.usuarios(id) on delete cascade,
  google_email text,
  calendar_id text not null default 'primary',
  refresh_token text not null,
  scope text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proveedor_calendar_eventos(
  servicio_id uuid primary key references public.servicios(id) on delete cascade,
  proveedor_id uuid not null references public.usuarios(id) on delete cascade,
  google_event_id text not null,
  event_etag text,
  last_action text not null default 'created',
  last_error text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint proveedor_calendar_eventos_action_check check(last_action in ('created','updated','deleted','error'))
);

create unique index if not exists proveedor_calendar_eventos_provider_google_uidx
  on public.proveedor_calendar_eventos(proveedor_id,google_event_id);
create index if not exists proveedor_calendar_eventos_provider_idx
  on public.proveedor_calendar_eventos(proveedor_id,synced_at desc);

alter table public.proveedor_calendar_conexiones enable row level security;
alter table public.proveedor_calendar_eventos enable row level security;

revoke all on public.proveedor_calendar_conexiones from public,anon,authenticated;
revoke all on public.proveedor_calendar_eventos from public,anon,authenticated;
grant all on public.proveedor_calendar_conexiones to service_role;
grant all on public.proveedor_calendar_eventos to service_role;

comment on table public.proveedor_calendar_conexiones is
  'Conexión OAuth Google Calendar del proveedor. Nunca se lee desde el navegador.';
comment on table public.proveedor_calendar_eventos is
  'Mapa idempotente serviceId UGO -> Google eventId. UGO sigue siendo la fuente de verdad.';

notify pgrst,'reload schema';
