# UGO Hive — ejecución autónoma, estado real por etapa

**Fecha:** 2026-11-27
**Rama de trabajo:** `arena/6f95c7c3-ugo-admin-panel` (base `main` @ `d2fe61e9ecc85e491d3839cb6885d3802d9c06de`)
**Entorno:** TEST únicamente. **Coste:** USD 0. **Producción:** intacta, sin una sola escritura.
**Regla aplicada:** ningún resultado de este documento se declara sin la verificación que lo respalda.

---

## 0. Accesos: verificado contra la realidad, no contra el supuesto

| Recurso | Estado real comprobado | Evidencia |
|---|---|---|
| `sebastisnzoth/ugo-admin-panel` (lectura/escritura de rama) | **DISPONIBLE** | `gh auth status`: sesión `sebastisnzoth`; clon local operativo |
| `sebastisnzoth/ugo-hive` | **BLOQUEADO** | `gh api repos/sebastisnzoth/ugo-hive` → `403 Resource not accessible by integration`; `git ls-remote` → `403` |
| PR `ugo-hive#1` | **BLOQUEADO** | depende del repositorio anterior (inaccesible) |
| Rama `fix/hive-isolated-health-20261127` | **NO EXISTE en `ugo-admin-panel`** | `git ls-remote --heads` sobre 682 ramas remotas: 0 coincidencias |
| PR #571 (main repo) | **CERRADO**, no abierto | `gh api .../pulls/571` → `state: closed`, head `feat/hive-local-freellmapi-guarded-20261022` |
| Conector Supabase | **SIN PROYECTOS** | `list_projects` → `{"items":[]}`; `list_organizations` → 1 organización |
| Neon `dry-heart-24391962` / `hive` | **BLOQUEADO** | no existe conector de Neon en esta sesión; sin credenciales en el entorno (`env` solo expone `GH_TOKEN`/`GITHUB_TOKEN`) |
| Conector Vercel | **DISPONIBLE** (plan hobby) | `list_projects` responde; `search=hive` → `{"projects":[]}` |
| Workflows `hive-*.yml` de la Etapa 5 | **NO EXISTEN en este repositorio** | 112 workflows presentes; solo 1 coincide con `^hive-` (`ugo-hive-pr518-preview.yml`) |
| Backend `ugo-hive-freeapi.onrender.com` | **NO VERIFICABLE** | sin salida de red a `onrender.com` desde este entorno |

**Consecuencia operativa:** las etapas que exigen el repositorio Hive, la base Neon o la
base Supabase (2, 4, 6 con datos reales, 8) no se pueden ejecutar ni verificar aquí.
No se sustituyen por simulaciones: quedan declaradas **BLOQUEADO** con la condición
exacta de desbloqueo. Lo que sí era ejecutable se ejecutó y se verificó abajo.

---

## 1. HECHO — verificado en esta sesión

### Etapa 1 · Inventario (HECHO)

- **13 departamentos recuperados con evidencia documental** (no inventados):
  D1 Dirección ejecutiva (6), D2 Operaciones (11), D3 Clientes (8), D4 Proveedores (10),
  D5 Crecimiento (7), D6 Confianza (8), D7 Finanzas (9), D8 Tecnología (12), D9 QA (12),
  D10 Legal (11), D11 Marketing (8), D12 Producto (9), D14 Auditoría (7).
  Suma exacta: **118 agentes**, 117 `IDLE` + 1 `DISABLED` (`corporate-audit-agent`).
  **No existe D13 en el canon de UGO**: el runtime registra 1–12 + 14.
  Fuente: `docs/UGO_HIVE_MASTER_DISENO_2026-10-18.md` §4–5 (snapshot de auditoría de UGO TEST)
  y `supabase/migrations/20260928004500_department14_independent_auditors.sql` (D14 exige
  exactamente seis agentes de assurance independientes).
- **Inventario de 118 `agent_key`** por departamento: registrado en la fuente anterior §5.
- **Acoplamiento Arena → Hive, medido:** de 333 archivos de runtime, **2** referencian Hive,
  ambos de UI y ambos bajo el gate Super Admin. Arena no importa nada de Hive en su arranque.
- **Activos Hive ya presentes en este repositorio** (27 archivos): consola Super Admin,
  funciones Edge `ugo-hive-status` / `ugo-hive-model-router` / `ugo-hive-backup-receiver`,
  migración de cuotas y circuitos, 3 suites de prueba y 10 evidencias previas.

### Etapa 3 · Optimización (HECHO lo que no requiere base de datos)

- **Defecto real corregido:** `HiveConsole` invocaba `ugo-hive-status` **sin cota de tiempo**.
  Un Hive colgado mantenía la petición abierta indefinidamente en el navegador. Ahora usa
  `AbortController` de 8 s, aborta al desmontar y limpia su temporizador. Una sola petición
  por montaje, sin `setInterval`, sin reintentos automáticos: Hive inactivo = cero tráfico.
- Los límites conservadores de cuotas y el `UNKNOWN` declarado ya existen en la política
  de inferencia (`ugo-hive-model-router/policy.mjs`) y en el motor SQL de reservas
  (`hive_reserve_model_call`: 20/día global, 10/actor, 5/misión, 15/proveedor, 20 000 tokens),
  con circuit breaker y backoff acotado a 300 s. **No aplicado remotamente**: preparación.

### Etapa 6 · Super Admin Hive Console (HECHO el catálogo, honesto)

- La consola mostraba 9 roles genéricos, inconsistentes con el canon real de 13 departamentos.
  Ahora muestra los **13 departamentos canónicos** desde una única fuente con procedencia
  declarada (`src/mvp/hiveCatalog.ts`: `source`, `capturedAt`, `environment`), etiquetados
  como catálogo y con **`EJECUCIÓN NO VERIFICADA`** en cada uno.
- Se añadió la **escalera de cuotas** (50/70/85/95 %) como política declarada, con
  `consumo real: DESCONOCIDO · límites conservadores aplicados`.
- **Cero datos ficticios:** ninguna cifra de tareas, agentes activos, consumo o resultados
  de Sentinel/Judge se muestra sin backend. Se eliminó la única afirmación implícita
  engañosa (los 9 roles "planned" presentados como si fueran el catálogo).
- Un botón de reintento manual (acción del usuario, no polling).

### Etapa 7 · QA y seguridad (HECHO el subconjunto ejecutable)

