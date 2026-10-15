# UGO TEST — GREEN backlog recovery (2026-10-15)

## Verified incident
GitHub Actions **UGO Scheduled Worker Proof TEST** run 38775024724 failed with `OTHER_GREEN_JOBS_QUEUED`. In UGO Arena (project `tmossnqfwfwjrtzwcbmm`), 17 historical Super Admin QA jobs had:
- `authority_class=GREEN`, `status=QUEUED`, `department_id=9`;
- `capability IS NULL`, `data_quality_status=PENDING`, `authorization_decision=AUTHORIZED_POLICY`;
- zero attempts, and no executable capability assignment.

These jobs **must not be falsely executed or treated as completed**. Policy authorization alone is not capability authorization and is not proof of trusted inputs.

## Remediation performed in UGO TEST
A constrained transaction transitioned exactly those 17 rows to `BLOCKED`, with `blocked_reason=MISSING_CAPABILITY_AND_DATA_QUALITY_PENDING`, and inserted **17** `WORKER_PRECONDITION_BLOCKED` decisions in `autonomous_decision_ledger`. Identifiers, evidence, correlation IDs, and original authorization fields were retained. No job was deleted, dispatched, or marked successful. No YELLOW/RED approvals changed.

Verification: zero GREEN queued, 17 protected GREEN blocked, zero running; workflow run **38775024724 attempt 2** completed successfully on source SHA `1b234345d323361296cf3fb7538a37a725faccd6`. Its actual scheduled proof job finished SUCCEEDED, verified `true` with `AUTHORIZED_POLICY`; Sentinel Gate and runtime revision steps succeeded.

## Recovery procedure for each protected historical job
1. Inspect the existing job's objective, input evidence, agent assignment, idempotency key and decision records; validate provenance and whether the request remains useful. Never infer an action capability from the agent's name alone.
2. Obtain correct `autonomous_capability_registry` assignment, matching agent/department/authority, and an independently verified trusted data-quality assessment. Do not backfill `TRUSTED` without evidence.
3. Preserve kill switches and approved authorization rules. Re-evaluate approval requirements according to authority; do not convert YELLOW/RED to GREEN.
4. Create a new, properly governed work order using the existing capability-specific preparation RPC, with distinct idempotency key and correlation to the original blocked job, **only after** prerequisites pass. Preserve original blocked record and its audit trail; never force a blocked historical job to success.
5. Run a narrow UGO TEST worker cycle, inspect Decision/Evidence Ledgers and action artifacts, and confirm that only the intended job ran. Human approval is still required for release to production.

## Model router follow-up
Recent UGO TEST benchmark records exist for free OpenRouter candidates, including `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` and `poolside/laguna-xs-2.1:free`. The router may choose OpenRouter as primary when the Gemini benchmark expires. **This does not satisfy a Gemini-primary / OpenRouter-fallback contract.** Refresh a genuine Gemini benchmark, probe the actual OpenRouter completion endpoint with a real free model, reconcile routes and run the failover drill; require metrics for both attempts and zero recorded cost. Any missing proof must fail closed.

All actions above are UGO TEST only. Production remains protected.