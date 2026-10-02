# UGO — Development guidance

This repository is a React + TypeScript marketplace backed by Supabase, serverless APIs, realtime workflows and external integrations.

## Source of truth

Use current `main`, code, migrations, CI and runtime evidence. Documentation is guidance, not proof of implementation or readiness.

Read:
- `ARCHITECTURE.md`
- `SECURITY.md`
- `CONTRIBUTING.md`

## Non-negotiable rules

- No force-push or destructive reset.
- Do not overwrite valid work from another branch.
- UGO TEST is the destructive validation environment.
- Production requires explicit human authorization.
- Never commit or print secrets.
- Never disable RLS/auth to make a flow pass.
- Preserve external contracts during refactors unless a contract change is explicit.
- Do not claim DONE without SAME-SHA evidence.

## Verification commands

```bash
npm install
npm run build
npm test
npm run test:p0
npm run test:integration
npm run lint
```

The repository has an automated Node `--test` contract suite. Do not state that tests are absent.

## Hugo / AI

Visible Hugo/orb surfaces are currently disabled. Backend/dormant integration code may still exist and must remain secure.

For protected Hugo/server flows:
- verify Supabase session;
- verify persisted active role;
- sanitize model-bound context;
- keep secrets/tokens out of model input and logs;
- treat model responses as untrusted;
- validate UI/tool actions against server-side permission policy.

## GitHub / evidence

A PR, build, deployment or workflow definition alone is not evidence of success. Correlate the exact SHA with CI/runtime evidence before reporting VERIFIED.
