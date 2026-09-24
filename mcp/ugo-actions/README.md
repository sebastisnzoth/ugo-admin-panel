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

## Runtime authentication for real reads

`ugo_get_current_job` uses the caller's real Supabase session and the database RLS boundary. It does not use `service_role`.

Runtime variables:

- `UGO_MCP_SUPABASE_URL`: Supabase URL for the intended UGO project.
- `UGO_MCP_SUPABASE_PUBLISHABLE_KEY`: browser-safe publishable key for that project.
- `UGO_MCP_USER_ACCESS_TOKEN`: authenticated user's session access token. Keep it in the MCP process environment; never commit it and never paste it into model prompts/tool arguments.
- `UGO_MCP_EXPECTED_PROJECT_REF`: optional project-ref guard. For the current UGO target use `trfsjuseqjxlhrxuvdsm`.

The current application test target in `src/lib/supabaseProject.ts` is UGO Arena (`tmossnqfwfwjrtzwcbmm`). The MCP read path therefore requires its own explicit runtime target and must not silently inherit that application test target when the intended backend is UGO (`trfsjuseqjxlhrxuvdsm`).

## Current tools

### `ugo_ping`

Infrastructure smoke test.

Expected result:

```text
UGO Actions MCP OK
```

### `ugo_get_current_job`

Real, read-only, RLS-bound service lookup.

Input:

- `userId`: explicit authenticated user UUID.
- `role`: `client` or `provider`.
- `serviceId`: optional exact service UUID.

Authorization path:

1. Validate input shape.
2. Resolve the authenticated Supabase user from the runtime session token.
3. Require that authenticated user ID equals `userId`.
4. Read the user's own `usuarios` row and require the declared role to match the real account type.
5. Query `servicios` through the publishable key + caller JWT so production RLS remains authoritative.
6. Add an explicit ownership filter (`cliente_id` for client, `proveedor_id` for provider).
7. If `serviceId` is supplied, return only that exact authorized service.
8. If no `serviceId` is supplied and more than one active service exists, return `ambiguous` with minimal candidate identifiers instead of guessing a global current order.
9. If no active service exists, return `none`.

No write, state transition or privileged key is used by this tool.

### `ugo_get_service`

Exact, read-only service lookup. `serviceId` is mandatory.

The tool validates caller identity and role, adds an explicit client/provider ownership filter, then lets the live `servicios_select` RLS policy remain authoritative. It never accepts service number as a substitute and never falls back to a "latest" service.

The response intentionally omits arbitrary `metadata`, client address and unrelated internal fields.

### `ugo_get_provider_location`

Read-only provider tracking for one exact `serviceId`.

The tool first verifies the caller against the exact owned service, then reuses the existing live UGO RPC `obtener_tracking_servicio_cliente(p_servicio_id)` instead of reading `perfiles_proveedor.ubicacion` directly. This preserves the backend's service-participant privacy boundary and avoids broadening `perfiles_proveedor` RLS.

Current live UGO behavior only exposes tracking data from that RPC when its backend rules allow it. An empty result is therefore reported as `unavailable`; the MCP does not bypass the RPC by falling back to a direct location query.

Location interpretation:

- freshness threshold: **30 seconds**, matching `ProviderLocationTracker`;
- `0,0`, null coordinates, non-finite values or coordinates outside valid latitude/longitude ranges are `unavailable`;
- valid coordinates older than 30 seconds are returned as `stale`, never described as current;
- a provider ID returned by the RPC must match the provider assigned to the requested `serviceId`, otherwise the MCP rejects the response as a scope mismatch.

No GPS update, state transition or other mutation occurs.

## Current service states verified in UGO

The production UGO schema currently exposes:

`borrador`, `buscando`, `ofrecido`, `asignado`, `en_camino`, `llegado`, `en_progreso`, `esperando_aprobacion`, `completado`, `cancelado`, `disputado`.

The MCP treats all except `completado`, `cancelado` and `disputado` as active for the unresolved-job query. Do not rename these states from the CTO conceptual names without an explicit database migration/compatibility plan.

## Validation

Run:

```bash
npm run validate
```

This performs JavaScript syntax checks and the MCP unit tests.

GitHub Actions also runs the isolated `UGO Actions MCP CI` workflow for changes under `mcp/ugo-actions/**`. The workflow does not require production secrets or write access.

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
9. Supabase MCP for developers is separate from the Hugo runtime action boundary.

## Planned sequence

Keep the action surface small and auditable. Add tools incrementally:

1. `ugo_ping`
2. real read-only `ugo_get_current_job` — implemented
3. `ugo_get_service` — implemented
4. `ugo_get_provider_location` — implemented
5. current-location capture contract for Hugo
6. accept job
7. start route
8. mark arrived
9. start work
10. finish work
11. cash-payment confirmation
12. rating

Do not open mutating actions until the read path and authorization boundary are verified.
