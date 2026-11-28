# UGO Hive · worker runtime

Worker de la cola de `hive` para el paquete **2.2.0**. Sin dependencias nuevas, sin SDK,
sin framework: `node:child_process` + el `psql` del sistema. Coste de ejecución: USD 0.

```
reserve → Sentinel → presupuesto/circuito → proveedor → Judge → complete | fail
```

Cada paso es su **propia** transacción corta. El token de fencing se reenvía en cada
transición: si el lease se perdió, el servidor responde `LEASE_LOST` y el worker **no**
marca nada como hecho.

## Ficheros

| Fichero | Para qué |
| --- | --- |
| `worker.mjs` | bucle acotado, health opcional, SIGTERM/SIGINT, `--self-check`, `--dry-run`, `--once` |
| `db.mjs` | cliente `psql` (credencial por entorno, `:'var'` en vez de concatenar SQL) |
| `config.mjs` | configuración por entorno, límites duros, `redact()` de secretos |
| `providers.mjs` | `mock` (sólo pruebas), `local` (loopback aprobado), `openrouter`/`openclaw` (cerrados), `freellmapi` (cerrado por política) |
| `sentinel.mjs` | guardas deterministas **antes** de ejecutar |
| `judge.mjs` | veredicto determinista **sobre** el resultado |
| `emergency.sh` | interruptor de emergencia (archivo local + ajuste en base) |
| `run.sh` | arranque con techo de un solo trabajo y un solo agente |
| `sql/worker_login.sql` | aprovisiona el **login** del worker con guardas y verifica privilegios |

## Qué garantiza

- **Identidad separada.** El worker se conecta con un login miembro de `hive_worker`
  (nunca `hive_migrator` ni superusuario). Sentinel rechaza la ejecución si detecta
  superusuario o ausencia del rol: códigos `SENTINEL_PRIVILEGED_CONNECTION`,
  `SENTINEL_NOT_WORKER_ROLE`.
- **Sin escritura directa.** El login no tiene `INSERT/UPDATE/DELETE/TRUNCATE` ni DDL;
  sólo `EXECUTE` de las funciones de cola. Lo comprueba `sql/worker_login.sql` (12 checks)
  y las pruebas (`tests/hive/worker-runtime.test.mjs`).
- **Fallo cerrado.** Sin ruta gratuita aprobada no hay llamada:
  `NO_VERIFIED_FREE_ROUTE`. `mock` exige `HIVE_WORKER_TEST_MODE=1`; `local` exige loopback
  y aprobación explícita.
- **Coste verificado, no asumido.** El Judge exige que el proveedor declare `cost` numérico:
  `VERIFIED_ZERO` aprueba, `COST_NON_ZERO` y `UNVERIFIED` rechazan (`COST_NOT_ZERO`,
  `COST_UNVERIFIED`). Sin declaración, la tarea queda `FAILED` y `result = null`.
- **Agente verificado antes de ejecutar.** `--self-check` comprueba que el agente existe en
  `hive.agents` y está `OPERATIVE`; `scripts/hive/agent-preflight.mjs` lo informa sin
  ejecutar nada.
- **Consumo acotado.** `maxIterations`/`maxJobs` (por defecto **1 y 1**), lease 120 s,
  latido cada lease/3, backoff con jitter, y presupuesto del servidor
  (`hive.quota_state` + `record_provider_call`): al 85 % se suspende, al 95 % se bloquea.
- **Efecto idempotente.** `complete_job(..., p_effect_key)` inserta en `job_effects` con
  `ON CONFLICT DO NOTHING`: la tarea se ejecuta *at least once*, el efecto **una vez**.
- **Nada sensible en logs.** `redact()` elimina cadenas de conexión, `Bearer`, `sk-…`,
  `password=` y cadenas largas hexadecimales. La URL viaja por variables `PG*` del hijo,
  nunca por `argv`.
- **Parada limpia.** `SIGTERM`/`SIGINT` dejan de reservar; el trabajo en curso termina o
  el lease expira y `recover_expired_leases` lo devuelve a la cola.

## Puesta en marcha (TEST)

