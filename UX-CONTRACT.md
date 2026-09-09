# UGO UX Contract

This contract defines observable application behavior for UGO Cliente, Proveedor and Admin surfaces. Business/domain/API rules remain authoritative for permissions, money, lifecycle and side effects.

## 1. Canonical interaction owners

| Capability | Canonical owner | Contract |
| --- | --- | --- |
| Buttons | Shared semantic button behavior / existing role components | Stable size; explicit verb; hover, focus-visible, active, disabled and busy states. |
| Status feedback | Shared `Notice` model, migrated toward one notification/live-region primitive | Success/info/error copy is user-readable; no raw backend messages. Inline corrective errors remain inline. |
| Forms | Existing role form surfaces, to be migrated to shared field behavior | Product validation is owned by UGO; preserve values; prevent duplicate submit; dirty forms require navigation protection. |
| Select/Listbox | Native select until UGO requires owned popup geometry | Native keyboard/locale behavior is accepted for current profile selects. |
| Scrollbar | Global `src/index.css` baseline | Visible, operable, inherited by product-owned scrolling surfaces. |
| Navigation | Role-specific bottom navigation | Same destination names and active semantics within each role; current item exposes `aria-current`. |
| Modal / confirmation | App-owned dialog/sheet only | Never use browser `alert`, `confirm` or `prompt`. |
| Service lifecycle | Domain RPC + role UI | UI exposes only valid next actions; payment/security gates are never bypassed client-side. |

## 2. Provider navigation

Canonical provider destinations are:

- **Radar** — current availability, nearby demand, active mission and Hugo entry point.
- **Trabajos** — active and available work details.
- **Ganancias** — released and protected funds, payout controls.
- **Perfil** — professional profile and availability configuration.

Hugo is a persistent assistant affordance and must always be implemented as a semantic interactive control. Bottom navigation must respect `env(safe-area-inset-bottom)`.

Switching tabs must not discard server state. Local dirty form edits must be protected before a future refactor makes tab changes destructive to unsaved data.

## 3. Provider Radar behavior ledger

| Operation | Trigger | Pending | Success | Failure / recovery |
| --- | --- | --- | --- | --- |
| Go online/offline | Availability button | Button stays same size, disabled/busy | Presence label and radar state update; status announced | Keep prior state and show user-readable retry guidance |
| Center map | “Mi ubicación” | No layout movement | Map centers on current location | Keep workflow usable; show permission/retry guidance |
| Accept opportunity | “Aceptar trabajo” | Prevent duplicate activation | Opportunity closes/refreshes; mission acceptance announced | Keep opportunity actionable and explain retry |
| Reject opportunity | “Rechazar” | Prevent duplicate activation | Opportunity refreshes; rejection acknowledged | Keep opportunity actionable and explain retry |
| Advance active service | Explicit lifecycle CTA | CTA remains stable and busy | State/progress/next action refresh; success announced | Keep current state and explain retry |
| Open Hugo | Center navigation control | No destructive side effect | Assistant entry point remains in provider context | Radar remains usable if assistant service is unavailable |

The labels **Aceptar trabajo** and **Rechazar** are canonical for the provider opportunity decision. Do not use “Ignorar” for the same operation on another provider screen.

## 4. Service lifecycle and protected payment

Money and lifecycle are high-risk behavior. UI wording must reflect server truth rather than infer payment safety from appearance.

For an assigned service, the provider must not be offered or allowed to transition to `en_camino` until the existing domain condition for protected/funded payment is satisfied. The interface shows this as explicit text:

- **Pago protegido confirmado** — safe to continue according to the current domain contract.
- **Pago protegido pendiente** — do not begin travel/service based solely on the assignment.

Current provider progression is represented as: assigned → en camino → arrived → in progress → awaiting approval. Any future lifecycle change must update domain/API rules, this contract and all role surfaces together.

## 5. Async and feedback states

Every remote operation has four visible states where applicable: idle, pending, success and failure. Lists/content also account for loading, empty and no-results conditions.

- Never expose raw database, Supabase, RPC or stack-trace text to end users.
- Feedback uses stable live regions: `role="status"` for non-critical updates and `role="alert"` for errors requiring immediate attention.
- Pending state blocks duplicate mutations but does not resize or move the initiating control.
- A map/geolocation error does not hide opportunity/service information.
- Realtime refreshes must not silently overwrite a newer local mutation result.

## 6. Empty states

An empty state explains both what is true and what action is available.

Provider Radar:

- Online + no demand: say that there are no compatible opportunities now and that the radar will update.
- Offline: explain that demand is paused and offer **Activar disponibilidad**.

Do not use motivational filler in operational empty states.

## 7. Accessibility baseline

Target WCAG 2.2 AA.

- Use native `button` for actions and links for navigation where routes exist.
- Important touch controls target about 44×44 CSS px or larger.
- All interactive controls have an accessible name, visible `:focus-visible`, hover/pressed behavior and a non-interactive disabled state.
- Active navigation uses text plus state semantics; never color alone.
- Respect `prefers-reduced-motion`.
- Product-owned scrollbars stay visible and usable, with forced-colors fallback.
- Focus must not be hidden by bottom navigation, sheets or mobile safe areas.

## 8. Forms

When profile/data-entry surfaces are next migrated to the production UI system:

- wrap product forms with `noValidate` and own validation messages;
- keep real labels associated with every field;
- set `resize: none` on textareas and provide adequate/default expandable height;
- preserve entered non-sensitive values on server failure;
- focus/scroll to the first invalid field on submit;
- prevent duplicate save;
- protect dirty edits during in-app navigation;
- keep a long-form save action reachable without covering keyboard content.

Until that migration is complete, do not treat the current Provider Profile form as the canonical production form primitive.

## 9. Copy and locale

UGO interface copy uses plain, direct verbs and consistent destination/action names. Current provider-facing implementation is primarily Spanish while Brazilian currency/market data may use BRL formatting. A future locale layer must localize messages, dates, numbers, currency, validation and aria labels together; do not mix translations screen by screen.

## 10. Verification contract

For UI changes, verify at minimum:

1. TypeScript build and lint.
2. Radar online/offline, opportunity accept/reject and active-service progression.
3. Loading, empty and failure feedback.
4. Keyboard navigation/focus visibility.
5. Narrow mobile viewport and safe-area behavior.
6. Reduced-motion and forced-colors fallbacks where supported.
7. No browser dialogs, non-semantic click targets or raw backend errors in changed code.
8. Compare behavior and vocabulary against at least one sibling provider screen.

Failures are reported as unresolved risk; they are never silently treated as passing.
