-- Reject evidence borrowed from another demo service, even when a scenario is rebound
-- after a prior run. The independent judge remains responsible for the assertions.
create or replace function public.autonomous_assert_qa_evidence_service_binding()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare bound_service uuid; run_scenario uuid;
begin
  select r.scenario_id,s.service_id into run_scenario,bound_service
  from public.autonomous_qa_runs r
  join public.autonomous_qa_scenarios s on s.id=r.scenario_id
  where r.id=new.run_id;
  if run_scenario is null or new.scenario_id is distinct from run_scenario
     or bound_service is null or new.service_id is distinct from bound_service then
    raise exception 'QA_EVIDENCE_SERVICE_MISMATCH' using errcode='23514';
  end if;
  return new;
end$$;

drop trigger if exists qa_evidence_service_binding on public.autonomous_qa_assertion_evidence;
create trigger qa_evidence_service_binding before insert or update
on public.autonomous_qa_assertion_evidence for each row
execute function public.autonomous_assert_qa_evidence_service_binding();

-- Recheck at promotion time: rebinding a scenario must invalidate older evidence.
create or replace function public.autonomous_assert_qa_coverage_service_binding()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if new.status='COVERED' and new.coverage_key=any(array['gps-geofence','roles','permissions-rls','realtime'])
     and (new.last_run_id is null or not exists (
       select 1 from public.autonomous_qa_runs r
       join public.autonomous_qa_scenarios s on s.id=r.scenario_id
       where r.id=new.last_run_id and s.scenario_key=new.coverage_key
         and s.service_id is not null
         and exists(select 1 from public.autonomous_qa_assertion_evidence e where e.run_id=r.id)
         and not exists(select 1 from public.autonomous_qa_assertion_evidence e
           where e.run_id=r.id and (e.scenario_id is distinct from s.id
             or e.service_id is distinct from s.service_id))
     )) then
    raise exception 'QA_COVERAGE_SERVICE_MISMATCH' using errcode='23514';
  end if;
  return new;
end$$;

drop trigger if exists qa_coverage_service_binding on public.autonomous_quality_coverage;
create trigger qa_coverage_service_binding before insert or update of status,last_run_id
on public.autonomous_quality_coverage for each row
execute function public.autonomous_assert_qa_coverage_service_binding();

create or replace function public.autonomous_invalidate_rebound_qa_coverage()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if old.service_id is distinct from new.service_id and
     new.scenario_key=any(array['gps-geofence','roles','permissions-rls','realtime']) then
    update public.autonomous_quality_coverage
       set status='UNCOVERED',last_run_id=null,updated_at=now()
     where coverage_key=new.scenario_key;
  end if;
  return new;
end$$;

drop trigger if exists qa_scenario_rebind_invalidates_coverage on public.autonomous_qa_scenarios;
create trigger qa_scenario_rebind_invalidates_coverage after update of service_id
on public.autonomous_qa_scenarios for each row
execute function public.autonomous_invalidate_rebound_qa_coverage();

-- Existing covered rows without a matching service are unsafe until rerun.
update public.autonomous_quality_coverage c set status='UNCOVERED',last_run_id=null,updated_at=now()
where c.coverage_key=any(array['gps-geofence','roles','permissions-rls','realtime'])
  and c.status='COVERED' and not exists (
    select 1 from public.autonomous_qa_runs r
    join public.autonomous_qa_scenarios s on s.id=r.scenario_id
    where r.id=c.last_run_id and s.scenario_key=c.coverage_key and s.service_id is not null
      and exists(select 1 from public.autonomous_qa_assertion_evidence e where e.run_id=r.id)
      and not exists(select 1 from public.autonomous_qa_assertion_evidence e
        where e.run_id=r.id and (e.scenario_id is distinct from s.id
          or e.service_id is distinct from s.service_id)));