- **Gate de aislamiento ejecutable y probado:** `scripts/hive/isolation-audit.mjs`, con 6 reglas
  y 8 pruebas propias (`tests/hive/isolation-audit.test.mjs`). Veredicto sobre el árbol real:
  **PASS · 333 archivos · 0 hallazgos**. Evidencia: `docs/ugo-hive/evidence/isolation-audit.json`.
  El gate impide, por construcción, que Arena adquiera una dependencia de arranque con Hive,
  que un módulo no revisado hable con Hive, que una llamada quede sin cota, o que aparezca
  una credencial privilegiada en el bundle del navegador.
- **CI:** `.github/workflows/hive-independence-guard.yml` (sin secretos, `contents: read`,
  `workflow_dispatch` + `pull_request` filtrado por rutas) ejecuta guard de entorno TEST,
  auditoría de aislamiento y suites Hive.
- **Línea base reproducida antes de tocar código:** `21/21` pruebas Hive en verde,
  `npx tsc -b` limpio, `verify:test-env` OK (`330` archivos, TEST `tmossnqfwfwjrtzwcbmm`).

---

## 2. PENDIENTE — ejecutable, pero requiere URL/servicio en marcha

| Ítem | Por qué está pendiente | Condición de cierre |
|---|---|---|
| Chaos test de caída total de Hive en TEST | exige apagar Hive TEST y recorrer cliente/proveedor/admin | Hive TEST accesible + ventana de prueba |
| Enlace de la petición de estado de Hive con latencia real | el backend público de Render no es alcanzable desde el entorno de ejecución | salida de red a `onrender.com` o despliegue verificado |
| Verificación de que `hive_backup_versions` tiene RLS para lectura sin `service_role` | la tabla no se crea en las migraciones de este repositorio | acceso al esquema de la base Hive |
| Ejecución real de agentes, Sentinel y Judge | requiere runtime de Hive | acceso a `ugo-hive` + base Hive |

---

## 3. BLOQUEADO — intervención humana necesaria

1. **Acceso a `sebastisnzoth/ugo-hive` (HTTP 403).** Sin él no se pueden corregir los seis
   workflows de la Etapa 5, ni el PR #1, ni la rama `fix/hive-isolated-health-20261127`,
   ni conectar OpenClaw, ni demostrar ejecución real de agentes.
   *Acción:* conceder a la integración de GitHub de Arena permiso `repo` sobre `ugo-hive`.
2. **Credenciales de Neon `dry-heart-24391962` (base `hive`).** No hay conector de Neon ni
   variables de entorno. Sin acceso no se puede verificar el esquema, completar migraciones,
   crear roles de privilegios mínimos, ni medir consumo real.
   *Acción:* conectar Neon en Arena (o aportar `DATABASE_URL` de solo lectura como secreto
   del repositorio) — nunca en el chat.
3. **Conector Supabase sin proyectos.** El conector está autenticado pero `list_projects`
   devuelve vacío, así que ni TEST `tmossnqfwfwjrtzwcbmm` ni PROD son legibles.
   *Acción:* reconectar Supabase en Arena con acceso a la organización de UGO.
4. **Etapa 8 (24 h reales de observación).** No puede iniciarse sin 1 y 2: no hay runtime
   que observar, y declarar estabilidad sin observación violaría la propia regla de la etapa.

---

## 4. Hallazgos de seguridad y honestidad (no corregidos a ciegas)

1. **`supabase/functions/ugo-hive-status/index.ts` usa `SUPABASE_SERVICE_ROLE_KEY`** para leer
   `hive_backup_versions` y `usuarios`. Viola la regla "no `service_role`". Corregirlo exige
   conocer las políticas RLS de esas tablas; sin acceso a la base, un cambio a cliente de
   usuario podría romper la consola en producción. **Documentado, no tocado** (regla 1: no romper).
2. **`hive_backup_versions` no existe en las migraciones de este repositorio.** La función la
   consulta: es una dependencia de esquema no versionada aquí. Sin base accesible no se puede
   determinar si el esquema está completo (objetivo de la Etapa 2).
3. **La consola no tenía cota de tiempo** en su única llamada de red (corregido en esta rama).
4. **`src/server/scoutGmail.js`** contiene el nombre `SUPABASE_SERVICE_ROLE_KEY` dentro de `src/`,
   pero es código de servidor (`node:crypto`) no importado por el bundle. Verificado: no es
   una fuga al navegador. La regla del gate se acotó a código de cliente en consecuencia.

---

## 5. Archivos tocados en esta rama

| Archivo | Tipo |
|---|---|
| `scripts/hive/isolation-audit.mjs` | nuevo · gate de aislamiento (6 reglas, CLI + API pura) |
| `tests/hive/isolation-audit.test.mjs` | nuevo · 8 pruebas del gate y del árbol real |
| `.github/workflows/hive-independence-guard.yml` | nuevo · CI sin secretos |
| `src/mvp/hiveCatalog.ts` | nuevo · catálogo canónico 13 departamentos + política de cuotas |
| `src/mvp/HiveConsole.tsx` | modificado · abort acotado, reintento manual, 13 departamentos, cuotas |
| `tests/contracts/hive-superadmin-console.test.mjs` | modificado · +2 contratos (cota y catálogo) |
| `docs/ugo-hive/HIVE_ISOLATION.md` | nuevo · reglas, límites, rollback |
| `docs/ugo-hive/evidence/isolation-audit.json` | nuevo · evidencia generada |
| `docs/ugo-hive/HIVE_EXECUTION_STATUS_2026-11-27.md` | nuevo · este informe |

Sin cambios en PIX, Asaas, GPS, matching, autenticación ni en ninguna funcionalidad operativa
de Arena. Sin migraciones aplicadas. Sin secretos nuevos. Sin despliegues.

## 6. Procedimiento de recuperación

Todos los cambios son aditivos y reversibles sin pérdida de datos:

```bash
git revert <sha-de-este-commit>   # sobre la rama, nunca reset ni force push
```

- La UI Hive vuelve a su estado anterior; el catálogo y el gate desaparecen con su archivo.
- El workflow se desactiva eliminándolo (no consume minutos si no se ejecuta).
- No hay migración remota, ni escritura de datos, ni secreto: no existe estado que restaurar.
- Producción no se tocó en ningún momento, por lo que no requiere rollback.

## 7. Veredicto de la misión

