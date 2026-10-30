# UGO — Neon agent setup (TEST only)

Official guidance used: https://neon.com/docs/cli/init and https://neon.com/docs/ai/neon-mcp-server and https://neon.com/docs/ai/agent-skills.
The requested https://neon.com/prompts/agent-setup.md could not be fetched by the assistant; do not claim verbatim compliance with that prompt.

## Existing project, do not reprovision
- Repo: `sebastisnzoth/ugo-admin-panel`
- Neon project: `patient-haze-05892538`
- Database: `ugodbapp`
- TEST branch: `ugo-test-migration` (`br-tiny-field-b6v07tb3`)
- Protected by policy (not write target): Neon `production` (`br-round-snow-b6hnpyot`)
- Existing migration PR: #605, branch `feat/neon-ugo-test-migration`
- No writes to Supabase PROD, Neon production, or Vercel production without explicit approval.
- Do not create new Neon projects or duplicate PRs.

## Local agent installation (OpenClaw on Mac)
Run these commands from the local checked-out UGO repository, with Node.js 22+ on PATH:

```sh
npx neon@latest --version
npx neon@latest init
```

The `init` wizard can install agent skills and MCP support. On OpenClaw, first verify whether its installed MCP adapter supports Neon; do NOT blindly write another agent's settings into OpenClaw. If it does not support it, delegate Neon operations via a configured compatible coding agent or use the authenticated Neon CLI directly. A browser sign-in may require the human user; do not pretend it completed.

To pin this existing project **without pulling secrets or overwriting .env**:
```sh
npx neon@latest link --project-id patient-haze-05892538 --no-env-pull -y
npx neon@latest checkout ugo-test-migration --no-env-pull
npx neon@latest branch list
npx neon@latest inspect db connection-health
```
Inspect actual CLI help if a subcommand differs in the installed version. Never echo connection strings or tokens.

## Agent operating contract
1. Read `AGENTS.md`, `docs/UGO_CAMINO_MAESTRO.md`, and PR #605 before changes.
2. Restrict SQL writes to Neon TEST branch ID `br-tiny-field-b6v07tb3`. No fallthrough to default branch; require explicit branch selection.
3. Prefer scoped credentials stored in GitHub Actions secrets / local secret storage. `NEON_API_KEY` is NOT the DB connection string; `NEON_PROJECT_ID` is a GitHub Actions variable.
4. Use Neon skills (`neon-postgres`, `neon-auth`, `neon-postgres-branches`) and MCP or CLI as available. Run `neon diff` and readonly database checks before merging.
5. Respect the existing architecture: 99 tables and 138 FK constraints currently exist in TEST; **not** equivalent to complete Supabase migration. Data, RLS policies, identity bridge, functions, triggers, sequences, indexes, Realtime and Storage require separate verification.
6. Neon TEST Data API is active, Neon Auth is provisioned. Do not send a Supabase JWT as if it were a Neon Auth session.
7. Neon Realtime and branchable Object Storage were not available for this project/region in the latest check. Do not advertise them as functioning. Use alternative backend only after design/authorization.
8. Never put privileged DB credentials in `VITE_*`, browser code, repo files, PR comments, CI logs, or shell output.
9. Start with a TEST login proving Neon Auth -> `usuarios` -> profile recovery -> persisted session. Then test Faxina request → provider matching → offers → evidence → payment-test in isolated environment.
10. Record actual changes, SHA, CI, failures, and rollback in PR #605. Never merge or deploy unverified changes. Never mark GO-LIVE on schema count alone.
