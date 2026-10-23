# UGO Hive — Local FreeLLMAPI integration checkpoint (2026-10-22 BRT)

> Historical checkpoint below. The real Mac inference later succeeded, and TEST now has an isolated job API. Read the current addendum at the end before attempting setup.

## Objective
Use the existing UGO scheduler to select a strictly read-only agent inference and call FreeLLMAPI on the user's Mac at `http://127.0.0.1:3001/v1`. Keep the existing Super Admin Hive console. No Render fallback, no remote backend writes, and no model control of UGO production.

## Changes on this branch
- `scripts/hive-local-freellmapi-client.mjs`: loopback-only API adapter, bearer from environment, bounded prompt/response, one concurrent request, bounded timeout and no redirects.
- `scripts/hive-local-agent-runner.mjs`: existing `scheduleTasks` chooses one explicitly requested `inference-only` task, refuses actionable capabilities and approval-requiring tasks; a model receives no tool credentials.
- `tests/contracts/hive-local-freellmapi-client.test.mjs`, `tests/contracts/hive-local-agent-runner.test.mjs`: network guard, authentication input validation, serialization, scheduler lease and capability guard contracts.

## Mac-only smoke test — NOT YET RUN
Use the locally cloned UGO repository and run the contract tests first:
```sh
node --test tests/contracts/hive-local-freellmapi-client.test.mjs tests/contracts/hive-local-agent-runner.test.mjs
```
After validation, supply the existing unified API key through an environment variable **locally** (never paste it in chat or commit it):
```sh
export HIVE_LOCAL_FREEAPI_KEY='(existing local key)'
HIVE_LOCAL_MODEL=qwen3-coder node scripts/hive-local-agent-runner.mjs
```
Expected result: `COMPLETED_LOCAL_INFERENCE` with real `answer`; this is not certification of autonomous missions.

## Hard gates
- No changes to `main`, production, Supabase, Render, or live Super Admin.
- No startup daemon, scheduled jobs, filesystem write permission, GitHub write permission, or MCP tools for model output.
- Never treat a passing mock contract as a successful Mac inference.
- Keep Empresa Autónoma OFF; never bypass existing autonomy gates.
- Future work: actual Mac run and same-SHA tests, authenticated local panel bridge, durable jobs, reboot and duplicate-delivery tests, regression checks for client/provider matching; no activation without evidence.

## Status
Code committed in isolated branch; same-SHA GitHub Actions test and Mac runtime smoke **pending**. No runtime proof claimed.


## Updated TEST integration — 2026-10-22

Mac actual smoke confirmed by owner: `COMPLETED_LOCAL_INFERENCE` from FreeLLMAPI and the localhost bridge responded `UGO PUENTE OK`. That is local-only evidence.

UGO TEST `tmossnqfwfwjrtzwcbmm` has three isolated Hive migrations applied: queue with RLS, retry/presence, and atomic user quota/idempotence. Endpoint `ugo-hive-local-jobs` v4 is ACTIVE in TEST with Super Admin JWT checks and a separate credential-hash worker authorization. No worker is enrolled as of this checkpoint. Direct database permissions to anon/authenticated are denied. SQL-only positive/negative lease and 10/min quota tests passed within ROLLBACK transactions; this is not a Mac↔TEST↔Super Admin E2E.

### First manual Mac connection (required because no remote control of owner Mac)

Use only the existing local worktree, and do not paste any secret into chat or GitHub. After the branch passes exact-SHA CI:

1. Fetch the existing PR branch in `~/ugo-hive-local` without discarding local work. Use `git status --short` and `git pull --ff-only` only if on `feat/hive-local-freellmapi-guarded-20261022` and the working tree is clean.
2. In one Terminal session, generate a fresh dedicated 256-bit worker secret: `export HIVE_TEST_WORKER_TOKEN="$(openssl rand -hex 32)"`. Keep the terminal private and open. Do not reuse the FreeLLMAPI key.
3. Calculate only its hash: `printf '%s' "$HIVE_TEST_WORKER_TOKEN" | shasum -a 256`. Copy only the 64-digit hash (not the token) into Super Admin → Hive Console → Register TEST worker. This enrollment requires an authenticated Super Admin session on the **candidate branch's local TEST frontend**, not the old published version. Do not register via anonymous requests.
4. Set `HIVE_LOCAL_FREEAPI_KEY` in the same private Terminal session using the preexisting key locally, without displaying the characters.
5. Run `node scripts/hive-local-test-daemon.mjs` from the root of the worktree. This is foreground only, polls TEST every 8 seconds, and can be stopped with Ctrl+C; it does not install services or launch at boot.
6. In authenticated candidate Hive Console, verify Mac Connected comes from heartbeat, submit a manual prompt, confirm a newly persisted SUCCESS answer from FreeLLMAPI, reload and verify history, then disconnect and verify offline.

