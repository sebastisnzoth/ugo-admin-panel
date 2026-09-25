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

## Runtime authentication for real reads/actions

UGO Actions reads and mutations use the caller's real Supabase session and the database RLS/RPC boundary. They do not use `service_role`.

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

### `ugo_get_current_user`

Read-only identity and operational-profile lookup for the authenticated client/provider.

The response is deliberately narrow. It can expose operational fields such as name, role, status, karma, onboarding state and provider availability/profile context, but it omits account/contact/payment secrets such as email, phone, CPF, PIX keys and external payment-account identifiers.

### `ugo_get_provider_offers`

Read-only provider opportunity feed.

The tool requires `role=provider`, reuses the authorized `obtener_ofertas_proveedor` RPC and rejects any returned row whose `proveedor_id` does not match the authenticated provider. It preserves the RPC privacy contract: coarse client zone is allowed, exact client address is not returned.

### `ugo_get_saved_places`

Read-only saved-place lookup for the authenticated client.

The tool requires `role=client`, queries `direcciones_cliente` with an explicit `usuario_id` ownership filter, and keeps database RLS authoritative. It can return the authenticated client's own saved address/coordinates because those are needed to choose a service location. It cannot read or modify another client's places and does not change the default place.

### `ugo_get_job_history`

Read-only recent service history for an authenticated client or provider.

The query applies the corresponding ownership filter (`cliente_id` or `proveedor_id`) plus RLS, orders by recent update and accepts a bounded `limit` (maximum 50). The returned summary omits counterpart IDs, exact addresses and arbitrary service metadata.

### `ugo_accept_job`

Controlled provider-offer acceptance using the same canonical backend RPC as the Provider UI.

Input is explicit and non-inferential:

- `userId`
- `role=provider`
- exact `serviceId`
- exact `offerId`

The tool validates the real Supabase session and provider role before reading the provider-owned offer. It refuses cross-provider and cross-service scope, never guesses a latest offer, calls only `aceptar_oferta(p_oferta_id)`, returns a minimal sanitized result, and reconciles ambiguous network/RPC failures by re-reading the exact persisted offer + service assignment.

Business rules remain backend-authoritative. TEST already enforces atomic assignment, offer expiry, provider readiness, the three-unpaid-UGO-services block and schedule-conflict rules, including valid future jobs while another job is live.

**Environment gate:** this mutation is currently enabled only for UGO Arena TEST (`tmossnqfwfwjrtzwcbmm`). Production UGO (`trfsjuseqjxlhrxuvdsm`) does not yet have the debt/schedule contract promoted, so the tool returns `backend_contract_not_ready` before mutation there. Remove or extend that gate only after those production migrations are promoted and verified.

### `ugo_start_route`

Controlled provider route-start mutation for one exact `serviceId`.

Input:

- `userId`
- `role=provider`
- exact `serviceId`

The tool validates the caller's real Supabase session, active provider role and exact service ownership before mutation. It never accepts coordinates, offer IDs, service numbers or a "latest job" shortcut.

The mutation reuses the Provider UI contract exactly:

`avanzar_servicio(p_servicio_id, 'en_camino')`

The backend remains authoritative for the legal `asignado -> en_camino` transition. In TEST it also enforces the scheduled-job start window (up to 60 minutes before `programado_para`) and requires a valid client payment path: either protected retained electronic payment with a real processor reference, or the canonical in-person cash payment state.

Repeated calls are safe: `en_camino` returns idempotent success; later states such as `llegado`, `en_progreso`, `esperando_aprobacion` and `completado` are reported as already advanced and are never moved backward. Ambiguous network failures are reconciled by re-reading the same provider-owned `serviceId`.

**Environment gate:** `ugo_start_route` is currently enabled only for UGO Arena TEST (`tmossnqfwfwjrtzwcbmm`). Production UGO (`trfsjuseqjxlhrxuvdsm`) still lacks the equivalent complete P0 contract (including the TEST scheduled-start rule and other pending P0 promotions), so the tool returns `backend_contract_not_ready` before mutation there.

