# UGO — Frontend Premium Consolidation Design

**Date:** 2026-09-20  
**Status:** proposed design for implementation  
**Repository:** `sebastisnzoth/ugo-admin-panel`  
**Scope:** Cliente · Proveedor · Admin · shared design system  
**Authoritative business/UX sources:** `UGO_PLAN_MAESTRO_UX_FLUJOS_VALIDADO.md`, `docs/UGO_UIUX_MAESTRO.md`, `docs/UGO_MAESTRO_USABILIDAD_ECOSISTEMA.md`, `DESIGN.md`.

## 1. Intent

UGO already has the correct product direction: one operational transaction with two faces, a client experience centered on “¿Qué necesitás?”, a provider experience centered on “¿Qué hago ahora?”, and an admin experience centered on operational control.

The problem to solve is not another visual redesign. It is consolidation. The current frontend contains multiple generations of CSS and prototype surfaces that can override each other, causing unreadable text, inconsistent spacing, duplicated visual languages, and regressions when one screen is fixed.

Success means:

- Cliente, Proveedor and Admin look like one product family;
- every critical mobile control is legible and touchable at 360–430 px;
- the map remains useful context rather than decorative noise;
- Hugo remains the recognizable assistant without competing with the primary action;
- screens consume canonical `--ugo-*` tokens instead of inventing parallel systems;
- legacy demo/prototype routes cannot be confused with real production operation;
- changes do not alter Supabase lifecycle, payment, matching, authorization or business rules.

## 2. Design direction

Keep the existing **Kinetic Trust** identity from `DESIGN.md`.

The visual signature remains:

> tactile service surfaces floating over live geographic/operational context.

Use emerald for verified/primary actions, cyan for Hugo/conversational assistance, blue for geographic context, pale cool surfaces for hierarchy, and restrained elevation. Avoid introducing a new palette, heavy neon, decorative gradients, or another visual “theme”.

Typography remains Plus Jakarta Sans with the existing fallbacks. Operational text must not depend on tiny 8–10 px copy. Body and actionable supporting text should default to the documented readable sizes, with 12 px as the practical floor for relevant information.

## 3. Canonical ownership

### Tokens

`DESIGN.md` is the durable visual contract.  
`src/mvp/ugo-design-system.css` is the canonical runtime token source.

New or migrated Cliente/Proveedor/Admin CSS must consume semantic `--ugo-*` variables. Screen-specific aliases are allowed only when they map directly to canonical UGO tokens and represent a real role-specific semantic need.

### Shared primitives

Existing shared UGO primitives own buttons, icon buttons, fields, search, cards, badges, states, sheets, drawers, modals and navigation behavior where applicable.

A screen may style composition and hierarchy, but must not recreate an equivalent foundational primitive solely for cosmetic differences.

### UX behavior

A new root-level `UX-CONTRACT.md` will document observable frontend behavior only: navigation, search, state presentation, dialogs, recovery, focus, touch targets and route/prototype policy. It will reference—not duplicate—the authoritative business documents above.

## 4. Client consolidation

### Home

Preserve the new Home architecture:

- location and context;
- dominant “¿Qué necesitás?” intent;
- active service resumption;
- search;
- Hugo entry;
- categories;
- live map with real provider data.

Correct the current implementation to canonical tokens and production accessibility:

- replace hard-coded greens/surfaces/radii with `--ugo-*` tokens;
- raise tiny operational copy to readable sizes;
- ensure actionable targets are at least 48 px;
- add an explicit accessible search-clear button when the query is non-empty;
- preserve focus and keyboard behavior;
- keep the map fallback textual and keep ordering possible even if the map fails.

### CSS consolidation

The Client root currently imports many historical sheets. Do not delete them in a blind sweep.

Migration strategy:

1. identify selectors that still affect current Client routes;
2. move current Home/navigation/guided-flow behavior to canonical sheets;
3. remove or stop importing legacy sheets only when they have no live consumers;
4. keep a temporary compatibility sheet only when necessary and document why;
5. no new `*-fix`, `*-lock`, or `*-redesign` file for this consolidation.

This prevents another layer from being added to the cascade.

## 5. Provider consolidation

Preserve the provider’s stronger operational personality, including the mission-focused card and clear “next action” hierarchy.

However:

- map `--pro-*` aliases to canonical `--ugo-*` roles instead of maintaining a separate palette;
- use the shared UGO radius, spacing, focus and touch-target values;
- keep lime/cyan only as deliberate role accents derived from UGO semantic colors;
- preserve the provider flow: see problem → accept → go → start → resolve → finish;
- do not change scheduling, concurrent/future job rules, payouts or cash-debt accounting in this visual pass.

## 6. Admin consolidation

Admin remains denser than Cliente/Proveedor but must still be readable.

Changes:

