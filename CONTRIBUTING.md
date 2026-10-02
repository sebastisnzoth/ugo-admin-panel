# Contributing to UGO

## Before changing code

1. Re-read current `main` and the target files.
2. Check open PRs/work locks before editing overlapping areas.
3. Use UGO TEST for destructive/runtime validation.
4. Never reset/force-push or overwrite valid work from another branch.
5. Do not deploy production without explicit authorization.

## Development

```bash
npm install
npm run dev
npm run build
npm test
npm run test:p0
npm run test:integration
npm run lint
```

Build/tests validate the configured TEST environment first where required.

## Pull requests

A PR should contain:
- one coherent objective;
- root cause and risk;
- files changed;
- tests executed;
- exact head SHA;
- rollback/reversibility notes for risky changes;
- no secrets or production credentials.

## Required review checklist

### Correctness
- public contracts preserved or intentionally versioned;
- no duplicated business rule introduced;
- error paths fail safely;
- realtime/async effects are idempotent where required.

### Security
- auth happens server-side for protected effects;
- role checks use persisted authority;
- no token/service-role/API key reaches the browser or LLM;
- RLS/RPC protections are not bypassed;
- model output is validated before an action.

### Tests
- add or update targeted contract tests;
- include a negative permission/security case for protected behavior;
- Core CI must be evaluated on the same SHA used as evidence.

### Documentation
Update README/ARCHITECTURE/SECURITY when behavior, scripts, boundaries or setup change. Documentation that asserts runtime state must be backed by code/CI/runtime evidence.

## Definition of done

Implemented is not the same as verified. A change is DONE only when its acceptance criteria pass with same-SHA evidence and no contradictory runtime/security signal remains.