### `ugo_mark_arrived`

First controlled mutation in the MCP surface.

Input is deliberately limited to:

- `userId`
- `role=provider`
- exact `serviceId`

There are **no lat/lng arguments**. Hugo/the model is not a GPS source.

The device/provider UI captures a fresh high-accuracy position and publishes it through the dedicated application RPC `publicar_ubicacion_proveedor`, which stores a dedicated GPS capture timestamp and accuracy. The MCP then calls only `marcar_llegada_proveedor(serviceId)`.

The dedicated migration also protects GPS provenance: direct provider-profile location updates and older location RPCs may still move the profile coordinate for compatibility, but they clear the dedicated `ubicacion_updated_at` / `ubicacion_accuracy_m` trust metadata. Only `publicar_ubicacion_proveedor` can preserve trusted arrival freshness for the authenticated provider transaction.

The backend is authoritative and validates:

- authenticated provider identity;
- exact service ownership;
- legal `en_camino -> llegado` state;
- persisted GPS exists and is not `0,0`;
- capture age is at most 30 seconds;
- persisted accuracy is valid and at most 250 m;
- client service location exists and is valid;
- server-computed distance is at most 200 m.

Expected operational rejections include `outside_geofence`, `gps_stale`, `gps_unavailable`, `gps_inaccurate`, `client_location_unavailable`, `invalid_state` and `unauthorized`.

Repeated arrival is idempotent: when the same service is already `llegado`, the backend returns an arrived result without replaying the state update.

The repository migration `20260924162000_provider_arrival_gps_gate.sql` also installs a database trigger that blocks any `en_camino -> llegado` update that did not pass the dedicated arrival validator. This prevents the older generic `avanzar_servicio` path from becoming a geofence bypass after the migration is promoted.

`publicar_ubicacion_proveedor` is intentionally **not exposed as a Hugo MCP tool**. Coordinates must originate from the device/app geolocation flow, not from model-generated tool arguments.

### `ugo_start_work`

Controlled provider work-start mutation for one exact `serviceId`.

Input is deliberately limited to:

- `userId`
- `role=provider`
- exact `serviceId`

The tool rejects extra action payload such as coordinates, offer IDs, service numbers, evidence paths, files or arbitrary metadata. It validates the caller's real Supabase session, active provider role and exact service ownership, then reuses the Provider UI contract:

`avanzar_servicio(p_servicio_id, 'en_progreso')`

The backend is authoritative for the legal `llegado -> en_progreso` transition. In TEST the canonical backend requires at least one real provider-owned initial evidence row (`tipo='antes'`) with a non-empty storage path before work can start. The MCP does not upload, generate, insert or fabricate evidence and preserves the backend rejection when that evidence is missing.

Repeated calls are safe: `en_progreso` returns idempotent success. `esperando_aprobacion` and `completado` are reported as already advanced and are never moved backward. Ambiguous network failures are reconciled by re-reading the same provider-owned `serviceId`; a persisted `en_progreso` or later valid state prevents a blind retry.

**Environment gate:** `ugo_start_work` is currently enabled only for UGO Arena TEST (`tmossnqfwfwjrtzwcbmm`). Production UGO (`trfsjuseqjxlhrxuvdsm`) still lacks the full promoted P0 lifecycle contract used by the guarded MCP sequence, so the tool returns `backend_contract_not_ready` before mutation there.

### `ugo_finish_work`

Controlled provider work-finish mutation for one exact `serviceId`.

Input is deliberately limited to:

- `userId`
- `role=provider`
- exact `serviceId`

The tool rejects extra action payload such as coordinates, offer IDs, service numbers, evidence paths, photos, files or arbitrary metadata. It validates the caller's real Supabase session, active provider role and exact service ownership, then reuses the Provider UI contract:

`avanzar_servicio(p_servicio_id, 'esperando_aprobacion')`

