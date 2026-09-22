-- UGO Scout · Gmail outreach account
-- Shared outbound Gmail connection for Admin/Scout recruitment.
-- OAuth refresh token remains server-only. Browser access is explicitly revoked.

create table if not exists public.scout_gmail_conexiones(
  id text primary key default 'primary',
  google_email text not null,
  refresh_token text not null,
  scope text,
  connected_by uuid references public.usuarios(id) on delete set null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scout_gmail_conexiones_singleton_check check(id='primary')
);

create table if not exists public.scout_email_envios(
  id uuid primary key default gen_random_uuid(),
  prospecto_id uuid references public.prospectos_scouts(id) on delete set null,
  to_email text not null,
  subject text not null,
  gmail_message_id text,
  gmail_thread_id text,
  estado text not null default 'sent',
  error text,
  sent_by uuid references public.usuarios(id) on delete set null,
  sent_at timestamptz not null default now(),
  constraint scout_email_envios_estado_check check(estado in ('sent','failed'))
);

create index if not exists scout_email_envios_prospect_idx
  on public.scout_email_envios(prospecto_id,sent_at desc);
create index if not exists scout_email_envios_sent_at_idx
  on public.scout_email_envios(sent_at desc);

alter table public.scout_gmail_conexiones enable row level security;
alter table public.scout_email_envios enable row level security;

revoke all on public.scout_gmail_conexiones from public,anon,authenticated;
revoke all on public.scout_email_envios from public,anon,authenticated;
grant all on public.scout_gmail_conexiones to service_role;
grant all on public.scout_email_envios to service_role;

comment on table public.scout_gmail_conexiones is
  'Cuenta Gmail compartida de Scout. Refresh token OAuth server-only; nunca se expone al navegador.';
comment on table public.scout_email_envios is
  'Auditoría server-only de invitaciones Gmail enviadas desde Scout.';

notify pgrst,'reload schema';
