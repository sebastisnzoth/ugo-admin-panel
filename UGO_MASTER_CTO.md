# UGO — PRODUCT + UX/UI + TECHNICAL MASTER

**Google AI Studio / Stitch implementation reference**

> **UN PEDIDO. UN PROFESIONAL. SIN VUELTAS.**

**SOURCE OF TRUTH**

This document defines what UGO must do, how it must behave, how it must feel, and the technical contracts that must not be broken while applying the visual layer.

- **Version:** 1.2 CTO Master — authenticated Hugo MCP read path
- **Date:** 24 September 2026
- **Status:** Implementation baseline / production-readiness specification

---

## 1. Executive Charter

UGO is a local-services operating platform. The product is not a directory, not a lead marketplace and not a chat app. Its promise is operational simplicity: a client asks for a service, one appropriate professional is assigned, both sides can complete the job with traceable states, payment and rating, and operations can intervene when necessary.

> **CTO DECISION:** Google AI Studio / Stitch is a visual and interaction reference. It must never become a parallel product, a mock-only fork, or a replacement for UGO business rules, Supabase, Realtime, service identity, security or production data.

### 1.1 Non-negotiable product principles

- Real functionality before visual polish. Every visible action must map to a real capability or be clearly disabled.
- One primary action per screen. Secondary actions must never compete with the main task.
- Mobile-first for Client and Provider; Admin and Super Admin must remain intentionally responsive on desktop and mobile.
- Do not copy Uber assets, marks, illustrations or exact layouts. Borrow only operational clarity and interaction discipline.
- Every async capability must expose loading, empty, success, error, permission-denied, offline and retry states.
- All job-sensitive actions are scoped by an explicit `serviceId` / order identity. Never rely on global "current order" assumptions.
- Real backend state is authoritative. UI optimism is allowed only when reversible and reconciled with server confirmation.
- Spanish rioplatense is the default product voice; Portuguese is supported where the market requires it.
- No secret keys in the frontend. Authorization is enforced server-side / database-side, not by hidden buttons.

### 1.2 Definition of Done

| Gate | Required evidence |
|---|---|
| Functional | Client -> Provider flow completes against real backend state; no mocked success paths. |
| Security | Role/ownership checks protect messages, tracking, evidence, payment, ratings, cancellations and admin actions. |
| Realtime | Relevant state changes appear on both sides without manual refresh, with reconnection behavior. |
| Resilience | GPS, microphone, camera, network and payment failures have explicit recovery paths. |
| UX | Mobile layout is readable at 390x844 and remains usable across supported desktop widths. |
| Quality | TypeScript/build/tests pass; critical E2E paths are validated before production deployment. |

---

## 2. Product Scope and Roles

| Role | Primary job | Critical capabilities |
|---|---|---|
| Client | Request and complete a service with minimum friction | Need, location, timing, matching, tracking, chat, payment, approval, rating, history, support |
| Provider | Accept, travel, perform and close work safely | Offers, availability, GPS, route, arrival, evidence, work states, payment/debt, history, ratings |
| Admin | Operate marketplace health and exceptions | Users, providers, jobs, categories, live states, disputes, Scout/CRM, intervention, audit |
| Super Admin | Govern product, security and business rules | Permissions, policy, financial controls, system configuration, observability, audit trail |

### 2.1 Product surfaces

- Landing / acquisition and authentication.
- Authenticated Client app.
- Authenticated Provider app.
- Admin operations center.
- Super Admin governance controls.
- Hugo conversational interface across authorized roles.
- Scout / provider acquisition CRM.
- Shared platform services: identity, orders, Realtime, notifications, maps/GPS, evidence, payment, ratings, disputes, audit.

---

## 3. Architecture Contract

The visual system may evolve aggressively. The platform contracts below are stability boundaries and must not be casually rewritten to fit a screen.

