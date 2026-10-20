# Incidente CI — fallos runtime UGO TEST por contención de la base compartida (2026-10-20)

Entorno: **UGO Arena TEST `tmossnqfwfwjrtzwcbmm`** (único proyecto TEST), GitHub Actions `ubuntu-latest`,
repositorio `sebastisnzoth/ugo-admin-panel`. Inspección y corrección desde la sesión Arena
`arena/5516cefe-ugo-admin-panel` (base `main` `cbd671b6`), **sin tocar producción ni aplicar migraciones**.

## 1. Revalidación de estado (no se asumieron los fallos previos)

PR **#533** (`integration/arena-green-provider-gps-20261020`), abierto y mergeable. SHA de referencia
inicial `1cdd4c19` → HEAD al inicio de la inspección `53a31017` → durante la sesión avanzó a
`731774643093bf533a13c233accc80eebdfbd8e6` (empuje de otra sesión, sólo documentación en cada caso).

### Corrida `53a31017` — runs iniciados 2026-10-20T01:49:54Z

| Workflow | Run ID | Resultado | Job | Evidencia (anotaciones del check) |
| --- | --- | --- | --- | --- |
| UGO Admin Realtime Runtime TEST | `39355590534` | **FAILURE** | `118409499948` | falla en «Runtime TEST without refresh»; `exit code 1` sin artefacto (`artifacts/admin-realtime-*` no encontrados) |
| UGO Hugo Provider Actions Runtime TEST | `39355590472` | **FAILURE** | `118409500050` | `AuthRetryableFetchError: Gateway Timeout` en `GoTrueAdminApi.createUser` (`@supabase/auth-js` `_request` → `handleError`) |
| UGO Provider Operating Zone Runtime TEST | `39355590433` | **FAILURE** | `118409500039` | falla en «Runtime»; `exit code 1`; sin artefacto |
| UGO Provider Profile Photo Runtime TEST | `39355590457` | **FAILURE** | `118409499912` | falla en «Runtime»; `exit code 1`; sin artefacto |
| UGO Cross-role UI Runtime TEST | `39355590369` | **FAILURE** | `118409709600` | `AssertionError: ifError got unwanted exception: fetch failed` en `createRoleUiFixtures` (`scripts/role-ui-fixtures.mjs:24`, `auth.admin.createUser`) |
| UGO P0 Client → Provider Matching E2E | `39355590343` | **FAILURE** | `118409499671` | etapa `bootstrap`: `read categories: <HTML> <title>supabase.co \| 522: Connection timed out</title>` (REST devolvió la página HTML de error del edge) |
| UGO Cross Performance Runtime | `39355590417` | **FAILURE** (terminó después) | `118409500076` | — |
| Auth Isolation / Cross Security / Hugo Timeout / Hugo Voice / Cross Errors / Core CI | — | **SUCCESS** (6) | — | — |

### Corrida `73177464` — runs iniciados 2026-10-20T01:58:53Z (mismo árbol de código, docs delta)

**7 FAILURE**: Profile Photo `39356400301`, Hugo Provider Actions `39356400392`, Admin Realtime `39356400372`,
Cross-role `39356400352`, P0 `39356400381`, Cross Performance `39356400403`, Operating Zone `39356400361`.
**6 SUCCESS**: Auth Isolation `39356400302`, Cross Security `39356400430`, Hugo Timeout `39356400451`,
Hugo Voice `39356400336`, Cross Errors `39356400349`, Core CI `39356400358`.

### Datos clave de la revalidación

- `1cdd4c19 → 53a31017` es **sólo documentación** (1 commit, `docs/ugo-hive/IMPLEMENTATION_STATUS.md`), y aun
  así el conjunto de fallos cambió (Profile Photo y P0 pasaron de PASS a FAIL). El mismo código produjo
  13/13 en `28b3e42`, 3 fallos en `1cdd4c19` y 7 fallos en `73177464`: **variabilidad total, no regresión**.