**Hive NO está operativo** y no se declara operativo. Lo que se entrega es: inventario real
de los 13 departamentos y 118 agentes, aislamiento de Arena **demostrado y con gate ejecutable**,
un defecto de conexión corregido, una consola honesta y una lista exacta de bloqueos con su
condición de desbloqueo. Las etapas 2, 4, 5, 6 (datos reales) y 8 requieren los accesos del §3;
declararlas terminadas sin ellos sería exactamente lo que las reglas 10, 11 y 12 prohíben.

---

# Fase 2 — continuación sobre el PR #633 (mismo día)

## 8. Reintento de desbloqueo: resultado exacto

| Recurso | Reintento | Diagnóstico preciso |
|---|---|---|
| `ugo-hive` | **sigue 403** | `gh api /user/installations` responde: app **`arena-ai-coding-agent`**, installation **`158671462`**, `repository_selection: "all"`. Aun así `ugo-hive` (privado) no es accesible, mientras los repos **públicos** sí: la instalación no cubre repositorios privados de la cuenta. **No es un problema de permisos del token, sino del alcance de la instalación.** |
| Neon | **sin vía** | `list_connector_tools("neon")` → `unsupported`: Arena no ofrece conector de Neon. Ningún ajuste de mi lado lo habilita. |
| Supabase | **sigue vacío** | `list_projects` → `{"items":[]}` con organización visible. El conector está autenticado pero sin proyectos: hay que reconectarlo eligiendo la organización de UGO. |

### Qué autorización falta, exactamente, y dónde se habilita

1. **GitHub privado:** <https://github.com/settings/installations/158671462> →
   *Repository access* → **All repositories** (o *Only select repositories* + `ugo-hive`) → Save.
   Si el repositorio vive en una organización:
   `https://github.com/organizations/<org>/settings/installations/158671462`.
   Para que yo pueda escribir (ramas/PR en `ugo-hive`) el permiso **Contents** debe ser
   *Read and write*. No hace falta hacer público el repositorio ni facilitar tokens.
2. **Neon:** crear el secreto de repositorio **`HIVE_TEST_DATABASE_URL`**
   (GitHub → repo `ugo-admin-panel` → Settings → Secrets and variables → Actions → New
   repository secret). No se pide por chat, no se imprime y el workflow lo valida.
3. **Supabase:** reconectar el conector de Supabase en Arena seleccionando la organización
   de UGO, para que `list_projects` devuelva `trfsjuseqjxlhrxuvdsm` / `tmossnqfwfwjrtzwcbmm`.

## 9. HECHO en esta fase

### 9.1 Rollback corregido y **verificado ejecutándolo** (era incorrecto)

El procedimiento anterior (`git revert 0af0912`) no deshacía el PR: son **tres** commits.
Nuevo `scripts/hive/rollback-verify.mjs` hace el revert completo en un *worktree* desechable
y comprueba que el árbol vuelve a ser idéntico al base.

Resultado real: **PASS · 3 commits · 12 archivos · árbol base restaurado byte a byte**.
Procedimiento exacto en `docs/ugo-hive/HIVE_ISOLATION.md` §5 y en
`docs/ugo-hive/evidence/rollback-verification.json`. Sin `reset`, sin `force push`, sin
borrado de datos; si el PR se fusionara, el verificador detecta el merge y emite
`git revert -m 1 <merge-sha>`.

### 9.2 Capa de datos independiente de Hive, preparada y probada (P1)

> **Actualizado en la fase 3 (§12):** el monolito `hive/neon/001_hive_core.sql` fue
> **retirado** y sustituido por el paquete versionado `hive/neon/migrations/00…08` con
> `apply.sh` y rollback no destructivo. Lo que sigue describe ese trabajo original; los
> números vigentes están en §12.

Esquema `hive` para la base independiente, **idempotente**:

- cola persistente con `idempotency_key` única, lease, heartbeat y `max_attempts`;
- reserva atómica (`FOR UPDATE SKIP LOCKED` + candado consultivo) con **un solo job simultáneo**
  por defecto: escalar exige cambiar `hive.settings`, no un despliegue;
- recuperación de trabajos interrumpidos que reencola **exactamente una vez** o cierra como
  `FAILED` si se agotaron los intentos (sin bucles);
- backoff exponencial acotado a 1 h con jitter determinista; reintentos acotados;
- escalera de cuotas 50/70/85/95 % con `monthly_quota: UNKNOWN` declarado y circuit breaker;
- separación explícita **registrado / conectado / operativo / deshabilitado**;
- privilegios mínimos: roles `hive_worker` y `hive_reader`, funciones `SECURITY DEFINER` con
  `search_path = ''`, sin escritura directa de tablas, sin DDL, sin `EXECUTE` heredado por `PUBLIC`.

**13 pruebas reales contra Postgres embebido** (`tests/hive/neon-queue.test.mjs`) — todas en
verde. Las pruebas **encontraron tres defectos reales en mi primera versión del SQL**:
`available_at` nulo cuando el llamador pasa `NULL` explícito, funciones `SECURITY INVOKER`
sin permisos de tabla y `EXECUTE` concedido a `PUBLIC` por defecto. Corregidos y re-verificados.

**No aplicado a Neon** (no hay credencial). Aplicación en un solo comando cuando exista el
secreto: `gh workflow run hive-neon-migrate.yml` — manual, valida que el destino sea Neon y
**no** Arena/Supabase, aplica dos veces (prueba de idempotencia real) y sube evidencia sin
credenciales.

### 9.3 Consola: distinción registrada / conectada / operativa (P3)

Se añadió a la pestaña de departamentos la leyenda de estados con la verdad incómoda:
*sólo la API de Hive declara cuál aplica*. Ningún contador se inventa mientras no exista API.

## 10. Pruebas ejecutadas en esta fase

```
neon queue (PGlite) ................ 13/13 PASS
suites Hive + contratos + i18n ..... 42/42 PASS
audit-i18n ......................... actionableVisibleLiterals: 0
tsc -b ............................. limpio
isolation audit .................... PASS · 333 archivos · 0 hallazgos
rollback verify .................... PASS · árbol base restaurado
```

## 11. Veredicto de fase 2

**Agentes realmente operativos: 0. Departamentos funcionales: 0. URL de Hive TEST: ninguna
(no existe despliegue accesible).** El bloqueo ya está localizado con precisión quirúrgica:
una casilla de la instalación de GitHub (`158671462`), un secreto de Actions
(`HIVE_TEST_DATABASE_URL`) y una reconexión del conector Supabase. Con esos tres elementos
el trabajo preparado se aplica sin reescribir nada.