| Layer | Contract |
|---|---|
| UI / feature modules | Reusable role-specific components, responsive composition, explicit state rendering, no hidden business logic in styling. |
| Application orchestration | Commands and queries for orders, matching, messages, location, payment, ratings, evidence and admin actions. |
| Realtime | Subscribe by explicit entity/service scope; reconnect safely; deduplicate updates; never mix jobs. |
| Data / Supabase | Existing schema and RLS remain authoritative unless changed through an explicit migration plan. |
| Server / RPC / Edge | Privileged operations, payment confirmation, geofence validation, sensitive state transitions and secure voice actions. |
| External integrations | Maps/GPS, notifications, Gemini/Hugo, Calendar, email or other providers must degrade safely when unavailable. |
| Observability | Structured events for state transitions, errors, permission failures, matching, payment and voice actions. |

> **RULE:** A screen is not complete because it renders. It is complete only when its command path, authorization, server transition, Realtime propagation, recovery behavior and analytics/audit event are defined.

### 3.1 `serviceId` as the isolation key

- Chat messages belong to exactly one service/order.
- Tracking belongs to exactly one service/order and one authorized provider-client pair.
- Evidence, payment, cancellation, dispute, rating and completion must all reference the same explicit `serviceId`.
- Multiple simultaneous or scheduled orders are supported. Actions on one order must never mutate another.
- Deep links, notifications and Hugo actions must carry or resolve the correct `serviceId` before execution.

---

## 4. Canonical Service Lifecycle

The lifecycle below is conceptual. The implementation may map these concepts to existing database enums. Do not rename production states only to match this document without a migration and compatibility plan.

| Phase | Conceptual state | What the user sees | Allowed next actions |
|---|---|---|---|
| Request | DRAFT | Service request being composed | Set category, location, timing, payment preference |
| Matching | REQUESTED / MATCHING | UGO is finding a professional | Cancel, edit only where business rules allow |
| Assignment | ASSIGNED / ACCEPTED | Professional found / accepted | Client waits; provider prepares / starts route |
| Travel | EN_ROUTE | Professional is on the way | Track, chat, safety/support |
| Arrival | ARRIVED | Professional arrived | Verify presence, capture start evidence |
| Execution | IN_PROGRESS | Work in progress | Chat, evidence, support, dispute if required |
| Close | AWAITING_APPROVAL | Provider finished, client must review | Approve / dispute / request support |
| Payment | PAYMENT_PENDING / PAID | Payment required or confirmed | Pay, mark cash paid where allowed, resolve failure |
| Completion | COMPLETED | Service closed | Rate, view history, receipt/details |
| Exception | CANCELLED / DISPUTED | Service stopped or under review | Show reason, policy, next step, support |

> **STATE INVARIANT:** No client or provider should ever wonder: what happened, what is happening, and what comes next. Every active-order screen must answer those three questions.

### 4.1 Transition integrity

- A provider cannot transition to ARRIVED from a stale, missing or invalid GPS position when geofence validation is required.
- Start and finish evidence are explicit lifecycle events, not decorative uploads.
- Client approval must occur before final closure when the selected business flow requires approval.
- Payment UI must not claim success until the backend confirms the payment state.
- Cancellation must target one explicit `serviceId` and preserve audit history.
- A disputed service is not silently auto-completed.

---

## 5. Client Experience

### 5.1 Home

- Primary prompt: **"¿Qué necesitás?"** with immediate access to service categories and Hugo.
- Map/location is contextual, not a visual distraction. Current location and saved places must be understandable and editable.
- Active service has priority over discovery content and exposes the current next action.
- Bottom navigation: Inicio, Servicios, Actividad, Ayuda, Perfil (or the current production equivalent if already standardized).

### 5.2 Request composition

1. Need: category and concise problem description.
2. Location: current GPS location or saved/manual place.
3. Timing: "Lo antes posible" or "Puede esperar" / scheduled option according to product rules.
4. Review: service, address, timing/urgency, estimated price where available, payment preference and primary **"Confirmar pedido"** action.