- raise critical labels that currently rely on 9–10 px text;
- use canonical surface, text, border, focus and status tokens;
- preserve the left desktop navigation and bottom mobile navigation;
- keep operational map, people, finance and settings workflows unchanged;
- correct tab semantics: either implement complete tab keyboard behavior or use normal button/navigation semantics when the UI is only acting as a view switcher;
- preserve the improved map-filter contrast already applied.

## 7. Prototype and legacy route policy

`?app=web` currently exposes a prototype using hard-coded names, prices, ETAs and statuses. It must not be visually indistinguishable from real UGO operation.

Implementation policy:

- production entry points must not route ordinary users into that prototype;
- if retained for development/reference, it must display a persistent “DEMO / datos ficticios” boundary and must never be presented as live production state;
- no fake provider, payment, ETA or service data may appear inside the real Cliente/Proveedor/Admin routes.

## 8. UX contract to add

Create root `UX-CONTRACT.md` with these canonical behaviors:

- route ownership and document-title policy;
- Cliente search: clear action, focus behavior, local filtering;
- primary action naming consistency;
- loading / empty / no-results / error / degraded states;
- focus-visible and 48 px touch target baseline;
- map fallback and geolocation denial behavior;
- dialog/sheet behavior and no browser `alert/confirm/prompt`;
- mobile bottom navigation and desktop shell behavior;
- service-active priority;
- prototype/demo boundary;
- feedback vocabulary;
- form validation ownership;
- scrollbar baseline;
- reduced-motion behavior.

No business lifecycle rule is invented there; business rules are referenced to the maintained masters.

## 9. Responsive contract

Primary mobile reference remains 390×844, with required resilience from 360–430 px.

### Client

- single-column content;
- map height bounded so it does not push the primary request action below an unreasonable first viewport;
- active service card appears before exploratory categories;
- persistent navigation and Hugo controls respect safe areas.

### Provider

- one dominant mission card and one primary action;
- bottom navigation does not cover content or mission actions;
- future/agenda work remains reachable without obscuring the active job.

### Admin

- bottom navigation on narrow widths;
- horizontally dense operational view-switchers may scroll, but scrollbars/overflow cues remain discoverable;
- tables retain their own overflow without clipping sibling panels.

Desktop may use wider composition, but must not create a separate product language.

## 10. Accessibility and interaction

Target WCAG 2.2 AA.

Required in the touched surfaces:

- semantic buttons/links;
- visible `:focus-visible`;
- 48 px target baseline for primary touch interactions;
- icon-only controls have accessible names;
- color is never the sole status indicator;
- reduced motion is respected;
- search clear is keyboard accessible;
- no critical information is available only on hover;
- map failure does not block service ordering;
- text does not depend on sub-12 px critical labels.

## 11. Implementation boundaries

This consolidation does **not** change:

- Supabase schema or RLS;
- service lifecycle/state transitions;
- payment business rules;
- provider matching logic;
- Hugo/Gemini intent interpretation;
- ratings lifecycle;
- admin permissions;
- integrations with Uber/iFood/Rappi.

Any discovered functional bug in those areas is recorded separately unless it prevents the frontend from rendering safely.

## 12. Verification

Every implementation batch must be proven with:

1. TypeScript and production build;
2. existing UGO Core CI;
3. relevant contract tests;
4. static premium UI audit when a local checkout is available;
5. search for native `alert/confirm/prompt`, non-semantic click targets and new duplicate visual constants;
6. browser inspection at 390×844 and desktop for Cliente, Proveedor and Admin when browser automation is available;
7. keyboard focus and search-clear checks;
8. map success plus map-error/degraded fallback;
9. reduced-motion inspection;
10. Vercel deployment status and runtime-error check.

## 13. Delivery sequence

Implement in bounded, reversible batches:

1. **Contract + shared baseline** — add `UX-CONTRACT.md`, scrollbar/focus/readability baseline, and token mapping.
2. **Cliente** — canonicalize Home/map/search and reduce live cascade conflicts.
3. **Proveedor** — map visual aliases to UGO tokens and normalize controls.
4. **Admin** — improve readability and view-switcher semantics without changing operations.
5. **Legacy/demo boundary** — isolate `?app=web` from production semantics.
6. **Cleanup** — remove imports only after proving no live consumer needs them.

Each batch must keep the app deployable and must not depend on a big-bang rewrite.

## 14. Acceptance criteria

The consolidation is complete when:

- Cliente, Proveedor and Admin visibly share the UGO design language;
- current critical screens no longer require competing “fix/lock” layers to remain legible;
- current touched UI consumes canonical tokens;
- critical mobile text and actions are readable/touchable;
- the Cliente search has explicit clear behavior;
- the map has usable success and degraded states;
- Admin view switching is semantically coherent;
- legacy/demo data cannot be mistaken for production data;
- `UX-CONTRACT.md` exists and reflects the maintained product masters;
- CI/build/tests pass for the final commit;
- production deployment is verified without new runtime errors.
