# UGO Hive — Local FreeLLMAPI integration checkpoint (2026-10-22 BRT)

> Historical checkpoint below. The real Mac inference later succeeded, and TEST now has an isolated job API. Read the current addendum at the end before attempting setup.

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


## Updated TEST integration — 2026-10-22

Mac actual smoke confirmed by owner: `COMPLETED_LOCAL_INFERENCE` from FreeLLMAPI and the localhost bridge responded `UGO PUENTE OK`. That is local-only evidence.

UGO TEST `tmossnqfwfwjrtzwcbmm` has three isolated Hive migrations applied: queue with RLS, retry/presence, and atomic user quota/idempotence. Endpoint `ugo-hive-local-jobs` v4 is ACTIVE in TEST with Super Admin JWT checks and a separate credential-hash worker authorization. No worker is enrolled as of this checkpoint. Direct database permissions to anon/authenticated are denied. SQL-only positive/negative lease and 10/min quota tests passed within ROLLBACK transactions; this is not a Mac↔TEST↔Super Admin E2E.

### First manual Mac connection (required because no remote control of owner Mac)

Use only the existing local worktree, and do not paste any secret into chat or GitHub. After the branch passes exact-SHA CI:

1. Fetch the existing PR branch in `~/ugo-hive-local` without discarding local work. Use `git status --short` and `git pull --ff-only` only if on `feat/hive-local-freellmapi-guarded-20261022` and the working tree is clean.
2. In one Terminal session, generate a fresh dedicated 256-bit worker secret: `export HIVE_TEST_WORKER_TOKEN="$(openssl rand -hex 32)"`. Keep the terminal private and open. Do not reuse the FreeLLMAPI key.
3. Calculate only its hash: `printf '%s' "$HIVE_TEST_WORKER_TOKEN" | shasum -a 256`. Copy only the 64-digit hash (not the token) into Super Admin → Hive Console → Register TEST worker. This enrollment requires an authenticated Super Admin session on the **candidate branch's local TEST frontend**, not the old published version. Do not register via anonymous requests.
4. Set `HIVE_LOCAL_FREEAPI_KEY` in the same private Terminal session using the preexisting key locally, without displaying the characters.
5. Run `node scripts/hive-local-test-daemon.mjs` from the root of the worktree. This is foreground only, polls TEST every 8 seconds, and can be stopped with Ctrl+C; it does not install services or launch at boot.
6. In authenticated candidate Hive Console, verify Mac Connected comes from heartbeat, submit a manual prompt, confirm a newly persisted SUCCESS answer from FreeLLMAPI, reload and verify history, then disconnect and verify offline.

Do not deploy/migrate production or enable Empresa Autonoma. If the Mac cannot run or lacks a credential, the release gate remains BLOCKED. Do not present a PR, green mock tests, or Active Edge status as delivered product.
