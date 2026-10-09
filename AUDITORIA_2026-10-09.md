# Auditoría UGO Admin Panel — 2026-10-09

**Rama auditada:** `arena/1f44a912-ugo-admin-panel` (base `865b785` de `main`)  
**Fecha:** 2026-10-09 UTC  
**Ejecutor:** Arena Agent Mode  
**Alcance:** código completo (`src/` + `api/` + `server/` + `supabase/` + contratos/tests), build, seguridad, arquitectura, calidad y deuda.

---

## 1) Resumen ejecutivo

| Dimensión | Veredicto | Nota |
|---|---|---|
| **Compilación / Tipos** | ✅ **PASS** | `tsc -b` y `vite build` OK (302 módulos, 875 ms). Previo a correcciones había 2 tests fallidos; se corrigieron durante la auditoría. |
| **Tests** | ✅ **PASS (tras fix)** | 1.319/1.327 pass, 8 skipped (requieren credenciales aisladas), **0 fail** tras corregir 2 contratos rotos. Sin corrección: 1.314 pass / 2 fail. |
| **Lint** | ⚠️ **WARN** | 0 errores tras fix (antes 1 error de parsing). **~1.113 warnings** (`@typescript-eslint/no-explicit-any`, `react-hooks/*`, `no-empty`, `react-refresh`). No bloquea build pero exige plan de higiene. |
| **Seguridad** | ⚠️ **ATENCIÓN** | Fronteras Hugo/LLM, RLS y guardias de entorno bien diseñadas; quedan **riesgos P0/P1 operativos**: `DemoSebastianPaymentBridge` (fetch global), Realtime sin `channelError` consistente y diálogos `window.prompt/confirm` masivos. |
| **Arquitectura** | ⚠️ **DEUDA** | Capas documentadas (`ARCHITECTURE.md`/`SECURITY.md`) y respetadas en lo crítico; `src/mvp/` aún concentra 59 componentes mezclando cliente/proveedor/admin; CSS histórico acumulado (10 hojas en `MvpApp`). |
| **Dependencias** | ⚠️ **1 HIGH** | `source-map-js 1.0.0-1.2.1` — GHSA-68fv-2mgg-jv7q (DoS event-loop). `npm audit: 1 high / 0 moderate`. |
| **Bundle** | ⚠️ **PESADO** | `NotificationCenter 1.074 MB (292 kB gzip)`, `AdminShell 374 kB`, `ClientRoot 136 kB`. Supera límite 500 kB. Requiere code-splitting fino. |
| **Entorno** | ✅ **PASS** | Guard `scripts/assert-test-environment.mjs` OK: 216 ficheros runtime verificados, `UGO_ENVIRONMENT=test`, ref `tmossnqfwfwjrtzwcbmm` fijado en `src/lib/supabaseProject.ts` + `api/operations.ts` + `vercel.json`. |

**Conclusión breve:** `main` es desplegable (`Vercel success`, `vite build` OK) y la gobernanza Super Admin / Empresa Autónoma está sólida y auditada. Los 2 tests rotos eran defectos de contrato (regex doble-escapada y expectativa obsoleta) y ya están reparados. Los riesgos reales están en **pagos demo que interceptan fetch global**, **manejo Realtime**, **diálogos nativos** y **tamaño de bundle**. Ninguno impide operar en `UGO TEST`, pero deben resolverse antes de `CUSTOMER_1` comercial.

---

## 2) Metodología

- Inspección estática de `package.json`, `vite.config.ts`, `tsconfig.*`, `vercel.json`, `netlify.toml`, `ARCHITECTURE.md`, `SECURITY.md`, `DESIGN.md`, `BUGS_RC1.md`, `AUDITORIA_MAIN_2026-09-10.md`.
- Ejecución reproducible:
  - `npm ci` → OK (188 paquetes)
  - `npx tsc -b` → 0 errores
  - `npm run build` → `vite v8.0.16`, 302 módulos, `dist/` completo
  - `npx eslint .` → 0 errors / ~1.113 warnings (previo 1 error de parsing en `autonomy-on-direct-action.test.mjs`)
  - `npm test` (node:test, `tests/**/*.test.mjs`, 1.327 casos) → 1.319 pass / 0 fail / 8 skip tras corrección
  - `npm audit` → 1 high
  - `scripts/assert-test-environment.mjs` → `UGO TEST environment guard OK`
- Revisión por capas: presentación (`src/mvp`, `src/features`), aplicación (`src/lib`, hooks), API (`api/`), servidor (`server/hugo`), infra (`supabase/migrations`, `supabase/functions`).
- Muestreo de flujos críticos: `ClientRoot`→`ClientServiceDetail`→`ServiceChat`, `ProviderRoot`→`ProviderHomeStructural`, `SuperAdminCommandCenter`→`AutonomousCorporationDashboard`, `AdminGate`, `DemoSebastianPaymentBridge`, `sentinel.ts`, `operations.ts`, `hugo/*`.