Do not force 8-10 unrelated fields onto one form. Progressive disclosure is preferred: one decision at a time, with the request summary preserved.

### 5.3 Matching and assignment

- MATCHING: clear progress state and cancel policy; no fake provider cards.
- MATCHED / ASSIGNED: show the real selected provider, ETA when available, rating, verified attributes and contact-safe actions.
- EMPTY: explain that no professional is currently available and provide a meaningful retry/schedule alternative.
- ERROR: distinguish network, permission and server errors; do not collapse them into "algo salió mal".

### 5.4 Active service

- Provider route/location appears only when authorized and available.
- Chat is scoped to the active `serviceId`.
- Status timeline uses human language, not database enum names.
- Notifications must correspond to real transitions: assigned, accepted, on the way, arrived, started, finished, payment, completed.
- The client can see evidence/history relevant to the job and access dispute/support without losing the service context.

### 5.5 Completion and rating

- Client reviews provider completion before closure where required.
- Cash flow includes an explicit **"YA PAGUÉ"** confirmation when that is the approved business path.
- Rating must be available to the client after completion and must persist visibly in history.
- Completed job detail retains timestamps, service data, provider, payment, evidence references, rating and support/dispute history as authorized.

---

## 6. Provider Experience

### 6.1 Provider home and availability

- Online/offline availability is explicit and reflected in backend state.
- Incoming offers require a visible, audible/push alert strategy without duplicate alerts.
- Provider can understand service type, approximate location/distance, timing and commercial conditions before accepting, subject to privacy rules.
- Scheduled future work must not automatically block accepting another compatible future order if business rules allow it.

### 6.2 GPS and arrival — P0

> **P0 CONTRACT:** Provider arrival depends on a recent real location. Reject `0,0` and stale or unavailable coordinates. Never fabricate a position and never advance the lifecycle when acquisition/validation fails.

- Acquire a fresh provider location before publishing or validating arrival.
- Expose clear errors for permission denied, timeout, unavailable GPS and stale location.
- Publish location before marking the provider arrived when tracking requires it.
- Backend geofence target: **200 m** unless product configuration defines a different authoritative radius.
- Provider has an explicit **"YA LLEGUÉ"** action; automatic arrival may complement but must not make the state opaque.
- If geofence validation fails, explain distance/problem and keep the previous valid state.

### 6.3 Work execution

1. Accept service.
2. Go to client.
3. Arrive with validated location.
4. Capture initial evidence if required.
5. Start work.
6. Capture final evidence if required.
7. Mark work finished.
8. Await client approval/payment resolution.
9. Complete and rate.

### 6.4 Provider financial rule

> **BUSINESS RULE:** A provider who owes UGO for **3 services** cannot accept additional new requests until the UGO debt is paid. The UI must show the debt state, the reason for the block and a direct **"Pagar UGO"** action.

- Cash services must create the corresponding platform debt/accounting entry.
- Blocking is enforced server-side, not only visually.
- Historical jobs remain accessible while acceptance is blocked.
- Payment of debt must reconcile before re-enabling acceptance.

### 6.5 Provider history

- "Mis trabajos" shows completed, cancelled and disputed work according to authorization.
- Each job detail includes dates/times, status, evidence/photos, payment/debt impact, client rating where permitted and audit-relevant milestones.
- No history view may depend on a single current-order variable.

---

## 7. Hugo — Conversational Operating Layer

Hugo is not a decorative chatbot. It is a conversational controller that can understand, confirm and execute authorized product actions through the same real application commands used by the UI.

### 7.1 Interaction model

- Voice-first orb experience, with text transcription as feedback; not a separate chat product.
- One useful question at a time. Do not talk continuously over the user.
- Maintain conversational context for the current task, but bind execution to explicit role, user and service identity.
- Use real catalog/provider/order data. Never invent availability, prices, credentials or payment confirmation.
- For provider suggestions, show at most 3 conversational results when a choice is required.
- Confirm destructive or financially relevant actions before execution unless an existing product rule explicitly allows immediate execution.

