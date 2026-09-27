-- D9 QA Lab executable simulator actors and deterministic run lifecycle.
create table if not exists public.autonomous_qa_simulators(id uuid primary key default gen_random_uuid(),simulator_key text not null unique,role text not null check(role in('CLIENT','PROVIDER','ADMIN','SYSTEM')),name text not null,capabilities jsonb not null default '[]'::jsonb,status text not null default 'ACTIVE' check(status in('ACTIVE','DISABLED')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.autonomous_qa_simulators enable row level security;
do $$begin create policy qa_simulators_superadmin_read on public.autonomous_qa_simulators for select to authenticated using(private.is_superadmin());exception when duplicate_object then null;end$$;
insert into public.autonomous_qa_simulators(simulator_key,role,name,capabilities)values
('qa-client-simulator','CLIENT','UGO QA Client Simulator','["request_service","approve_work","confirm_payment","rate_provider"]'),
('qa-provider-simulator','PROVIDER','UGO QA Provider Simulator','["receive_offer","accept_service","publish_gps","arrive","start_evidence","finish_evidence","complete_work","rate_client"]'),
('qa-admin-system-simulator','ADMIN','UGO QA Admin/System Simulator','["observe_service","verify_isolation","verify_realtime","verify_governance"]')
on conflict(simulator_key)do update set role=excluded.role,name=excluded.name,capabilities=excluded.capabilities,updated_at=now();

create or replace function public.superadmin_run_qa_scenario(p_scenario_id uuid,p_simulator_results jsonb,p_chaos_result jsonb default '{}'::jsonb)
returns public.autonomous_qa_runs language plpgsql security definer set search_path=public,private,auth as $$
declare s public.autonomous_qa_scenarios%rowtype;r public.autonomous_qa_runs%rowtype;passed boolean;missing text[]:='{}';expected jsonb;begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';end if;
 select * into s from public.autonomous_qa_scenarios where id=p_scenario_id and status='ACTIVE';if s.id is null then raise exception 'ACTIVE_SCENARIO_REQUIRED';end if;
 expected:=coalesce(s.deterministic_judge->'required_assertions','[]'::jsonb);
 select coalesce(array_agg(x),'{}') into missing from jsonb_array_elements_text(expected)x where coalesce((p_simulator_results->>x)::boolean,false)=false;
 passed:=cardinality(missing)=0 and not coalesce((p_chaos_result->>'unexpected_failure')::boolean,false);
 insert into public.autonomous_qa_runs(scenario_id,status,simulator_results,chaos_result,judge_result,diagnosis,remediation_request,permanent_regression,started_at,finished_at)
 values(s.id,case when passed then'PASSED'else'FAILED'end,coalesce(p_simulator_results,'{}'),coalesce(p_chaos_result,'{}'),jsonb_build_object('passed',passed,'missing_assertions',to_jsonb(missing),'seeded_defect',s.seeded_defect),case when passed then null else'Deterministic judge rejected scenario' end,case when passed then null else'Remediate failed assertions and rerun before release' end,passed and s.source_type='REGRESSION',now(),now()) returning * into r;
 update public.autonomous_quality_coverage set scenario_id=s.id,last_run_id=r.id,status=case when passed then'COVERED'else'FAILING'end,updated_at=now() where coverage_key=s.scenario_key;
 return r;end$$;
revoke all on function public.superadmin_run_qa_scenario(uuid,jsonb,jsonb) from public;grant execute on function public.superadmin_run_qa_scenario(uuid,jsonb,jsonb) to authenticated;

insert into public.autonomous_qa_scenarios(scenario_key,source_type,title,description,target_role,deterministic_judge,chaos_profile,seeded_defect)
values
('provider-radius','REGRESSION','Provider radius <=20km','Client/Provider simulators prove offers never exceed 20km.','CROSS_ROLE','{"required_assertions":["provider_within_20km","outside_provider_rejected"]}','{"boundary_km":[19.99,20.0,20.01]}',false),
('gps-geofence','REGRESSION','Real GPS and 200m arrival gate','Provider simulator proves 0,0/stale GPS rejected and arrival requires backend geofence.','PROVIDER','{"required_assertions":["zero_zero_rejected","stale_gps_rejected","arrival_inside_200m","arrival_outside_200m_rejected"]}','{"gps_faults":["0,0","stale","timeout","permission_denied"]}',false),
('service-lifecycle','REGRESSION','P0 service lifecycle by serviceId','Client, Provider and Admin simulators cover request through bilateral rating without cross-service mutation.','CROSS_ROLE','{"required_assertions":["service_id_isolated","request_created","provider_accepted","arrival_verified","start_evidence","finish_evidence","client_approved","payment_recorded","completed","bilateral_rating"]}','{"faults":["duplicate_action","reordered_event","realtime_delay"]}',false),
('permissions-rls','REGRESSION','Role isolation RLS/RPC','Actors prove Client Provider Admin cannot cross ownership or Super Admin governance boundaries.','CROSS_ROLE','{"required_assertions":["client_isolated","provider_isolated","admin_governance_denied","superadmin_governance_allowed"]}','{"faults":["foreign_service_id","direct_table_mutation"]}',false),
('qa-meta-seeded-defect','REGRESSION','Meta-QA seeded defect detector','Known defect must be rejected by deterministic judge, proving QA can fail honestly.','SYSTEM','{"required_assertions":["seeded_defect_detected"]}','{"seed":"KNOWN_FAILURE"}',true)
on conflict(scenario_key)do update set title=excluded.title,description=excluded.description,target_role=excluded.target_role,deterministic_judge=excluded.deterministic_judge,chaos_profile=excluded.chaos_profile,seeded_defect=excluded.seeded_defect,updated_at=now();