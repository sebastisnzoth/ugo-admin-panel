# Visual Kinetic Trust — Etapa 3 · Provider + Admin

> Rama `arena/1f44a912-ugo-admin-panel` sobre `a8a5c9f` (etapa2 client) → HEAD provider/admin. DESIGN.md v1 canon, `ugo-design-system.css` 109 líneas `--ugo-*`. Sin rewrite Supabase/Auth/Realtime/pagos.

## Alcance
- **Provider:** `ugo-web-provider.css` (desktop 248px sidebar) + `provider-home-structural.css` (mobile 390×844 fijo 328+60+1fr) + `provider-production-shell.css` (canonical last layer) — tokenización completa.
- **Admin:** `admin-phase2.css` ya endurecido a tokens en hardening previo (línea 13 `var(--ugo-color-surface)` + contrast sections), verificado sin cambios mayores.

## Auditoría divergencias Provider
| Legacy | Token DESIGN.md | Lugar | Migración |
|---|---|---|---|
| `--green:#159a63` + `Source Sans Pro` | `var(--ugo-color-primary) #006948` + `var(--ugo-font) Plus Jakarta Sans` | `ugo-web-provider.css` header | alias directo |
| `--deep:#12322c`, `--ink:#17211f`, `--muted:#66736f` | `var(--ugo-color-on-surface) #131b2e` + `on-surface-variant #3d4a42` | ugo-web-provider vars | token |
| `--canvas:#f5f7f6` | `var(--ugo-color-surface) #faf8ff` | ugo-web-provider + structural | surface |
| `#087f5b` (structural brand/KPI/progress/CTA) | `var(--ugo-color-primary) #006948` | `provider-home-structural.css` | primary |
| `#172421` estructural ink | `var(--ugo-color-on-surface)` | structural home | ink |
| `#64706b/#52665c` muted | `var(--ugo-color-on-surface-variant)` | structural texts | variant |
| `#f3f5f3 / #edf1ee / #e3f3e9` soft | `var(--ugo-color-surface)` / `color-mix(primary 8% surface-lowest)` | sheet/brand KPI | surface-low/mix |
| `#dfe7e2/#e1e9e3` line | `color-mix(outline-variant 78% transparent) #bccac0` | structural nav/header | outline-variant |
| `#128c4a / #0b6f3a / #eef7f2` prod shell | `var(--ugo-color-primary) #006948` / `color-mix 88% black` / `color-mix 8%` | `provider-production-shell.css` | primary |
| `Inter Tight` | `var(--ugo-font) "Plus Jakarta Sans","Inter Tight",...` | structural + prod shell | font token |
| 40-44px CTA | `var(--ugo-touch-target) 48px` | structural-actions/cta, bottom-nav | touch 48 |
| focus `#087f5b 32%` | `var(--ugo-color-focus) #0058BE 35% 3px` | kinetic block | tertiary |
| motion `.16s` arbitrario | `var(--ugo-duration-fast)140ms / standard 220ms` | kinetic | motion |

Admin: `#f4f6f8/#101828 Inter` overridden line 13 por `var(--ugo-color-surface)/var(--ugo-color-on-surface)/var(--ugo-font)!important` + sections `surface-lowest + shadow-card + focus tertiary 28%` — ya Kinetic.