### 7.2 Client voice flow

1. Understand the need/category.
2. Capture or clarify problem description.
3. Resolve location. If the user says **"mi ubicación"**, request/use real GPS and populate the request state automatically.
4. Resolve timing/urgency.
5. Resolve payment preference when required.
6. Read back a concise request summary.
7. Ask for confirmation.
8. Create the real order and move the visible UI to the real resulting state.

### 7.3 Provider/Admin voice actions

- Provider: availability, incoming work context, route/arrival, service state, history and payment/debt actions within permissions.
- Admin/Super Admin: operational queries and actions only through explicit privileged executors with audit trail.
- Administrative voice must never bypass RLS/authorization or directly trust model-generated parameters.

### 7.4 Hugo execution safety

| Risk | Required control |
|---|---|
| Hallucinated action | Model proposes intent; deterministic executor validates entities, permissions and allowed transition. |
| Wrong service | Resolve and verify explicit `serviceId` before service-scoped action. |
| GPS missing | Acquire/validate location; never substitute fabricated coordinates. |
| Payment claim | Only state "pago confirmado" after backend confirmation. |
| Long latency | Show listening/thinking/executing states; support cancel; timeout cleanly. |
| Duplicate command | Use idempotency/deduplication for execution-sensitive actions where applicable. |


### 7.5 Hugo MCP execution architecture

Hugo's MCP layer is an **internal action adapter for development and controlled execution**, not a replacement for UGO's backend, Supabase, RLS, RPC/Edge Functions, Realtime or application authorization.

**Repository location:** `mcp/ugo-actions/`

**Current implementation baseline (24 September 2026):**
- `ugo_ping` verifies that the MCP server is reachable.
- `ugo_get_current_job` is a real read-only path bound to the caller's Supabase session and database RLS. It validates explicit `userId` + role, can target an exact `serviceId`, and refuses to guess when multiple active services exist.
- Runtime is plain Node.js ESM so the MCP can run on the current Catalina development machine without depending on `tsx` / `esbuild`.
- The MCP is versioned in GitHub, but GitHub is not the runtime. Codex or another authorized MCP client starts/connects to the server; a future hosted runtime may replace the local process without changing the security contract.

**Binding execution rules:**
- Prefer small, typed, auditable tools such as `ugo_get_service`, `ugo_accept_job`, `ugo_start_route`, `ugo_mark_arrived`, `ugo_start_work`, `ugo_finish_work`, `ugo_confirm_cash_payment` and `ugo_rate_service`; do not create a generic privileged `ugo_do_anything`.
- Every service-scoped tool receives or deterministically resolves the correct `serviceId`.
- The model proposes intent; a deterministic executor validates authenticated user, role, ownership, legal lifecycle transition, required confirmation, GPS freshness/geofence and financial rules before mutation.
- MCP must never become a backdoor around RLS or backend authorization.
- Mutating tools require idempotency/deduplication where repeated execution could duplicate state, evidence, notifications or financial effects.
- Privileged credentials remain server-side. No service-role or secret key is exposed to the model, browser or repository.
- Supabase MCP used by developers/agents is **separate** from `ugo-actions`. It is tooling for inspecting/developing the project and does not define Hugo's production authorization boundary.
- Read-only Hugo MCP calls use the caller's user-bound Supabase access token kept in the MCP runtime environment, never a `service_role` key and never a token passed through model tool arguments.
- The runtime may enforce an expected Supabase project ref so UGO and isolated test projects cannot be confused silently.
- Read-only capability is established before write capability. Do not enable mutating MCP tools until the corresponding backend/RPC authorization path is verified.

**Canonical arrival example:**

`Hugo intent -> ugo_mark_arrived -> serviceId + provider identity + fresh real GPS -> authorized backend/RPC -> ownership/state/geofence validation -> publish location -> ARRIVED -> Realtime -> Client/Provider/Admin`

