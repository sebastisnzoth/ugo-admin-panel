# UGO Hive — Local FreeLLMAPI integration checkpoint (2026-10-22 BRT)

## Objective
Use the existing UGO scheduler to select a strictly read-only agent inference and call FreeLLMAPI on the user's Mac at `http://127.0.0.1:3001/v1`. Keep the existing Super Admin Hive console. No Render fallback, no remote backend writes, and no model control of UGO production.

## Changes on this branch
- `scripts/hive-local-freellmapi-client.mjs`: loopback-only API adapter, bearer from environment, bounded prompt/response, one concurrent request, bounded timeout and no redirects.
- `scripts/hive-local-agent-runner.mjs`: existing `scheduleTasks` chooses one explicitly requested `inference-only` task, refuses actionable capabilities and approval-requiring tasks; a model receives no tool credentials.
- `tests/contracts/hive-local-freellmapi-client.test.mjs`, `tests/contracts/hive-local-agent-runner.test.mjs`: network guard, authentication input validation, serialization, scheduler lease and capability guard contracts.

## Mac-only smoke test — NOT YET RUN
Use the locally cloned UGO repository and run the contract tests first:
```sh
node --test tests/contracts/hive-local-freellmapi-client.test.mjs tests/contracts/hive-local-agent-runner.test.mjs
```
After validation, supply the existing unified API key through an environment variable **locally** (never paste it in chat or commit it):
```sh
export HIVE_LOCAL_FREEAPI_KEY='(existing local key)'
HIVE_LOCAL_MODEL=qwen3-coder node scripts/hive-local-agent-runner.mjs
```
Expected result: `COMPLETED_LOCAL_INFERENCE` with real `answer`; this is not certification of autonomous missions.

## Hard gates
- No changes to `main`, production, Supabase, Render, or live Super Admin.
- No startup daemon, scheduled jobs, filesystem write permission, GitHub write permission, or MCP tools for model output.
- Never treat a passing mock contract as a successful Mac inference.
- Keep Empresa Autónoma OFF; never bypass existing autonomy gates.
- Future work: actual Mac run and same-SHA tests, authenticated local panel bridge, durable jobs, reboot and duplicate-delivery tests, regression checks for client/provider matching; no activation without evidence.

## Status
Code committed in isolated branch; same-SHA GitHub Actions test and Mac runtime smoke **pending**. No runtime proof claimed.