- Durante la misma ventana corrieron **al menos tres suites en paralelo**: PR #533 (`01:35`, `01:49`, `01:58`),
  la otra sesión Arena en `arena/607fd3ca-ugo-admin-panel` / PR #530 (`01:44`, `02:01`) y los workers
  programados de `main` (crons cada 15 min + cadenas `workflow_run` con runs cada ~4 min: `39355018059`,
  `39355436401`, `39355868663`, `39356783757`, `39356911808`…). Cada suite dispara ~14 workflows que
  **empiezan su paso runtime casi al mismo segundo**.
- Estado de la plataforma consultado en el momento: **status.supabase.com → "We're fully operational"**
  (sin incidente regional publicado). Los errores 504/522 son del **proyecto TEST compartido saturado**,
  no de una caída global de Supabase.
- La rama `arena/607fd3ca` corrió la misma suite dos veces (`01:44:35` y `02:01:32`) con el **mismo patrón**
  de fallos (Admin Realtime, Hugo Provider Actions, Profile Photo, Cross Performance…): reproducido
  independientemente de la rama.

## 2. Causa raíz

**Contención del único proyecto UGO TEST por suites paralelas + grupos de concurrencia ausentes o
incorrectos + los scripts de fixture no toleran fallos transitorios del plano de control.** Tres capas:

1. **Saturación simultánea**: ≥2 suites de 14 workflows + workers de `main` golpean GoTrue/PostgREST/Realtime
   al mismo tiempo. Síntomas observados con evidencia directa: Cloudflare `522 Connection timed out` (REST),
   `AuthRetryableFetchError: Gateway Timeout` 504 (GoTrue `createUser`), `TypeError: fetch failed` (auth-js),
   y `canceling statement due to statement timeout` en corridas anteriores (RPC con `pg_advisory_xact_lock`).
2. **Grupos de concurrencia**:
   - `provider-profile-photo-runtime.yml` **no tenía ningún grupo** pese a usar el proveedor designado
     compartido (`proveedor.ugo.test`): dos ramas a la vez pisaban `foto_perfil_path` y la assert de
     limpieza `PROFILE_PHOTO_CLEANUP_REQUIRED` fallaba por diseño, no por producto.
   - `provider-operating-zone-runtime.yml` **no tenía grupo**: el RPC fija un advisory lock sobre un fixture
     QA de ids fijos; la segunda ejecución concurrente esperaba el lock más allá del `statement_timeout`.
   - Admin Realtime / Hugo Provider Actions / Cross-role / Cross Performance tenían grupos **por rama/PR**,
     o sea las suites de distintas ramas corrían en paralelo sin límite.
3. **Sin diagnóstico en 4 workflows**: los fallos terminaban en `Process completed with exit code 1` sin
   volcado (los logs descargables viven fuera del allowlist de red de esta sesión: `results-receiver.
   actions.githubusercontent.com` y `*.blob.core.windows.net` inaccesibles; anotaciones limitadas a 10/check).

## 3. Correcciones aplicadas (esta sesión, rama `arena/5516cefe-ugo-admin-panel`)

Cambios mínimos, **sin relajar ningún assert, sin tocar seguridad, sin migraciones, sin simulaciones**:

1. **`scripts/lib/transient-retry.mjs`** (nuevo): reintento acotado (4 intentos, backoff exponencial 1.5s→10s)
   **sólo** para la clase de errores transitorios observados (`AuthRetryableFetchError`/504, 502/503/429,
   `fetch failed`/`ECONNRESET`/`ETIMEDOUT`, SQLSTATE `57014` statement timeout, HTML 522/524 del edge).
   Errores de comportamiento (`ADMIN_REALTIME_TIMEOUT`, transiciones inválidas, permisos, etc.) **no se
   reintentan** y se propagan al primer intento. `createUserWithRetry` reutiliza el usuario si el primer
   intento transitorio ya se aplicó (`email_exists` → `listUsers`). `fetchWithTransientRetry` para URLs
   públicas (CDN de storage con 522).
2. **`tests/contracts/transient-retry.test.mjs`** (nuevo): 11 tests offline que fijan la clasificación
   (transitorio vs. fallo-under-test) y el agotamiento de intentos.