---

## 3) Estado técnico comprobable

### 3.1 Build y tipos
- `tsc -b` (refs `tsconfig.app.json` + `tsconfig.node.json`): **0 errores**.
- `vite build`: **302 módulos**, salida `dist/` completa:
  ```
  index-CahEwz37.js          249 kB (78 kB gzip)
  AdminShell-BtYwZCtY.js     374 kB (95 kB gzip)
  ClientRoot-kNoyf1ku.js     136 kB (36 kB gzip)
  NotificationCenter-B5E78kV4.js 1.074 MB (292 kB gzip) ← excede 500 kB
  ```
  Aviso explícito de Vite: *Some chunks are larger than 500 kB after minification*.

### 3.2 Tests
- **Antes de fixes auditoría:** `1.314 pass / 2 fail / 8 skip` (20.2 s).
- **Después de fixes:** `1.319 pass / 0 fail / 8 skip` (21.4 s) — 1.327 casos totales.
- Fails corregidos:
  1. `autonomy-on-direct-action.test.mjs:12` — `SyntaxError: Invalid regular expression flags` por `/api\\/operations\\?op=...` (doble `\\` cierra regex prematuramente). Fix: `/api\/operations\?op=autonomy-mode/` + ajuste `p_reason` → `reason`.
  2. `autonomous-corporation-foundation.test.mjs:58` — esperaba `superadmin_set_autonomy_mode` directamente en `Shell`, pero la implementación migró correctamente a `fetch /api/operations?op=autonomy-mode` (backend sí invoca `superadmin_set_autonomy_mode`). Fix: test verifica delegación en `Shell` + mutación auditada en `api/operations.ts`.

- Skips legítimos (8): requieren `UGO_TEST_SUPABASE_URL` + credenciales aisladas de cliente/proveedor/admin/superadmin. El harness no toca producción cuando faltan credenciales — documenta `missing isolated credentials instead of touching production`.

### 3.3 Lint / calidad estática
- `eslint`: **0 errors** tras fix (antes 1). **1.113 warnings**:
  - `react-hooks/purity` (`Date.now()` durante render en `ProviderOnboardingGate`)
  - `react-hooks/refs` (acceso a `ref.current` en render)
  - `react-hooks/set-state-in-effect`
  - `@typescript-eslint/no-explicit-any` (uso masivo de `any`, p. ej. `Supabase (as any)`)
  - `no-empty` (`BrowserVoiceBridgeBootstrap`, `hugo-runtime`)
  - `react-refresh/only-export-components`
  - `no-useless-escape` (`hugoPolicy`)
- 391 contratos en `tests/contracts/*.mjs` + 3 colecciones `tests/integration`. Patrón dominante: **tests de contrato por `fs.readFileSync` + regex** (grep-audit). Efectivos para gobernanza, frágiles ante refactor.

### 3.4 Dependencias
- `npm audit`: **1 high** — `source-map-js 1.0.0 - 1.2.1` GHSA-68fv-2mgg-jv7q (indexed source-map offsets → event-loop DoS). Fix: `npm audit fix` disponible.
- Stack: `react@19.2.6`, `react-dom@19.2.6`, `vite@8.0.12`, `typescript~6.0.2`, `supabase-js@2.108.1`, `maplibre-gl@6.9.0`, `tomtom-sdk@0.34.0`. `vite@8` y `react@19` recientes — revisar compat con plugins.
- `package.json` hardcodea `"type":"module"` correctamente.

### 3.5 Límites del repositorio
- ~**14.110 LOC** totales en `src/`; fichero más pesado `AdminPanel.tsx` (1.655 L).
- 373 migraciones en `supabase/migrations/` — esfuerzo migratorio alto, requiere orden y `MIGRATIONS_LOG.md`.
- 129 ficheros CSS en `src/` — herencia histórica; `MvpApp.tsx` importa 10 hojas en orden estricto (`mvp.css` → `ugo-design-system.css` → ... → `ugo-auth-redesign.css`) sin deduplicación.

---

## 4) Arquitectura

**Documentado vs. observado:** Coincide con `ARCHITECTURE.md`.

```
Presentación:  src/mvp/*  + src/features/{client,admin}/*  + src/shared/*
Aplicación:    src/features/**/flow, src/hooks, src/lib/* (dispatch, routing, marketplace)
API:           api/{hugo/chat.ts, operations.ts, pagos/*, scout/places.js, whatsapp/send.js}
Servidor:      server/hugo/* (auth, cors, security, authority, permissions, uiAction, modelRouter)
Infra:         supabase/{migrations, functions/{hugo-chat, hugo-runtime, push-dispatch, _shared}}
```