If any required validation fails, the tool returns a structured failure and the service remains in the previous authoritative state.


---

## 8. Realtime, Notifications and Synchronization

- Admin must reflect relevant operational changes without manual refresh.
- Client and Provider must converge on the same service state after Realtime events or reconnect.
- Subscriptions are scoped narrowly enough to prevent cross-job leakage.
- Duplicate Realtime events must not duplicate UI transitions, notifications or evidence entries.
- Push/web notifications must deep-link to the correct service and role surface.
- Provider offer alerts should support a recognizable sound where platform policy permits, with user control and no alert storms.

### 8.1 Offline/reconnect behavior

| Situation | Expected UX |
|---|---|
| Temporary offline | Banner/state indicator; preserve safe local input; block unsafe transitions that require server confirmation. |
| Reconnect | Refresh authoritative service state; reconcile optimistic UI; avoid replaying completed actions. |
| Realtime dropped | Fallback refetch/poll only as designed; expose stale-state risk internally. |
| Notification opened late | Resolve latest service state before rendering action buttons. |

---

## 9. Maps, GPS and Location

- Current location is a capability with permissions, freshness and accuracy — not merely latitude/longitude fields.
- Client can use current location, saved places (e.g. Casa, Oficina, Mamá) or manual entry where supported.
- Provider tracking shares only the minimum location required for the active job and authorized participants.
- Location timestamps and freshness thresholds must be available to the business logic that validates arrival.
- Map UI must explain whether a marker is current, approximate, last-known or unavailable.
- Never treat `0,0` as a valid fallback position.

---

## 10. Payments, Cash and UGO Debt

Payment state is financial state. UI must describe it precisely and only after the authoritative system confirms it.

| Flow | Required behavior |
|---|---|
| Electronic payment | Initiate through approved backend/provider path; show pending/success/failure; support safe retry. |
| Cash | Record that the client/provider flow used cash, then create/reconcile the UGO fee/debt according to business rules. |
| Client confirmation | "YA PAGUÉ" may be used where the cash flow requires bilateral confirmation; it does not replace server reconciliation. |
| Provider debt | Show amount/services owed, block acceptance at 3 unpaid service obligations, expose "Pagar UGO". |
| History | Persist payment method/state and debt impact per service without exposing sensitive payment secrets. |

---

## 11. Evidence, Approval and Disputes

- Initial/final evidence is tied to the `serviceId`, actor and timestamp.
- Evidence upload failures do not silently advance the lifecycle if evidence is required.
- Client approval and provider completion are distinct events where the flow requires both.
- Dispute entry preserves service context, evidence, messages and relevant state history.
- AI may assist classification or image analysis, but dispute decisions that affect users require traceable policy and human/admin controls as defined by operations.
- PIN/QR bilateral verification can be used when appropriate; a PIN shared through secure chat is the fallback when there is no physical encounter.

---

## 12. Admin and Super Admin

### 12.1 Operations center

- Readable live overview of online, active and inactive providers; active services; exceptions; disputes; debt/payment issues and critical system errors.
- Filters and search must reduce time-to-action rather than become dashboard decoration.
- Every user/provider/service detail view exposes authorized historical context: documents, dates, service timeline, evidence references, payments and admin actions.
- Realtime updates should not require refresh for normal operations.
- Admin actions that mutate production state require explicit authorization and audit logging.

### 12.2 Scout / provider acquisition CRM

- Store prospects by category without arbitrary 100-record truncation.
- Editable prospect record with source, contacts, category, status, notes and history.
- Strong deduplication and protected contact handling.
- Daily work queue, campaign/history view and conversion dashboard.
- Email/WhatsApp invitation actions should route through authorized connected channels and preserve communication history.
- Invitation must lead to provider registration/document onboarding, not a dead-end marketing page.

---

## 13. UX/UI Design System

### 13.1 Visual direction

