# UGO — Autonomous Corporation Blueprint

**Version:** 1.0 · 27 September 2026  
**Status:** implementation contract  
**Branch of truth:** `main`

> This document turns the corporate architecture agreed for UGO into an executable implementation contract. It does not replace product/data/testing masters; when they conflict, `UGO_MASTER_GOVERNANCE.md` wins.

## 1. Objective

UGO must be governable from Super Admin from customer #1 and preserve the same governance model as volume grows. Autonomous mode is not "AI does anything": it is event-driven execution inside explicit authority, cost, security, quality and legal boundaries.

Primary launch objective:

```text
UGO Launch Ready — Florianópolis
client request → eligible provider ≤20 km → acceptance → real GPS/travel → arrival
→ start evidence → work → finish evidence → client approval → payment
→ completion → bilateral rating → audit
```

If a normal exception requires direct manual editing in Supabase/GitHub, the autonomous company is not launch-ready.

## 2. Corporate departments

Department 13 is intentionally unused.

| # | Department | Core responsibility |
|---|---|---|
| 1 | Executive AI Direction | strategy, priorities, orchestration, exceptions, outcome learning |
| 2 | Operations | dispatch, location, lifecycle, realtime, recovery |
| 3 | Client Experience | customer care, service help, account, billing support, complaints, CX |
| 4 | Providers | recruitment, onboarding, activation, supply, quality, retention/fairness |
| 5 | Growth & Expansion | market intelligence, acquisition, experiments, revenue growth, expansion |
| 6 | Trust & Resolution | cases, evidence, fraud/abuse, resolution, appeals, critical escalation |
| 7 | Finance | controller, payments, reconciliation, provider balance, refunds, treasury/security |
| 8 | Technology & Security | engineering, debugging, review, security, DevOps, observability, radar, R&D |
| 9 | Quality, QA & Excellence | autonomous QA lab, scenarios, simulators, chaos, regression, release gate |
| 10 | Legal, Compliance & Policy | legal intelligence, contracts, privacy, consumer, labor risk, policy, compliance audit |
| 11 | Marketing, Brand & Communication | brand, creative, community, experiments, PR/reputation, localization |
| 12 | Product, Design, UI/UX & Experience | product strategy, UX research, design, design system, accessibility, analytics |
| 14 | Corporate Audit, Governance & Control | internal audit, enterprise risk, controls, cross-department audit, AI governance, executive assurance |

Closed department structures are frozen. New capabilities should first be routed into an existing department rather than creating new organizational units.

## 3. Department 14 — six independent agents

1. **UGO Internal Auditor** — audits any department against policy and evidence.
2. **UGO Enterprise Risk Officer** — maintains the company-wide risk map.
3. **UGO Internal Control Inspector** — proves controls operate, not merely exist.
4. **UGO Cross-Department Auditor** — audits complete journeys across departmental boundaries.
5. **UGO AI Governance Auditor** — audits agents/models, OpenRouter routing, permissions, autonomy, cost and anomalous behavior.
6. **UGO Executive Assurance & Challenge** — reports directly to the Administrator General and runs the Founder Challenge Protocol.

Department 14 may challenge, audit, require remediation and escalate. It cannot silently rewrite its own authority or replace the Administrator General.

## 4. Autonomous mode

Super Admin exposes a global state:

```text
OFF       no autonomous mutation; observation remains available
SHADOW    agents plan/simulate, but mutations are not executed
ON        authorized reversible actions execute automatically
SAFE_MODE affected high-risk automation is contained; unaffected operations continue
```

Turning ON autonomy activates event/schedule driven workers; it must not depend on an open browser session.

Every agent action carries:

```text
action_id
department_id
agent_id
trigger/event
target entity + serviceId when applicable
policy/version
risk class
input evidence references
model/provider + model id when AI is used
estimated/actual cost
proposed action
authorization decision
execution result
verification result
timestamps
correlation_id
```

## 5. Authority classes

```text
GREEN  reversible, low-risk, inside policy → may auto-execute
YELLOW material but bounded → stronger verification / dual control / configured approval
RED    irreversible, high-impact, policy-changing, high-value money, production authority,
       sensitive legal interpretation or privilege escalation → Administrator General / authorized human
```