```bash
# 1 · (operador con rol de migraciones, una sola vez) crear el login del worker
psql "$HIVE_MIGRATOR_DATABASE_URL" \
     -v hive_confirm=APLICAR \
     -v hive_password="$(openssl rand -base64 32)" \
     -v hive_login=hive_app \
     -f hive/worker/sql/worker_login.sql

# 2 · el worker sólo ve su propia URL
export HIVE_WORKER_DATABASE_URL='postgresql://hive_app:…@…neon.tech/hive?sslmode=require'
export HIVE_WORKER_AGENT='hugo-orchestrator'      # un único agente
export HIVE_WORKER_MAX_JOBS=1
export HIVE_WORKER_MAX_ITERATIONS=1

hive/worker/run.sh --self-check   # identidad, rol, interruptor, cola
hive/worker/run.sh --dry-run --once
hive/worker/run.sh --once         # una tarea, si hay una en cola
```

En GitHub: `UGO Hive worker TEST (self-check + one job)` (`.github/workflows/hive-worker-test.yml`),
sólo `workflow_dispatch`, exige `confirm=EJECUTAR` y el secreto `HIVE_WORKER_DATABASE_URL`.

## Variables

| Variable | Por defecto | Notas |
| --- | --- | --- |
| `HIVE_WORKER_DATABASE_URL` | — | obligatoria; login miembro de `hive_worker` |
| `HIVE_WORKER_PROVIDER` | `none` | `mock` (sólo pruebas), `openrouter`, `openclaw`, `freellmapi` (cerrado) |
| `HIVE_WORKER_AGENT` | — | `agent_key` o nombre; exige agente `OPERATIVE` |
| `HIVE_WORKER_MAX_ITERATIONS` / `_MAX_JOBS` | `1` / `1` | techos duros (1000 / 100) |
| `HIVE_WORKER_LEASE_SECONDS` | `120` | 30–600 |
| `HIVE_WORKER_EMERGENCY_FILE` | — | si existe, el worker no ejecuta |
| `HIVE_WORKER_HEALTH_PORT` | — | `/healthz` en `0.0.0.0` |
| `HIVE_WORKER_TEST_MODE` | — | `1` habilita el proveedor `mock` |
| `HIVE_OPENROUTER_MODEL` + `HIVE_OPENROUTER_APPROVAL` + `OPENROUTER_API_KEY` | — | sin los tres, `NO_VERIFIED_FREE_ROUTE` |

## Proveedores: estado real

| Ruta | Estado | Motivo |
| --- | --- | --- |
| `mock` | ✅ pruebas | servidor HTTP local determinista; `cost 0` declarado, sin red externa |
| `local` | ✅ loopback | FreeLLMAPI/OpenClaw **en la propia máquina**; exige `HIVE_LOCAL_PROVIDER_APPROVED=APROBADO` y URL `127.0.0.1`/`localhost`/`[::1]`. Además `localFetchGuard` bloquea cualquier salida que no sea loopback (`EGRESS_BLOCKED`) y `classifyUpstream` convierte un `upstream` remoto no declarado en `LOCAL_PROVIDER_UPSTREAM_UNVERIFIED` (error). Comprobación: `npm run hive:local-check`. Habla dos formas: `HIVE_LOCAL_PROVIDER_SHAPE=hive` (`POST /api/complete` → `{text, cost}`) u `openai` (`POST /v1/chat/completions`; el backend **debe** añadir `cost: 0`, si no la tarea se rechaza) |
| `openrouter` | ⛔ cerrado | exige modelo `:free`, precios en cero, evidencia de facturación y aprobación < 1 h (`policy.mjs`) |
| `openclaw` | ⛔ cerrado | sin endpoint aprobado (`HIVE_OPENCLAW_APPROVED=APROBADO` no existe todavía) |
| `freellmapi` | ⛔ cerrado | su pinning de proveedor no es verificable |

Ninguna de esas tres se abre "porque el worker lo pida": la elegibilidad la decide la
política ya revisada del repositorio, no una variable declarada por el cliente.

## Configurar la credencial sin exponerla