- Premium operational simplicity: white and near-black surfaces with cyan/turquoise as the principal accent.
- High contrast, restrained shadows, clear spacing hierarchy, large tap targets and minimal decorative noise.
- Maps and cards should support decisions, not dominate the interface.
- The Hugo orb is a recognizable interaction affordance but must not obscure critical CTAs or navigation.
- Avoid duplicate green status dots or redundant state indicators.

### 13.2 Component families

| Family | Core components |
|---|---|
| Navigation | Top app bar, bottom navigation, back, role switch only where allowed |
| Service | Service card, active order card, timeline, status chip, provider summary, request summary |
| Map | Current-location marker, provider marker, route/ETA, permission/error panels, saved-place selector |
| Action | Primary CTA, secondary action, destructive confirmation, sticky action footer |
| Communication | Hugo orb, transcript, chat thread, quick replies, notification banner |
| Financial | Price summary, payment method, payment state, debt banner, Pagar UGO |
| Evidence | Camera/upload action, preview, upload state, timestamped evidence item |
| System state | Skeleton, spinner/progress, empty state, offline, retry, permission-denied, blocking error |

---

## 14. Content, Accessibility and Trust

- Use plain operational language. Prefer "pago protegido" / "pago confirmado" over financial jargon.
- Buttons describe actions: "Confirmar pedido", "YA LLEGUÉ", "Comenzar", "Finalizar", "YA PAGUÉ", "Pagar UGO".
- Do not expose raw exception messages or database status codes to end users.
- Color never carries state alone; pair with text/iconography.
- Interactive controls need adequate touch size, focus state, labels and keyboard support on web.
- Voice and text must remain alternatives: a failed microphone cannot block the core service flow.
- Sensitive contact information is protected; anti-bypass policy is enforced through product and operations without dark patterns.

---

## 15. Critical Failure and Recovery Matrix

| Failure | Do not | Required recovery |
|---|---|---|
| GPS denied | Fake coordinates or mark arrived | Explain permission; allow retry/settings guidance; preserve state |
| GPS timeout | Advance silently | Show timeout; reacquire; keep last valid state visibly distinct |
| No provider | Show fake match | EMPTY state; retry/schedule option; preserve request |
| Realtime disconnect | Freeze invisibly | Show connection state where relevant; refetch/reconcile on reconnect |
| Payment pending | Show paid | Keep pending; refresh/reconcile; safe retry |
| Evidence upload fails | Complete job | Retry/upload recovery; do not cross required gate |
| Voice parse uncertain | Guess and execute | Ask one targeted clarification |
| Voice executor rejected | Pretend success | Explain action could not be completed; show next valid action |
| Wrong/expired deep link | Open stale CTA | Resolve current service state and render only valid actions |

---

## 16. Security, Privacy and Authorization

- RLS/ownership/role checks cover service data, messages, locations, evidence, ratings and financial records.
- Provider cannot read or mutate another provider's jobs. Client cannot read another client's jobs.
- Admin privileges are explicit and auditable; Super Admin privileges are narrower in membership and stronger in controls.
- Frontend role flags are presentation hints, never authorization proof.
- Service-scoped Realtime channels must not leak messages or tracking across services.
- API keys and privileged service credentials remain server-side.
- Voice actions use the same authorization boundary as clicks/taps; the model itself is never trusted as an authorization source.
- Personal data retention and deletion policies should be documented separately and reflected in implementation.

---

## 17. Production Readiness and Test Strategy

### 17.1 P0 end-to-end scenario