No model can:
- grant itself permissions;
- alter its own authority boundary;
- bypass RLS/RPC or deterministic business rules;
- deploy experimental work directly to production;
- move sensitive money merely from natural-language reasoning;
- erase or rewrite audit history.

## 6. Deterministic controls before AI

AI never decides objective invariants that code can enforce. Deterministic judges own at least:
- service state transitions;
- explicit `serviceId` isolation;
- provider alert radius maximum 20 km;
- arrival/geofence and recent valid GPS requirements;
- provider debt/blocking rules;
- permissions/RLS/ownership;
- idempotency and concurrency;
- financial ledger arithmetic/reconciliation;
- release blocking criteria.

AI may interpret evidence and propose action; deterministic controls authorize execution.

## 7. Evidence, decision and financial ledgers

**Decision Ledger:** append-only record of material autonomous decisions.

**Evidence Ledger:** references immutable/hash-verifiable evidence; do not duplicate secrets or unnecessary personal data.

**Financial Ledger:** authoritative money movements. Corrections are compensating entries; history is not overwritten.

A disputed case is not promoted into ground truth. Training/evaluation data distinguishes:
`SIMULATED`, `REAL_CONFIRMED`, `REAL_DISPUTED`.

## 8. UGO Autonomous QA Lab

Department 9 continuously executes:

```text
change/incident/industry case
→ scenario design
→ Client simulator + Provider simulator + Admin/System simulator
→ chaos/fault injection
→ deterministic judge
→ diagnosis
→ remediation request
→ rerun
→ permanent regression
→ release gate
```

It must include meta-QA: seed known defects and prove QA detects them. Maintain a Quality Coverage Map for business rules, roles, integrations, countries, permissions, payments, GPS, realtime and critical journeys.

Industry incidents from relevant marketplaces may become test scenarios only after applicability to UGO is established.

## 9. Model Router — zero-budget-first

Initial financial constraint: prefer zero-cost OpenRouter capacity.

Routing:

```text
task classification
→ eligible free models
→ UGO benchmark threshold
→ primary + free fallback
→ execute
→ measure quality/latency/failure/cost
→ periodic reevaluation
```

Paid models require an explicit future budget policy/authorization. "Free" is not sufficient if it fails UGO quality/safety gates.

Department 8 Technology Radar/R&D discovers and evaluates candidates; Department 9 validates on UGO benchmarks; Department 14 audits routing, permissions and cost.

## 10. Data Quality Gate

Before an autonomous decision, validate applicable source freshness, provenance, completeness and consistency. High-risk decisions require independent reconciliation where possible.

Bad data must produce `DATA_UNTRUSTED` / escalation, not confident automation.

## 11. Kill Switch and Safe Mode

Controls exist at global, department, agent and capability level.

A critical anomaly should isolate the smallest affected capability. Example: payment automation can be frozen while an already-assigned service continues safely.

Activation preserves:
- current state;
- pending jobs;
- evidence;
- correlation IDs;
- reason;
- actor/control that triggered containment.

Recovery requires verification and re-audit.

## 12. Corporate audit loop

```text
departments execute
→ internal controls
→ QA validates product/software
→ Department 14 audits the company
→ finding
→ owner + severity + remediation deadline
→ correction
→ independent re-audit
→ evidence of closure
→ executive report
```

No department closes its own critical finding.

Department 14 also maintains:
- Enterprise Risk Map;
- Control Coverage Map;
- Corporate Digital Twin for pre-execution simulations;
- Corporate Red Team scenarios;
- meta-audit with seeded anomalies;
- Founder Challenge Protocol: eliminate? simplify? external threat? real user need? asymmetric opportunity?

## 13. Voice of Client & Provider

Departments 3/4 own relationship signals; Department 9 validates reproducibility; Product consumes them.

Use:
- explicit feedback: rating, comment, survey, support, complaint;
- behavioral evidence: abandonment, retries, cancellations, repeat use, latency, provider inactivity;
- operational evidence: matching, GPS, state, payment, dispute, errors.

Loop:

```text
signal → aggregate/privacy gate → pattern → hypothesis → UGO Test reproduction
→ QA → correction → production candidate → post-change measurement
```

Agents propose; evidence validates.

## 14. UGO Empresas

