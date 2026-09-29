# UGO Autonomous Corporation — Implementation Record

**Governing contract:** `docs/UGO_AUTONOMOUS_CORPORATION_MASTER.md` v1.2  
**Branch of truth:** `main`  
**Validation environment:** UGO TEST only (`tmossnqfwfwjrtzwcbmm`)  
**Production:** protected; this implementation record does not authorize production deployment.

## 1. Purpose

This document is the living implementation record for the Autonomous Corporation blueprint. It separates implemented controls from runtime-validated controls and remaining Master requirements. It must never mark a requirement complete from UI presence, schema presence, or CI alone.

Maturity is tracked as:

`IMPLEMENTED → CI VALIDATED → RUNTIME VALIDATED → PUBLISHED`

No production publication is implied.

**29 September QA evidence binding:** `20260929144500_qa_evidence_service_binding.sql` adds service/scenario association checks to independent QA evidence and invalidates coverage when a scenario is rebound. Source-level implementation and local contract checks do not establish migration application or runtime validation in UGO TEST. Keep this control unverified until positive and negative TEST probes pass.

## 2. Master requirement matrix

| Master capability | Current implementation | Maturity |
|---|---|---|
| Corporate departments D1-D12, D14 | persisted departments; D13 intentionally unused | RUNTIME VALIDATED / TEST |
| D14 six independent agents | six named D14 agents persisted | RUNTIME VALIDATED / TEST |
| Corporate agents | canonical D1-D12 agents plus six D14 agents | RUNTIME VALIDATED / TEST |
| OFF / SHADOW / ON / SAFE_MODE | persisted global state + Super Admin control | RUNTIME VALIDATED / TEST |
| GREEN / YELLOW / RED authority | GREEN policy authorization; YELLOW WAITING_APPROVAL + independent dual control; RED human approval/rejection | IMPLEMENTED; second independent YELLOW approver runtime proof pending |
| Decision/Evidence ledgers | append-only persisted ledgers + complete action envelope + hashed verification evidence | RUNTIME VALIDATED / TEST for governed GREEN executor |
| Scoped kill switches | GLOBAL / DEPARTMENT / AGENT / CAPABILITY + evidence-backed recovery re-audit | IMPLEMENTED; runtime recovery proof in CI pending |
| Job engine | queue, idempotency, SKIP LOCKED claim, leases, heartbeat, retry, max attempts, stale recovery, dead-letter, cancellation + scheduled TEST worker + allowlisted GREEN executor | RUNTIME VALIDATED / TEST for worker and GREEN executor; broader capability coverage remains |
| Data Quality Gate | freshness, provenance, completeness, consistency; independent reconciliation for YELLOW/RED; hashed evidence | RUNTIME VALIDATED schema/RPC in TEST |
| QA Lab persistence | scenarios, runs, chaos profiles, deterministic judges, coverage map, release gate | RUNTIME VALIDATED schema in TEST |
| QA actors | Client, Provider, Admin/System simulators persisted | RUNTIME VALIDATED registration in TEST; real P0 execution binding remains |
| Meta-QA | seeded-defect scenario + governed calibration RPC | IMPLEMENTED; required runtime CI calibration added |
| Customer #1 Release Gate | persisted gate with QA, critical finding and stale-job blockers | IMPLEMENTED; full acceptance journey remains |

| OpenRouter free-first | authenticated free-first probe + persisted candidates/routes/metrics + protected server runtime primary/fallback | IMPLEMENTED; Preview runtime validation pending |
| IP Gate | persisted corporate protection gate + Super Admin visibility | RUNTIME VALIDATED foundation / TEST; remaining Master evidence/audit closure controls tracked below |
| Super Admin Empresa Autónoma | persisted autonomy/departments/agents/jobs/inbox/ledgers/findings/kill switches + QA Lab + Model Router + Risk & Audit + Launch Gate + correlation timeline + UGO Empresas | IMPLEMENTED; runtime UI validation remains |
| Consultar Agente | evidence-gated protected server-side OpenRouter consultation with correlation id | IMPLEMENTED; Preview runtime validation pending |
| UGO Empresas | D12-owned readiness + multi-worker demand/slot persistence | IMPLEMENTED foundation; gated behind customer #1 stability |

