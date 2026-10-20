# Incidente P0 — Cliente autenticado → pedido real → matching → oferta → aceptación → `asignado`

Fecha: 19/10/2026 (BRT). Entorno de prueba: **UGO Arena TEST `tmossnqfwfwjrtzwcbmm`** exclusivamente.
Rama: `arena/607fd3ca-ugo-admin-panel` → PR #530. Base: `main` `fa93929`; `main` avanzó a `fe9e261` (sólo documentación) durante el trabajo.

**Estado global: código del incidente verificado en CI con el recorrido P0 real en verde; publicación BLOCKED_HUMAN por una migración que sólo puede aplicarse con credenciales de la base TEST. Nada de este documento se autocertifica VERIFIED.**

## Causas raíz probadas

| # | Causa | Evidencia | Corrección |
|---|---|---|---|
| 1 | `RecoveryGate` trataba **cualquier** `?code=` como recuperación de contraseña: secuestraba el login normal, limpiaba la URL y devolvía a la pantalla de acceso | `src/mvp/MvpApp.tsx`; contrato `pages-auth-routing` | Sólo `auth=recovery`, `type=recovery` o el evento real `PASSWORD_RECOVERY` toman la pantalla; el resto continúa al app |
| 2 | `useRoleSession` trataba un fallo **transitorio** de `getSession`/perfil como cierre de sesión; una respuesta vieja podía pisar a una nueva | `src/lib/roleSupabase.ts`, `src/mvp/shared.tsx`; `role-session-concurrency-behavior` (9 casos), `provider-session-bootstrap-race` | Guardas de generación, `sessionChecked`/`retrySession`, `SIGNED_OUT` reconfirmado contra el servidor, `TOKEN_REFRESHED` sin recargar perfil, errores de transporte nunca autorizan el login |
| 3 | El refresco periódico de GPS llamaba a `activar_disponibilidad_proveedor`, que **fuerza `online`** | `src/mvp/provider/providerService.ts` | El refresco usa la RPC de ubicación (`refreshProviderAvailabilityLocation`), sólo con proveedor online+disponible+verificado y pestaña visible; un fallo de GPS no cambia disponibilidad ni sesión |
| 4 | `private.apply_service_pricing_snapshot()` completaba `comision_ugo`/`ganancia_proveedor` en el **INSERT**, pero la política `servicios_insert` exige que vengan nulos → **todo pedido con tarifa era rechazado por RLS** | `supabase/migrations/20260920071000_*`; prueba PGlite `service-insert-pricing-rls-behavior` | Migración `20261019233520_*`: en el INSERT sólo fija `tarifa` desde `metadata.tariff_quote.precio_referencia`; el reparto 15 % / neto se aplica al asignar |
| 5 | El `ProviderHugoBridge` existía pero **no estaba montado**, por eso el runtime de acciones de Hugo no encontraba “Hablar con Hugo” | `src/mvp/provider/ProviderRoot.tsx`; workflow `hugo-provider-actions-runtime` | Se monta `<ProviderHugoBridge/>` y se actualiza el contrato obsoleto que exigía lo contrario; el centinela de presencia ya lo requería |
| 6 | El gate Admin mostraba el **login** cuando una sesión válida sufría un timeout de perfil (encontrado al verificar, no era el incidente reportado pero rompía la prueba cross-role) | `src/mvp/AdminGate.tsx`; `admin-auth-ux` | Estado `sessionActive`: reintento acotado (12 intentos) y tarjeta de reintento; el login sólo aparece cuando el perfil confirma que no es admin |

## Cambios y pruebas asociadas