---

## 12. Fase 3 — paquete versionado, concurrencia real y base preexistente

### 12.1 HECHO (verificado ejecutándolo, no razonado)

| Elemento | Verificación | Resultado |
|---|---|---|
| Paquete `hive/neon/migrations/00…08` + `apply.sh` | `hive/neon/apply.sh apply` contra PostgreSQL **16.2** real | aplica en una transacción, `08_verify` pasa |
| Migración idempotente y aditiva | 13 pruebas PGlite | **13/13** |
| Base **preexistente** (`agents`/`jobs`/`provider_circuits` con otro diseño) | 7 pruebas con esquema legacy | **7/7** · 0 filas perdidas |
| **Concurrencia real** (procesos `psql` separados, PostgreSQL 16.2) | 8 pruebas | **8/8** |
| Puerta de destino | 5 escenarios de rechazo | rechaza proyecto/base/arena/marcador ajenos |
| Activación de agentes | prueba dedicada | 1 operativo, el 2.º da `OPERATIVE_LIMIT_REACHED` |
| Rollback | `rollback_non_destructive.sql` | conserva tablas y filas; 0 `drop` en el paquete |

Evidencia regenerable: `docs/ugo-hive/evidence/hive-neon-package.json`
(`node scripts/hive/neon-evidence.mjs`; ningún número escrito a mano).

Defectos reales encontrados por las pruebas en esta fase:

1. **Candado de sesión con vida propia** → la comprobación de concurrencia leía estado no
   confirmado y concedía **20 leases de 20** con `max_concurrent_jobs = 1`.
2. **Candado de transacción bloqueante** → un worker que mantenía su transacción abierta
   serializaba todas las reservas ajenas (5,04 s por 20 sesiones).
3. Corrección final: `pg_try_advisory_xact_lock` → respuesta inmediata `RESERVE_BUSY`,
   nunca bloqueo, y contrato de reintento acotado con backoff + jitter.
4. El candado `drop schema hive cascade` del procedimiento anterior, **eliminado**: el
   paquete no contiene ni una sola sentencia destructiva, y un workflow lo comprueba
   antes de aplicar.

### 12.2 PENDIENTE (bloqueado por acceso, no por trabajo)

- Aplicar el paquete a Neon: exige `HIVE_TEST_DATABASE_URL` (secreto de Actions) y el
  proyecto `dry-heart-24391962`. Instrucciones exactas, sin secretos, en
  `docs/ugo-hive/INTEGRATION_PACKAGE.md`.
- Rol de login del worker (`hive_worker` es grupo NOLOGIN): lo crea el operador.
- Un job real contra un proveedor: exige credencial de proveedor y consume presupuesto.

### 12.3 P5 · caída total de Hive: hasta dónde se puede demostrar hoy

Lo demostrado (**HECHO**):

- La auditoría de independencia recorre **333 archivos de runtime** y exige 0 referencias
  a Hive fuera de la consola Super Admin (`verdict: PASS`, `scripts/hive/isolation-audit.mjs`).
- Los **boot files** de Arena no pueden referenciar Hive (prueba que falla si se añade).
- La única llamada de red a Hive está acotada a **8 s**, con `AbortController`, sin
  `setInterval`, sin reintentos, y el chat/la inferencia están **desactivados** en la UI.
  Con Hive caído, la consola muestra `OFFLINE` / `SIN RESPUESTA EN 8 S` y Arena no
  cambia su arranque: no hay import de Hive en el camino de boot ni en las Edge Functions
  de Arena.

Lo **NO** demostrado, y por qué (**PENDIENTE/BLOQUEADO**, sin adornos):

- Una prueba E2E en navegador (caída simulada de Hive con la app abierta) exige un
  despliegue TEST. No existe: la instrucción vigente es **un único despliegue TEST final
  cuando todo esté aprobado**, y además no hay navegador headless disponible en este
  entorno (la descarga de binarios está fuera de la red permitida).
- Por eso P5 se declara **verificado a nivel de unidad + auditoría estática**, nunca
  "E2E demostrado". Inventar esa prueba sería exactamente lo que no se hace.

### 12.4 Inventario de tablas `hive.*` preexistentes vía conector Supabase

El conector Supabase está activado, y `list_projects` devuelve **`{"items":[]}`**: la
autorización concedida no expone ningún proyecto, así que **no se puede inspeccionar** si
`hive.agents` / `hive.jobs` / `hive.provider_circuits` existen en la base de Arena.

Consecuencia asumida: el paquete **no depende** de saberlo. Se comporta igual con base
vacía o con tablas legacy, y eso está probado (`tests/hive/neon-compat.test.mjs`, 7/7,
con `agents`/`jobs`/`provider_circuits` de otro diseño y 6 filas que sobreviven intactas).
Desbloqueo exacto: reconectar el conector Supabase en Arena autorizando el proyecto
`trfsjuseqjxlhrxuvdsm` (sólo lectura), o aportar el secreto `HIVE_TEST_DATABASE_URL` de Neon.

### 12.5 Veredicto vigente (sin cambios en lo esencial)

**Agentes operativos: 0. Departamentos funcionales: 0. URL Hive TEST: ninguna.
Consumo: USD 0 (cero llamadas). Cuotas mensuales: DESCONOCIDAS, límites conservadores
(20 llamadas / 20 000 tokens por proveedor y día).** Los 118 agentes están *catalogados*;
catalogar no es operar y ninguna prueba de este documento afirma lo contrario.

---

## 13. Fase 4 — correcciones P0 contra el esquema REAL de Neon

ChatGPT verificó directamente el proyecto `dry-heart-24391962`, base `hive`:
**9 agentes, 1 tarea finalizada, 0 pendientes**, con estas tablas:

```sql
hive.agents(id uuid, name text UNIQUE, status text, last_heartbeat timestamptz)
hive.jobs(id uuid, idempotency_key text, agent_name text, prompt text NOT NULL,
          status text, created_at timestamptz)
```

La versión 2.0.0 del paquete se había escrito contra un esquema supuesto. No se aplicó a
Neon, pero **habría fallado o re-encolado la tarea terminada**. Las doce correcciones:

| # | Corrección | Cómo quedó verificado |
|---|---|---|
| 1 | `02_catalog.sql` sobre `agents` real: `agent_key` se **añade** y se rellena con slug único de `name` (acentos plegados, duplicados por orden de `id`) y sólo **después** se crea el índice único; aborta si hay conflicto | 9 agentes reales conservan `name`; `agent_key` único; prueba de la réplica |
| 2 | `03_queue.sql` y `06_functions.sql` sobre `jobs` real (`idempotency_key`, `agent_name`, `prompt NOT NULL`, `status`, `created_at`) | `enqueue_job` exige `prompt` (`PROMPT_REQUIRED`); `agent_name` enlazado a `agents.name` |
| 3 | Tareas terminadas preservadas: `DONE→SUCCEEDED`, y el trigger **prohíbe** volver a `QUEUED` (`TERMINAL_STATE_CANNOT_REQUEUE`) | la tarea real sigue `SUCCEEDED` tras reaplicar, re-encolar y `UPDATE` directo |
| 4 | Compatibilidad `status ⇄ state` sin pérdida: trigger bidireccional + `legacy_status` con el valor original | `status='connected'` → `state=CONNECTED`; `state=CONNECTED` → `status='connected'`; `legacy_status='active'` intacto |
| 5 | `activate_agent` segura en concurrencia (`pg_try_advisory_xact_lock` + recuento + UPDATE en la misma transacción) | 10 sesiones reales simultáneas → **exactamente 1** `OPERATIVE`; el resto `ACTIVATE_BUSY`/`OPERATIVE_LIMIT_REACHED` |
| 6 | `reserve_job` no entrega trabajo a agentes deshabilitados/no autorizados (`skipped_unauthorized`), y ejecutar en nombre de un agente no operativo da `AGENT_NOT_AUTHORIZED` | prueba en PGlite y en PostgreSQL real con sesiones paralelas |
| 7 | `fail_job` valida el vencimiento del lease, igual que `complete`/`heartbeat`, con diagnóstico fino (`LEASE_EXPIRED` ≠ `LEASE_LOST` ≠ `TERMINAL`) | prueba dedicada en ambos motores |
| 8 | Identidad del destino anclada en el **servidor**: huella `sha256(base, oid, dueño, inet_server_addr, puerto)` persistida; primera aplicación con confirmación explícita; deriva → aborta | `DESTINATION_FIRST_APPLY_REQUIRED` sin confirmación; reaplicación posterior sin ella; huella `f9c5f898…` registrada |
| 9 | Pruebas contra **réplica exacta** del esquema informado | `tests/hive/fixtures/neon_existing_schema.sql` + `neon-real-schema.test.mjs` (6/6) |
| 10 | Todas las suites re-ejecutadas | **38/38**: cola 13 · compatibilidad 7 · réplica 6 · concurrencia real 12 |
| 11 | Publicado en el mismo PR #633 | commits de esta fase en `arena/6f95c7c3-ugo-admin-panel` |
| 12 | SHA final para que ChatGPT aplique y verifique | ver el mensaje de entrega y el comentario del PR |

### Ciclo completo verificado con `apply.sh` sobre PostgreSQL 16.2 real

```
preflight  → 9 agentes (active, disabled, idle, paused), 1 tarea, status DONE:1
apply sin confirmación → DESTINATION_FIRST_APPLY_REQUIRED (no escribe nada)
apply con confirmación → 13 departamentos · 127 agentes (9+118) · 1 tarea SUCCEEDED · 0 en cola
re-aplicar             → idempotente, mismos números
rollback no destructivo→ 127 agentes y la tarea SUCCEEDED siguen ahí
re-aplicar tras rollback → vuelve a operativo
```

### Defecto adicional encontrado probando (no leyendo)

El arnés creaba las bases en `SQL_ASCII` (initdb sin `--encoding`). Ahí `lower()` y
`translate()` trabajan byte a byte y `'QA – Regressão'` producía `qa-regressaeo`. Se
corrigió el arnés a UTF8 —como Neon— y se añadió `server_encoding` a `hive.meta` como
evidencia. Sin esta prueba, `agent_key` habría salido corrupto en un destino no-UTF8.

### Veredicto (sin cambios, ahora con el esquema real)

**Agentes operativos: 0. Departamentos funcionales: 0. URL Hive TEST: ninguna.
Consumo: USD 0. Cuotas mensuales: DESCONOCIDAS** (20 llamadas / 20 000 tokens por
proveedor y día). Los 127 agentes están catalogados (9 reales + 118 del canon); catalogar
no es operar.

---

## 14. Fase 5 — restricción real de `status` y huella del destino (v2.2.0)

ChatGPT verificó una incompatibilidad más: `jobs_status_check CHECK (status IN
('PENDING','RUNNING','DONE','FAILED'))`. La v2.1.0 escribía `status = lower(state)`
(`'queued'`, `'succeeded'`), que la restricción **rechaza**. Corregido:

| Requisito | Cómo quedó | Prueba |
|---|---|---|
| `status` compatible con los valores originales | proyección sobre el dominio real, leído de `pg_get_constraintdef`; si no encajara, `STATUS_DOMAIN_MISMATCH` y **no se borra la restricción** | 10/10 réplica + `HIVE_STATUS_DOMAIN` en el log de `apply.sh` |
| `SUCCEEDED→DONE`, `QUEUED→PENDING`, `LEASED→RUNNING` | función `hive.status_for_state()` usada por el trigger y por la migración | ciclo real `PENDING → RUNNING → DONE` en PostgreSQL 16.2 |
| `CANCELLED` sin perder significado | `state='CANCELLED'` (autoritativo), `status='DONE'` (proyección terminal), contado en `queue_metrics().cancelled` | prueba dedicada: `DONE / CANCELLED` y métrica = 1 |
| Un `UPDATE` directo de `status` no reactiva una tarea terminal | el trigger lanza `TERMINAL_STATE_CANNOT_REQUEUE` | `update ... set status='PENDING'` sobre la tarea `DONE` → error, `state` intacto |
| Restricciones reales en la réplica | `tests/hive/fixtures/neon_existing_schema.sql` incluye el `CHECK` literal | la restricción sigue existiendo tras migrar (consulta a `pg_constraint`) |
| Huella sin IP interna | v2: `sha256(base, oid, dueño, encoding, collate, ctype)`; la dirección se registra sólo como dato informativo; huellas v1 exigen re-anclaje explícito y quedan auditadas | 4/4 destino + reinicio real del servidor y reaplicación de `00` sin error |
| Concurrencia, idempotencia y preservación re-verificadas | 43/43 pruebas; ciclo `apply.sh` completo | ver abajo |