1. Client authenticates and creates a real request.
2. Provider receives the real offer/assignment and accepts.
3. Provider goes en route and publishes real location.
4. Client receives state/route updates without refresh.
5. Provider reaches valid geofence and marks **YA LLEGUÉ**.
6. Initial evidence is captured when required.
7. Work starts.
8. Final evidence is captured when required.
9. Provider marks work finished.
10. Client approves.
11. Payment flow resolves, including cash/**YA PAGUÉ** where selected.
12. Service reaches completed state.
13. Both sides can rate according to policy.
14. Admin sees the final state/history without manual refresh.

### 17.2 Required negative tests

- GPS denied, timeout, stale coordinate and `0,0`.
- Provider tries arrival outside geofence.
- Two simultaneous/scheduled services; actions remain isolated by `serviceId`.
- Chat isolation between services/users.
- Realtime disconnect/reconnect during active job.
- Duplicate event / repeated command.
- Cash service increments provider UGO debt; acceptance blocks on third unpaid obligation.
- Payment failure/retry and stale pending payment.
- Evidence upload failure.
- Client cannot rate before eligible state; client can rate after completion.
- Unauthorized role attempts privileged voice/admin action.

### 17.3 Release gates

| Gate | Pass condition |
|---|---|
| Build | Production build passes with no unresolved TypeScript errors. |
| Unit/integration | Critical state-transition and executor tests pass. |
| E2E | P0 real Client <-> Provider lifecycle passes. |
| Security | RLS/ownership tests confirm isolation and privileged paths. |
| Mobile QA | Critical flows pass on target phone dimensions/device class. |
| Observability | Failures and state transitions are diagnosable from logs/events. |
| Deploy | Deploy only after local/preview validation; avoid consuming production/deploy quota for unvalidated iterations. |


### 17.4 MCP and GitHub Actions gate

Changes under `mcp/ugo-actions/**` require an isolated CI gate before integration.

Minimum MCP CI evidence:
- dependencies install successfully in a clean runner;
- `src/index.js` passes JavaScript syntax validation;
- the MCP process starts successfully under Node and reaches the expected startup signal;
- failures stop the check instead of being treated as success;
- MCP validation does **not** require production Supabase write access or privileged secrets;
- production deploys are not a prerequisite for validating MCP code.

GitHub Actions is the **verification layer**, not the Hugo runtime. The MCP process executes in the authorized client/runtime; GitHub stores/version-controls the source and automatically validates changes.

The repository currently has an isolated `UGO Actions MCP CI` workflow prepared through PR #176. Its first dedicated MCP validation run passed successfully. Merge remains subject to the repository's wider CI checks and normal integration discipline.


---

## 18. Implementation Order — CTO Priority

Do not open new fronts while P0 is unstable. Sequence work so each block is independently testable and mergeable.

| Priority | Block | Exit criterion |
|---|---|---|
| P0.1 | Provider GPS / arrival | Fresh real location, `0,0` rejection, clear errors, publish before arrival, 200 m server geofence, YA LLEGUÉ works. |
| P0.2 | Client <-> Provider lifecycle | Request -> accept -> route -> arrive -> evidence -> work -> finish -> approve -> payment -> complete -> ratings. |
| P0.3 | Hugo voice actions | Orb can converse and execute the same real flow, including "mi ubicación", with permission/role safety. |
| P1 | Realtime operations | Admin/client/provider reflect relevant changes without refresh and recover from reconnect. |
| P1 | Notifications | Assignment, route, arrival, work/payment/completion notifications deep-link correctly. |
| P1 | History and evidence | Client/provider histories include correct job details and photos/evidence. |
| P1 | Financial enforcement | Cash debt accounting + Pagar UGO + block at 3 unpaid obligations. |
| P2 | Scout/CRM and growth | Provider acquisition workflows after core service reliability. |

---

## 19. Google AI Studio / Stitch Master Instruction

> **USE THIS AS THE IMPLEMENTATION BRIEF**
>
> Create/refine the UGO interface as a production-facing UX layer over the existing UGO product. Do not create a separate app, mock backend, alternate source of truth or simplified fake flow.
>
> Preserve the real UGO architecture and business behavior: Client, Provider, Admin/Super Admin; Supabase authentication/data/RLS; explicit `serviceId` isolation; Realtime; matching; maps/GPS; chat; tracking; evidence; payments including cash and provider debt; ratings; notifications; disputes; history; and Hugo voice actions. The visual reference is authoritative for presentation and interaction quality, but backend state and security are authoritative for truth.
>
> Design mobile-first around 390x844 for Client/Provider, with intentional responsive behavior on larger widths and Admin desktop. Use a premium black/white/cyan system, high contrast, reusable components, bottom sheets where they reduce friction, one primary action per screen and complete loading/empty/error/offline/permission states. Do not copy Uber branding or assets.
>
> Every action shown in the interface must either execute a real authorized command or be visibly unavailable with an explanation. Never display success for location, payment, assignment, arrival, evidence or completion before the backend has confirmed it. Never invent providers, availability, prices, GPS positions or job status.
>
> The core journey must remain: **CLIENTE -> PEDIDO -> MATCHING -> PROVEEDOR -> SERVICIO -> PAGO -> CIERRE -> ADMIN**.
>
> Hugo is a voice-first conversational controller of the same real application actions, not a separate chatbot. When the user says **"mi ubicación"**, Hugo must request/use real GPS and populate the real request flow. Admin voice actions require privileged executors and audit.
>
> Deliver screens and components in a way that can be integrated incrementally into the existing repository without breaking routes, service identity, data contracts or business logic. Treat each feature as complete only when success, failure, permission, offline, retry and Realtime reconciliation behaviors are specified.

---

## 20. CTO Decision Log — Binding Product Rules

| Decision | Binding rule |
|---|---|
| Core promise | "Un pedido. Un profesional. Sin vueltas." |
| Visual reference | Google AI Studio/Stitch drives UX/UI quality, not backend truth. |
| Multiple orders | Each order is independent and `serviceId`-scoped. |
| Provider arrival | Real recent GPS + backend validation; never fake location. |
| Geofence | 200 m target unless centrally reconfigured. |
| Cash | Creates/reconciles UGO debt as applicable. |
| Debt block | Provider cannot accept new work after 3 unpaid service obligations until paying UGO. |
| Hugo | Voice-first controller that executes real authorized app actions. |
| Hugo MCP | Small typed service-scoped tools; deterministic backend validation; never a Supabase/RLS bypass. |
| Supabase MCP | Developer/agent tooling only; separate from Hugo's production execution boundary. |
| GitHub Actions | CI gate validates MCP startup/syntax and core repository checks before integration; it is not the MCP runtime. |
| Realtime | Operational state changes should not require manual refresh. |
| Deploy discipline | Validate before consuming production/Vercel deployments. |

---

## 21. Final Acceptance Checklist

- [ ] No screen depends on `mockData` for production success paths.
- [ ] No service action is ambiguous about which `serviceId` it targets.
- [ ] Client and Provider can complete the real lifecycle end to end.
- [ ] GPS arrival cannot advance on invalid/unavailable data.
- [ ] Hugo can complete the same request flow as typed UI, including real location capture.
- [ ] Hugo MCP tools are explicit, typed, service-scoped and cannot bypass backend authorization/RLS.
- [x] `ugo_get_current_job` implements a user-session/RLS-bound read path with explicit role/ownership and multi-service ambiguity handling.
- [ ] Remaining MCP read paths are verified before mutating tools are enabled; mutation paths enforce role, ownership, lifecycle, idempotency and required GPS/payment checks.
- [ ] MCP changes pass the dedicated GitHub Actions validation gate before integration.
- [ ] Admin receives operational updates without refresh.
- [ ] Cash/debt and provider blocking rule are enforced server-side.
- [ ] Client rating works after completion; provider rating path is consistent with policy.
- [ ] History includes evidence and relevant service milestones.
- [ ] Every critical async screen has loading/empty/error/offline/retry behavior.
- [ ] Build, tests, authorization isolation and mobile QA pass before production release.

> **FINAL CTO STANDARD:** UGO is ready for a real customer only when the complete operational loop works with real identities, real state, real location, real authorization and recoverable failures. A polished prototype is not production readiness.

---

**END OF MASTER SPECIFICATION — UGO — 24 SEPTEMBER 2026**
