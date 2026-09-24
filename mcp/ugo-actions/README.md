# UGO Actions MCP

Local MCP server for UGO operational actions used during Codex/Hugo development.

## Why this exists

Hugo must execute the same real, authorized application commands as the UI. This MCP is the development-facing action layer for that work. It is not a replacement for Supabase, RLS, RPC/Edge authorization, Realtime, or the production application.

The binding product and technical rules live in:

- [UGO_MASTER_CTO.md](../../UGO_MASTER_CTO.md)

## Catalina-compatible runtime

This server intentionally runs with plain Node.js ESM. Do not require `tsx` or an `esbuild` runtime on the Catalina development machine.

Install:

```bash
cd "/Volumes/Armazenamento/developer/ugo-admin-panel/mcp/ugo-actions"
npm install
```

Run directly:

```bash
node src/index.js
```

Expected stderr:

```text
UGO Actions MCP iniciado
```

The process then waits for an MCP stdio client.

## Register in Codex

```bash
codex mcp add ugo-actions -- node "/Volumes/Armazenamento/developer/ugo-admin-panel/mcp/ugo-actions/src/index.js"
```

For the FCC wrapper, open `fcc-codex`, run `/mcp`, and verify that `ugo-actions` is enabled.

## Current tools

### `ugo_ping`

Infrastructure smoke test.

Expected result:

```text
UGO Actions MCP OK
```

### `ugo_get_current_job`

Safe stub only. It validates `userId` and returns a placeholder response. It does **not** read Supabase yet.

## Architecture rules

Before adding real actions:

1. Every service-scoped action must resolve an explicit `serviceId`.
2. Never let the model authorize itself.
3. Validate user identity, role/ownership and legal state transition in deterministic backend code.
4. GPS-sensitive transitions must use fresh real coordinates; never substitute `0,0` or fabricated positions.
5. Financial state is authoritative only after backend confirmation.
6. Mutating tools must be idempotent where repeated execution is possible.
7. Realtime and audit events must remain scoped to the correct service.
8. Do not expose privileged keys in this package or the frontend.

## Planned sequence

Keep the action surface small and auditable. Add tools incrementally:

1. `ugo_ping`
2. real read-only `ugo_get_current_job`
3. `ugo_get_service`
4. provider-location read
5. current-location capture contract for Hugo
6. accept job
7. start route
8. mark arrived
9. start work
10. finish work
11. cash-payment confirmation
12. rating

Do not open mutating actions until the read path and authorization boundary are verified.