### Ciclo completo re-verificado con la restricción real (PostgreSQL 16.2)

```
preflight   → 9 agentes · 1 tarea · status DONE:1
apply       → HIVE_STATUS_DOMAIN: restricción real compatible, se conserva
              13 dept · 127 agentes · 1 SUCCEEDED · 0 en cola · version 2.2.0
ciclo real  → enqueue PENDING/QUEUED → reserve RUNNING/LEASED → complete DONE/SUCCEEDED
UPDATE status='PENDING' sobre la tarea cerrada → TERMINAL_STATE_CANNOT_REQUEUE
cancelación → status DONE / state CANCELLED · queue_metrics.cancelled = 1
rollback    → 127 agentes y 3 tareas intactas, CHECK intacto
reaplicar   → operativo de nuevo
```

### Veredicto (sin cambios)

**0 agentes operativos · 0 departamentos funcionales · sin URL Hive TEST · USD 0 · sin
deploy · sin merge · PROD intacta.** 127 agentes catalogados (9 reales + 118 del canon):
catalogar no es operar.

---

## 15. Fase 6 — runtime real del worker

La migración 2.2.0 ya está aplicada en Neon (ChatGPT). Lo que faltaba no era esquema: era
**algo capaz de ejecutar la cola con permisos separados y sin coste**. Eso es lo que hay
ahora en `hive/worker/` (detalle en `hive/worker/README.md`).

### Piezas y su estado real

| Pieza | Estado | Cómo se ha comprobado |
|---|---|---|
| Worker de cola (`worker.mjs`) | **OPERATIVO en local** | ciclo `QUEUED → LEASED → SUCCEEDED` contra PostgreSQL 16.2 y la réplica exacta |
| Rol de ejecución (`sql/worker_login.sql`) | **VERIFICADO** | 12/12 comprobaciones: miembro de `hive_worker`, no superusuario, sin `INSERT/UPDATE/DELETE/TRUNCATE`, sin DDL, con `EXECUTE` de cola |
| Sentinel | **ACTIVO** | rechaza superusuario, ausencia de rol, lease perdido, prompt vacío/largo, cuota suspendida, circuito abierto, emergencia |
| Judge | **ACTIVO** | reglas deterministas: texto vacío, fuga de secreto, coste ≠ 0, proveedor distinto al configurado, presupuesto cerrado → `JUDGE_REJECTED` y `result = null` |
| Interruptor de emergencia | **OPERATIVO** | archivo local (sin base ni permisos) + `hive.settings.emergency_stop` (nivel 2, rol de migraciones) |
| Pruebas | **21 unitarias + 11 de runtime**, y 102/102 en `tests/hive/*` | `node --test`, PostgreSQL real obligatorio (`HIVE_REQUIRE_REAL_POSTGRES=1`) |
| Evidencia | `docs/ugo-hive/evidence/hive-worker-e2e.json` | generada por `scripts/hive/worker-evidence.mjs` |
| Ejecución en TEST desde GitHub | **PREPARADO, sin ejecutar** | `.github/workflows/hive-worker-test.yml` (sólo `workflow_dispatch`, exige `EJECUTAR` y el secreto `HIVE_WORKER_DATABASE_URL`) |
| OpenRouter | **CERRADO** | `NO_VERIFIED_FREE_ROUTE`: no existe aprobación vigente (< 1 h) con precios en cero y evidencia de facturación |
| OpenClaw | **CERRADO** | no hay endpoint aprobado que cumpla la política |
| `freellmapi` | **CERRADO por política** | su pinning de proveedor no es verificable |
| `HiveConsole` con datos reales | **BLOQUEADO** | requiere endpoint TEST desplegado con lectura de Neon; no se simula (ver abajo) |

### Prueba E2E real, un único agente

```
réplica cargada   → 9 agentes · 1 tarea · CHECK status intacto
paquete 2.2.0     → 13 departamentos · 127 agentes · 1 tarea histórica preservada
rol worker        → 12/12 checks (sin escritura directa de tablas)
agente            → hugo-orchestrator OPERATIVE (max_operative_agents = 1)
tarea             → QUEUED → LEASED → SUCCEEDED / status DONE
Judge             → PASS · 77 tokens · coste 0 · mock local
efecto            → job_effects = 1 (idempotente)
logs              → 0 cadenas de conexión, 0 contraseñas
```

Fencing añadido a la evidencia por prueba dedicada: se roba el `lease_token` **durante** la
llamada al proveedor y el worker **no** completa (`LEASE_LOST`), la tarea sigue `LEASED` y
`result` queda `null`. Un proveedor caído reprograma con backoff (`RETRY_SCHEDULED`) en vez
de dejar la tarea colgada.

### Lo que sigue bloqueado, y por qué

- **Una tarea real contra Neon**: requiere una tarea encolada en la base `hive` y el secreto
  `HIVE_WORKER_DATABASE_URL` con un login miembro de `hive_worker`. Ambas cosas son
  operaciones con acceso directo a Neon → **coordinadas con ChatGPT** (crear el login con
  `hive/worker/sql/worker_login.sql`, encolar una única tarea, lanzar el workflow).
- **Inferencia gratuita**: hoy no hay ninguna ruta `:free` con aprobación vigente. El
  worker no la inventa; devuelve `NO_VERIFIED_FREE_ROUTE`.
- **`HiveConsole` con datos reales**: la consola lee de un endpoint, y ese endpoint
  (`supabase/functions/ugo-hive-status`) no debe apuntar a Neon sin despliegue y sin
  credenciales. Mientras eso no exista, la consola sigue en `READ_ONLY`/`TEST`: se prefirió
  no mostrar datos simulados como si fueran reales.

### Veredicto de la fase

**Runtime: OPERATIVO y probado en local con el rol de ejecución. Neon: sin cambios por mi
parte (migración 2.2.0 ya aplicada; no se ha escrito nada). Inferencia externa: CERRADA.
USD 0. Sin deploy · sin merge · PROD intacta.** Los agentes operativos siguen siendo **0**
en Neon: el worker puede ejecutar, pero sólo lo hará sobre una tarea encolada y con una ruta
de inferencia aprobada.

---

## 16. Fase 7 — endpoint autenticado, consola con datos reales y coste verificado

Punto de partida: ChatGPT creó y verificó `hive_app` en Neon TEST (miembro de `hive_worker`,
privilegios mínimos, límites de conexión), **NOLOGIN** hasta configurar credenciales. No se
creó ningún usuario de ejecución nuevo y no se repitió ninguna migración.

