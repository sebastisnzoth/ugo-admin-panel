-- UGO Autonomous Corporation governance foundation (TEST-first)
-- Real persisted control plane for Super Admin. No production deployment implied.

create table if not exists public.autonomous_company_state (
  singleton boolean primary key default true check (singleton),
  mode text not null default 'OFF' check (mode in ('OFF','SHADOW','ON','SAFE_MODE')),
  reason text,
  policy_version text not null default 'AUTONOMOUS_CORP_V1',
  updated_by uuid,
  updated_at timestamptz not null default now()
);
insert into public.autonomous_company_state(singleton,mode,reason) values(true,'OFF','Autonomy requires explicit Super Admin activation') on conflict(singleton) do nothing;

create table if not exists public.autonomous_departments (
  department_id integer primary key check (department_id in (1,2,3,4,5,6,7,8,9,10,11,12,14)),
  name text not null,
  objective text not null,
  status text not null default 'IDLE' check(status in ('IDLE','ACTIVE','DEGRADED','BLOCKED','SAFE_MODE')),
  sla_minutes integer,
  health jsonb not null default '{}'::jsonb,
  last_action_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.autonomous_departments(department_id,name,objective) values
(1,'Executive AI Direction','Strategy, priorities, orchestration and exceptions'),
(2,'Operations','Dispatch, location, lifecycle, realtime and recovery'),
(3,'Client Experience','Customer care, service help, billing support and CX'),
(4,'Providers','Recruitment, onboarding, supply, quality and fairness'),
(5,'Growth & Expansion','Acquisition, experiments, revenue growth and expansion'),
(6,'Trust & Resolution','Cases, evidence, fraud, resolution and appeals'),
(7,'Finance','Payments, reconciliation, balances, refunds and treasury'),
(8,'Technology & Security','Engineering, security, DevOps, observability and R&D'),
(9,'Quality, QA & Excellence','Autonomous QA, simulators, regression and release gate'),
(10,'Legal, Compliance & Policy','Legal, privacy, labor, IP protection and policy'),
(11,'Marketing, Brand & Communication','Brand, content, community, PR and localization'),
(12,'Product, Design, UI/UX & Experience','Product strategy, UX, design and analytics'),
(14,'Corporate Audit, Governance & Control','Independent audit, risk, controls and AI governance')
on conflict(department_id) do update set name=excluded.name,objective=excluded.objective;

create table if not exists public.autonomous_agents (
  id uuid primary key default gen_random_uuid(),
  department_id integer not null references public.autonomous_departments(department_id),
  agent_key text not null unique,
  name text not null,
  capability text not null,
  authority_class text not null check(authority_class in ('GREEN','YELLOW','RED')),
  status text not null default 'IDLE' check(status in ('IDLE','QUEUED','RUNNING','BLOCKED','SAFE_MODE','DISABLED')),
  model_provider text,
  model_id text,
  permissions jsonb not null default '[]'::jsonb,
  last_action_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.autonomous_jobs (
  id uuid primary key default gen_random_uuid(),
  department_id integer not null references public.autonomous_departments(department_id),
  agent_id uuid references public.autonomous_agents(id),
  objective text not null,
  trigger_type text not null default 'MANUAL',
  target_type text,
  target_id text,
  service_id uuid,
  authority_class text not null check(authority_class in ('GREEN','YELLOW','RED')),
  status text not null default 'QUEUED' check(status in ('QUEUED','RUNNING','WAITING_APPROVAL','BLOCKED','SUCCEEDED','FAILED','CANCELLED')),
  idempotency_key text not null unique,
  correlation_id uuid not null default gen_random_uuid(),
  input_evidence jsonb not null default '[]'::jsonb,
  result jsonb,
  blocked_reason text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists public.autonomous_decision_ledger (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.autonomous_jobs(id) on delete restrict,
  department_id integer not null references public.autonomous_departments(department_id),
  agent_id uuid references public.autonomous_agents(id),
  decision text not null,
  reason text not null,
  authority_class text not null check(authority_class in ('GREEN','YELLOW','RED')),
  policy_version text not null,
  evidence_refs jsonb not null default '[]'::jsonb,
  authorization text not null,
  correlation_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.autonomous_evidence_ledger (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.autonomous_jobs(id) on delete restrict,
  evidence_type text not null,
  reference text not null,
  evidence_hash text,
  metadata jsonb not null default '{}'::jsonb,
  correlation_id uuid not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.autonomous_kill_switches (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check(scope_type in ('GLOBAL','DEPARTMENT','AGENT','CAPABILITY')),
  scope_key text not null,
  enabled boolean not null default false,
  reason text,
  activated_by uuid,
  activated_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(scope_type,scope_key)
);

create table if not exists public.autonomous_audit_findings (
  id uuid primary key default gen_random_uuid(),
  department_id integer references public.autonomous_departments(department_id),
  job_id uuid references public.autonomous_jobs(id),
  finding_type text not null,
  severity text not null check(severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  description text not null,
  status text not null default 'OPEN' check(status in ('OPEN','REMEDIATING','CLOSED')),
  detected_by_department integer not null default 14 check(detected_by_department=14),
  owner_department integer,
  closure_evidence jsonb not null default '[]'::jsonb,
  closed_by uuid,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check(status<>'CLOSED' or (closed_by is not null and jsonb_array_length(closure_evidence)>0)),
  check(not (severity='CRITICAL' and status='CLOSED' and owner_department=14))
);

alter table public.autonomous_company_state enable row level security;
alter table public.autonomous_departments enable row level security;
alter table public.autonomous_agents enable row level security;
alter table public.autonomous_jobs enable row level security;
alter table public.autonomous_decision_ledger enable row level security;
alter table public.autonomous_evidence_ledger enable row level security;
alter table public.autonomous_kill_switches enable row level security;
alter table public.autonomous_audit_findings enable row level security;

revoke all on public.autonomous_company_state,public.autonomous_departments,public.autonomous_agents,public.autonomous_jobs,public.autonomous_decision_ledger,public.autonomous_evidence_ledger,public.autonomous_kill_switches,public.autonomous_audit_findings from public,anon;
grant select on public.autonomous_company_state,public.autonomous_departments,public.autonomous_agents,public.autonomous_jobs,public.autonomous_decision_ledger,public.autonomous_evidence_ledger,public.autonomous_kill_switches,public.autonomous_audit_findings to authenticated;

create policy autonomous_state_superadmin_read on public.autonomous_company_state for select to authenticated using(private.is_superadmin());
create policy autonomous_departments_superadmin_read on public.autonomous_departments for select to authenticated using(private.is_superadmin());
create policy autonomous_agents_superadmin_read on public.autonomous_agents for select to authenticated using(private.is_superadmin());
create policy autonomous_jobs_superadmin_read on public.autonomous_jobs for select to authenticated using(private.is_superadmin());
create policy autonomous_decisions_superadmin_read on public.autonomous_decision_ledger for select to authenticated using(private.is_superadmin());
create policy autonomous_evidence_superadmin_read on public.autonomous_evidence_ledger for select to authenticated using(private.is_superadmin());
create policy autonomous_switches_superadmin_read on public.autonomous_kill_switches for select to authenticated using(private.is_superadmin());
create policy autonomous_findings_superadmin_read on public.autonomous_audit_findings for select to authenticated using(private.is_superadmin());

create or replace function private.autonomous_append_only() returns trigger language plpgsql set search_path=public,private,auth as $$
begin raise exception 'AUTONOMOUS_LEDGER_APPEND_ONLY' using errcode='42501'; end $$;
create trigger autonomous_decision_immutable before update or delete on public.autonomous_decision_ledger for each row execute function private.autonomous_append_only();
create trigger autonomous_evidence_immutable before update or delete on public.autonomous_evidence_ledger for each row execute function private.autonomous_append_only();

create or replace function public.superadmin_set_autonomy_mode(p_mode text,p_reason text)
returns public.autonomous_company_state language plpgsql security definer set search_path=public,private,auth as $$
declare v public.autonomous_company_state%rowtype;
begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501'; end if;
 if p_mode not in ('OFF','SHADOW','ON','SAFE_MODE') then raise exception 'INVALID_AUTONOMY_MODE' using errcode='22023'; end if;
 update public.autonomous_company_state set mode=p_mode,reason=nullif(btrim(p_reason),''),updated_by=auth.uid(),updated_at=now() where singleton=true returning * into v;
 insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles) values('autonomy.mode.changed',auth.uid(),'autonomous_company',null,jsonb_build_object('mode',p_mode,'reason',p_reason));
 return v;
end $$;
revoke all on function public.superadmin_set_autonomy_mode(text,text) from public;
grant execute on function public.superadmin_set_autonomy_mode(text,text) to authenticated;

create or replace function public.superadmin_set_kill_switch(p_scope_type text,p_scope_key text,p_enabled boolean,p_reason text)
returns public.autonomous_kill_switches language plpgsql security definer set search_path=public,private,auth as $$
declare v public.autonomous_kill_switches%rowtype;
begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501'; end if;
 if p_scope_type not in ('GLOBAL','DEPARTMENT','AGENT','CAPABILITY') then raise exception 'INVALID_KILL_SWITCH_SCOPE' using errcode='22023'; end if;
 insert into public.autonomous_kill_switches(scope_type,scope_key,enabled,reason,activated_by,activated_at)
 values(p_scope_type,btrim(p_scope_key),p_enabled,nullif(btrim(p_reason),''),case when p_enabled then auth.uid() else null end,case when p_enabled then now() else null end)
 on conflict(scope_type,scope_key) do update set enabled=excluded.enabled,reason=excluded.reason,activated_by=excluded.activated_by,activated_at=excluded.activated_at,updated_at=now()
 returning * into v;
 insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles) values('autonomy.kill_switch.changed',auth.uid(),'autonomous_kill_switch',v.id,jsonb_build_object('scope_type',v.scope_type,'scope_key',v.scope_key,'enabled',v.enabled,'reason',v.reason));
 return v;
end $$;
revoke all on function public.superadmin_set_kill_switch(text,text,boolean,text) from public;
grant execute on function public.superadmin_set_kill_switch(text,text,boolean,text) to authenticated;

create or replace function public.autonomous_enqueue_job(p_department_id integer,p_agent_id uuid,p_objective text,p_trigger_type text,p_target_type text,p_target_id text,p_service_id uuid,p_authority_class text,p_idempotency_key text,p_input_evidence jsonb default '[]'::jsonb)
returns public.autonomous_jobs language plpgsql security definer set search_path=public,private,auth as $$
declare v public.autonomous_jobs%rowtype; m text; killed boolean;
begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501'; end if;
 select mode into m from public.autonomous_company_state where singleton=true;
 select exists(select 1 from public.autonomous_kill_switches where enabled and ((scope_type='GLOBAL') or (scope_type='DEPARTMENT' and scope_key=p_department_id::text) or (scope_type='AGENT' and scope_key=p_agent_id::text))) into killed;
 if killed or m in ('OFF','SAFE_MODE') then raise exception 'AUTONOMY_NOT_EXECUTABLE' using errcode='P0001'; end if;
 if p_authority_class='RED' then
   insert into public.autonomous_jobs(department_id,agent_id,objective,trigger_type,target_type,target_id,service_id,authority_class,status,idempotency_key,input_evidence)
   values(p_department_id,p_agent_id,btrim(p_objective),p_trigger_type,p_target_type,p_target_id,p_service_id,p_authority_class,'WAITING_APPROVAL',p_idempotency_key,coalesce(p_input_evidence,'[]')) on conflict(idempotency_key) do nothing returning * into v;
 else
   insert into public.autonomous_jobs(department_id,agent_id,objective,trigger_type,target_type,target_id,service_id,authority_class,status,idempotency_key,input_evidence)
   values(p_department_id,p_agent_id,btrim(p_objective),p_trigger_type,p_target_type,p_target_id,p_service_id,p_authority_class,'QUEUED',p_idempotency_key,coalesce(p_input_evidence,'[]')) on conflict(idempotency_key) do nothing returning * into v;
 end if;
 if v.id is null then select * into v from public.autonomous_jobs where idempotency_key=p_idempotency_key; end if;
 return v;
end $$;
revoke all on function public.autonomous_enqueue_job(integer,uuid,text,text,text,text,uuid,text,text,jsonb) from public;
grant execute on function public.autonomous_enqueue_job(integer,uuid,text,text,text,text,uuid,text,text,jsonb) to authenticated;