Customer #1 evaluation now also blocks when coverage is empty or no completed, non-simulated `ambiente='real'` service has accepted matching, initial/final evidence, confirmed payment and bilateral ratings. A `demo` P0 harness run cannot satisfy this gate. The gate is applied in UGO TEST; the real customer acceptance run remains pending.

The follow-up gate additionally excludes demo client/provider identities and requires `FULL-E2E` and `TWO-DEVICES` checklist items to be **approved**. This prevents a technically completed fixture from becoming commercial acceptance. The scheduled UGO TEST workflow now re-evaluates the persisted gate with the Super Admin test identity, including after an earlier step fails, and asserts that missing acceptance cannot appear READY. The release gate checks the latest persisted QA verdict per scenario and does not keep a remediated historical failure open forever. A successful workflow run for the same SHA is still required for runtime proof.

## 3. Implemented migrations

- `20260929060000_autonomous_customer_one_real_gate.sql` (applied to UGO TEST)
- `20260929061000_autonomous_customer_acceptance_proof.sql` (applied to UGO TEST)
- `20260929062000_autonomous_release_gate_current_qa.sql` (superseded: ambiguous PL/pgSQL alias)
- `20260929063000_autonomous_release_gate_alias_fix.sql` (applied to UGO TEST)

- `20260927234500_autonomous_corporation_foundation.sql`
- `20260928000500_autonomous_corporate_agents.sql`
- `20260928002000_autonomous_safe_execution.sql`
- `20260928005500_autonomous_authority_approval.sql`
- `20260928163000_autonomous_qa_lab.sql`
- `20260928170000_autonomous_job_resilience.sql`
- `20260928173000_autonomous_data_quality_evidence.sql`
- `20260928180000_autonomous_qa_simulators.sql`
- `20260928184500_autonomous_action_envelope.sql`
- `20260928193000_autonomous_yellow_dual_control.sql`
- `20260928200000_autonomous_d14_assurance.sql`
- `20260928203000_autonomous_voice_signals.sql`
- `20260928213000_autonomous_model_router.sql`
- `20260928220000_autonomous_qa_meta_gate.sql`
- `20260928223000_autonomous_governance_table_grants.sql`
- `20260928231500_autonomous_release_gate_hardening.sql`
- `20260928233000_autonomous_model_router_bootstrap.sql`
- `20260928234500_autonomous_worker_cycle.sql`
- `20260929001500_ugo_empresas_readiness.sql`
- `20260929004500_autonomous_recovery_audit.sql`
- `20260929011500_autonomous_qa_p0_coverage.sql`
- `20260929013000_autonomous_yellow_routing.sql`
- `20260929014500_autonomous_finding_reaudit.sql`
- `20260929020000_autonomous_ip_evidence_links.sql`
- `20260929021500_autonomous_p0_event_binding.sql`
- `20260929023000_autonomous_qa_remediation.sql`\n- `20260929034500_autonomous_green_capability_executor.sql`\n- `20260929040000_autonomous_service_role_claim_guard.sql`\n- `20260929040500_autonomous_worker_status_ambiguity.sql`

IP governance is implemented by the existing corporate IP migrations and is a permanent control independent from QA release approval.

## 4. QA Lab current runtime state

UGO TEST contains three governed simulator identities:

1. `UGO QA Client Simulator`
2. `UGO QA Provider Simulator`
3. `UGO QA Admin/System Simulator`

Initial persisted scenarios cover:
- provider alert radius maximum 20 km;
- valid/recent GPS and 200 m arrival geofence;
- complete P0 service lifecycle isolated by `serviceId`;
- Client / Provider / Admin RLS and RPC isolation;
- Meta-QA seeded known defect detection.

The Quality Coverage Map starts honestly as `UNCOVERED`. Coverage may become `COVERED` only after a deterministic scenario run passes. No synthetic green status is permitted.

## 5. Remaining Master work — blocking DONE

