-- Consultar Agente sends only sanitized aggregate evidence to an external
-- model; the confidential question/answer stay out of the database audit.
create table if not exists public.autonomous_agent_consultations(
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.autonomous_agents(id),
  actor_id uuid not null references public.usuarios(id),
  correlation_id uuid not null unique,
  task_class text not null check(task_class='AGENT_CONSULTATION'),
  question_hash text not null check(length(question_hash)=64),
  answer_hash text check(answer_hash is null or length(answer_hash)=64),
  evidence_summary jsonb not null default '{}'::jsonb,
  provider text,
  model_id text,
  success boolean not null,
  failure_code text,
  latency_ms integer check(latency_ms is null or latency_ms>=0),
  cost numeric(14,6) not null default 0 check(cost>=0),
  created_at timestamptz not null default now()
);
alter table public.autonomous_agent_consultations enable row level security;
revoke all on public.autonomous_agent_consultations from public,anon,authenticated;
grant select on public.autonomous_agent_consultations to authenticated;
grant insert,select on public.autonomous_agent_consultations to service_role;
create policy autonomous_consultations_superadmin_read
on public.autonomous_agent_consultations for select to authenticated
using(private.is_superadmin());
create trigger autonomous_consultations_immutable before update or delete
on public.autonomous_agent_consultations for each row
execute function private.autonomous_append_only();