- `src/lib/roleSupabase.ts`, `src/mvp/shared.tsx`, `src/mvp/provider/useProviderRealtime.ts`, `src/mvp/provider/providerData.tsx` — sesión y diagnóstico; contratos `role-session-concurrency-behavior`, `provider-session-bootstrap-race`, `provider-auth-gps-permission`.
- `src/mvp/provider/providerService.ts`, `src/mvp/provider/providerData.tsx` — GPS real, refresco 45 s sin forzar online; contratos de GPS y `provider-operating-zone`.
- `supabase/migrations/20261019233520_defer_insert_settlement_until_assignment.sql` — liquidación diferida; prueba PGlite `service-insert-pricing-rls-behavior` (inserto 120 → comisión nula; al asignar → 18 / 102; pagos falsificados y servicios ajenos rechazados).
- `src/features/client/request/ClientPostConfirmFlow.tsx` — el cliente no inventa comisiones; mensaje honesto cuando el matching no ofertó.
- `src/mvp/provider/ProviderRoot.tsx` — montaje del bridge de Hugo del Proveedor.
- `src/mvp/AdminGate.tsx`, `src/mvp/MvpApp.tsx` — sesión Admin y recuperación de contraseña.
- `scripts/p0-client-provider-e2e.mjs` + `.github/workflows/p0-client-provider-e2e.yml` — recorrido P0 real, etapas publicadas como anotaciones y diagnóstico de fallo por página.

## Evidencia real (UGO Arena TEST)

| SHA | P0 Cliente→Proveedor | Resto de checks (sin Netlify) |
|---|---|---|
| `6079833` | PASS (servicio `2c2312ff…`, oferta `d38dadbc…`, GPS 1 572 ms) | cross-role flaky |
| `dce8441` | PASS (agrega login de Cliente en UI + recarga) | cross-role flaky |
| `632f486` | FAIL una vez en `provider_feed` | luego no se reprodujo en 5 corridas |
| `216ed78` | PASS | cross-role flaky |
| `7b3a46d` | PASS | Hugo Provider Actions PASS; zone/performance cayeron por contención y pasaron después |
| `48b2f80` | PASS | Admin Realtime falló y se corrigió el gate Admin |
| `f608e19` | PASS | cross-role falló en un punto distinto |
| `28b3e42` | **PASS** (run `39349396206`) | **22 checks en verde**, incluido responsivo/browser (`39349396215`) y Admin Realtime (`39349396279`); sólo Netlify Header/Pages/Redirect fallan |
| `ac70e82` (merge de `main` `fe9e261`, sólo docs) | PASS | 15 checks en verde; Admin Realtime (`39352660105`) falló una vez y se reejecuta sobre el mismo árbol de aplicación |

Configuración de la corrida P0 (`39349396206`): login de Cliente y de Proveedor **en la UI** con recarga, proveedor online desde la UI (`aria-pressed=true`), GPS capturado y persistido, pedido creado por el cliente autenticado, `iniciar_matching` real, oferta persistida y visible al proveedor, aceptación desde la UI, servicio `asignado` y ambas sesiones vivas al final. El script falla con código distinto de cero si cualquiera de esas condiciones no se cumple. GitHub limita las anotaciones a 10 por check, así que la lista completa de etapas queda en el artefacto `p0-client-provider-e2e`.

La prueba cross-role falla en un punto distinto cada corrida (logout Admin, login Admin, traducciones del Proveedor) y volvió a pasar sobre el **mismo árbol de aplicación** en `28b3e42`: es contención de la base TEST compartida, no un defecto del recorrido P0. No se relajó ningún assert para conseguir el verde.

## Bloqueos

1. **BLOCKED_HUMAN — migración TEST.** `20261019233520_defer_insert_settlement_until_assignment.sql` no está aplicada en `tmossnqfwfwjrtzwcbmm`; este agente no tiene credenciales ni el conector devuelve acceso (403). Mientras no se aplique, la prueba P0 inserta sin cotización (no toca la rama de liquidación) y **no se puede afirmar en vivo** que un pedido con tarifa se cree, se matchee y liquide. La semántica SQL sí está probada localmente con PostgreSQL embebido (PGlite).
2. **Netlify.** Los checks de Header/Pages/Redirect de ambos sitios fallan de inmediato: ruido de integración, ajeno a este incidente.
3. **Cross-role.** Inestable bajo contención; se documenta como tal y no se usa como prueba del recorrido P0.

