# UGO Frontend Premium Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Unify Cliente, Proveedor, Admin and the legacy demo under canonical UGO UI without changing lifecycle, payments, matching, permissions or Hugo logic.

**Architecture:** `DESIGN.md` owns durable visual intent; `src/mvp/ugo-design-system.css` owns runtime tokens. Role screens keep their composition but derive color/type/spacing/radius/focus/touch behavior from `--ugo-*`. Work stays on `main` per repo governance.

**Tech Stack:** React 19, TypeScript 6, Vite 8, CSS, MapLibre, Supabase, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-20-ugo-frontend-premium-consolidation-design.md`

## Global Constraints
- Kinetic Trust stays.
- 390×844 reference; 360–430 px resilience.
- WCAG 2.2 AA; touch targets ≥48 px.
- No new `*-fix`, `*-lock`, `*-redesign` CSS.
- Map/geolocation failure never blocks ordering.
- Do not alter Supabase schema/RLS, lifecycle, payment, matching, Hugo intent, ratings, admin permissions or integrations.
- `?app=web` must be clearly fictitious demo data.

## Review Focus
1. Map failure keeps Hugo/request usable.
2. Search clear refocuses and triggers no order.
3. Active provider work does not hide permitted future work.
4. Admin switchers do not claim incomplete ARIA tabs.
5. `?app=web` shows a persistent demo boundary before fake data.

---

### Task 1: UX Contract + Shared Baseline

**Files**
- Create `UX-CONTRACT.md`
- Modify `src/mvp/ugo-design-system.css`
- Create `tests/contracts/frontend-premium-consolidation.test.mjs`

- [ ] Write RED test:

```js
import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('premium contract and tokens exist',async()=>{
 const[ux,css]=await Promise.all([read('UX-CONTRACT.md'),read('src/mvp/ugo-design-system.css')])
 assert.match(ux,/UGO — UX Contract/);assert.match(ux,/WCAG 2\.2 AA/);assert.match(ux,/48 px/);assert.match(ux,/Mapa degradado/);assert.match(ux,/DEMO · DATOS FICTICIOS/)
 for(const x of['--ugo-font-caption:12px','--ugo-font-body:14px','--ugo-font-title:16px','--ugo-scrollbar-thumb:'])assert.ok(css.includes(x),x)
 assert.match(css,/scrollbar-color:var\(--ugo-scrollbar-thumb\)/)
})
```

Run `node --test tests/contracts/frontend-premium-consolidation.test.mjs` → FAIL.

- [ ] Add in `:root`:

```css
--ugo-font-caption:12px;--ugo-font-body:14px;--ugo-font-title:16px;
--ugo-scrollbar-thumb:color-mix(in srgb,var(--ugo-color-outline) 72%,transparent);
--ugo-scrollbar-thumb-hover:var(--ugo-color-on-surface-variant);
--ugo-scrollbar-track:color-mix(in srgb,var(--ugo-color-surface-container) 76%,transparent);
```

Add global document scrollbar baseline with `scrollbar-color`, `scrollbar-width:thin`, WebKit track/thumb, hover and forced-colors fallback.

- [ ] Create `UX-CONTRACT.md` stating: runtime ownership above; WCAG 2.2 AA; 48 px baseline; Cliente search clear/refocus; **Mapa degradado** never blocks ordering; Provider active work does not hide permitted future work; Admin uses complete semantics; no native `alert/confirm/prompt`; `?app=web` displays **DEMO · DATOS FICTICIOS**; 390×844 + 360–430; reduced motion. Reference the three maintained UGO master UX documents.

- [ ] Run GREEN and commit:

```bash
node --test tests/contracts/frontend-premium-consolidation.test.mjs
git add UX-CONTRACT.md src/mvp/ugo-design-system.css tests/contracts/frontend-premium-consolidation.test.mjs
git commit -m "docs(ui): establish premium UX contract"
```

---

### Task 2: Cliente Home / Search / Map

**Files**
- Modify `src/mvp/client/ClientHomeScreen.tsx`
- Modify `src/mvp/client/client-home-screen.css`
- Modify `src/mvp/client/ClientRoot.tsx`
- Create `tests/contracts/client-home-premium-consolidation.test.mjs`

- [ ] RED test must assert:
  - `aria-label="Limpiar búsqueda"`;
  - `setQuery('')` and `searchRef.current?.focus()`;
  - existing map fallback `Podés pedir el servicio igual`;
  - `Pedíselo a Hugo` remains;
  - CSS contains `var(--ugo-color-primary)`, `var(--ugo-color-on-surface)`, `var(--ugo-touch-target)`, `var(--ugo-font-caption)`;
  - CSS no longer contains `#087d63|#102335|#0b1c30`;
  - `ClientRoot.tsx` loads `client-home-screen.css` after `client-desktop-shell-fixes.css`.

Run `node --test tests/contracts/client-home-premium-consolidation.test.mjs` → FAIL.

