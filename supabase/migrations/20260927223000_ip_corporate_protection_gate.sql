-- UGO Intellectual Property & Corporate Protection Gate MVP
-- Persistent, auditable and Super Admin governed. No external legal filing is performed here.

create table if not exists public.ip_innovations (
  id uuid primary key default gen_random_uuid(),
  title text not null check (btrim(title) <> ''),
  description text not null default '',
  department_id integer not null check (department_id in (1,2,3,4,5,6,7,8,9,10,11,12,14)),
  creator_id uuid not null default auth.uid(),
  contributors jsonb not null default '[]'::jsonb,
  innovation_type text not null default 'OTHER',
  possible_protection text not null check (possible_protection in ('TRADEMARK','COPYRIGHT','SOFTWARE_REGISTRATION','PATENTABILITY_REVIEW','TRADE_SECRET','CONTRACT','NONE','LEGAL_REVIEW')),
  confidentiality text not null default 'INTERNAL' check (confidentiality in ('PUBLIC','INTERNAL','CONFIDENTIAL','STRICTLY_CONFIDENTIAL')),
  status text not null default 'DRAFT' check (status in ('DRAFT','IP_REVIEW_REQUIRED','UNDER_REVIEW','PROTECTION_RECOMMENDED','CONFIDENTIAL','CLEARED_FOR_DISCLOSURE','EXTERNAL_COUNSEL_REQUIRED','REJECTED','ARCHIVED')),
  legal_protection_status text not null default 'POTENTIAL' check (legal_protection_status in ('POTENTIAL','RECOMMENDED','FILED','REGISTERED','GRANTED')),
  target_jurisdictions text[] not null default array['BR']::text[],
  repository text,
  commit_sha text,
  technical_evidence jsonb not null default '{}'::jsonb,
  product_evidence jsonb not null default '{}'::jsonb,
  legal_notes text,
  decision_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ip_evidence_ledger (
  id uuid primary key default gen_random_uuid(),
  innovation_id uuid not null references public.ip_innovations(id) on delete restrict,
  evidence_type text not null,
  reference text not null,
  evidence_hash text,
  version text,
  author_id uuid default auth.uid(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  evidence_key text generated always as (coalesce(evidence_hash,'')) stored,
  unique (innovation_id, evidence_type, reference, evidence_key)
);

create table if not exists public.ip_gate_decisions (
  id uuid primary key default gen_random_uuid(),
  innovation_id uuid not null references public.ip_innovations(id) on delete restrict,
  intended_action text not null check (intended_action in ('PUBLIC_RELEASE','PUBLIC_DOCUMENTATION','MARKETING_DISCLOSURE','EXTERNAL_DEMO','OPEN_SOURCE_PUBLICATION','EXTERNAL_PARTNER_DISCLOSURE')),
  decision text not null check (decision in ('ALLOW','REVIEW_REQUIRED','BLOCK_DISCLOSURE','EXTERNAL_COUNSEL_REQUIRED')),
  reason text not null,
  policy_version text not null default 'IP_GATE_V1',
  evidence jsonb not null default '[]'::jsonb,
  evaluated_by uuid default auth.uid(),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (innovation_id, intended_action, idempotency_key)
);

create table if not exists public.ip_audit_findings (
  id uuid primary key default gen_random_uuid(),
  innovation_id uuid references public.ip_innovations(id) on delete restrict,
  finding_type text not null,
  severity text not null check (severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  description text not null,
  status text not null default 'OPEN' check (status in ('OPEN','REMEDIATING','CLOSED')),
  detected_by uuid default auth.uid(),
  closed_by uuid,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check (status <> 'CLOSED' or closed_by is not null)
);

alter table public.ip_innovations enable row level security;
alter table public.ip_evidence_ledger enable row level security;
alter table public.ip_gate_decisions enable row level security;
alter table public.ip_audit_findings enable row level security;

revoke all on public.ip_innovations, public.ip_evidence_ledger, public.ip_gate_decisions, public.ip_audit_findings from public, anon;
grant select on public.ip_innovations, public.ip_evidence_ledger, public.ip_gate_decisions, public.ip_audit_findings to authenticated;

create policy ip_innovations_superadmin_read on public.ip_innovations for select to authenticated using (private.is_superadmin());
create policy ip_evidence_superadmin_read on public.ip_evidence_ledger for select to authenticated using (private.is_superadmin());
create policy ip_decisions_superadmin_read on public.ip_gate_decisions for select to authenticated using (private.is_superadmin());
create policy ip_findings_superadmin_read on public.ip_audit_findings for select to authenticated using (private.is_superadmin());

create or replace function private.ip_has_verified_legal_evidence(p_innovation_id uuid)
returns boolean language sql stable security definer set search_path=public,private,auth as $$
 select exists(select 1 from public.ip_evidence_ledger e where e.innovation_id=p_innovation_id and e.evidence_type in ('LEGAL_FILING','LEGAL_REGISTRATION','LEGAL_GRANT') and nullif(btrim(e.reference),'') is not null);
$$;
revoke all on function private.ip_has_verified_legal_evidence(uuid) from public;
grant execute on function private.ip_has_verified_legal_evidence(uuid) to authenticated;

create or replace function public.ip_create_innovation(p_title text,p_description text,p_department_id integer,p_innovation_type text,p_possible_protection text,p_confidentiality text default 'INTERNAL',p_target_jurisdictions text[] default array['BR']::text[],p_repository text default null,p_commit_sha text default null,p_technical_evidence jsonb default '{}'::jsonb,p_product_evidence jsonb default '{}'::jsonb)
returns public.ip_innovations language plpgsql security definer set search_path=public,private,auth as $$
declare v public.ip_innovations%rowtype;
begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501'; end if;
 insert into public.ip_innovations(title,description,department_id,creator_id,innovation_type,possible_protection,confidentiality,status,target_jurisdictions,repository,commit_sha,technical_evidence,product_evidence)
 values(btrim(p_title),coalesce(p_description,''),p_department_id,auth.uid(),coalesce(nullif(btrim(p_innovation_type),''),'OTHER'),p_possible_protection,p_confidentiality,
 case when p_possible_protection in ('PATENTABILITY_REVIEW','TRADE_SECRET','LEGAL_REVIEW') or p_confidentiality in ('CONFIDENTIAL','STRICTLY_CONFIDENTIAL') then 'IP_REVIEW_REQUIRED' else 'DRAFT' end,
 coalesce(p_target_jurisdictions,array['BR']::text[]),p_repository,p_commit_sha,coalesce(p_technical_evidence,'{}'),coalesce(p_product_evidence,'{}')) returning * into v;
 insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles) values('ip.innovation.created',auth.uid(),'ip_innovation',v.id,jsonb_build_object('department_id',v.department_id,'status',v.status,'possible_protection',v.possible_protection));
 return v;
end $$;
revoke all on function public.ip_create_innovation(text,text,integer,text,text,text,text[],text,text,jsonb,jsonb) from public;
grant execute on function public.ip_create_innovation(text,text,integer,text,text,text,text[],text,text,jsonb,jsonb) to authenticated;

create or replace function public.ip_add_evidence(p_innovation_id uuid,p_evidence_type text,p_reference text,p_evidence_hash text default null,p_version text default null,p_metadata jsonb default '{}'::jsonb)
returns public.ip_evidence_ledger language plpgsql security definer set search_path=public,private,auth as $$
declare v public.ip_evidence_ledger%rowtype;
begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501'; end if;
 insert into public.ip_evidence_ledger(innovation_id,evidence_type,reference,evidence_hash,version,author_id,metadata)
 values(p_innovation_id,btrim(p_evidence_type),btrim(p_reference),p_evidence_hash,p_version,auth.uid(),coalesce(p_metadata,'{}'))
 on conflict (innovation_id,evidence_type,reference,evidence_key) do nothing
 returning * into v;
 if v.id is null then select * into v from public.ip_evidence_ledger where innovation_id=p_innovation_id and evidence_type=btrim(p_evidence_type) and reference=btrim(p_reference) and evidence_key=coalesce(p_evidence_hash,''); end if;
 return v;
end $$;
revoke all on function public.ip_add_evidence(uuid,text,text,text,text,jsonb) from public;
grant execute on function public.ip_add_evidence(uuid,text,text,text,text,jsonb) to authenticated;

create or replace function public.evaluate_ip_gate(p_innovation_id uuid,p_intended_action text,p_idempotency_key text)
returns public.ip_gate_decisions language plpgsql security definer set search_path=public,private,auth as $$
declare i public.ip_innovations%rowtype; v public.ip_gate_decisions%rowtype; d text; r text;
begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501'; end if;
 select * into i from public.ip_innovations where id=p_innovation_id for share;
 if not found then raise exception 'INNOVATION_NOT_FOUND' using errcode='P0002'; end if;
 if i.status='EXTERNAL_COUNSEL_REQUIRED' then d:='EXTERNAL_COUNSEL_REQUIRED';r:='External counsel clearance is required.';
 elsif i.status='CLEARED_FOR_DISCLOSURE' and i.confidentiality not in ('CONFIDENTIAL','STRICTLY_CONFIDENTIAL') then d:='ALLOW';r:='Innovation has recorded disclosure clearance.';
 elsif i.possible_protection in ('PATENTABILITY_REVIEW','TRADE_SECRET','LEGAL_REVIEW') or i.confidentiality in ('CONFIDENTIAL','STRICTLY_CONFIDENTIAL') then d:='BLOCK_DISCLOSURE';r:='Sensitive innovation requires IP clearance before disclosure.';
 else d:='REVIEW_REQUIRED';r:='IP review is required before sensitive disclosure.'; end if;
 insert into public.ip_gate_decisions(innovation_id,intended_action,decision,reason,evidence,evaluated_by,idempotency_key)
 values(i.id,p_intended_action,d,r,jsonb_build_array(jsonb_build_object('innovation_version',i.version,'status',i.status,'confidentiality',i.confidentiality,'possible_protection',i.possible_protection)),auth.uid(),p_idempotency_key)
 on conflict (innovation_id,intended_action,idempotency_key) do nothing returning * into v;
 if v.id is null then select * into v from public.ip_gate_decisions where innovation_id=i.id and intended_action=p_intended_action and idempotency_key=p_idempotency_key; end if;
 return v;
end $$;
revoke all on function public.evaluate_ip_gate(uuid,text,text) from public;
grant execute on function public.evaluate_ip_gate(uuid,text,text) to authenticated;

create or replace function public.can_disclose_innovation(p_innovation_id uuid,p_intended_action text,p_idempotency_key text)
returns boolean language sql security definer set search_path=public,private,auth as $$
 select (public.evaluate_ip_gate(p_innovation_id,p_intended_action,p_idempotency_key)).decision='ALLOW';
$$;
revoke all on function public.can_disclose_innovation(uuid,text,text) from public;
grant execute on function public.can_disclose_innovation(uuid,text,text) to authenticated;

create or replace function public.ip_set_legal_status(p_innovation_id uuid,p_status text,p_reason text)
returns public.ip_innovations language plpgsql security definer set search_path=public,private,auth as $$
declare v public.ip_innovations%rowtype;
begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501'; end if;
 if p_status in ('FILED','REGISTERED','GRANTED') and not private.ip_has_verified_legal_evidence(p_innovation_id) then raise exception 'VERIFIED_LEGAL_EVIDENCE_REQUIRED' using errcode='23514'; end if;
 update public.ip_innovations set legal_protection_status=p_status,decision_reason=p_reason,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now(),version=version+1 where id=p_innovation_id returning * into v;
 if not found then raise exception 'INNOVATION_NOT_FOUND' using errcode='P0002'; end if;
 insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles) values('ip.legal_status.changed',auth.uid(),'ip_innovation',v.id,jsonb_build_object('legal_status',v.legal_protection_status,'reason',p_reason));
 return v;
end $$;
revoke all on function public.ip_set_legal_status(uuid,text,text) from public;
grant execute on function public.ip_set_legal_status(uuid,text,text) to authenticated;

create or replace function public.ip_audit_innovation(p_innovation_id uuid)
returns setof public.ip_audit_findings language plpgsql security definer set search_path=public,private,auth as $$
declare i public.ip_innovations%rowtype; v public.ip_audit_findings%rowtype;
begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501'; end if;
 select * into i from public.ip_innovations where id=p_innovation_id;
 if not found then raise exception 'INNOVATION_NOT_FOUND' using errcode='P0002'; end if;
 if i.legal_protection_status in ('FILED','REGISTERED','GRANTED') and not private.ip_has_verified_legal_evidence(i.id) then
  insert into public.ip_audit_findings(innovation_id,finding_type,severity,description,detected_by) values(i.id,'UNVERIFIED_LEGAL_CLAIM','CRITICAL','Legal protection status lacks verified legal evidence.',auth.uid()) returning * into v;
 end if;
 return query select * from public.ip_audit_findings where innovation_id=p_innovation_id order by created_at desc;
end $$;
revoke all on function public.ip_audit_innovation(uuid) from public;
grant execute on function public.ip_audit_innovation(uuid) to authenticated;

create or replace function private.ip_ledger_immutable()
returns trigger language plpgsql set search_path=public,private,auth as $$
begin raise exception 'IP_LEDGER_APPEND_ONLY' using errcode='42501'; end $$;
create trigger ip_evidence_no_update_delete before update or delete on public.ip_evidence_ledger for each row execute function private.ip_ledger_immutable();
create trigger ip_decisions_no_update_delete before update or delete on public.ip_gate_decisions for each row execute function private.ip_ledger_immutable();