## Publicación

Instrucción del usuario (20/10): publicar en **ambos canales** — GitHub Pages (único canal que el checkpoint de Hive registraba como vigente) y Vercel producción, verificando **el mismo commit** en los dos.

- Vercel: proyecto `ugo-admin-panel` (`prj_mamEs9taSOgtEKZsVDVcqlFes2er`), rama de producción `main`, despliegue automático por push; el build usa el commit exacto (`meta.githubCommitSha`) y queda en `READY`/`PROMOTED` con alias `ugo-admin-panel.vercel.app`.
- Pages: workflow `UGO GitHub Pages`; se verifica `html_url` y `source_sha` publicado.

## Próximo paso y rollback

1. Aplicar la migración en TEST y repetir el P0 con `metadata.tariff_quote.precio_referencia` para probar la liquidación en vivo.
2. Fusionar el PR con CI verde en el SHA exacto y comprobar ambos canales con el SHA del merge.
3. Rollback: revertir el commit de merge (nunca reset/force). No hay datos reales modificados; la migración es aditiva y no borra información.

## Checkpoint

`TASK_ID | STATUS | REPO | BRANCH | SOURCE_SHA | RESULT_SHA | TESTS | RUN_ID | EVIDENCE | JUDGE | SENTINEL | COST | BLOCKER | NEXT_TASK`

`P0-CLIENT-PROVIDER | CI_PASS_BLOCKED_HUMAN | ugo-admin-panel | arena/607fd3ca-ugo-admin-panel | fa93929 | 28b3e42 | 1465 tests (1457 PASS / 8 SKIP / 0 FAIL); P0 real PASS; 22 checks verdes | 39349396206 / 39349396215 / 39349396279 | PR #530 + artefacto p0-client-provider-e2e | 5 etapas Judge/Sentinel PASS | 1 atestiguado | prueba TEST sin costo | migración TEST sin aplicar | aplicar migración, mergear y verificar Pages + Vercel con el mismo SHA`

---

## Ciclo 2 — 20/10/2026 (PR #533: Admin Realtime y Hugo Provider Actions)

Problema: `Admin estados operativos ↔ Realtime UGO TEST` no encontraba `.ugo-admin2-status` y `UGO Hugo Provider Actions Runtime TEST` no encontraba `TRABAJO ACTIVO`; el PR #533 había añadido clics de recuperación en los tests sin corregir la causa.

Cambios de causa raíz:

- `src/features/client/onboarding/ClientOnboardingGate.tsx` y `src/mvp/provider/providerData.tsx`: un bootstrap lento ya no se presenta como fallo. Se mantiene la pantalla de carga hasta que el chequeo resuelve y la tarjeta de reintento sólo aparece con error real (la tarjeta tampoco afirma que la sesión esté activa si nunca se confirmó).
- `src/mvp/provider/providerService.ts`: `loadProviderSnapshot` reintenta errores **transitorios** (red, `57014`, timeouts, 502/503/504) con espera corta 0/400/1200 ms; un error permanente falla de inmediato y sigue reportándose a Sentinel. Así una consulta lenta no deja el espacio del Proveedor sin servicio activo.
- `scripts/admin-realtime-runtime.mjs` y `scripts/hugo-provider-actions-runtime.mjs`: al agotarse la espera se publica una anotación con el estado real de la pantalla (URL, formulario de login, spinners, alertas, botones de reintento, texto visible) para identificar la causa exacta sin depender de logs inaccesibles.

Estado: cambios preparados y probados localmente (18 contratos focales PASS, `tsc -b` limpio). La verificación en CI del SHA exacto queda pendiente en este ciclo.