- [ ] Add inside `.ugo-home-search`:

```tsx
{query&&<button type="button" className="ugo-home-search-clear" aria-label="Limpiar búsqueda"
 onClick={e=>{e.preventDefault();setQuery('');setShowAll(false);searchRef.current?.focus()}}>×</button>}
```

Add `aria-label="Buscar servicio"` to the input. Clearing does not navigate or publish a Hugo intent.

- [ ] Replace Home hard-coded palette with UGO semantic tokens; card 26/28 px radii → `--ugo-radius-xl`; operational 8–10 px labels → `--ugo-font-caption`; primary actions/clear → `--ugo-touch-target`. Style `.ugo-home-search-clear` as a 48 px circular transparent button with canonical focus ring.

- [ ] Remove the Home CSS import from `ClientHomeScreen.tsx`; import it last in `ClientRoot.tsx` after `client-desktop-shell-fixes.css`.

- [ ] Verify and commit:

```bash
node --test tests/contracts/client-home-premium-consolidation.test.mjs tests/contracts/client-hugo-orb-home-order.test.mjs tests/contracts/client-provider-radar-recovery.test.mjs tests/contracts/client-single-active-service.test.mjs
git add src/mvp/client/ClientHomeScreen.tsx src/mvp/client/client-home-screen.css src/mvp/client/ClientRoot.tsx tests/contracts/client-home-premium-consolidation.test.mjs
git commit -m "style(client): consolidate premium home"
```

---

### Task 3: Provider → Canonical UGO Tokens

**Files**
- Modify `src/mvp/provider/provider-redesign-2026.css`
- Create `tests/contracts/provider-premium-consolidation.test.mjs`

- [ ] RED test asserts provider aliases use `--ugo-color-on-surface`, `--ugo-color-primary`, `--ugo-color-secondary-container`, `--ugo-color-error`; raw `--pro-green:#`, `--pro-cyan:#`, `--pro-danger:#` disappear; `ProviderHome.tsx` still contains `d.service&&d.opportunities.length>0`, `Podés aceptar otro`, and `openAgenda`.

- [ ] Replace alias block with:

```css
--pro-ink:var(--ugo-color-on-surface);
--pro-ink-soft:var(--ugo-color-on-surface-variant);
--pro-green:var(--ugo-color-primary);
--pro-green-dark:color-mix(in srgb,var(--ugo-color-primary) 86%,black);
--pro-mint:color-mix(in srgb,var(--ugo-color-primary-container) 14%,var(--ugo-color-surface-lowest));
--pro-lime:var(--ugo-color-primary-container);
--pro-cyan:var(--ugo-color-secondary-container);
--pro-paper:var(--ugo-color-surface-lowest);
--pro-canvas:var(--ugo-color-surface);
--pro-muted:var(--ugo-color-on-surface-variant);
--pro-line:var(--ugo-color-outline-variant);
--pro-danger:var(--ugo-color-error);
```

Move actionable controls below 48 px to `min-height:var(--ugo-touch-target)` and map role radii to UGO radius tokens. Do not touch Provider TSX business logic.

- [ ] Verify and commit:

```bash
node --test tests/contracts/provider-premium-consolidation.test.mjs tests/contracts/provider-navigation-ux.test.mjs tests/contracts/provider-scheduled-navigation.test.mjs tests/contracts/provider-single-active-assignment.test.mjs
git add src/mvp/provider/provider-redesign-2026.css tests/contracts/provider-premium-consolidation.test.mjs
git commit -m "style(provider): align role UI with UGO tokens"
```

---

### Task 4: Admin Readability + Semantics

**Files**
- Modify `src/mvp/AdminPhase2.tsx`
- Modify `src/mvp/admin-phase2.css`
- Modify `src/mvp/admin-home-stitch.css`
- Modify `src/mvp/admin-uiux-final.css`
- Create `tests/contracts/admin-premium-navigation.test.mjs`

- [ ] RED test asserts no `role="tab"`, `role="tablist"` or `aria-selected`; Operaciones/Personas/Finanzas/Configuración wrappers have `role="group"`; active buttons have `aria-pressed`; Admin CSS uses `--ugo-font-caption`; no `font-size:7px`.

- [ ] Convert those four view switchers to normal button groups. Preserve every current setter, label, badge and active class. Use `aria-pressed={sameBooleanAsActiveClass}`.

- [ ] Raise critical nav/operational labels to `var(--ugo-font-caption)`. On mobile replace compressed six-column bottom nav with a horizontal rail:

```css
.ugo-admin2-sidebar nav{height:68px;display:flex;gap:4px;overflow-x:auto;scrollbar-gutter:stable}
.ugo-admin2-sidebar nav button{flex:0 0 76px;min-height:64px}
.ugo-admin2-sidebar nav button span{font-size:var(--ugo-font-caption)}
```