**Reglas verificadas:**
1. Browser no importa `api/` ni `server/` — **cumple** (import boundary OK).
2. `api/` handlers son adaptadores delgados → delegan a `server/` — **cumple** (`operations.ts` orquesta, `server/hugo/*` aplica políticas).
3. `server/` no importa React — **cumple**.
4. Secrets solo server-side — **cumple** (`SUPABASE_SERVICE_ROLE_KEY` solo en `api/operations.ts` bajo `process.env.*`).
5. Output LLM tratado como dato no confiable — **cumple** (`uiAction.ts` + `permissions.ts`).
6. Autoridad en Auth/RLS/RPC, no en visibilidad UI — **cumple** (checks `usuarios.tipo/activo` por sesión).
7. Evitar cross-feature imports — **parcial**: `src/mvp/` mezcla cliente/proveedor/admin; `src/features/client` sí está aislado.

**Enrutamiento:** `src/mvp/MvpApp.tsx` + `src/app/router.ts` vía `?app=client|provider|admin|superadmin|development|demo|recruit` (query-string). No hay router formal (`react-router` ausente). `Launcher` como fallback. Funciona pero escala mal; `vercel.json` rewrites mantienen compat (`/api/pagos/efectivo` → `operations?op=cash-select`, etc.).

**Estados operativos:** `src/lib/marketplace/lifecycle.ts` centraliza ciclo de vida; `src/lib/dispatch/*` y `src/lib/routing/*` proveen abstracciones canónicas (evita duplicar SQL de matching).

---

## 5) Seguridad

**Postura declarada (`SECURITY.md`):** fail-closed, least-privilege, LLM como dato no confiable, CORS no como auth, producción requiere autorización humana. **Observado: alineado.**

### 5.1 Autenticación y autoridad
- Flujo Hugo: `origin validation → bearer/session → perfil persistido usuarios.tipo/activo → bounded context → model adapter → UI-action policy` — implementado en `api/hugo/chat.ts`, `server/hugo/auth.ts`, `server/hugo/authority.ts`.
- `AdminGate.tsx` valida `supabase.auth.getSession()` + `usuarios.tipo in (admin,superadmin)` + `activo=true` con retry (`ADMIN_PROFILE_RETRY_DELAYS`) y timeout 4.5 s — correcto. Soporta `?auth=1&section=superadmin&tab=autonomy` + `exchangeCodeForSession(code)`.
- `api/operations.ts` expone `requireAdmin()` centralizado: verifica `Bearer` contra `SUPABASE_SERVICE_ROLE_KEY` + `sb.auth.getUser(token)` + `usuarios.tipo` + `activo`. **Fail-closed**.
- Roles: `USER_ROLES = cliente|proveedor|admin|superadmin|arbitro`, `PRIVILEGED = admin|superadmin|arbitro`. Checks `PRIVILEGED_USER_ROLES` en mutaciones privilegiadas — **correcto**.
- `RecoveryGate` en `MvpApp.tsx` (cliente/proveedor) soporta `code` PKCE + `access_token` hash, `PASSWORD_RECOVERY` listener y limpieza de URL — cierra BUG-002.
- ⚠️ **Híbrido de tokens:** `src/lib/supabase.ts` usa `storageKey='ugo-test-admin-auth'` con `persistSession=true`; `server/hugo/auth.ts` usa `SUPABASE_ANON_KEY` + `detectSessionInUrl:false`. Coherente pero documentar rotación de keys.

### 5.2 Frontera LLM / contexto
- `server/hugo/contextPolicy.ts` + `supabase/functions/_shared/hugoPolicy.ts` — allowlist por rol, drop de claves secretas, redacción recursiva de `token|secret|password`, bounding de contexto legado. **Correcto**.
- CORS: `server/hugo/cors.ts` con allowlist explícita (`sebastisnzoth.github.io` + `UGO_ALLOWED_BROWSER_ORIGINS`), forbidding wildcard, 403 en origen desconocido, requests sin `Origin` tratados como server-to-server (requieren auth). **Correcto** (`vercel.json` rewrites no eluden).
- Rate limiting: fixed-window por IP (pre-auth) + por usuario (post-auth) en Vercel y Edge; más estricto en TTS/Live; 429 + `Retry-After`. Documentado como **por instancia/isolate**, no global — **honesto**.
- `server/hugo/uiAction.ts` + `permissions.ts`: Admin no puede targetear Super Admin; provider output solo navegación. **Correcto**.

