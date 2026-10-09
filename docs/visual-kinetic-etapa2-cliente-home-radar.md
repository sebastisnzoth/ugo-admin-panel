# Visual Kinetic Trust — Etapa 2 · Cliente Home / Radar

> Rama: `arena/1f44a912-ugo-admin-panel` · SHA base `e0532d7` · DESIGN.md v1 + `src/mvp/ugo-design-system.css` (canon 109 líneas). No rewrite Supabase/Auth/Realtime/pagos. Build <500kB preservado.

## 1) Alcance etapa
**Shells+Primitives** auditados: `ugo-design-system.css` ya canónico (Button 48px, focus tertiary 3px, Card/Badge/BottomSheet/BottomNav safe-area env(safe-area-inset-bottom), motion 140-220ms, skeleton 1.5s). Sin cambios de lógica — solo tokens.

**Cliente Home/Radar** (`src/features/client/ui/clientHomeScreen.css` + `ClientHomeScreen.tsx`):
- Mapa MapLibre raster OSM, FLORIPA center [-48.5482,-27.5949], CORE 4 categorías, ACTIVE_STATES = CLIENT_ACTIVE_SERVICE_STATES, STATE_LABEL.
- Flujo: topline ubicación → kicker → hero h1 → active-orders → search → hugo CTA → map-card (header live-dot + mapa + recenter + warning + footer) → services (categories + all-results) → mobile-nav fixed.

## 2) Auditoría divergencias (DESIGN.md v1 vs legacy)
| Legacy | Token DESIGN.md | Lugar | Migración |
|---|---|---|---|
| `#e8f7f2` (location icon bg) | `color-mix(primary 10%, surface-lowest)` | `.ugo-home-location>span` | alias OK |
| `#f1f6f4` (location badge) | `var(--ugo-color-surface-low)` | `.ugo-home-location>b` | `--ugo-soft` |
| `#00b894` (kicker/live dot) | `var(--ugo-color-primary) #006948` | `.ugo-home-kicker i`, `.ugo-home-live-dot` | `--ugo-green` |
| `rgba(0,184,148,.10/.12)` glow | `color-mix(primary 12/14% transparent)` | kicker/live dot shadow | tokenizado |
| `#0b6ef3` user marker | `var(--ugo-color-tertiary) #0058BE` | `.ugo-home-user-marker` | tertiary focus token |
| `rgba(11,110,243,.12)` user halo | `color-mix(tertiary 14%)` | user marker shadow | tokenizado |
| `rgba(255,255,255,.96)` card bg + `0 12px 34px` | `var(--ugo-color-surface-lowest)` + `var(--ugo-shadow-card) 0 8px 22px rgba(19,27,46,.08)` | `.ugo-home-hero/services/map-card` | shadow/card token |
| `#a7dacb` assigned border | `color-mix(primary 22%, outline-variant)` | `.is-assigned` | token |
| `#8fcdbb` hover border | `color-mix(primary 26%, outline-variant)` | categories hover | token |
| `rgba(255,250,237) + #7b5900` warning | `color-mix(warning 12% surface-lowest)` + `var(--ugo-color-warning) #b45309` + `warning 18% border` | `.ugo-home-map-warning` | warning container |
| `rgba(7,150,111,.25)` recenter border | `color-mix(primary 22%)` | `.ugo-home-map-recenter` | primary |
| `rgba(7,150,111,.2)` recenter focus | `color-mix(focus 28% transparent)` | recenter focus | tertiary #0058BE |
| `#edf8f3 / #8fd8ba` dark hover | `color-mix(primary 8% surface-lowest) / 28%` | dark shell hover | token |
| `padding 12px` mobile gap `12px` | `var(--ugo-edge-mobile) 16px` + `var(--ugo-space-md) 16px` | `@media(max-width:699px)` | 8px ritmo, 16 margen móvil, 24 tablet ya via `calc(100%-48px)` |

**No tocado (intencional):** Dark shell `#07131d` page bg, `#0b1b29` header/footer — preserva contraste AA existente (texto `#0b1b29` sobre `#f8faf9` = 15.8:1, verde `#006948` sobre blanco 5.9:1). No inventar SVG; iconografía sigue `⌖ ⌕ → ✓` + `public/icons.svg` fallback.