Do not deploy/migrate production or enable Empresa Autonoma. If the Mac cannot run or lacks a credential, the release gate remains BLOCKED. Do not present a PR, green mock tests, or Active Edge status as delivered product.


## 2026-10-23 — Agentes de análisis TEST, sin autonomía

- Evidencia humana del mismo día: Mac worker registró `SUCCEEDED` y Chat IA devolvió una respuesta real correcta. La observación no valida aún todos los gates, arranque tras reinicio ni cuota de proveedor.
- En PR #571 se agregó selector de nueve perfiles (`Hugo`, `Architect`, `Developer`, `QA`, `Security`, `DevOps`, `Judge`, `Sentinel`, `Research`) a `HiveConsole.tsx`. Cada selección prepara un prompt acotado de análisis de solo lectura y usa exclusivamente el `create` autenticado del mismo endpoint TEST ya probado. Se conserva el límite de 4000 caracteres y la restricción de inferencia; no se crean jobs autónomos ni permisos de DB, GitHub o Shell.
- Nuevo contrato en `tests/contracts/hive-superadmin-console.test.mjs` comprueba selección, ruteo por cola ya existente y ausencia de acciones de ejecución/autonomía.
- Código: commit de interfaz `8e0d5209b3afb618f758adfb0e30bb2522b8f23b` y pruebas `2bfdf3699e5d445aea275cd078134844609d8f02`. **Pruebas SAME-SHA y preview publicado pendientes de comprobar; no declarar nuevos agentes E2E verificados.**
- Empresa Autónoma OFF; sin cambios de Supabase PROD, esquema SQL, claves ni matching. No confundir perfiles de análisis por prompt con agentes autónomos capaces de herramientas o colaboración multiagente.
- Próximo gate: CI Core/contratos del HEAD; comprobar preview Pages del nuevo HEAD; probar cada rol con prompt real y límites; evaluar RBAC, cuotas, errores y métricas; solo después considerar merge a main.


## 2026-10-23 — Corrección de atribución histórica y gate de despliegue

- Inspección TEST: `ugo-hive-local-jobs` sigue ACTIVE versión 4, `verify_jwt=false` con autorización interna del worker y Super Admin; no actualizar antes de validar el árbol revisado.
- En PR #571, las entradas antiguas sin cabecera de agente válida se etiquetan `Legacy`, no `Hugo`; el frontend hace lo mismo para respuestas sin campo `agent`. Esto elimina una falsa atribución de identidad. Se incorporó una aserción de contrato específica.
- SHA de código: `3fae819e6cb544611d1ac7c45ba041c19a368877` (Edge), `4936738bf4a52a9af789be3c4943ae2191c2e6e4` (UI), `ec92e622f06ce3d1165ce49f0a2d48d4a57c6cba` (contrato).
- Estado: código publicado en la rama, pero versión nueva NO desplegada en TEST, CI SAME-SHA todavía pendiente, E2E de nueve perfiles pendiente. Base de datos TEST y PROD sin cambios en esta intervención. Empresa Autónoma OFF.
- Siguiente gate: CI exacto, revisión seguridad, desplegar Edge solo TEST y verificar respuestas reales antes de fusionar PR.

## 2026-10-23 — Diagnóstico real de saturación FreeLLMAPI y reparación acotada

- Evidencia local aportada por el dueño: qwen3-coder-free vía Septor responde algunas llamadas y otras terminan 429 `free tier queue is saturated`; otras rutas gratuitas OpenRouter agotaron cuota. ENCRYPTION_KEY fue rotada localmente con 11 registros; no reproducir secretos en logs.
- Cambio: adapter FreeLLMAPI clasifica 429 y 503 con códigos sanitizados, captura Retry-After en segundos acotados a 3600 sin reenvío automático; rechaza JSON roto y respuesta vacía. El worker preserva un conjunto restringido de códigos de error para diagnosis sin exponer proveedor/credenciales.
- Tests agregados para 429/503/Retry-After, una llamada sin replay y excepción sanitizada. Implementado en rama PR #571; pruebas GitHub CI exact-SHA pendientes.
- **Límite importante:** `FAILED` sigue cerrando el job actual. No afirmar resiliencia completa, espera persistente ni retry automático sin rediseñar cola/lease/idempotencia para no duplicar una inferencia de resultado incierto. En caso de 429 la interfaz debe comunicar fallo recuperable y permitir nueva consulta humana, sin fingir ejecución automática.
- No se tocó Supabase TEST/PROD ni Render; no se activó Empresa Autónoma; no hubo claves nuevas.
- Próximo trabajo: confirmar CI same-SHA; diseñar transición persistente `RETRY_WAIT` por clase de fallo y presupuestos de reintentos (sólo rechazos HTTP conocidos sin inferencia ejecutada, no timeouts inciertos); validar migración aditiva y prueba contra TEST antes de desplegar; comprobar los nueve perfiles.
