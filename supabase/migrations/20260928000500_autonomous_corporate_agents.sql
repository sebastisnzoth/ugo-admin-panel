-- Register the canonical UGO autonomous corporate agents. No simulated activity is created.
insert into public.autonomous_agents(department_id,agent_key,name,capability,authority_class,status,model_provider,model_id,permissions)
values
(1,'executive-orchestrator','Executive Orchestrator','Prioritize and orchestrate governed corporate work','RED','IDLE','openrouter','FREE_FIRST','["prioritize","orchestrate","escalate"]'::jsonb),
(2,'operations-agent','Operations Agent','Service operations, dispatch and lifecycle recovery','YELLOW','IDLE','openrouter','FREE_FIRST','["operations","dispatch","recovery"]'::jsonb),
(3,'client-experience-agent','Client Experience Agent','Client experience analysis and support workflows','YELLOW','IDLE','openrouter','FREE_FIRST','["client_experience","support"]'::jsonb),
(4,'provider-agent','Provider Agent','Provider onboarding, supply and quality workflows','YELLOW','IDLE','openrouter','FREE_FIRST','["providers","quality"]'::jsonb),
(5,'growth-expansion-agent','Growth & Expansion Agent','Growth analysis and governed expansion proposals','YELLOW','IDLE','openrouter','FREE_FIRST','["growth","expansion"]'::jsonb),
(6,'trust-resolution-agent','Trust & Resolution Agent','Case, fraud and resolution analysis','YELLOW','IDLE','openrouter','FREE_FIRST','["trust","resolution","fraud_review"]'::jsonb),
(7,'finance-agent','Finance Agent','Finance analysis, reconciliation and exception review','RED','IDLE','openrouter','FREE_FIRST','["finance","reconciliation","escalate"]'::jsonb),
(8,'technology-security-agent','Technology & Security Agent','Engineering, security, DevOps and observability','YELLOW','IDLE','openrouter','FREE_FIRST','["engineering","security","devops","observability"]'::jsonb),
(9,'qa-excellence-agent','QA & Excellence Agent','Independent QA, regression and release-gate verification','YELLOW','IDLE','openrouter','FREE_FIRST','["qa","regression","release_gate"]'::jsonb),
(10,'legal-policy-agent','Legal, Compliance & Policy Agent','Legal, privacy, compliance, policy and IP triage','RED','IDLE','openrouter','FREE_FIRST','["legal_review","compliance","ip_triage","escalate"]'::jsonb),
(11,'marketing-brand-agent','Marketing, Brand & Communication Agent','Brand and communication proposals within policy','YELLOW','IDLE','openrouter','FREE_FIRST','["marketing","brand","communication"]'::jsonb),
(12,'product-design-agent','Product, Design & UX Agent','Product, design, UX and analytics proposals','YELLOW','IDLE','openrouter','FREE_FIRST','["product","design","ux","analytics"]'::jsonb),
(14,'internal-auditor','UGO Internal Auditor','Audit any department against policy and evidence','RED','IDLE','openrouter','FREE_FIRST','["audit","evidence_review","remediation"]'::jsonb),
(14,'enterprise-risk-officer','UGO Enterprise Risk Officer','Maintain the enterprise risk map','YELLOW','IDLE','openrouter','FREE_FIRST','["risk","risk_map","escalate"]'::jsonb),
(14,'internal-control-inspector','UGO Internal Control Inspector','Verify controls operate with evidence','YELLOW','IDLE','openrouter','FREE_FIRST','["control_review","evidence_verification"]'::jsonb),
(14,'cross-department-auditor','UGO Cross-Department Auditor','Audit complete cross-department journeys','RED','IDLE','openrouter','FREE_FIRST','["cross_department_audit","journey_audit"]'::jsonb),
(14,'ai-governance-auditor','UGO AI Governance Auditor','Audit agents models routing permissions autonomy cost and anomalies','RED','IDLE','openrouter','FREE_FIRST','["ai_governance","model_router_audit","cost_audit","permission_audit"]'::jsonb),
(14,'executive-assurance-challenge','UGO Executive Assurance & Challenge','Independent executive assurance and Founder Challenge','RED','IDLE','openrouter','FREE_FIRST','["executive_assurance","founder_challenge","escalate"]'::jsonb)
on conflict(agent_key) do update set
 department_id=excluded.department_id,name=excluded.name,capability=excluded.capability,
 authority_class=excluded.authority_class,model_provider=excluded.model_provider,
 model_id=excluded.model_id,permissions=excluded.permissions,updated_at=now();
