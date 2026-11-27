# UGO Hive · capa de datos independiente (Neon TEST) — paquete v2.0.0

**Estado: paquete versionado, verificado y NO aplicado a Neon.**
No hay credencial de Neon ni conector en esta sesión (`list_connector_tools("neon")` →
`unsupported`). Aplicarlo exige el secreto `HIVE_TEST_DATABASE_URL`, que nunca se pide
por chat, nunca se imprime y nunca se escribe en el repositorio.

Este directorio sustituye al monolito `001_hive_core.sql` (retirado). Las migraciones
son aditivas, idempotentes y no destructivas: **no existe ninguna sentencia
`drop table` ni `drop schema` en todo el paquete**, y un workflow lo comprueba antes de
aplicar nada.

## Orden de aplicación (una sola transacción)

| Archivo | Qué hace |
|---|---|
| `00_destination_and_meta.sql` | Puerta de destino: exige `hive.target_project=dry-heart-24391962` y `hive.target_database=hive`, rechaza si `public` contiene tablas de Arena, si `hive.meta.neon_project_id` marca otro proyecto, o si el nombre de la base no es `hive`. Crea `hive.meta`. |
| `01_roles.sql` | Roles separados: `hive_migrator` (único con DDL), `hive_worker` (ejecuta la cola), `hive_reader` (sólo lectura). `revoke all on schema hive from public`. |
| `02_catalog.sql` | 13 departamentos (D1–D12 + D14, sin D13) y los **118 agentes** del canon, más `settings` conservadores y `activate_agent` / `deactivate_agent`. |
| `03_queue.sql` | `hive.jobs` con `idempotency_key` única, `lease_token` (fencing), `available_at`, `max_attempts`; `hive.job_events` append-only. |
| `04_job_effects.sql` | `hive.job_effects`: clave de efecto externo única → at-least-once con **efecto** único. |
| `05_provider_budget.sql` | `provider_daily_usage` y `provider_circuits`: presupuesto USD 0, escalera 50/70/85/95 %, `monthly_quota: UNKNOWN` cuando no se puede medir. |
| `06_functions.sql` | `enqueue_job`, `reserve_job`, `heartbeat_job`, `complete_job`, `fail_job`, `recover_expired_leases`, `queue_metrics`. |
| `07_grants.sql` | Privilegios mínimos por rol; retira el `EXECUTE` que Postgres concede a `PUBLIC`. |
| `08_verify.sql` | Verificación que **lanza excepción** si falta un departamento, un agente del canon, una columna crítica, una función o un rol, o si aparece una tabla de Arena dentro de `hive`. |

## Uso

```bash
# 0. Estado real del destino. SOLO LECTURA: qué existe ya, columnas, conteos exactos.
hive/neon/apply.sh preflight

# 1. Aplicar. Una transacción: si algo falla no queda nada a medias.
hive/neon/apply.sh apply

# 2. Verificar invariantes después de cualquier cambio.
hive/neon/apply.sh verify
```

La URL viaja en `HIVE_TEST_DATABASE_URL` (secreto de entorno). Los parámetros de la
puerta de destino viajan en `PGOPTIONS`, nunca en la línea de comandos ni en logs.
`apply.sh` rechaza por host cualquier destino Supabase/Arena **antes** de conectar, y
la puerta SQL lo vuelve a rechazar dentro de la base.

## Base preexistente: no se asume vacía

`hive.agents`, `hive.jobs` y `hive.provider_circuits` pueden existir ya con otro diseño.
El paquete usa `create table if not exists` + `alter table ... add column if not exists`
y `on conflict do nothing`: las filas existentes se conservan y sólo se añaden columnas.

Si la tabla preexistente contiene `idempotency_key` duplicados, la migración **aborta**
con `IDEMPOTENCY_KEYS_DUPLICATED` y no borra nada: decide el operador.

`tests/hive/neon-compat.test.mjs` (7 pruebas) aplica el paquete sobre un esquema legacy
real y comprueba fila por fila que nada se pierde ni se reescribe.

## Concurrencia real (no simulada)

PGlite es de una sola conexión: no puede demostrar nada sobre bloqueos. Por eso
`tests/hive/neon-concurrency.test.mjs` arranca un **PostgreSQL 16.2 real**
(`scripts/hive/pg-harness.mjs`) y lanza **un proceso `psql` por sesión**.

```bash
python3 -m venv /tmp/pgenv && /tmp/pgenv/bin/pip install pgserver
PG_VENV=/tmp/pgenv HIVE_REQUIRE_REAL_POSTGRES=1 node --test --test-concurrency=1 tests/hive/neon-concurrency.test.mjs
```

8 pruebas: 20 sesiones compitiendo por una plaza (exactamente 1 lease), 12 por 3 plazas,
token de fencing vencido, doble `complete` simultáneo (uno solo gana), efecto externo
idempotente, recuperación concurrente sin duplicar, y 10 sesiones encolando la misma
clave. En CI `HIVE_REQUIRE_REAL_POSTGRES=1` convierte la falta de PostgreSQL en fallo,
nunca en un verde silencioso.

### Contrato del worker (derivado de las pruebas)

1. Reservar en **su propia transacción corta**; nunca mantenerla abierta mientras trabaja.
2. Si la respuesta es `RESERVE_BUSY`, reintentar con backoff exponencial **acotado** y
   jitter; jamás un bucle cerrado. (La prueba lo hace en SQL, como `wait_reserve`.)
3. Toda transición exige `job_id` + `lease_owner` + `lease_token`: sin el token vigente
   la respuesta es `LEASE_LOST` y no se cierra el trabajo de otro.
4. `recover_expired_leases` reencola con backoff: no hay reintento en caliente.

## Rollback NO destructivo

`hive/neon/rollback/rollback_non_destructive.sql` retira permisos y funciones de
operación, libera los leases abiertos y deja **todas las tablas y filas intactas**.
Reaplicar el paquete devuelve el sistema a operativo sin pérdida de datos.
Nunca `drop schema ... cascade`, nunca `reset`, nunca `force push`.

## Lo que esto NO es

- **No es evidencia de agentes operativos.** Los 118 están catalogados; 0 operativos,
  0 departamentos funcionales. No se ha ejecutado un job real contra ningún proveedor.
- No hay URL de Hive TEST: no se ha aplicado nada a Neon.
- Consumo real: **USD 0** (cero llamadas a proveedores); cuotas mensuales
  **DESCONOCIDAS** y límites conservadores (20 llamadas / 20 000 tokens por proveedor y día).
- No sustituye al repositorio `ugo-hive`: cuando el acceso se habilite, este paquete se
  mueve allí sin cambios y este directorio queda como espejo de referencia.

Evidencia regenerable: `node scripts/hive/neon-evidence.mjs` escribe
`docs/ugo-hive/evidence/hive-neon-package.json` con versión del servidor, catálogo,
roles, funciones, sentencias destructivas encontradas (debe ser 0) y resultado de las
tres suites. Ningún número de esa evidencia está escrito a mano.
