-- Expand QA Lab to every Master P0 deterministic control.
insert into public.autonomous_qa_scenarios(scenario_key,source_type,title,description,target_role,deterministic_judge,chaos_profile,seeded_defect,status)
values
('payments','REGRESSION','Payment and cash YA PAGUE','Payment ledger and cash acknowledgement remain isolated by serviceId','ADMIN','{"required_assertions":["payment_recorded","cash_acknowledged","ledger_isolated"]}'::jsonb,'{}'::jsonb,false,'ACTIVE'),
('realtime','REGRESSION','Realtime state propagation','Client Provider Admin observe persisted state without refresh','ADMIN','{"required_assertions":["client_realtime","provider_realtime","admin_realtime"]}'::jsonb,'{}'::jsonb,false,'ACTIVE'),
('roles','REGRESSION','Role isolation and authority','RLS and governed authority remain isolated','ADMIN','{"required_assertions":["client_isolated","provider_isolated","admin_isolated","superadmin_governed"]}'::jsonb,'{}'::jsonb,false,'ACTIVE')
on conflict(scenario_key)do update set deterministic_judge=excluded.deterministic_judge,status='ACTIVE',updated_at=now();