```bash
# comprobar la forma (no conecta, no imprime la URL)
HIVE_WORKER_DATABASE_URL='postgresql://…' node scripts/hive/secret-setup.mjs --check
# comprobar además la identidad real y que no sea superusuario
HIVE_WORKER_DATABASE_URL='postgresql://…' node scripts/hive/secret-setup.mjs --connect
# publicar en GitHub por STDIN (nunca por argv ni en logs)
HIVE_WORKER_DATABASE_URL_FILE=./worker.url node scripts/hive/secret-setup.mjs --set-github-secret
```

Rechaza: hosts que no son `*.neon.tech`, Supabase/Arena, falta de `sslmode=require`, usuarios
privilegiados (`postgres`, `neondb_owner`, …) y contraseñas en parámetros.

## Activar los dos logins (sin recrear roles)

Neon TEST ya tiene `hive_app` y `hive_console_ro` creados y **NOLOGIN**. El procedimiento
definitivo no crea usuarios: les pone contraseña, los deja `LOGIN` con sus límites y verifica
que siguen siendo mínimos.

```bash
node scripts/hive/activate-logins.mjs          # simulación (por defecto)
HIVE_CONFIRM_ACTIVATION=APLICAR node scripts/hive/activate-logins.mjs --apply \
  [--set-github-secrets]                      # publica las DOS URLs por stdin
```

Escribe `~/.ugo-hive/secrets/*-database-url.url` con modo **600**, nunca imprime la cadena y
se niega si el directorio de secretos cae dentro del repositorio.

## Una sola tarea con un solo agente

```bash
HIVE_CONFIRM_SINGLE_TASK=APLICAR node scripts/hive/run-single-task.mjs \
  --agent hugo-orchestrator --prompt "…" --out /tmp/tarea.json
```

Sin `HIVE_CONFIRM_SINGLE_TASK` sólo muestra el plan. Exige: agente existente y **OPERATIVE**,
**exactamente un** agente operativo, cola vacía, y después verifica `SUCCEEDED/DONE`, un único
efecto, la secuencia de eventos y el coste `VERIFIED_ZERO`.

## Vigilancia (24 h, sólo lectura)

```bash
HIVE_READER_DATABASE_URL='postgresql://…' node scripts/hive/watch-24h.mjs \
  --hours 24 --interval-seconds 300 --out docs/ugo-hive/evidence/hive-watch-24h.jsonl
```

Una muestra por intervalo; alertas críticas para leases vencidos, emergencia activa, cuota
suspendida, circuito abierto y lectura caída. Escribe `.jsonl` + `.summary.json` y sale con
código 1 si hay alguna alerta crítica.

## Interruptor de emergencia

```bash
hive/worker/emergency.sh on      # parada inmediata para todos los workers
hive/worker/emergency.sh status  # archivo local + valor en base
hive/worker/emergency.sh off     # retira el archivo (no toca la base)
```

Nivel 1 (archivo) no necesita base ni permisos. Nivel 2
(`hive.settings.emergency_stop=true`) se activa con el rol de migraciones y es visible desde
la consola; el worker lo lee en **cada** iteración.

## Pruebas

```bash
node --test tests/hive/worker-unit.test.mjs          # 31 · sin base de datos (incluye egreso)
HIVE_REQUIRE_REAL_POSTGRES=1 PG_VENV=/tmp/pgenv \
  node --test tests/hive/worker-runtime.test.mjs      # 13 · tarea única, emergencia nivel 2
PG_VENV=/tmp/pgenv node scripts/hive/worker-evidence.mjs
  # → docs/ugo-hive/evidence/hive-worker-e2e.json
```

Las pruebas de runtime cubren: ciclo completo, cola vacía, `--dry-run`, interruptor,
rechazo del Judge (no se marca DONE, no se guarda `result`), **fencing** (lease robado
durante la llamada → sin `SUCCEEDED`), proveedor caído (reprogramación con backoff),
`maxJobs`, parada, redacción de logs y ausencia de escritura directa del login.

## Lo que este runtime NO hace

- No despliega, no fusiona `main`, no toca PROD, no crea bases.
- No llama a inferencia externa hasta que exista una ruta aprobada.
- No sustituye a la consola: `HiveConsole` muestra datos reales **sólo** si existe
  `VITE_HIVE_CONSOLE_API` (estado en `docs/ugo-hive/HIVE_EXECUTION_STATUS_2026-11-27.md`, §17).
