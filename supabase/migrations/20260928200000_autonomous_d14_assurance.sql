-- D14 corporate assurance loop: risk map, control coverage, challenge and independent finding closure.
alter table public.autonomous_audit_findings add column if not exists remediation_deadline timestamptz;
alter table public.autonomous_audit_findings add column if not exists remediation_summary text;
alter table public.autonomous_audit_findings add column if not exists reaudit_evidence jsonb not null default '[]'::jsonb;
alter table public.autonomous_audit_findings add column if not exists reaudit_by_agent uuid references public.autonomous_agents(id);

create table if not exists public.autonomous_enterprise_risks(id uuid primary key default gen_random_uuid(),risk_key text not null unique,domain text not null,description text not null,likelihood text not null check(likelihood in('LOW','MEDIUM','HIGH')),impact text not null check(impact in('LOW','MEDIUM','HIGH','CRITICAL')),owner_department integer references public.autonomous_departments(department_id),mitigation text,status text not null default 'OPEN' check(status in('OPEN','MITIGATING','ACCEPTED','CLOSED')),updated_at timestamptz not null default now());
create table if not exists public.autonomous_control_coverage(id uuid primary key default gen_random_uuid(),control_key text not null unique,domain text not null,control_description text not null,owner_department integer references public.autonomous_departments(department_id),auditor_agent_id uuid references public.autonomous_agents(id),status text not null default 'UNVERIFIED' check(status in('UNVERIFIED','EFFECTIVE','INEFFECTIVE','BLOCKED')),last_verified_at timestamptz,evidence_refs jsonb not null default '[]'::jsonb);
create table if not exists public.autonomous_challenges(id uuid primary key default gen_random_uuid(),challenge_type text not null check(challenge_type in('DIGITAL_TWIN','RED_TEAM','META_AUDIT','FOUNDER_CHALLENGE')),title text not null,hypothesis text not null,scenario jsonb not null default '{}'::jsonb,status text not null default 'PLANNED' check(status in('PLANNED','RUNNING','PASSED','FAILED','BLOCKED')),result jsonb not null default '{}'::jsonb,correlation_id uuid not null default gen_random_uuid(),created_at timestamptz not null default now(),finished_at timestamptz);
alter table public.autonomous_enterprise_risks enable row level security;alter table public.autonomous_control_coverage enable row level security;alter table public.autonomous_challenges enable row level security;
do $$begin create policy enterprise_risks_superadmin_read on public.autonomous_enterprise_risks for select to authenticated using(private.is_superadmin());create policy control_coverage_superadmin_read on public.autonomous_control_coverage for select to authenticated using(private.is_superadmin());create policy challenges_superadmin_read on public.autonomous_challenges for select to authenticated using(private.is_superadmin());exception when duplicate_object then null;end$$;

create or replace function public.superadmin_close_autonomous_finding(p_finding_id uuid,p_remediation_summary text,p_reaudit_agent_id uuid,p_reaudit_evidence jsonb)
returns public.autonomous_audit_findings language plpgsql security definer set search_path=public,private,auth as $$
declare f public.autonomous_audit_findings%rowtype;a public.autonomous_agents%rowtype;begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';end if;
 select * into f from public.autonomous_audit_findings where id=p_finding_id for update;if f.id is null then raise exception 'FINDING_NOT_FOUND';end if;
 select * into a from public.autonomous_agents where id=p_reaudit_agent_id and department_id=14;if a.id is null then raise exception 'D14_REAUDITOR_REQUIRED';end if;
 if nullif(btrim(p_remediation_summary),'')is null or jsonb_array_length(coalesce(p_reaudit_evidence,'[]'))=0 then raise exception 'REMEDIATION_AND_REAUDIT_EVIDENCE_REQUIRED';end if;
 if f.severity='CRITICAL' and f.owner_department=14 then raise exception 'CRITICAL_OWNER_CANNOT_SELF_CLOSE';end if;
 update public.autonomous_audit_findings set status='CLOSED',remediation_summary=btrim(p_remediation_summary),reaudit_by_agent=a.id,reaudit_evidence=p_reaudit_evidence,closure_evidence=p_reaudit_evidence,closed_by=auth.uid(),closed_at=now() where id=f.id returning * into f;return f;end$$;
revoke all on function public.superadmin_close_autonomous_finding(uuid,text,uuid,jsonb) from public;grant execute on function public.superadmin_close_autonomous_finding(uuid,text,uuid,jsonb) to authenticated;

insert into public.autonomous_control_coverage(control_key,domain,control_description,owner_department,status)values
('authority-boundaries','governance','GREEN/YELLOW/RED authority boundaries and human escalation',14,'UNVERIFIED'),
('data-quality-gate','data','Freshness provenance completeness consistency and reconciliation',8,'UNVERIFIED'),
('qa-release-gate','quality','Deterministic QA coverage and Customer #1 release gate',9,'UNVERIFIED'),
('job-resilience','operations','Leases heartbeat retry stale recovery dead-letter and kill switches',2,'UNVERIFIED'),
('audit-evidence','audit','Append-only decisions and hash-verifiable evidence',14,'UNVERIFIED')
on conflict(control_key)do nothing;
insert into public.autonomous_challenges(challenge_type,title,hypothesis,scenario)values
('DIGITAL_TWIN','Customer #1 corporate digital twin','The complete governed company can replay a service lifecycle without cross-service mutation','{"requires":["serviceId","client","provider","admin","finance","qa","d14"]}'),
('RED_TEAM','Corporate authority red team','Unauthorized role/model paths cannot bypass authority or kill switches','{"attacks":["role_bypass","kill_switch_bypass","red_self_approval"]}'),
('META_AUDIT','Seeded corporate anomaly','D14 controls detect a known governance anomaly','{"seeded_anomaly":true}'),
('FOUNDER_CHALLENGE','Founder challenge protocol','A material strategic assumption is challenged with evidence before irreversible execution','{"requires_human_decision":true}');