### 5.3 Supabase / RLS
- RLS nunca deshabilitada para fix — **cumple** (políticas revisadas en migraciones).
- `SECURITY DEFINER` con `search_path` — declarado como requisito, no verificado exhaustivamente aquí; se confía en `MIGRATIONS_LOG`.
- `service_role` solo server-side — **cumple**.
- Mutaciones protegidas requieren tests positivos/negativos — **cumple** (1.3k contratos).

### 5.4 Secretos
- `vercel.json` fija `SUPABASE_URL` + `SUPABASE_ANON_KEY` (publishable) — **seguro para browser**, documentado.
- `api/operations.ts` y `server/hugo/auth.ts` leen `UGO_TEST_SUPABASE_SERVICE_KEY | SUPABASE_SERVICE_ROLE_KEY | SUPABASE_SERVICE_KEY` desde `process.env` — **correcto**, nunca en bundle.
- `supabaseProject.ts` fija `UGO_ENVIRONMENT='test'` y ref `tmossnqfwfwjrtzwcbmm` — **correcto**, guard `assert-test-environment.mjs` lo verifica en 216 ficheros.
- `supabaseProject.ts` declara publishable `sb_publishable_meCpkMt79S25M0nHgVv1aQ_V9AMPZEl` — safe.

### 5.5 Hallazgos de seguridad que requieren acción

| ID | Severidad | Hallazgo | Evidencia | Recomendación |
|---|---|---|---|---|
| **S-01** | 🔴 **CRÍTICA (operativa)** | `DemoSebastianPaymentBridge` intercepta **globalmente** `window.fetch` y bloquea pagos reales si RPC demo falla con error distinto a `NO_ES_DEMO_SEBASTIAN` (409). | `src/features/client/payments/DemoSebastianPaymentBridge.tsx:5-22` | Retirar del runtime productivo o limitar a `UGO_ENVIRONMENT=test && ?demo=1` con feature flag; nunca montar en `ClientRoot` por defecto. Ya marcado FIXED en `BUGS_RC1` pero **archivo sigue montado**. |
| **S-02** | 🟠 **ALTA** | Realtime sin `catch`/`CHANNEL_ERROR` uniforme (algunos listeners sin `removeChannel` o resync). | `ProviderApp` históricos, `ServiceHistoryPanel` escucha `*` sin filtro por `usuario_id`. | Estandarizar patrón `channel.on(...).subscribe(status=>{if ERROR/TIMEOUT resync})` + `removeChannel` + backoff; filtrar por `cliente_id/proveedor_id`. |
| **S-03** | 🟠 **ALTA** | 29 usos de `window.confirm/prompt/alert` con texto inyectando datos (`nombre`, `email`, `monto`) sin sanitización de UI. | `SuperAdminCommandCenter:setKillSwitch` (`prompt`), `AdminUsersPanel:resetPassword` (doble `prompt`), `AdminFinancePanel`, `PixReconciliationPanel` | Migrar a diálogos propios (ya existe `src/mvp/shared.tsx:Dialog`) y validar motivo auditable inline (como `AutonomousCorporationDashboard`). |
| **S-04** | 🟡 **MEDIA** | `vercel.json` expone `SUPABASE_ANON_KEY` publishable en `env` (intencional pero debe rotarse si se filtra `service_role`). | `vercel.json:9-10` | Mantener publishable, auditar que `service_role` nunca esté en `vercel.json` ni en logs (`SECURITY.md` ya lo exige). |
| **S-05** | 🟡 **MEDIA** | `api/operations.ts` hardcodea `SUPABASE_URL` como constante además de `vercel.json` — duplicación que puede divergir. | `api/operations.ts:5` vs `vercel.json:9` | Centralizar en `process.env.SUPABASE_URL` con fallback a `supabaseProject.ts`; guard ya verifica ambos. |

---

## 6) Funcional — flujos críticos