### Lo implementado

| Pieza | Estado | Evidencia |
|---|---|---|
| Endpoint `GET /api/hive/snapshot` | **OPERATIVO en local** | `hive/console-api/`; 8 pruebas de auth/CORS/cuotas + 7 contra PostgreSQL real |
| Rol de lectura independiente | **VERIFICADO** | `hive/reader/sql/reader_login.sql`: 11/11 checks (miembro de `hive_reader`, `default_transaction_read_only`, sin escritura, sin `reserve_job`) |
| HiveConsole con datos reales | **CONECTADA y condicional** | `src/mvp/hiveConsoleApi.ts` + `VITE_HIVE_CONSOLE_API`; sin endpoint no hace ninguna petición |
| Coste del proveedor | **YA NO SE ASUME 0** | `classifyCost()` → `VERIFIED_ZERO` / `COST_NON_ZERO` / `UNVERIFIED`; el Judge rechaza los dos últimos |
| Agente real | **VERIFICADO ANTES DE EJECUTAR** | `scripts/hive/agent-preflight.mjs` + `--self-check`; `AGENT_NOT_REGISTERED` / `AGENT_NOT_OPERATIVE` |
| Integración local FreeLLMAPI/OpenClaw | **SÓLO LOOPBACK** | proveedor `local`: `127.0.0.1`/`localhost`/`[::1]` + aprobación explícita + coste declarado |
| Configuración segura de secretos | **IMPLEMENTADA** | `scripts/hive/secret-setup.mjs` (`--check`, `--connect`, `--set-github-secret` por stdin) |
| Vigilancia 24 h | **PREPARADA** | `scripts/hive/watch-24h.mjs` (JSONL + resumen + alertas; código 1 si hay críticas) |
| Pruebas | **28 unitarias worker · 8 endpoint · 7 endpoint+BD · 9 vigilancia/secretos · 2 cliente** | `node --test tests/hive/*.test.mjs` |
| Evidencia | `docs/ugo-hive/evidence/hive-console-api.json` | `scripts/hive/console-evidence.mjs` |

### Prueba E2E (local, PostgreSQL 16.2, réplica exacta)

```
paquete 2.2.0     → 13 departamentos · 127 agentes
logins separados  → worker 12/12 · lectura 11/11 · 0 fallos
lectura           → INSERT/UPDATE/DELETE/DDL/reserve: DENIED
agente            → hugo-orchestrator OPERATIVE · exit 0 · max_operative_agents = 1
tarea             → SUCCEEDED/DONE · efecto 1 · Judge PASS
coste             → VERIFIED_ZERO declarado por el proveedor (mock.cost)
sin coste         → COST_UNVERIFIED → REJECTED · tarea FAILED · result = null
endpoint          → anónimo 401 · admin 403 · origen ajeno 403 · superadmin 200 (no-store)
vigilancia        → 2 muestras reales · HEALTHY · 0 cadenas de conexión en el JSONL
emergencia        → archivo creado → worker STOPPED → archivo retirado
preservación      → tarea histórica SUCCEEDED/DONE · CHECK intacto · 127 agentes
```

### Lo que sigue bloqueado

1. **`hive_app` está NOLOGIN.** Para la tarea real en Neon hace falta que ChatGPT lo ponga
   con contraseña (o rote la existente) y que entregue `HIVE_WORKER_DATABASE_URL` como
   secreto de GitHub. El mecanismo para publicarlo sin exponerlo ya está probado
   (`secret-setup.mjs --set-github-secret`).
2. **Login de lectura en Neon.** `hive_console_ro` debe crearse allí con
   `hive/reader/sql/reader_login.sql` (rol de migraciones). Sin él, el endpoint no puede
   arrancar en TEST: se niega si el rol no es de sólo lectura.
3. **Endpoint desplegado.** El workflow `hive-console-api-test.yml` comprueba forma de URL,
   identidad real y `/healthz`; el alojamiento sigue sin definirse y no se simula.
4. **Inferencia gratuita.** `openrouter` y `openclaw` siguen cerrados; `local` sólo loopback.
   Ver `docs/ugo-hive/FREE_PROVIDER_INVESTIGATION.md`.
5. **Vigilancia de 24 h.** Lista para ejecutarse en cuanto el endpoint tenga credenciales:
   no se puede vigilar lo que todavía no corre.

### Veredicto

**Endpoint implementado y probado · consola conectada de forma condicional · coste
verificado (no asumido) · rol de lectura separado y probado · agente verificado contra el
catálogo real · emergencia probada · vigilancia lista.**
Sin escrituras en Neon · sin deploy · sin merge · USD 0 · PROD intacta.

---

## 17. Fase 8 — integración operativa (13 puntos)

Ejecutada sobre el mismo commit base, contra **PostgreSQL 16.2 real** y la **réplica exacta**
del esquema de Neon TEST (`tests/hive/fixtures/neon_existing_schema.sql`). Los roles se crean
primero **NOLOGIN**, igual que están en Neon, para demostrar que la activación **no los
recrea**. Evidencia reproducible: `docs/ugo-hive/evidence/hive-ops-fase8.json`
(`PG_VENV=/tmp/pgenv npm run hive:ops-evidence`).

### Punto por punto