### Phase B
- Prove the browser-independent scheduled TEST worker operates with autonomy ON.
- Runtime-validate protected OpenRouter primary/fallback and periodic reevaluation in Preview/TEST.

### Phase C
- Bind QA simulators to actual UGO TEST Client/Provider/Admin actions. Synthetic caller-supplied booleans are now explicitly rejected as authoritative runtime evidence; scenarios require a persisted `service_id` in UGO TEST and deterministic persisted-state judges.
- Execute chaos/fault injection against the real P0 path.
- Generate remediation request, rerun and permanent regression automatically.
- Keep Release Gate deterministic and blocking.

### Phase D
- Runtime-validate P0 service event binding to corporate audit evidence.
- Execute complete TEST journey by one explicit `serviceId`.
- Verify normal exceptions can recover without raw Supabase/GitHub edits.
- Run D14 independent corporate audit and close findings with independent re-audit evidence.
- Evaluate Customer #1 Launch Gate from persisted evidence.

### D14 corporate governance
Enterprise Risk Map, Control Coverage Map, Digital Twin, Red Team, Founder Challenge and critical finding re-audit controls are persisted; final runtime corporate audit remains.

### Voice of Client & Provider

### Super Admin
Dedicated persisted QA, Model Router, Risk & Audit, Launch Gate, correlation timeline and UGO Empresas readiness surfaces are implemented; runtime UI validation remains.

### IP remaining controls
- Keep legal claims evidence-backed; never infer patent/registration/exclusivity.

### UGO Empresas
D12 readiness, company demand and individual multi-worker slot persistence are implemented in UGO TEST. Execution remains intentionally blocked behind customer #1 core stability per Master Phase E.

## 6. DONE rule

Do **not** declare Autonomous Corporation DONE merely because agents, tables, UI or CI exist.

DONE requires the Master success criterion: a customer can complete the service journey; normal exceptions are governed; critical actions are auditable; meaningful exceptions reach Administrator General; and the same source of truth scales.

A real production customer/pilot, production publication, unavailable external credential, or external legal authorization may remain an external blocker. All implementable pre-production work must be completed and runtime validated first.

## 7. Safe execution invariant

Before every implementation block:
1. fetch current `origin/main`;
2. compare current HEAD;
3. reconcile concurrent changes safely;
4. never reset, force-push or revert unrelated work;
5. never expose secrets;
6. never touch production;
7. validate in UGO TEST;
8. leave autonomy in a safe state after probes.
\n## 8. Governed executor runtime evidence\n\nUGO TEST runtime validation executed the allowlisted `qa.green.echo` capability through the governed worker. Persisted result: GREEN `SUCCEEDED` with `verification_result.passed=true`, one Decision Ledger row and one Evidence Ledger row. Negative authority probes remained non-executable: YELLOW -> `WAITING_APPROVAL` / `YELLOW_DUAL_CONTROL_REQUIRED`; RED -> `WAITING_APPROVAL` / `RED_HUMAN_APPROVAL_REQUIRED`. Autonomy was restored to `OFF` after validation. This is RUNTIME VALIDATED in TEST, not PUBLISHED.\n
## 9. Verification-first QA hardening

The previous worker QA helper could accept caller-supplied assertion booleans. That path is no longer accepted as proof: `autonomous_run_qa_service_scenario` now requires a bound `ambiente='test'` service and derives supported verdicts from persisted service/offers/events/evidence/payments/ratings. The CI runtime gate fails closed when scenarios lack real TEST service bindings. At the time of this hardening UGO TEST contained no `servicios` rows with `ambiente='test'`; therefore Customer #1 remains correctly BLOCKED rather than manufacturing coverage. Unsupported deterministic probes fail explicitly instead of becoming green.


## 10. 2026-09-28 pre-production closure evidence