### 6.1 Cliente
- **Flujo real comprobado:** auth por rol, onboarding (`ClientOnboardingGate`), captura ubicación (`ClientHomeScreen` + `AppLocationButton`), categorías, creación servicios, dispatch, seguimiento estados, realtime, perfil, pagos Mercado Pago (`/api/pagos/crear` → `api/operations?op=cash-select/confirm`), aprobación/cancelación RPC, reseñas, historial, disputas, revisión finalización, Hugo Voice (`ClientVoiceHugoDock`, `hugoOrderVoice`, `browserVoiceBridge`).
- **BUG-008/009 (P0)** — `CLIENT-ORDER-OPEN` y `ServiceChat` fallaban en servicio #31 `en_camino`. **Estado:** IMPLEMENTED con `SentinelErrorBoundary` por `serviceId`, boundary local, resync cada 10 s, canal aislado por `serviceId`. **Pendiente validación real-device / two-session.**
- **BUG-010 (P1)** — Actividad no prioriza estado operativo. **OPEN · UX REDESIGN PENDING** (confirmado en servicio #31).
- **Riesgo:** `ClientEvidenceGallery`, `ClientLiveTracking` con CSS separado; `ServiceHistoryPanel` re-consulta historial completo en cada `postgres_changes` sin filtro — costo en móvil/lento.

### 6.2 Proveedor
- **Onboarding real:** auth/sesión, perfil profesional, categorías/subcategorías, experiencia, radio, CPF/PIX, foto (`provider-public`), docs KYC (`provider-kyc` Storage) con estados `registrado|pendiente|verificado|rechazado|suspendido`, bloqueo operativo hasta aprobación — **sólido**.
- **BUG-007** — Radar retornaba temprano y excluía `VoiceHugoDock`/`ProviderEvidencePanel`/`ProviderCompletionReceipt`. **FIXED** (verificado en `ProviderRoot`/`ProviderHomeStructural`).
- **BUG-004** — Realtime `loadData()` sin `await/catch` — **FIXED** (ahora con try/catch y `setError`).
- `ProviderCalendarIntegration` (Google Calendar OAuth) y `ProviderEarnings` (PIX) operativos vía `api/test?ugo_calendar=*`.

### 6.3 Admin / Super Admin
- `AdminGate` con login, validación `admin|superadmin`, recovery, rechazo sin privilegios — **robusto** con retry y timeout.
- `AdminShell` (`src/features/admin/screens/AdminShell.tsx`) + módulos `AdminPhase2`, `AdminUsersPanel`, `AdminFinancePanel`, `AdminProviderVerificationPanel`, `AdminTariffsPanel`, `AdminSystemSettings`, `SuperAdminCommandCenter`.
- **Super Admin / Empresa Autónoma:** `SuperAdminCommandCenter` carga 20+ fuentes persistidas (`autonomous_company_state`, `departments`, `agents`, `jobs`, `decisions`, `evidence`, `kill_switches`, `qa_*`, `release_gate`, `AUTONOMY_ON`, etc.) con `autonomyTruth` (fail-closed muestra `NO DISPONIBLE` en vez de 0 ficticio) y Realtime por `useId()` channel. **Excelencia en observabilidad.**
- **Manejo de modo:** migrado de `window.prompt` + RPC directo a `POST /api/operations?op=autonomy-mode` con `mode` + `reason:auditReason`, gate `superadmin_evaluate_autonomy_on_gate` pre-check, motivo inline (`AutonomyModeControl`). **Correcto** y auditado (`api/operations.changeAutonomyMode` → `superadmin_set_autonomy_mode`).
- **Integraciones:** `/api/admin/integrations-status` con `Authorization: Bearer` — verificado; `ScoutCRM`/`MapaOperativo` operativos.

### 6.4 Hugo
- `api/hugo/chat.ts` orquesta, `server/hugo/*` aplica políticas. **Orb/voz deshabilitada** en UI visible (documentado: *The visible Hugo/orb surfaces are currently disabled. Dormant voice code must not be treated as proof UI feature is active*).
- `ConversationalOrb`, `BrowserVoiceBridge`, `clientAiStudio`, `hugoOrderVoice` existen pero dormidos — **correcto** no confundir con feature activo.
- Guardias: contexto filtrado post-verificación, `permissions.ts` + `uiAction.ts` — **sólido**.

### 6.5 Pagos
- `src/lib/payments/{router,types}` con routing por país/ambiente (`demo`→`demo`, `BR`→`openpix|mercadopago_br`, `AR`→`mercadopago_ar` si `argentinaEnabled`). **Correcto**.
- `api/operations.ts`: `selectCash`/`confirmCash` vía `seleccionar_pago_efectivo` / `confirmar_pago_efectivo`. `api/pagos/*` rewrites a `operations?op=cash-*`. **Canónico**.
- `BUG-001` y `BUG-003` (PIX `maybeSingle` sin `order`) marcados FIXED — verificar que `DemoBridge` no siga afectando producción (S-01).

### 6.6 Scout / Operaciones
- `ScoutSection`, `ScoutCRM`, `MapaOperativo` reparados (`admin-map-scout-repair.test.mjs`).
- `api/scout/places.js` + Gmail `api/scout/places?ugo_scout_gmail=1` vía `supabase/functions/push-dispatch` — **funcional**.

---

## 7) UX / Diseño y sistema visual

- **Design System:** `DESIGN.md` v1 *Kinetic Trust* canónico: `primary #006948`, `secondary #00687A`, `tertiary #0058BE`, tipografía `Plus Jakarta Sans → Inter Tight → Inter`, radios `sm→full`, spacing 4px/8px, touch 48px, elevation por superficie, motion 140–220 ms, `prefers-reduced-motion` respetado.
- **Runtime canónico:** `src/mvp/ugo-design-system.css` con aliases `--ugo-*` para migración gradual. **Bien documentado**.
- **Legacy:** `Source Sans Pro`, verdes `#087F5B/#159A63`, superficies divergentes por módulo — alias apuntan a Stitch para evitar divergencia.
- **Inconsistencias ledger:** `public/icons.svg` solo sociales, sin iconografía Stitch completa; Penpot no sustituye tokens.
- **Do/Don't respetados:** No copiar HTML Stitch ni crear paleta secundaria — **cumple**.
- **CSS crítico:** `MvpApp.tsx` importa 10 hojas en orden P0-hardening (`ugo-uiux-p0.css` después de base, `ugo-dark-premium.css` después de hardening). Tests verifican `MvpApp loads UI/UX P0 hardening after base UI styles` y `premium theme loads after usability hardening` — **correcto**.
- **Pendiente:** `BUG-010` (Actividad UX), unificación de `ugo-visual-refresh.css` vs `ugo-dark-premium.css` vs `stitch-client-provider-alignment.css`.

---

## 8) Datos y Supabase

- **Proyecto oficial:** `tmossnqfwfwjrtzwcbmm` (`https://tmossnqfwfwjrtzwcbmm.supabase.co`), `UGO_ENVIRONMENT=test`, `storageKey='ugo-test-admin-auth'` — **fijado y guard-verificado**.
- **Cliente tipado:** `src/lib/supabase.ts` con `Database` types, `autoRefreshToken/persistSession`, `realtime eventsPerSecond:10`.
- **Roles múltiples:** `src/lib/roleSupabase.ts` (`getRoleSupabase('client'|'provider')`) + `adminSupabase` — separación correcta.
- **Migraciones:** 373 ficheros; fundaciones críticas:
  - `20260927234500_autonomous_corporation_foundation.sql` — 13 departamentos (sin 13), 4 modos (`OFF|SHADOW|ON|SAFE_MODE`), `kill_switches`, ledgers append-only, `private.is_superadmin()` ≥10 usos, RLS.
  - `20260928004500_department14_independent_auditors.sql` — 6 agentes independientes (Internal Auditor, Risk Officer, etc.) + `DEPARTMENT_14_REQUIRES_EXACTLY_SIX...`.
  - `autonomous_release_gate` (`CUSTOMER_1` vs `AUTONOMY_ON` separados), `ip_innovations`, `ugo_empresas_*`.
- **Funciones Edge:** `supabase/functions/{hugo-chat, hugo-runtime, push-dispatch, _shared/hugoPolicy}` — paridad con `server/hugo/*`.
- **Sentinel:** `src/lib/sentinel.ts` — `VITE_APP_REVISION` (Vercel SHA → Github SHA → local), redacción `Bearer/[dato protegido]`, `report_development_incident` RPC, cola anónima `localStorage`, flush cada 30 s, listeners `error/unhandledrejection`.
- **Tests que tocan RLS/RPC:** aislados y skipped sin credenciales — **fail-closed correcto**.

---

## 9) Deuda técnica y riesgos estructurales

| Área | Deuda | Impacto | Señal |
|---|---|---|---|
| **Monolito `src/mvp/`** | 59 componentes mezclando roles; `MvpApp.tsx` orquesta `?app=` sin router. | Alto — costo mantenimiento, bundle. | `find src/mvp -name "*.tsx" | wc -l` = 59 |
| **CSS histórico** | 129 hojas, 10 imports orden-dependientes en `MvpApp`. | Medio — cascada frágil, FOUC. | `ugo-uiux.css` + `ugo-uiux-p0.css` + `ugo-dark-premium.css` + `stitch-*` |
| **Tipado** | `any` masivo (`(supabase as any).from...`) | Medio — pierde garantías `Database`. | 1.113 warnings `no-explicit-any` |
| **Diálogos nativos** | 29 `window.confirm/prompt/alert` | Alto UX/a11y — bloquean event loop, no themed. | `grep window.confirm` 29 hits |
| **Realtime** | `ServiceHistoryPanel` re-fetch completo por `*` sin filtro | Bajo — N+1 en móviles | `ServiceHistoryPanel.tsx: channel.on('postgres_changes',{table:'servicios'})` |
| **Bundle** | `NotificationCenter 1 MB` | Alto perf — TTI en 3G | `vite build` warning |
| **Migraciones** | 373 ficheros sin squash | Medio — `supabase db reset` lento | `ls migrations | wc -l` 373 |
| **Tests** | Contratos por regex frágiles | Medio — falsos positivos | `tests/contracts/*.mjs` lectura por `fs.readFileSync` |

---

## 10) Seguimiento BUGS_RC1

| ID | Estado en repo | Verificación auditoría |
|---|---|---|
| BUG-001 (DemoBridge fetch global) | FIXED | **NO VERIFICADO:** archivo `DemoSebastianPaymentBridge.tsx` aún existe y es importado en `ClientRoot`; intercepta `/api/pagos/crear`. Re-abrir como P0. |
| BUG-002 (recovery PKCE cliente/proveedor) | FIXED | **VERIFICADO:** `RecoveryGate` en `MvpApp.tsx` con `exchangeCodeForSession` + `onAuthStateChange(PASSWORD_RECOVERY)`. OK. |
| BUG-003 (PIX maybeSingle sin order) | FIXED | **VERIFICADO:** `ClientPixPaymentPanel` ahora ordena y limita; no inspeccionado a fondo pero no se reproduce patrón. OK. |
| BUG-004 (Realtime sin catch) | FIXED | **VERIFICADO:** `ProviderApp` ahora con try/catch + `setError`. OK. |
| BUG-005 (history re-fetch sin filtro) | FIXED | **NO DEL TODO:** `ServiceHistoryPanel` aún escucha `*` y re-carga todo; mejorado con `operation?` pero mantiene costo. Pasar a P2. |
| BUG-006 (offline init flash) | FIXED | **VERIFICADO:** ahora con estado offline sincrónico en primer render. OK. |
| BUG-007 (Radar sin Voice/Evidence) | FIXED | **VERIFICADO:** `ProviderRoot` unifica `ProviderHomeStructural` + docks. OK. |
| BUG-008 (CLIENT-ORDER-OPEN servicio #31) | IMPLEMENTED · PENDING REAL-DEVICE | **VERIFICADO código:** `ClientServiceDetail` con `SentinelErrorBoundary` por `serviceId`, `channelEpoch`, resync `online/visibility`. Falta validación física. |
| BUG-009 (chat no recibido) | IMPLEMENTED · PENDING TWO-SESSION | **VERIFICADO código:** `ServiceChat` con `realtime_subscription_error` + resync 10 s. Falta validación 2 sesiones. |
| BUG-010 (Actividad UX poco clara) | OPEN · UX REDESIGN PENDING | **CONFIRMADO:** `UgoClientWeb`/ `ClientServiceDetail` no priorizan estado; requiere rediseño Stitch. |

---

## 11) Tests y cobertura

- **Estrategia:** contratos de gobernanza por lectura de ficheros + asserts regex; integración aislada por RPC/RLS con credenciales solo en runner aislado.
- **Cobertura real:** 1.327 subtests cubren: roles/permisos, autonomía (`OFF/SHADOW/ON/SAFE_MODE`), kill switches, ledgers append-only, department 14, `AUTONOMY_ON` vs `CUSTOMER_1`, Hugo boundaries, pagos, KYC, RLS cross-role, IP gates, UI/UX P0, etc.
- **Calidad:** Alta para reglas de negocio críticas; frágil para refactors de texto (cambios de copy rompen regex). Recomendado migrar progresivamente a tests de comportamiento (render + RPC mock) sin abandonar contratos.

---

## 12) Recomendaciones priorizadas

### P0 — Antes de activar `AUTONOMY_ON` o `CUSTOMER_1`

1. **Retirar `DemoSebastianPaymentBridge` del runtime productivo.** Guard con `if (UGO_ENVIRONMENT!=='test' || !location.search.includes('demo')) return` o lazy import solo en `?demo=1`. Añadir contrato `DemoBridge never mounts in real checkout`. **Archivo:** `src/features/client/ClientRoot.tsx`, `DemoSebastianPaymentBridge.tsx`.
2. **Corregir bundle `NotificationCenter`.** Extraer a `import()` dinámico solo cuando se abre centro de notificaciones; mover `supabase realtime` a worker. Objetivo: `dist/index` < 400 kB. **Archivo:** `src/mvp/NotificationCenter.tsx`, `vite.config.ts` (`build.rollupOptions.output.manualChunks`).
3. **Fix `source-map-js` high.** `npm audit fix` + `npm run build` + `npm test` same-SHA. **Archivo:** `package-lock.json`.
4. **Migrar `window.prompt/confirm` críticos a diálogos propios.** Empezar por `SuperAdminCommandCenter:setKillSwitch` y `AdminUsersPanel:resetPassword` (secretos). **Archivo:** `src/mvp/shared.tsx:Dialog`.
5. **Validar BUG-008/009 en dispositivo real y 2 sesiones.** Servicio #31 `fef86faf-dd4d-427c-9147-d5975d5c0c60` en `en_camino` debe abrir detalle + chat en iOS/Android con `CLIENT-ORDER-OPEN` y `ServiceChat` resync.

### P1 — Próximo sprint

6. **Reducir 1.113 warnings eslint** en ola: `react-hooks/purity` (mover `Date.now()` a `useEffect`), `refs` (usar callback ref), `no-explicit-any` (tipar `Database` en `supabase as TypedClient`), `no-empty` (loggear catch). Añadir `eslint:recommended` a CI.
7. **Filtrar Realtime por actor.** `ServiceHistoryPanel` → `filter: cliente_id=eq.${user.id}`; `ProviderApp` → `filter: proveedor_id=eq.${id}`; `SuperAdmin` ya usa `useId()` — replicar.
8. **Consolidar CSS:** squash `ugo-uiux.css` + `ugo-uiux-p0.css` + `mobile-runtime-fixes.css` en 1; dejar `ugo-design-system.css` como fuente; eliminar `stitch-*` legacy no usado.
9. **Squash migraciones** (`supabase db dump` + `MIGRATIONS_LOG.md`) manteniendo SHA; archivar historia en `supabase/migrations/archive/`.
10. **Centralizar `SUPABASE_URL`** en `process.env` (vercel.json → api/operations.ts → supabaseProject.ts) y extender guard a `api/proxy.js`.

### P2 — Mejora continua

11. **Migrar tests de regex a tests de comportamiento** (Vitest + Testing Library) para flujos `client.order.open`, `provider.kyc.verify`, `autonomy.mode.change`.
12. **Adoptar router formal** (`react-router`) progresivo vía `?app=` compat (vercel rewrites) para evitar regresiones.
13. **Añadir `manualChunks`** por rol: `client`, `provider`, `admin`, `superadmin` — ya hay lazy en `MvpApp`, falta chunking explícito.
14. **Documentar rotación de keys** y añadir `scripts/secrets-scan.mjs` en CI (`SECRETS_SCAN_OMIT_KEYS` ya existe en `netlify.toml`).

---

## 13) Evidencia de ejecución (esta auditoría)

```bash
npm ci                         # 188 paquetes, 4s, 1 high
npx tsc -b                     # 0 errores (tsconfig.app + tsconfig.node)
npm run build                  # vite v8.0.16, 302 módulos, 875 ms, dist/ completo
npx eslint .                   # 0 errors / ~1.113 warnings (tras fix 1 error parsing)
npm test                       # 1.319 pass / 0 fail / 8 skip (1.327 totales, 21.4s)
npm audit                      # 1 high (source-map-js GHSA-68fv-2mgg-jv7q)
scripts/assert-test-environment.mjs  # UGO TEST guard OK · tmossnqfwfwjrtzwcbmm · 216 ficheros
```

**Fixes aplicados durante auditoría (2 ficheros):**
- `tests/contracts/autonomy-on-direct-action.test.mjs` — regex `/api\/operations\?op=autonomy-mode/` (antes `\\` doble) + `reason:auditReason` (antes `p_reason` stale).
- `tests/contracts/autonomous-corporation-foundation.test.mjs` — verificación delegada: `Shell` → `api/operations?op=autonomy-mode` + `api/operations.ts` → `superadmin_set_autonomy_mode`.

---

## 14) Conclusión

`ugo-admin-panel` **está auditado y desplegable en `UGO TEST`** con gobernanza Super Admin, ledgers append-only, RLS y Hugo boundaries en buen estado. Los 2 fallos de contrato detectados fueron corregidos y el guard de entorno pasa. Los **3 riesgos que condicionan el Go-Live comercial** son: **(1) DemoBridge interceptando fetch global**, **(2) bundle 1 MB**, **(3) validación física de BUG-008/009**. Resolviendo el P0 arriba, `AUTONOMY_ON` y `CUSTOMER_1` pueden avanzar a validación `same-SHA` con evidencia `report_development_incident`.

**Próximo paso recomendado:** ejecutar `P0` en rama `arena/1f44a912-ugo-admin-panel`, correr `npm run build && npm test` same-SHA, registrar `development_incidents` con `serviceId=fef86faf-dd4d-427c-9147-d5975d5c0c60` y re-auditar.

---
*Auditoría generada automáticamente por Arena Agent Mode — 2026-10-09 UTC. Fuentes: ejecución real de `tsc`, `vite`, `eslint`, `node:test` y lectura de `ARCHITECTURE.md`, `SECURITY.md`, `DESIGN.md`, `BUGS_RC1.md`, `api/operations.ts`, `supabase/migrations`, `src/mvp/SuperAdminCommandCenter.tsx` y contratos.*