The backend is authoritative for the legal `en_progreso -> esperando_aprobacion` transition. In TEST the canonical backend requires at least one real provider-owned final evidence row (`tipo='despues'`) with a non-empty storage path before approval can be requested. The MCP does not upload, generate, insert or fabricate evidence and preserves the backend rejection `Agregá al menos una foto final antes de pedir aprobación` when final evidence is missing.

Repeated calls are safe: `esperando_aprobacion` returns idempotent success. `completado` is reported as already advanced and is never moved backward. Ambiguous network failures are reconciled by re-reading the same provider-owned `serviceId`; a persisted `esperando_aprobacion` or `completado` state prevents a blind retry.

**Environment gate:** `ugo_finish_work` is currently enabled only for UGO Arena TEST (`tmossnqfwfwjrtzwcbmm`). Production UGO (`trfsjuseqjxlhrxuvdsm`) still lacks the full promoted P0 lifecycle contract used by the guarded MCP sequence, so the tool returns `backend_contract_not_ready` before mutation there.

### `ugo_approve_work`

Controlled client work-approval mutation for one exact `serviceId`.

Input is deliberately limited to:

- `userId`
- `role=client`
- exact `serviceId`

The tool validates the caller's real Supabase session, active client role and exact client ownership before mutation. It accepts no payment confirmation, evidence payload, rating, provider ID, service number or arbitrary metadata.

The mutation reuses the Client UI contract exactly:

`aprobar_servicio(p_servicio_id)`

The backend remains authoritative for final provider evidence and payment readiness. There are two valid outcomes:

- electronic payment: the approval completes the service and releases the protected retained payment;
- cash payment: the approval records `metadata.trabajo_aprobado_at` and intentionally keeps the service in `esperando_aprobacion`; the separate client `YA PAGUÉ` action is still required to close the service.

Repeated calls are safe. A cash service already carrying `trabajo_aprobado_at` returns idempotent approval without replaying the RPC. A completed service is reported as already advanced and is never moved backward. Ambiguous network/RPC failures are reconciled by re-reading the same client-owned `serviceId`; only a persisted completed service or a persisted cash work-approval marker counts as proven success.

**Environment gate:** `ugo_approve_work` is enabled only for UGO Arena TEST (`tmossnqfwfwjrtzwcbmm`). Production UGO remains blocked because its migration history has not yet been verified to include the later client cash-close hardening equivalent to `fix_client_cash_close_sensitive_counter`.

### `ugo_confirm_cash_payment`

Controlled client `YA PAGUÉ` mutation for an exact service already approved for cash payment.

Input is deliberately limited to:

- `userId`
- `role=client`
- exact `serviceId`

The tool reads only the exact client-owned service and its latest payment, verifies the canonical cash shape (`metodo=efectivo`, `procesador=efectivo`, `modelo_pago=presencial`), requires `metadata.trabajo_aprobado_at`, and then reuses the Client UI RPC exactly:

`confirmar_pago_efectivo_cliente(p_servicio_id)`

No amount, payment ID, external reference, provider ID or debt value can be supplied by the model. The backend owns those values and the state transition.

A successful call is not accepted from the RPC response alone: the MCP re-reads the same client-owned `serviceId` and latest payment and requires both `servicios.estado=completado` and `pagos.estado=liberado`. Ambiguous network failures are reconciled with the same persisted proof.

The payment liberation also remains connected to UGO's backend commission ledger. The canonical TEST triggers create/update `deudas_ugo_proveedor` for released cash commissions and enforce the 3-pending-debt provider block (offline + pending offers expired). This MCP does not write that ledger or provider availability directly.

**Environment gate:** `ugo_confirm_cash_payment` is enabled only for UGO Arena TEST (`tmossnqfwfwjrtzwcbmm`). Production UGO remains blocked until the later cash-close sensitive-profile/debt hardening is promoted and verified live.

### `ugo_rate_service`

Controlled bilateral rating mutation for one exact completed `serviceId`.

Input is deliberately limited to:

- `userId`
- `role=client|provider`
- exact `serviceId`
- integer `score` from 1 through 5
- optional `comment` up to 500 characters