The scheduled UGO TEST worker now executes the real persisted P0 harness, authenticated Client/Provider/Admin probes, GPS/geofence rejection probes, a real Realtime event, deterministic QA coverage, Meta-QA seeded-defect detection/remediation/permanent regression, Customer #1 gate evaluation and the deterministic Sentinel Gate. The model probe discovers Gemini models from the authenticated API catalog before OpenRouter fallback; a fresh runtime selected `gemini-flash-lite-latest` and connected the canonical autonomous agents without exposing credentials. OpenRouter remains the zero-budget fallback required by the Master.

The Sentinel Gate fails closed unless UGO TEST autonomy is `OFF`, the six canonical D14 agents are the only enabled D14 auditors, the legacy `corporate-audit-agent` is disabled, there are no RUNNING autonomous jobs, no active leases and no enabled kill switches. Customer #1 remains a separate persisted Launch Gate and is not made green by Sentinel.

The repository-wide final gate executes `npm run build`, `npm test` and `npm run lint`; legacy lint debt remains visible as warnings while critical operational surfaces retain dedicated blocking lint steps. The isolated RPC/RLS workflow remains the authoritative authenticated lifecycle gate.

The remaining non-simulatable Master success criterion is intentionally not manufactured: `CUSTOMER_1` remains `BLOCKED` with `CUSTOMER_ACCEPTANCE_NOT_APPROVED`, and `FULL-E2E` / `TWO-DEVICES` remain blocked until a real human customer acceptance run is completed on two devices. This is an external acceptance dependency, not permission to publish or touch production.

## 11. Canonical specialist audit (28 September 2026)

UGO TEST showed one general agent per department D1–D12, six canonical D14 agents, and one disabled legacy D14 agent. Across the entire company, only one autonomous job had succeeded, using the `qa.green.echo` capability. No specialist had a recorded action. The previous assertion that all corporate agents were runtime validated therefore applies only to the department agents and their registration/model routing, **not** to the individual specialists or their execution chains.

The canonical roster migration adds the 99 named D1–D12 specialist identities requested for operations, client, provider, growth, trust, finance, technology, QA, legal, marketing and product. They are explicitly `DISABLED`, have no inferred permissions and have no asserted model availability. D14 remains exactly six enabled canonical auditors; the legacy D14 identity stays disabled. The model connector skips disabled agents even if an older row has a model provider set. The migration is applied to UGO TEST, but this is a catalog prerequisite only. A specialist moves out of `DISABLED` only after its own trigger, real data input, Data Quality Gate, governed job executor, persisted verification, regression test and runtime evidence exist. No specialist is counted as operational from this migration alone.

The first independently wired specialist is D9 `Deterministic Judge`. For new persisted-state QA runs created through the protected QA runner, a database trigger independently recomputes the scenario assertions from the bound UGO TEST service. It rejects an invented simulator result or verdict and writes the agent attribution, governed QA observation job, simulation marker, Decision Ledger and hashed Evidence Ledger with the same correlation ID. A rollback-only TEST transaction confirmed both a real persisted-state PASS and rejection of a forged PASS. The scheduled worker workflow now checks the resulting records through an authenticated service-role consumer; its final-SHA CI run is still needed before marking this path CI or runtime validated.

The first CI attempt exposed a PostgREST authentication detail: the new trigger checked `request.jwt.claim.role`, which the existing QA runner did not require and which was absent in the service-role request. A follow-up migration removed that redundant trigger check while explicitly revoking direct QA-run mutations from public, anonymous and authenticated roles. The trigger still recalculates the verdict independently. The first SHA is therefore **CI FAILED**, and validation must use the correction SHA.

The D9 `P0 Journey Tester` now records a separate, idempotent job for the actual demo service exercised through the business RPC paths by the existing UGO TEST harness. It independently checks the persisted accepted offer within 20 km, arrival event, two evidence **rows**, cash confirmation, completion and bilateral ratings; it writes linked Decision and Evidence Ledger records. Its verdict explicitly says that physical GPS, uploaded media bytes and a real customer acceptance were **not** verified. A rollback-only database probe passed on an existing demo service. The authenticated GitHub Actions run of the final SHA remains the runtime gate.

