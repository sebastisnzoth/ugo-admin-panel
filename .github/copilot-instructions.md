# GitHub Copilot instructions for UGO

UGO is a React + TypeScript + Supabase service marketplace with serverless APIs and AI integrations.

Read before making non-trivial changes:
- `ARCHITECTURE.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- relevant docs/readiness evidence for the feature

Rules:
1. Preserve existing public contracts unless the task explicitly changes them.
2. Browser code must not import server modules or secrets.
3. Protected effects require verified session + persisted role + RLS/RPC/domain guards.
4. Never use model output directly as an authorized command.
5. Never disable RLS or weaken auth just to make tests pass.
6. Do not invent APIs/tables/fields without checking the repository.
7. Use the existing Node `--test` suite and add targeted positive/negative tests.
8. Do not force-push, reset destructively or touch production without explicit authorization.
9. Prefer small incremental refactors over broad rewrites.
10. Treat `main`, code, CI and runtime evidence as stronger than stale documentation.