| # | Punto | Estado | Cómo se comprobó (no razonando: ejecutando) |
|---|---|---|---|
| 1 | Procedimiento definitivo de activación de los dos logins | **HECHO** | `scripts/hive/activate-logins.mjs`: simulación por defecto, `--apply` exige `HIVE_CONFIRM_ACTIVATION=APLICAR`, **12/12 checks**, escribe las URLs en `~/.ugo-hive/secrets` con modo **600**, rechaza un directorio dentro del repo y **nunca imprime la cadena** (`stdout_contains_dsn: false`) |
| 2 | `HIVE_WORKER_DATABASE_URL` / `HIVE_READER_DATABASE_URL` por secretos | **HECHO** | el script las publica opcionalmente con `--set-github-secrets` (stdin, vía `secret-setup.mjs`); nunca aparecen en el repositorio, ni en argv, ni en logs |
| 3 | Vercel Preview vs Render Free | **DECIDIDO, sin desplegar** | `docs/ugo-hive/TEST_HOST_EVALUATION.md`: Vercel no ejecuta un proceso con `psql` ni conserva estado; Render Free sí (750 h ≈ un servicio, se duerme a los 15 min). **Sin crear servicio** |
| 4 | Priorizar procesamiento local (OpenClaw/FreeLLMAPI) | **SÓLO RUTA LOCAL** | proveedor `local` = loopback + `HIVE_LOCAL_PROVIDER_APPROVED=APROBADO` + contrato `POST /api/complete`; ninguna ruta remota se abre «porque el worker la pida» |
| 5 | El proveedor local no redirige a servicios pagos | **VERIFICADO CON GUARDA** | `localFetchGuard` bloquea todo lo que no sea loopback (`EGRESS_BLOCKED`) y `classifyUpstream` convierte un `upstream` remoto sin declarar en `LOCAL_PROVIDER_UPSTREAM_UNVERIFIED` (error, no aviso). Evidencia: 0 conexiones externas, `cost.state = VERIFIED_ZERO` |
| 6 | Una tarea con un agente real en Neon | **BLOQUEADO** | los roles siguen **NOLOGIN** en Neon y no hay URL del endpoint: no hay a dónde conectarse. Ejecutado y verificado en local (ver más abajo) |
| 7 | Sentinel y Judge contra el resultado real | **HECHO en local** | tarea `SUCCEEDED` con efecto 1, eventos `ENQUEUED → LEASED → SUCCEEDED`; Judge **PASS** y coste `VERIFIED_ZERO`; con coste no declarado el Judge rechaza (`FAILED`, `result = null`) |
| 8 | Consola conectada al endpoint autenticado | **HECHO** | anónimo **401** · no superadmin **403** · superadmin **200** · `cache-control: no-store` · CORS sólo orígenes de la lista |
| 9 | 13 departamentos y 127 agentes con estados reales | **HECHO** | instantánea: 13 departamentos (ids `1..12,14`), **127** agentes, `agents_unassigned: 9` (agentes heredados sin departamento, declarados aparte en vez de repartidos), estados `1 operativo · 123 registrados · 0 conectados · 3 desactivados` |
| 10 | Interruptor de emergencia | **HECHO, dos niveles** | base (`hive.settings.emergency_stop`) → `STOPPED / EMERGENCY_STOP`; archivo (`EMERGENCY-STOP`) → `STOPPED / EMERGENCY_STOP_FILE`; visible en la consola (`emergency.stop`) |
| 11 | Pruebas E2E pendientes | **HECHO lo ejecutable** | suite Hive completa en verde (ver cifras abajo) + evidencia Fase 8 con 15 veredictos, todos `true` |
| 12 | Un único despliegue TEST | **PREPARADO, no desplegado** | `hive/console-api/Dockerfile` (Node 22 + `psql`, usuario sin privilegios, healthcheck) + checklist en `TEST_HOST_EVALUATION.md`; el despliegue espera al secretos y a la autorización |
| 13 | Vigilancia 24 h | **BLOQUEADA** | exige runtime funcional: sólo hay endpoint local. El vigilante está probado (ventana corta real, `HEALTHY`, 0 cadenas en el JSONL) y se lanzará cuando punto 12 esté arriba |

### Lo que cambió en el código (Fase 8)

- **Verificador de la consola reescrito**: `HIVE_CONSOLE_AUTH_MODE ∈ user | allowlist | service`.
  `user` es la ruta por defecto: clave **anónima** + token del usuario contra `/auth/v1/user` y
  `/rest/v1/usuarios` (RLS decide). `allowlist` no toca tablas. `service` es la única que usa
  clave privilegiada y el arranque lo anuncia como `PRIVILEGED_MODE`. Si el perfil no se puede
  leer, responde **503 `AUTH_UNAVAILABLE`**, nunca 200. Evidencia: `privileged_credentials_used: false`.
- **Guarda de egreso del proveedor local** y clasificación de `upstream` (arriba).
- **Tres scripts nuevos** (activación, comprobación de proveedor local, tarea única) y
  **dos suites nuevas** (`activation` 6/6, `frontend-secret-guard` 6/6).
- **Consola**: panel de los 13 departamentos con sus estados y `agents_unassigned`, sin polling
  (`polling_calls: 0`) y sin ninguno de los 296 archivos de cliente con cadena de conexión
  (`files_with_dsn: []`). La única variable `VITE_HIVE_*` es `VITE_HIVE_CONSOLE_API`.

### Cifras de la evidencia (`hive-ops-fase8.json`)

```
roles previos        → hive_app NOLOGIN · hive_console_ro NOLOGIN (no se recrean)
activación           → 12/12 checks · secretos 600 · DSN en stdout: no
conexiones           → worker hive_app (miembro de hive_worker, sin superusuario)
                       reader hive_console_ro (read_only, insert DENIED, select OK)
proveedor local      → LOCAL · VERIFIED_ZERO · latencia 52 ms · egreso externo 0
tarea única          → SUCCEEDED/DONE · efecto 1 · Judge PASS · 1 agente OPERATIVE
endpoint             → 401 / 403 / 200 no-store · 13 departamentos · 127 agentes
auth                 → 2 peticiones, sólo clave pública, token del usuario reenviado
emergencia           → base STOPPED · archivo STOPPED
vigilancia           → HEALTHY · 0 cadenas de conexión en el JSONL
preservación         → tarea histórica SUCCEEDED/DONE · CHECK intacto · 127 agentes
```

### Bloqueos vigentes (sin cambios, y son humanos)

1. `hive_app` y `hive_console_ro` **NOLOGIN en Neon**: falta que ChatGPT ejecute la activación
   (o la rote) — el procedimiento ya existe y está probado.
2. **Proveedor gratuito de la máquina del fundador sin verificar**: el contrato está probado
   contra un servidor local de pruebas; la verificación real es
   `npm run hive:local-check` en su equipo, que falla cerrado si el backend no declara coste 0.
3. **Coste cero remoto**: `openrouter` / `openclaw` / `freellmapi` siguen cerrados. No se abre
   ninguna ruta paga.

### Veredicto de la fase

**Procedimiento de activación definitivo y probado · endpoint que no usa credenciales
privilegiadas · proveedor local auditado (loopback + coste declarado) · una tarea con un
agente real en local · consola con los 13 departamentos y 127 agentes reales · emergencia en
dos niveles · alojamiento TEST decidido sin desplegar.** Puntos 6 y 13 siguen bloqueados por
credenciales del lado humano. **USD 0 · sin deploy · sin merge · PROD intacta.**