The second CI attempt reached the new judge verifier, then found that `service_role` lacked `SELECT` on `autonomous_qa_runs`. A scoped read grant for this table was applied to UGO TEST and committed as a separate migration; no public write permission was added. The final-SHA CI run must exercise both the judge verifier and the P0 Journey Tester before either is marked CI validated.

At `cab579e272ef9002e60d1250b3b851341acb6ba7`, UGO Core CI, UGO Autonomous Worker TEST and UGO Isolated RPC RLS finished green on the same SHA. UGO TEST persisted successful, correlated jobs for the Deterministic Judge and P0 Journey Tester; autonomy remained `OFF`, six D14 agents were enabled, and Customer #1 remained `BLOCKED`. Their demo P0 checks do not establish device GPS, uploaded media bytes or customer acceptance.

The next Meta-QA hardening removes the old Super Admin path that wrote an artificial failed run and marked Meta-QA validated. The D9 Meta-QA Agent now reconciles three separately persisted QA runs on one completed demo service (baseline PASS, injected defect detected as FAIL, recovered PASS marked permanent regression). It writes a governed job, append-only decision and hashed evidence, and only then updates the persisted gate. A rollback-only UGO TEST database probe verified the three-run calibration. Authentication and final-SHA workflow proof remain pending for this new change.

An additional database guard denies new executable jobs for catalog-only `DISABLED` agents, rejects department mismatches and prevents lowering an assigned agent's authority from RED/YELLOW to GREEN. It leaves historical jobs untouched. UGO TEST transaction probes verified the two denial paths and an enabled D9 assignment, each rolled back. This prevents a generic worker or manual enqueue from making an unvalidated specialist appear operational.

The Quality Coverage Map now explicitly separates database demo P0 coverage from three requirements that remain unproven: physical device GPS, fetchable uploaded evidence bytes and human customer acceptance on two devices. Those requirements are persisted as `UNCOVERED` in UGO TEST. Launch Gate reads all coverage rows, so no simulated result can turn those rows green or remove `QA_COVERAGE_INCOMPLETE` without new, applicable evidence.

An audit of the authenticated Client/Provider/Admin, GPS and Realtime QA scripts found that `autonomous_record_external_qa_probe` previously accepted boolean observations supplied by its caller and promoted their scenarios to `COVERED`. The scripts still execute actual authenticated requests and fail CI if their assertions fail; their booleans are now stored only as observations. The backend marks these four scenarios `BLOCKED`/`UNCOVERED` until independently checkable persisted evidence exists. UGO TEST rollback probe confirmed that even `{client_isolated:true}` cannot make the roles scenario green. The overall Launch Gate remains blocked on these evidence gaps.

`Consultar Agente` now resolves the selected agent server-side under Super Admin authentication, refuses disabled agents and active kill switches, and supplies the model only sanitized summaries of that agent's persisted jobs, decisions and evidence types. Caller-supplied evidence text is ignored. A new append-only UGO TEST consultation audit stores actor, agent, correlation ID, model, response hashes, counts and zero cost without copying raw questions, answers or private service data. The UI sends only agent ID and question. This is implemented and locally testable; Preview/TEST HTTP runtime validation remains necessary before calling it runtime validated. No production deploy was made.


## 12. Specialist execution wave status (28 September 2026)

This table is evidence-based. `DISABLED` remains the correct state for a catalogued specialist whose complete execution chain has not been proven. Registration, model routing or UI presence alone never promotes maturity.

