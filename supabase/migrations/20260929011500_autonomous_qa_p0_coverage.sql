-- Expand QA Lab to every Master P0 deterministic control.
insert into public.autonomous_qa_scenarios(scenario_key,title,scenario_type,required_assertions,status,coverage_key)
values
('payments','Payment and cash YA PAGUE','REGRESSION','["payment_recorded","cash_acknowledged","ledger_isolated"]'::jsonb,'ACTIVE','payments'),
('realtime','Realtime state propagation','REGRESSION','["client_realtime","provider_realtime","admin_realtime"]'::jsonb,'ACTIVE','realtime'),
('roles','Role isolation and authority','SECURITY','["client_isolated","provider_isolated","admin_isolated","superadmin_governed"]'::jsonb,'ACTIVE','roles')
on conflict(scenario_key)do update set required_assertions=excluded.required_assertions,status='ACTIVE',coverage_key=excluded.coverage_key;