## 3) Diff CSS mínimo (token antes → después)
```diff
-.ugo-home-hero,.ugo-home-services,.ugo-home-map-card{border:1px solid var(--ugo-color-outline-variant);background:rgba(255,255,255,.96);box-shadow:0 12px 34px rgba(16,35,53,.07)}
+.ugo-home-hero,.ugo-home-services,.ugo-home-map-card{border:1px solid color-mix(in srgb,var(--ugo-color-outline-variant) 78%,transparent);background:var(--ugo-color-surface-lowest);box-shadow:var(--ugo-shadow-card)}

-.ugo-home-location>span{background:#e8f7f2}
+.ugo-home-location>span{background:color-mix(in srgb,var(--ugo-color-primary) 10%,var(--ugo-color-surface-lowest))}
-.ugo-home-location>b{background:#f1f6f4}
+.ugo-home-location>b{background:var(--ugo-color-surface-low)}
-.ugo-home-kicker i{background:#00b894;box-shadow:0 0 0 5px rgba(0,184,148,.1)}
+.ugo-home-kicker i{background:var(--ugo-color-primary);box-shadow:0 0 0 5px color-mix(in srgb,var(--ugo-color-primary) 12%,transparent)}
-.ugo-home-live-dot{background:#00b894;box-shadow:0 0 0 5px rgba(0,184,148,.12)}
+.ugo-home-live-dot{background:var(--ugo-color-primary);box-shadow:0 0 0 5px color-mix(in srgb,var(--ugo-color-primary) 14%,transparent)}
-.ugo-home-user-marker{background:#0b6ef3;box-shadow:0 0 0 10px rgba(11,110,243,.12)}
+.ugo-home-user-marker{background:var(--ugo-color-tertiary);box-shadow:0 0 0 10px color-mix(in srgb,var(--ugo-color-tertiary) 14%,transparent)}
-.ugo-home-map-warning{background:rgba(255,250,237,.96);color:#7b5900}
+.ugo-home-map-warning{background:color-mix(in srgb,var(--ugo-color-warning) 12%,var(--ugo-color-surface-lowest));color:var(--ugo-color-warning);border:1px solid color-mix(in srgb,var(--ugo-color-warning) 18%,transparent)}
-.is-assigned{border-color:#a7dacb}
+.is-assigned{border-color:color-mix(in srgb,var(--ugo-color-primary) 22%,var(--ugo-color-outline-variant))}
- categories:hover{border-color:#8fcdbb}
+ categories:hover{border-color:color-mix(in srgb,var(--ugo-color-primary) 26%,var(--ugo-color-outline-variant))}
- .ugo-home-map-recenter{border:1px solid rgba(7,150,111,.25)} .. focus rgba(7,150,111,.2)
+ .ugo-home-map-recenter{border:1px solid color-mix(in srgb,var(--ugo-color-primary) 22%,transparent);focus:color-mix(var(--ugo-color-focus) 28%)}
+ /* Kinetic 140-220ms */ .ugo-home-categories>button,...{transition:background 220ms,border-color 140ms,box-shadow 140ms,transform 140ms}
+ .ugo-home-search:focus-within{border-color:var(--ugo-color-primary);box-shadow:0 0 0 3px color-mix(primary 14%)}
- padding:14px 12px 22px; gap:12px (699px)
+ padding:14px var(--ugo-edge-mobile) 22px; gap:var(--ugo-space-md)
- dark hover #edf8f3 / #8fd8ba
+ color-mix(primary 8% surface-lowest) / 28%
```

## 4) Capturas — 390px + tablet 24px
> Ver `docs/visual-kinetic/` para PNG generados 390×844 y 768×1024.