## Diff CSS mínimo (token antes→después)
```diff
# ugo-web-provider.css
-.ugo-web-provider{--green:#159a63;--deep:#12322c;--ink:#17211f;--muted:#66736f;--canvas:#f5f7f6;font-family:Source Sans Pro}
+.ugo-web-provider{--green:var(--ugo-color-primary);--deep:var(--ugo-color-on-surface);--ink:var(--ugo-color-on-surface);--muted:var(--ugo-color-on-surface-variant);--canvas:var(--ugo-color-surface);font-family:var(--ugo-font)}

# provider-home-structural.css
-.ugo-provider-structural-home{background:#f3f5f3;color:#172421;font-family:"Inter Tight"}
+.ugo-provider-structural-home{background:var(--ugo-color-surface);color:var(--ugo-color-on-surface);font-family:var(--ugo-font)}

# provider-production-shell.css head
-  --provider-prod-bg:#f5f7f6;--provider-prod-surface:#ffffff;--provider-prod-ink:#142019;--provider-prod-muted:#66736b;--provider-prod-line:#dfe7e2;--provider-prod-green:#128c4a;--provider-prod-green-dark:#0b6f3a;--provider-prod-soft:#eef7f2;
+  --provider-prod-bg:var(--ugo-color-surface);--provider-prod-surface:var(--ugo-color-surface-lowest);--provider-prod-ink:var(--ugo-color-on-surface);--provider-prod-muted:var(--ugo-color-on-surface-variant);--provider-prod-line:color-mix(in srgb,var(--ugo-color-outline-variant) 78%,transparent);--provider-prod-green:var(--ugo-color-primary);--provider-prod-green-dark:color-mix(in srgb,var(--ugo-color-primary) 88%,black);--provider-prod-soft:color-mix(in srgb,var(--ugo-color-primary) 8%,var(--ugo-color-surface-lowest)); font-family:var(--ugo-font)

# provider-production-shell.css tail (append 97 líneas Kinetic)
+ .ugo-provider-structural-home .brand span etc {color:var(--ugo-color-primary);background:color-mix(primary 10% surface-lowest)}
+ .structural-actions button:last-child etc {background:var(--ugo-color-primary);color:var(--ugo-color-on-primary);box-shadow:0 8px 18px color-mix(primary 22%)}
+ .structural-sheet{background:var(--ugo-color-surface)} .structural-nav{background:var(--ugo-color-surface-lowest);border-top:color-mix(outline-variant 70%)}
+ .muted texts {color:var(--ugo-color-on-surface-variant)} marker {background:var(--ugo-color-primary)}
+ .kinetic block {transition: background 220ms, border 140ms, shadow 140ms, transform 140ms; focus tertiary 3px; reduced-motion none; touch 48px; card shadow-card + outline-variant 72%}
```

## Capturas 390 + tablet/desktop 24px
- **Mobile 390:** `docs/visual-kinetic/provider-mobile-390-before-after.png` — estructural fijo 390 centered, map 328px, nav 60+env(safe-area), sheet padding `16 24 calc(84+env)`, CTA 48px, KPI 8px gap, offer card 190px right.
- **Desktop 1024:** `docs/visual-kinetic/provider-desktop-1024-after.png` — sidebar 224px `#131b2e`, main `min(100%-48px,1080px)`, quick-grid 2→1 col ≤560px, focus-card 230px gradient → token dark but readable, operational dock/bottom-nav hidden ≥1000px (contrato production-shell).
- Before→After: solo cromática + token surfaces, layout idéntico, sin reflow roto.

## Checklist
- [x] Touch 48px: structural-actions/cta 48, nav button 48, provider bottom-nav 52 (≥48), production primary 54, quick-card etc
- [x] AA: on-surface #131b2e sobre #faf8ff 15.9:1, primary #006948/blanco 5.9:1, outline 4.5:1, dark sidebar blanco/#131b2e 16:1
- [x] Safe-area: structural `calc(84+env)`, nav `calc(60+env)` + `padding-bottom env`, production dock `82+env` bottom-nav `70+env` + `100dvh`
- [x] Focus tertiary 3px `color-mix(focus 35%)` en structural/buttons + production primary
- [x] Reduced-motion `transition:none` + `100dvh` + `max-width min()` 16/24 edges
- [x] Motion 140-220 `var(--ugo-duration-fast/standard)` + skeleton intacto
- [x] 8px ritmo: gaps 8/12/16 → 16, padding 16/24, border-radius 12/16/20 → `var(--ugo-radius-md/lg/xl)`
- [x] No alert/confirm: grep provider `alert|confirm` 0 en flujo
- [x] Perf: ProviderRoot 116.34kB gzip 18.66kB (+4.6kB <40kB), UgoWeb 26.44kB, ClientRoot 289.82kB 0 warn

## Verify same-SHA (e0532d7→a8a5c9f→HEAD)
```
verify:test-env ✓ 216 files
tsc -b → 0 err
vite build ✓ 303 modules, ProviderRoot 116.34kB, ClientRoot 289.82kB, notification-center 224kB (<500kB)
npm test → 1332 tests — 1324 pass 8 skip 0 fail (provider production shell final layer contract restored)
```
Contratos intactos: `provider-ui-production-shell-20261002` (last import still production-shell), `uiux-p0` y `premium-reference`.

## Admin / Super Admin
`admin-phase2.css` ya tokenizado (surface #faf8ff, primary #006948, secondary #00687A/container #57DFFE, tertiary #0058BE, 8px, 48px, focus, reduced-motion). Capturas admin no requeridas para esta entrega; verificado build no regresión. Próximo opcional: Super Admin Command Center surface `#FAF8FF→#EAEDFF` si se desea kinética adicional.