3. **Wiring en los scripts que fallaron** (setup/fixtures SÓLO; asserts intactos):
   `role-ui-fixtures.mjs` (createUser + upserts), `hugo-provider-actions-runtime.mjs` (createUser×2 + RPC
   prepare), `admin-realtime-runtime.mjs` (signIn, perfil admin, createUser, upserts, categorías),
   `provider-operating-zone-runtime.mjs` (RPC con 5 intentos), `provider-profile-photo-runtime.mjs`
   (signIn, lecturas, upload con tolerancia a 409 tras reintento, fetch público, cleanup).
4. **Workflows** (6):
   - `admin-realtime`, `cross-performance`, `role-ui`, `hugo-provider-actions` → grupo **repo-wide por
     workflow** `ugo-runtime-timing-singleflight-${{ github.workflow }}` (cada proof timing corre una vez
     a la vez en todo el repositorio, todas las ramas, sin cancelarse entre workflows distintos).
   - `provider-operating-zone` → grupo nuevo `ugo-provider-operating-zone-runtime` (serializa el advisory
     lock del fixture QA entre ramas).
   - `provider-profile-photo` → grupo `ugo-test-shared-provider-fixture` (igual que gps/debt/arrival/ui:
     correcto para el proveedor designado compartido).
   - Los 6 workflows vuelcan el runtime con `tee` y publican las últimas 10 líneas como
     `::error` en `if: failure()` → futuros fallos quedan visibles en anotaciones sin descargar logs.

### 3.1 Iteración detectada en la primera corrida del fix (02:34:02Z, PR #535)

Al compartir **un mismo grupo entre workflows distintos**, GitHub cancela los runs *pending* del grupo
en cuanto entra otro run nuevo («any previously pending job or workflow in the concurrency group will be
canceled»): en el primer batch los grupos `ugo-runtime-timing-singleflight` cancelaron
`UGO Admin Realtime` (`39359617505`) y `UGO Cross-role UI` (`39359617493`). Corrección inmediata: el
grupo pasó a `ugo-runtime-timing-singleflight-${{ github.workflow }}` — **single-flight por workflow en
todo el repo (todas las ramas)**, sin colisión entre workflows distintos. Este es el motivo exacto por el
que los grupos originales del repo siempre incluían `github.workflow` o un prefijo propio.

### 3.2 Resultado del primer batch con fixes y evidencia nueva (02:34–02:45Z, PR #535)

Los workflows con `::error` ahora publican la causa exacta (las anotaciones reemplazaron al `exit 1` mudo):

- **Ventana de 504 sostenida en GoTrue**: Hugo Provider Actions (`39359617460`, `39359897024`),
  Admin Realtime (`39359897518`), Cross-role (`39359897140`), Profile Photo (`39359617508`,
  `39359897178`) y Cross Performance (`39359617548`, `39359897057`) fallaron TODOS con
  `{status: 504, __isAuthError: true}` en `signInWithPassword`/`createUser`. Cross Performance ya traía
  **su propio** login con 7 intentos/`cap 20 s` (~71 s de presupuesto) y igual falló → la ventana de 504
  duró **≥ 2–3 minutos** (≈02:34–02:45Z). `UGO TEST Auth Isolation` (autenticación más liviana, corrida
  temprana) pasó en ambos batches → GoTrue no estaba globalmente caído, sino saturado en ráfagas.
- **Operating Zone `39359617465`**: los 5 intentos del RPC terminaron en `code: '57014'`
  (statement timeout) y el paso Runtime tardó ~10 min → el RPC esperaba/bloqueaba más de lo que el
  reintento podía cubrir.
- Contexto: en esa ventana **no corría la otra sesión** (último batch de `arena/607fd3ca` a las 02:01Z) y
  los workers de `main` estaban `skipped`; el exceso vino de los **dos batches propios solapados**
  (02:34 + 02:37) — una tercera sesión `arena/9a1da8aa` cerró su corrida a las 02:22Z. Lección operativa:
  **una sola corrida de suite a la vez por repositorio**.

