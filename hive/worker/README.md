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
| `providers.mjs` | `mock` (sólo pruebas), `openrouter` y `openclaw` (cerrados), `freellmapi` (cerrado por política) |
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
  `NO_VERIFIED_FREE_ROUTE`. `mock` exige `HIVE_WORKER_TEST_MODE=1`.
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
| `mock` | ✅ pruebas | servidor HTTP local determinista; `cost 0`, sin red externa |
| `openrouter` | ⛔ cerrado | exige modelo `:free`, precios en cero, evidencia de facturación y aprobación < 1 h (`policy.mjs`) |
| `openclaw` | ⛔ cerrado | sin endpoint aprobado (`HIVE_OPENCLAW_APPROVED=APROBADO` no existe todavía) |
| `freellmapi` | ⛔ cerrado | su pinning de proveedor no es verificable |

Ninguna de esas tres se abre "porque el worker lo pida": la elegibilidad la decide la
política ya revisada del repositorio, no una variable declarada por el cliente.

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
node --test tests/hive/worker-unit.test.mjs          # 21 · sin base de datos
HIVE_REQUIRE_REAL_POSTGRES=1 PG_VENV=/tmp/pgenv \
  node --test tests/hive/worker-runtime.test.mjs      # 11 · PostgreSQL real + réplica exacta
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
- No sustituye a la consola: `HiveConsole` sigue en `READ_ONLY` hasta que exista endpoint
  TEST (ver `docs/ugo-hive/HIVE_EXECUTION_STATUS_2026-11-27.md`, sección 15).