| Wave | Specialist | Implemented | CI validated | Runtime UGO TEST | D14 / independent control | Status / blocker |
|---|---|---:|---:|---:|---:|---|
| 1 | Deterministic Judge | yes | yes | yes | deterministic persisted-state recomputation | RUNTIME VALIDATED on `cab579e272ef9002e60d1250b3b851341acb6ba7` |
| 1 | P0 Journey Tester | yes | yes | yes | persisted-state verifier + ledgers | RUNTIME VALIDATED on `cab579e272ef9002e60d1250b3b851341acb6ba7`; demo scope only |
| 1 | Meta-QA Agent | yes | yes | yes | seeded defect must fail before remediation | RUNTIME VALIDATED on `cb8472b17b3937679fa85aa35c3d23fead36879a` |
| 1 | Regression Agent | yes | no | no | persisted-state reconciliation + negative rollback probe | IMPLEMENTED — authenticated same-SHA CI/runtime workflow proof pending |
| 1 | Release Gate Agent | yes | no | no | authoritative gate remains deterministic and read-only to specialist | IMPLEMENTED — authenticated same-SHA CI/runtime workflow proof pending |
| 1 | Quality Coverage Agent | yes | yes | yes | D14 Internal Control Inspector: `qa-release-gate` EFFECTIVE | RUNTIME VALIDATED — independent coverage reconciliation, Decision/Evidence Ledger and D14 runtime audit; protected physical/human coverage remains UNCOVERED |
| 1 | QA Director | no | no | no | pending | DISABLED |
| 1 | Client Simulator | partial | no | no | observations cannot self-certify | DISABLED — authenticated observation is not independent proof |
| 1 | Provider Simulator | partial | no | no | observations cannot self-certify | DISABLED — authenticated observation is not independent proof |
| 1 | Admin/System Simulator | partial | no | no | observations cannot self-certify | DISABLED — authenticated observation is not independent proof |
| 1 | Chaos Agent | partial | no | no | Meta-QA seed exists, standalone agent chain absent | DISABLED |
| 2 | D2 Operations specialists | catalogued | no | no | pending | DISABLED — wire after Wave 1 |
| 3 | D3/D4 Client + Provider specialists | catalogued | no | no | pending | DISABLED |
| 4 | D6/D7 Trust + Finance specialists | catalogued | no | no | pending | DISABLED |
| 5 | D8 Technology specialists | catalogued | no | no | pending | DISABLED |
| 6 | D1/D5/D10/D11/D12 specialists | catalogued | no | no | pending | DISABLED |

Same-SHA validation for `cb8472b17b3937679fa85aa35c3d23fead36879a` completed GREEN for UGO Core CI, UGO Autonomous Worker TEST and UGO Isolated RPC RLS. The worker persisted a Meta-QA Agent job with Decision/Evidence Ledger correlation, left autonomy `OFF`, kept exactly six enabled D14 auditors and ended with Sentinel `PASS`. The Launch Gate remained correctly `BLOCKED`; after fail-closed coverage hardening its blockers included `QA_COVERAGE_INCOMPLETE`, `QA_RUN_FAILURE` and `CUSTOMER_ACCEPTANCE_NOT_APPROVED`.

The current Wave 1 rule is therefore strict: only Deterministic Judge, P0 Journey Tester and Meta-QA Agent may be described as runtime-validated specialists. The remaining Wave 1 identities stay disabled until their own trigger, input provenance, Data Quality Gate, governed authority path, executor, independent verifier, ledgers, regression and UGO TEST runtime evidence are all present.

`Consultar Agente` is implemented with server-side agent resolution and append-only consultation audit, and the repository-wide CI for its source SHA is green. It is not yet marked runtime validated because the protected HTTP path still needs an authenticated TEST/Preview execution proving the deployed consumer and audit record on the same source SHA.


Wave 1 update: Quality Coverage Agent is now independently wired and runtime-validated in UGO TEST. Its reconciler can promote only coverage backed by a successful Deterministic Judge job and demotes stale/unverified greens. D14 `internal-control-inspector` independently verified the latest specialist job, its Decision/Evidence Ledger chain and the protected UNCOVERED requirements, then marked the existing `qa-release-gate` control `EFFECTIVE`. Physical GPS, uploaded media bytes and human customer acceptance remain explicitly UNCOVERED.


## 13. Regression Agent implementation (28 September 2026)