Use the caption token for `.ahs-eyebrow`, `.ahs-map-meta`, `.ahs-service-row` and KPI small labels. Remove the 7 px override; change Admin focus selector from `[role="tab"]` to `[role="group"] button`.

- [ ] Verify and commit:

```bash
node --test tests/contracts/admin-premium-navigation.test.mjs tests/contracts/admin-uiux-truthful-state.test.mjs tests/contracts/admin-map-scout-repair.test.mjs tests/contracts/admin-complete-trace.test.mjs
git add src/mvp/AdminPhase2.tsx src/mvp/admin-phase2.css src/mvp/admin-home-stitch.css src/mvp/admin-uiux-final.css tests/contracts/admin-premium-navigation.test.mjs
git commit -m "style(admin): improve readable operational navigation"
```

---

### Task 5: Persistent Demo Boundary

**Files**
- Create `src/mvp/UgoDemoBoundary.tsx`
- Create `src/mvp/ugo-demo-boundary.css`
- Modify `src/mvp/MvpApp.tsx`
- Modify `tests/contracts/test-demo-flow.test.mjs`

- [ ] Extend test to require `app==='web'` to wrap `UgoWeb` in `UgoDemoBoundary`, and the component to contain `role="status"`, **DEMO · DATOS FICTICIOS**, and `No representa la operación real de UGO.` Run test → FAIL.

- [ ] Create:

```tsx
import React from'react'
import'./ugo-demo-boundary.css'
export function UgoDemoBoundary({children}:{children:React.ReactNode}){
 return <div className="ugo-demo-boundary"><div className="ugo-demo-boundary-banner" role="status" aria-label="Entorno de demostración"><strong>DEMO · DATOS FICTICIOS</strong><span>No representa la operación real de UGO.</span></div>{children}</div>
}
```

Style banner sticky, ≥48 px, with UGO warning/surface/text tokens.

- [ ] Lazy-load it in `MvpApp.tsx`; only replace the `app==='web'` route with `<UgoDemoBoundary><UgoWeb/></UgoDemoBoundary>`. Do not wrap client/provider/admin.

- [ ] Verify and commit:

```bash
node --test tests/contracts/test-demo-flow.test.mjs tests/contracts/demo-payment-guard.test.mjs tests/contracts/test-environment-isolation.test.mjs
git add src/mvp/UgoDemoBoundary.tsx src/mvp/ugo-demo-boundary.css src/mvp/MvpApp.tsx tests/contracts/test-demo-flow.test.mjs
git commit -m "fix(demo): isolate fictitious legacy web route"
```

---

### Task 6: Freeze CSS Proliferation

**Files**
- Create `docs/UGO_CSS_MIGRATION_LEDGER.md`
- Modify `tests/contracts/frontend-premium-consolidation.test.mjs`

- [ ] Add a RED test requiring the ledger to mention `client-ai-studio-final-lock.css`, `client-real-test-fixes.css`, and `Retiro sólo con evidencia de consumidor cero`.

- [ ] Create ledger naming canonical owners: global `ugo-design-system.css`; Cliente Home `client-home-screen.css`; Cliente shell `client-persistent-header.css` + `client-desktop-shell-fixes.css`; Provider `provider-redesign-2026.css`; Admin `admin-phase2.css` + `admin-home-stitch.css` + `admin-uiux-final.css`. Freeze existing historical Cliente `visual-polish`, `guided-request-redesign`, `ai-studio-*-lock/ops/complete`, `real-test-fixes`, `flow-reference-2026` from gaining new cross-screen responsibilities. Retirement requires selector search + relevant tests + build + browser proof.

- [ ] Run test GREEN and commit `docs(ui): freeze legacy CSS proliferation`.

---

### Task 7: Full Verification + Sentinel + Publish

- [ ] Focused premium contracts all pass.
- [ ] Run `npm run build`, `npm test`, `npm run lint`; all exit 0.
- [ ] If a checkout is available, run Frontend Design Premium strict audit; otherwise explicitly report it unavailable.
- [ ] Browser verify when available: Cliente at 390×844 + desktop (search clear/refocus, normal/degraded map); Provider mobile (active + future work); Admin desktop+narrow (readable rail/groups); `?app=web` banner; keyboard focus; reduced motion.
- [ ] Consult Sentinel for current P0/P1 evidence around `CLIENT-ORDER-OPEN`, `MATCH-ONLINE`, `client.provider_radar.sync`, request/matching, provider availability/navigation and Admin operational UI. Do not invent live status.
- [ ] Verify final `main`: UGO Core CI `success`, Vercel production `READY`, and runtime-errors query for latest deployment/24h.
- [ ] Final acceptance: canonical tokens on touched surfaces; clear search/refocus; degraded map orders; Provider active+future preserved; Admin readable/semantic; legacy web marked DEMO; `UX-CONTRACT.md` present; no new patch stylesheet; fresh build/test/lint/CI/deploy evidence.
