-- Ensure the full canonical D14 roster exists even when earlier migrations were already applied.
insert into public.autonomous_agents(department_id,agent_key,name,capability,authority_class,status,model_provider,model_id,permissions)
values
(14,'internal-auditor','UGO Internal Auditor','Audit any department against policy and evidence','RED','IDLE','openrouter','FREE_FIRST','["audit","evidence_review","remediation"]'::jsonb),
(14,'enterprise-risk-officer','UGO Enterprise Risk Officer','Maintain the enterprise risk map','YELLOW','IDLE','openrouter','FREE_FIRST','["risk","risk_map","escalate"]'::jsonb),
(14,'internal-control-inspector','UGO Internal Control Inspector','Verify controls operate with evidence','YELLOW','IDLE','openrouter','FREE_FIRST','["control_review","evidence_verification"]'::jsonb),
(14,'cross-department-auditor','UGO Cross-Department Auditor','Audit complete cross-department journeys','RED','IDLE','openrouter','FREE_FIRST','["cross_department_audit","journey_audit"]'::jsonb),
(14,'ai-governance-auditor','UGO AI Governance Auditor','Audit agents models routing permissions autonomy cost and anomalies','RED','IDLE','openrouter','FREE_FIRST','["ai_governance","model_router_audit","cost_audit","permission_audit"]'::jsonb),
(14,'executive-assurance-challenge','UGO Executive Assurance & Challenge','Independent executive assurance and Founder Challenge','RED','IDLE','openrouter','FREE_FIRST','["executive_assurance","founder_challenge","escalate"]'::jsonb)
on conflict(agent_key) do update set department_id=excluded.department_id,name=excluded.name,capability=excluded.capability,authority_class=excluded.authority_class,model_provider=excluded.model_provider,model_id=excluded.model_id,permissions=excluded.permissions,updated_at=now();