D9 `Regression Agent` now has a deterministic persisted-state reconciler. It derives the protected scenario set only from QA runs already marked as permanent regressions, inspects the latest persisted run for each scenario, and records a governed job plus Decision/Evidence Ledger correlation. It accepts no caller-supplied pass/fail assertion and does not mutate QA verdicts. A UGO TEST execution verified four current permanent regressions with zero detected regressions; a rollback-only negative probe temporarily removed the latest permanent marker and the agent correctly returned `passed=false` with one detected regression. Autonomy remained `OFF`, exactly six D14 auditors remained enabled, and no RUNNING job was left behind. The authenticated service-role runtime consumer is wired into `UGO Autonomous Worker TEST`; same-SHA workflow proof is still pending, so this specialist is IMPLEMENTED but is not yet claimed CI VALIDATED or RUNTIME VALIDATED.


## 14. Release Gate Agent implementation (28 September 2026)

D9 `Release Gate Agent` now verifies the authoritative persisted Customer #1 gate without changing its status or criteria. Its UGO TEST probe observed the real `BLOCKED` state with `QA_COVERAGE_INCOMPLETE`, `QA_RUN_FAILURE` and `CUSTOMER_ACCEPTANCE_NOT_APPROVED`, and persisted a governed job plus Decision/Evidence Ledger correlation. A rollback-only negative probe temporarily asserted `READY` with empty blockers while persisted QA evidence remained blocking; the specialist correctly returned `passed=false`. The authenticated service-role consumer is wired into `UGO Autonomous Worker TEST`, but same-SHA workflow proof remains pending. Therefore the specialist is IMPLEMENTED only; it is not yet CI VALIDATED or RUNTIME VALIDATED.


## 15. Super Admin autonomous corporation control surface (28 September 2026)

The real Super Admin `Empresa Autónoma` surface is split into dedicated views for command overview, departments, AI agents, executive inbox, Decision/Evidence ledgers, risk and audit, QA Lab, Model Router, Customer #1 Launch Gate, UGO Empresas and kill-switch/autonomy controls. The surface consumes the existing persisted autonomous tables and governed RPCs; it does not introduce mock corporate state.

The AI workforce detail preserves governed execution, audited approvals, kill-switch controls and server-side `Consultar agente`. Agent consultation sends only `agent_id` plus the operator question to the protected server route; persisted evidence is resolved and sanitized server-side. The autonomous shell now has responsive navigation for desktop/tablet/mobile without changing the Admin shell or backend authority rules.

Validation remains verification-first. This section is IMPLEMENTED at source level; CI/runtime maturity must be assigned only from the final same-SHA workflows and UGO TEST evidence. A blocked Customer #1 gate remains BLOCKED and must not be represented as READY.


## 16. Autonomy mode control UX hardening (28 September 2026)

The Super Admin autonomy control now exposes the persisted mode as an explicit current state and translates the internal `SAFE_MODE` value to the human-facing label **MODO SEGURO** without changing backend semantics. OFF, SHADOW, ON and SAFE_MODE remain the only canonical persisted values.

Each mode explains its operational effect before selection. A mode transition continues to require a non-empty auditable reason through `superadmin_set_autonomy_mode`; the reason is governance evidence, not authentication. The UI does not optimistically claim a new mode: after the governed RPC it reloads authoritative Supabase state, and on RPC failure it reports the failure and also resynchronizes. Selecting the already-active mode is a no-op.

This UX change does not widen autonomous authority. ON still executes only what policy permits; GREEN/YELLOW/RED, Data Quality Gate, RLS/RPC, Kill Switches, QA and D14 remain mandatory. Source implementation and regression contract are present; CI/runtime maturity must be proven on the final same SHA.


## 17. Regression specialist validation guard reconciliation (28 September 2026)

The Autonomous Worker runtime was reconciled with the later specialist validation-state guard. The canonical D9 Regression Agent remains `DISABLED` and validation-only until an explicit governed promotion contract exists. Its runtime probe now verifies `autonomous_validate_specialist`, GREEN authority and `validation_only=true` without attempting the operational `autonomous_reconcile_regressions` RPC. This removes a contradictory path where CI first proved the specialist must remain disabled and then tried to execute an RPC that requires it to be IDLE.

This is fail-closed: it does not promote the specialist, weaken the validation guard, or claim operational regression reconciliation. Promotion remains a separate requirement and must obtain its own same-SHA CI and UGO TEST runtime evidence.
