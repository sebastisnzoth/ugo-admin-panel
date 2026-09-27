-- Department 14 requires six independent assurance roles. Keep the existing stable key for the Internal Auditor to preserve references.
update public.autonomous_agents
set name='UGO Internal Auditor',
    capability='Independent internal audit of corporate execution and evidence',
    authority_class='RED',
    permissions='["audit","evidence_review","finding_open","escalate"]'::jsonb,
    updated_at=now()
where agent_key='corporate-audit-agent' and department_id=14;

insert into public.autonomous_agents(department_id,agent_key,name,capability,authority_class,status,model_provider,model_id,permissions)
values
(14,'enterprise-risk-officer','UGO Enterprise Risk Officer','Enterprise risk identification, mapping and escalation','RED','IDLE','openrouter','FREE_FIRST','["risk_map","risk_review","escalate"]'::jsonb),
(14,'internal-control-inspector','UGO Internal Control Inspector','Independent inspection of deterministic and corporate controls','RED','IDLE','openrouter','FREE_FIRST','["control_review","control_coverage","escalate"]'::jsonb),
(14,'cross-department-auditor','UGO Cross-Department Auditor','Cross-department audit and separation-of-duties review','RED','IDLE','openrouter','FREE_FIRST','["cross_department_audit","segregation_review","escalate"]'::jsonb),
(14,'ai-governance-auditor','UGO AI Governance Auditor','Independent AI authority, model and policy governance audit','RED','IDLE','openrouter','FREE_FIRST','["ai_governance","model_audit","authority_review","escalate"]'::jsonb),
(14,'executive-assurance-challenge','UGO Executive Assurance & Challenge','Executive assurance, challenge and founder escalation','RED','IDLE','openrouter','FREE_FIRST','["executive_assurance","challenge","founder_escalation"]'::jsonb)
on conflict(agent_key) do update set
 department_id=excluded.department_id,name=excluded.name,capability=excluded.capability,
 authority_class=excluded.authority_class,model_provider=excluded.model_provider,
 model_id=excluded.model_id,permissions=excluded.permissions,updated_at=now();

do $$
begin
 if (select count(*) from public.autonomous_agents where department_id=14) <> 6 then
   raise exception 'DEPARTMENT_14_REQUIRES_EXACTLY_SIX_INDEPENDENT_AGENTS';
 end if;
end $$;