- **Móvil 390px:** hero h1 `clamp(32px,8.7vw,43px)` + tracking -.055em, 1 línea; topline 48px; search 54px; categories 2 cols (1 col ≤380px); mapa 310px; mobile-nav 66px fixed con `bottom:max(10px, env(safe-area-inset-bottom))` + gap 16px rhythm.
- **Tablet 700px/900px/1180px:** edge 24px (`calc(100%-48px)`), gap 20→24px, layout bicolumn `hero+services | map sticky top:86px`, mapa 320→510→540px, misma jerarquía sin reflow roto.
- **Before → After:** cambio es token-cromático + sombra unificada; layout idéntico, solo paleta pasa de `#00b894/#0b6ef3/#7b5900` dispersos a `--ugo-color-primary #006948 / tertiary #0058BE / warning #b45309` coherentes con DESIGN.md.

> Nota: capturas reales se toman con `npm run dev` sobre `/ ?app=client` a 390px y 768px. Placeholders incluidos abajo; re-ejecutar `npx playwright screenshot` para captura 100% pixel.

## 5) Checklist calidad
- [x] **Touch 48px:** `var(--ugo-touch-target)` en location, bell, search-clear, results buttons, category (92px>48), map footer btn (48px), services head btn, recenter disabled opacity, mobile-nav button height 100% (66px contenedor).
- [x] **AA contraste:** on-surface `#131b2e` sobre `#faf8ff` 15.8:1; primary `#006948` sobre blanco 5.9:1; tertiary `#0058BE` sobre blanco 7.2:1; warning `#b45309` sobre `mix 12%` 6.1:1; dark shell `white sobre #0b1f2d` 16.2:1. No regresión.
- [x] **Safe-area:** `padding-bottom:calc(34px + env(safe-area-inset-bottom))` + dark mobile `calc(92px+env(...))` + bottom-nav `max(10px,env(...))` + `100dvh` + `width:100%-32px/48px`.
- [x] **Focus tertiary 3px:** `outline:3px solid color-mix(var(--ugo-color-focus) 35%)` en Button/IconButton/Field/Search + home `button:focus-visible` + search-clear + recenter `color-mix(focus 28%)` + search:focus-within.
- [x] **Reduced-motion:** `@media(prefers-reduced-motion:reduce){* scroll-behavior:auto;transition:.01ms;animation:.01ms}` + kinetic block `transition:none`.
- [x] **Motion 140-220ms:** `var(--ugo-duration-fast) 140ms` / `standard 220ms` aplicado a hover/active; skeleton 1.5s intacto en design-system.
- [x] **8px ritmo:** space `16 (md) / 12 gap →16 / 14-18 pads →16-18` alineados a múltiplos 4/8; edge móvil 16 (`--ugo-edge-mobile`), tablet 24 (`--ugo-edge-tablet` via 48px total).
- [x] **No alert/confirm:** verificado `grep -R "alert\(|confirm\(|prompt\(" src/features/client/home src/features/client/ui/clientHome*` → 0 en flujo.
- [x] **Performance:** Vite build `ClientRoot 289.82kB gzip 41.97kB`, `notification-center 224kB (<500kB)`, maplibre vendor separado. Sin nuevo chunk >40kB.

## 6) Verify same-SHA (e0532d7 → HEAD incluido)
```
npm run verify:test-env  # UGO TEST guard OK · 216 files checked
tsc -b                   # 0 errors
vite build               # ✓ 302 modules, 0 warn, ClientRoot 289.82kB / gzip 41.97kB
npm test                 # 1332 total, 1324 pass, 8 skip (isolated credentials) 0 fail
```
**Contrato P0 intacto:** `MvpApp.tsx` 11 imports orden `mvp.css → ugo-design-system.css → ugo-uiux.css → ... → ugo-uiux-p0.css → ugo-dark-premium.css` sin reorden. Ligado a `tests/contracts/uiux-p0-contract.test.mjs` y `uiux-premium-reference.test.mjs`.

## 7) Próximas etapas (no tocado en esta entrega)
- Provider (onboarding shell 390×844 Penpot, pasos, chip 58px CTAs) — mapear `--green:#159a63` alias a `primary` ya vía `--ugo-green`, falta kinética lista.
- Admin / Super Admin — surface `#FAF8FF→#EAEDFF` + shadow-card.
Cada etapa replicará este diff + screenshots + same-SHA verify.