The model cannot provide `cliente_id`, `proveedor_id` or `autor_tipo`. The MCP reads the exact role-owned completed service and derives those fields from the persisted service:

- `role=client` -> `autor_tipo=cliente`; target is the service provider;
- `role=provider` -> `autor_tipo=proveedor`; target is the service client.

The tool inserts only into `public.resenas` through the caller's authenticated Supabase session. TEST RLS independently requires the service to be completed, the client/provider IDs to match the service, and the authenticated user to be the author for that direction.

There is exactly one rating per `(servicio_id, autor_tipo)`. Repeating the exact same score/comment is idempotent. If that side already rated the service with different content, the MCP returns `already_rated` and never updates or overwrites the existing review. Ambiguous insert failures are reconciled by re-reading the exact service + author direction.

The MCP never claims or writes reputation/karma. The earlier automatic rating-to-`usuarios.karma` trigger was intentionally removed because that protected profile field has a separate authorization boundary.

**Environment gate:** `ugo_rate_service` is enabled only for UGO Arena TEST (`tmossnqfwfwjrtzwcbmm`). Production UGO remains blocked until the bilateral rating schema, unique index and RLS policy are promoted and verified live.

## Current service states verified in UGO

The production UGO schema currently exposes:

`borrador`, `buscando`, `ofrecido`, `asignado`, `en_camino`, `llegado`, `en_progreso`, `esperando_aprobacion`, `completado`, `cancelado`, `disputado`.

The MCP treats all except `completado`, `cancelado` and `disputado` as active for the unresolved-job query. Do not rename these states from the CTO conceptual names without an explicit database migration/compatibility plan.

## Audited client closure boundary

Repository and UGO Arena TEST audit on 2026-09-25 established that `esperando_aprobacion -> cierre` is not one universal mutation:

- the Client UI calls `aprobar_servicio(p_servicio_id)` for the exact client-owned service;
- electronic approval requires protected retained payment with a real processor reference, then completes the service and releases the payment;
- cash approval records `metadata.trabajo_aprobado_at` and intentionally keeps the service in `esperando_aprobacion`;
- only the later client action `confirmar_pago_efectivo_cliente(p_servicio_id)` marks the cash payment released and moves that same service to `completado`;
- both paths remain backend-authoritative for ownership, final provider evidence and payment state;
- the latest closure hardening must not update another user's protected `usuarios` counters from a client-owned RPC.

The audit itself added no mutation and kept the MCP at 0.9.0. `ugo_approve_work` implemented the work-approval boundary in 0.10.0, and `ugo_confirm_cash_payment` followed in 0.11.0 as a separate independently validated cash-close boundary.

Production must remain blocked for future client-closing MCP mutations until its live migration/function state is verified to include the closure hardening represented by `fix_client_cash_close_sensitive_counter` (or an equivalent newer contract). Repository code alone is not proof that PROD is ready.

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
5. `ugo_get_current_user` — implemented
6. `ugo_get_provider_offers` — implemented
7. `ugo_get_saved_places` — implemented
8. `ugo_get_job_history` — implemented
9. device-owned GPS publication contract — implemented in Provider UI/backend migration
10. `ugo_mark_arrived` — implemented in code, pending migration promotion
11. `ugo_accept_job` — implemented and TEST-gated pending PROD debt/agenda promotion
12. `ugo_start_route` — implemented and TEST-gated pending PROD P0 contract promotion
13. `ugo_start_work` — implemented and TEST-gated pending PROD P0 contract promotion
14. `ugo_finish_work` — implemented and TEST-gated pending PROD P0 contract promotion
15. `ugo_approve_work` — implemented and TEST-gated pending PROD client-close hardening
16. `ugo_confirm_cash_payment` — implemented and TEST-gated pending PROD cash-close/debt hardening
17. `ugo_rate_service` — implemented and TEST-gated pending PROD bilateral-rating promotion

Do not open the next mutating action until its exact role-owned service boundary is independently audited, TEST-validated and the required backend contracts are promoted through the normal environment pipeline.
