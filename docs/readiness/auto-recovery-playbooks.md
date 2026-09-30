# UGO Auto-Recovery Playbooks

Readiness: `auto-recovery`  
Environment for validation: **UGO TEST**  
Production: **PROTECTED / not touched by readiness proofs**

## Invariants

Every automatic recovery must be observable as:

`incident → authorized recovery → deterministic verification → audit trail → Judge PASS → Sentinel PASS`

The recovery path must not require raw SQL edits, ad-hoc GitHub state edits, secret exposure, disabling unrelated safety controls, or manual mutation of business state.

## Playbook: expired worker lease

**Trigger**

- A job is in `RUNNING` with an expired lease.
- The exception is classified as a normal recoverable worker failure.
- The recovery capability is authorized by policy.

**Automatic action**

1. Persist a correlated `AUTONOMOUS_LEASE_TIMEOUT` incident.
2. Route the recovery through the UGO autonomous worker mechanism.
3. Requeue/claim the controlled recovery job according to worker policy.
4. Execute the deterministic recovery capability.
5. Persist decision-ledger and evidence-ledger records.
6. Persist an `autonomous_recovery_audits` decision.
7. Resolve the incident only after verification passes.

**Safety gates**

- Fail closed if another job is already `RUNNING`.
- Fail closed if another GREEN job is queued.
- Fail closed if a GLOBAL kill switch or a kill switch scoped to the recovery department, agent, or capability is active.
- Preserve the autonomy mode that existed before the proof.
- Preserve every unrelated enabled kill switch.
- Keep production untouched.

**Verification**

- Recovery job is `SUCCEEDED`.
- Authorization is `AUTHORIZED_POLICY`.
- Verification result has `passed=true`.
- Incident is `resolved` and references the same correlation ID.
- Recovery audit decision is `RECOVER`.
- Decision/evidence ledgers contain correlated proof.
- Audit log contains `autonomy.exception_recovery.completed`.
- No job remains `RUNNING`.
- Initial and final autonomy modes match.
- Enabled kill-switch IDs before and after match exactly.
- `manual_sql_state_edit=false`.
- `manual_github_state_edit=false`.

**Escalation**

Any failed invariant leaves the readiness control unverified. The workflow must report failure, preserve the safety state, persist available diagnostic evidence, and require another authorized recovery attempt rather than mutating state manually.

## Evidence locations

- Authoritative readiness lock: `docs/ugo-work-locks/readiness-auto-recovery.json`
- Runtime workflow: `.github/workflows/ugo-exception-recovery-test.yml`
- Runtime executor: `scripts/autonomous-exception-recovery-runtime.mjs`
- Independent verifier: `scripts/autonomous-exception-recovery-judge.mjs`
- Regression contract: `tests/contracts/autonomous-exception-recovery.test.mjs`
- Versioned database migrations:
  - `20260929190746_autonomous_exception_recovery_runtime.sql`
  - `20260930035000_restore_service_role_worker_recovery.sql`
  - `20260930035500_exception_recovery_preserve_runtime_state.sql`
- GitHub Actions artifact: `ugo-auto-recovery-proof-<run_id>`