Iteración 2 aplicada sobre esta evidencia (mismo PR #535):

- Defaults del helper subidos a **6 intentos / base 2 s / tope 15 s** (62 s de backoff puro) y log final
  `agotó N intentos` para que quede dentro del `tail` de anotaciones.
- `cross-performance`: su login propio pasa de 7 intentos/20 s a **10 intentos/30 s** (~2.5 min), porque
  su evidencia demostró que 71 s no cubren la ventana observada.
- `provider-operating-zone`: **plazo por intento de 45 s** (`CLIENT_DEADLINE_45000MS`, SQLSTATE 57014)
  + 4 intentos/4 s → falla temprano y legible en lugar de colgar 10 min.

## 4. Validación local (misma sesión, misma base `cbd671b6`)

- `npm run build` (`verify:test-env` + `tsc -b` + `vite build`) → **PASS**.
- `node --test tests/contracts/*.test.mjs` (suite completa de contratos) → **1440 tests: 1438 PASS / 0 FAIL /
  2 SKIP** (mismo patrón baseline documentado por la sesión vecina).
- Focal de los contratos tocados (7 archivos, incluye el nuevo) → **31/31 PASS**.
- `npx eslint` sobre los 8 archivos JS tocados → **0 errores**.
- `node --check` de los 6 scripts modificados → OK; los 6 workflows parsean como YAML correcto.
- **No se ejecutó runtime contra TEST desde la sesión**: el sandbox sólo permite `github.com`/`api.github.com`
  y `tmossnqfwfwjrtzwcbmm.supabase.co` es inaccesible desde aquí (TLS bloqueado). La prueba runtime real
  corresponde a CI.

## 5. Bloqueos y límites de la sesión (para retomar sin repetir)

1. **Sin rerun ni dispatch**: `gh run rerun` y `POST .../workflow_dispatch` devuelven
   `403 Resource not accessible by integration` (el token de la App de GitHub de Arena no tiene permiso
   `workflow`). Reproducción = nueva corrida de CI; crear un PR desde esta rama dispara los workflows.
2. **Sin logs crudos**: descarga de logs de Actions bloqueada por la red del sandbox; la evidencia se
   recuperó vía API de check-run annotations (límite 10/check).
3. **Sin acceso Supabase**: conector Supabase de Arena devuelve `403` para `tmossnqfwfwjrtzwcbmm`
   (`list_projects` vacío) — mismo bloqueo que documenta la sesión vecina; la migración
   `20261019233520_defer_insert_settlement_until_assignment.sql` sigue **sin aplicar en TEST**
   (BLOCKED_HUMAN, credenciales) y no se tocó.
4. **Rama del PR #533 intocable desde esta sesión** (la sesión trabaja sobre `arena/5516cefe-ugo-admin-panel`
   por política de Arena): los cambios de este checkpoint están listos para cherry-pick/comentario en el PR.
5. **Netlify** Header/Pages/Redirect fallan en todos los SHAs (ruido de integración preexistente, ajeno);
   GitHub Pages sigue siendo el canal web vigente; no se gastaron despliegues Vercel/Netlify.

## 6. Próxima acción exacta

1. Abrir PR desde `arena/5516cefe-ugo-admin-panel` (o cherry-pick de esta rama hacia
   `integration/arena-green-provider-gps-20261020`) para que los 6 workflows corran con single-flight +
   reintentos y se obtenga evidencia verde en CI.
2. Verificar en la corrida posterior: los 6 workflows antes en rojo, con artefactos `*-runtime.json`
   y `result: PASS`; registrar run ID + SHA.
3. Si persiste un fallo, las anotaciones `::error title=…` ahora muestran la línea exacta (nuevo flujo).

`TASK_ID | STATUS | REPO | BRANCH | SOURCE_SHA | RESULT_SHA | TESTS | RUN_ID | EVIDENCE | JUDGE | SENTINEL | COST | BLOCKER | NEXT_TASK`

`CI-TEST-CONTENTION | FIXED_LOCAL_PENDING_CI | ugo-admin-panel | arena/5516cefe-ugo-admin-panel | cbd671b6 | (ver commit de este checkpoint) | 1440 contratos: 1438 PASS/0 FAIL/2 SKIP; focal 31/31; build PASS; eslint 0 | diagnóstico sobre runs 393555904xx/393564003xx de PR533 (SHA 53a31017 y 73177464) | este documento + diff de 6 workflows y 6 scripts | no ejecutado (runtime requiere CI) | no consultable desde el sandbox (red/403) | US$0; sin despliegues | rerun/dispatch 403 y Supabase 403 en la sesión | abrir PR de la rama y verificar los 6 workflows en verde en un SHA exacto`