UGO Empresas is a product, not a new department. Department 12 is Product Owner.

B2B flow:

```text
company demand (skill + quantity + place + date/time + duration + requirements)
→ individual slots
→ matching
→ confirmed workers + backups
→ reconfirmation
→ check-in/attendance
→ automatic replacement workflow for no-show
→ service/hours validation
→ payment/settlement
→ company report
```

Development path:
`product spec → isolated implementation → UGO Test at multi-worker load → Ops/Provider/Finance/Legal/Security validation → QA gate → controlled pilot → metrics → authorized production`.

## 15. Pre-mortem defenses

The corporate engine must explicitly defend against:
1. customer #1 failing end-to-end;
2. hidden manual intervention;
3. cascading agent error;
4. shared bad data;
5. TEST green / production broken;
6. organizational over-complexity;
7. fraud exploiting automation;
8. AI cost exceeding economics;
9. external provider outage;
10. technically correct product with no market adoption.

Required controls: Launch Gate, Data Quality Gate, Safe Mode/Kill Switch, provider fallbacks/circuit breakers, cost per process, canary/pilot, audit and measurable user outcomes.

## 16. Customer #1 Launch Gate

No commercial promotion until the existing release masters are satisfied. Corporate autonomy adds these requirements:
- Super Admin can see current service, owning departments/agents, decisions and incidents;
- normal exceptions can be recovered without raw DB edits;
- autonomy can be disabled/contained safely;
- each critical autonomous action is traceable;
- no critical finding remains open;
- model failure has a deterministic/fallback path;
- the complete real journey can be operated and audited by `serviceId`.

Customer #1 is the full-company acceptance test.

## 17. Super Admin implementation contract

Super Admin should progressively expose:
- **Autonomy:** OFF / SHADOW / ON / SAFE_MODE, with scoped kill switches;
- **Departments:** status, agents, objective, queue, SLA, health, last action;
- **Agent detail:** permissions, model route, executions, errors, cost, evidence;
- **Executive inbox:** only exceptions requiring Administrator General;
- **Decision/Evidence:** searchable ledgers and correlation timeline;
- **Risk & Audit:** risks, controls, findings, remediation, re-audit;
- **QA Lab:** scenarios, coverage, seeded defects, release gate;
- **Model Router:** free candidates, benchmarks, fallback, availability;
- **Launch Gate:** customer #1 readiness and exact blockers;
- **UGO Empresas:** product readiness/pilot status.

The UI is a control surface over real persisted state. It must never show invented agent activity.

## 18. Execution platform

Use existing infrastructure before adding cost:
- GitHub: source, CI, tests, regression and engineering automation;
- Vercel: application/runtime workloads appropriate to its execution model;
- Supabase: authoritative state, events, Realtime, RLS/RPC and audit persistence;
- OpenRouter: model access/routing, zero-budget-first;
- persistent/event workers: only where browser/Vercel request lifecycle is insufficient.

No production deploy is implied by this document.

## 19. Implementation sequence

**Phase A — governance foundation**
1. persist departments/agents/capabilities;
2. autonomy state + scoped kill switches;
3. policy/authority evaluator;
4. decision/evidence/action ledgers;
5. Super Admin read/control surfaces.

**Phase B — safe execution**
6. event/job queue and idempotent executor;
7. OpenRouter Model Router with free-first policy;
8. Data Quality Gate;
9. Safe Mode/circuit breakers;
10. audit/reconciliation.

**Phase C — autonomous QA**
11. scenario registry + deterministic judges;
12. Client/Provider/Admin simulators;
13. chaos + seeded defects;
14. Quality Coverage Map + Release Gate.

**Phase D — customer #1**
15. bind current P0 journeys to corporate events/actions;
16. execute full TEST journey;
17. remove hidden manual interventions;
18. Department 14 corporate audit;
19. controlled real pilot only after existing production gates.

**Phase E — UGO Empresas**
20. specification and isolated implementation after customer #1 core is stable, unless it becomes the explicitly prioritized launch path.

## 20. Success criterion

UGO Autonomous Company is not complete because agents exist. It is complete when:

> One real customer can request and complete a service, normal exceptions are handled through governed operations, every critical action is auditable, the Administrator General sees only meaningful exceptions, and the same governance model can scale without changing the source of truth.
