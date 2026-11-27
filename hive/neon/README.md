# UGO Hive · capa de datos independiente (Neon TEST) — paquete v2.2.0

**Estado: paquete versionado, probado contra el esquema REAL de Neon, y NO aplicado por
esta sesión.** El esquema real lo verificó ChatGPT directamente en el proyecto
`dry-heart-24391962`, base `hive`: **9 agentes y 1 tarea finalizada, 0 pendientes**.

Correcciones acumuladas: la v2.0.0 asumía una tabla vacía (habría re-encolado la tarea
`DONE`); la v2.1.0 escribía `status = lower(state)`, incompatible con la restricción real
`jobs_status_check CHECK (status IN ('PENDING','RUNNING','DONE','FAILED'))`; la v2.2.0
proyecta `status` sobre ese dominio exacto y ata la huella del destino a atributos
estables, no a la IP interna que Neon cambia al reiniciar el compute.

## Esquema real (lo que hay, no lo que se supone)

```sql
hive.agents(id uuid, name text UNIQUE, status text, last_heartbeat timestamptz)   -- 9 filas
hive.jobs(id uuid, idempotency_key text, agent_name text,
          prompt text NOT NULL, status text, created_at timestamptz)              -- 1 DONE
alter table hive.jobs add constraint jobs_status_check
  check (status in ('PENDING','RUNNING','DONE','FAILED'));                        -- real
```

La migración **añade** columnas y nunca borra filas:

| Tabla | Columnas nuevas | Cómo se rellenan |
|---|---|---|
| `agents` | `agent_key` (único), `state`, `legacy_status`, `department_id`, `max_concurrency`, `source`, `last_seen_at`, `updated_at` | `agent_key` = slug único de `name` (acentos plegados, duplicados resueltos por orden de `id`); `legacy_status` guarda el `status` original; `state` se deriva de forma conservadora |
| `jobs` | `state`, `agent_key`, `department_id`, `priority`, `payload`, `result`, `available_at`, `attempts`, `max_attempts`, `lease_owner`, `lease_token`, `lease_expires_at`, `heartbeat_at`, `last_error`, `legacy_status`, `effect_key`, `finished_at`, `updated_at` | `state` se deriva de `status`; `legacy_status` guarda el original; `agent_key` se enlaza por `agent_name` |

### `status` ⇄ `state`: compatibilidad sin pérdida

| `status` real | `state` | Nota |
|---|---|---|
| `done`, `completed`, `succeeded`, `success`, `finished` | `SUCCEEDED` | **nunca** vuelve a `QUEUED`; el trigger lo impide explícitamente |
| `failed`, `error`, `errored` | `FAILED` | |
| `cancelled`, `canceled`, `aborted` | `CANCELLED` | |
| `pending`, `queued`, `new`, `todo` | `QUEUED` | |
| `leased`, `running`, `in_progress`, `processing` | `FAILED` + `last_error = LEGACY_IN_FLIGHT_NEEDS_REVIEW` | de una tarea en vuelo sin dueño conocido no se re-ejecuta nada a ciegas |
| cualquier otro | `FAILED` + `LEGACY_STATUS_UNMAPPED:<valor>` | no se adivina |

En `agents`: `disabled/inactive/paused/off/stopped/suspended` → `DISABLED`;
`connected/online/ready/healthy` → `CONNECTED`; **todo lo demás → `REGISTERED`**, incluido
`active`. Con 9 agentes `active`, promoverlos a `OPERATIVE` habría roto
`max_operative_agents = 1`. La activación es siempre explícita.

Un trigger `BEFORE INSERT OR UPDATE` mantiene `status` y `state` coherentes en ambos
sentidos: si cambia `state`, se refleja en `status`; si la herramienta externa escribe
`status`, se traduce a `state` sin promover nada. El valor original se conserva en
`legacy_status` y nunca se pierde.

### `state` → `status`: la proyección real (v2.2.0)

`status` **no admite** `queued`, `succeeded` ni minúsculas: la restricción real sólo
permite cuatro valores. `state` es la verdad operativa; `status` es su proyección.

| `state` (autoritativo) | `status` (proyección real) | Nota |
|---|---|---|
| `QUEUED` | `PENDING` | |
| `LEASED` | `RUNNING` | |
| `SUCCEEDED` | `DONE` | |
| `FAILED` | `FAILED` | |
| `CANCELLED` | `DONE` | **resolución explícita**: `CANCELLED` no existe en el CHECK; su significado exacto vive en `state`, y `status='DONE'` sólo indica "cerrada, sin trabajo pendiente". Se contabiliza aparte en `queue_metrics().cancelled` |

La restricción se **lee de la base** al migrar (`pg_get_constraintdef`): si el dominio real
no admitiera los cuatro valores canónicos, la migración aborta con `STATUS_DOMAIN_MISMATCH`
en lugar de eliminar la restricción o inventar valores. **Nunca** se borra una restricción.

Reglas del trigger que no se pueden saltar:

- una tarea terminal no vuelve a la cola: ni por `state`, ni por un `UPDATE` directo de
  `status` a `PENDING`/`RUNNING` (error `TERMINAL_STATE_CANNOT_REQUEUE`);
- un `RUNNING` escrito desde fuera recibe un lease: si el proceso muere, la recuperación lo
  reencola en vez de dejarlo colgado;
- `status` y `state` no pueden divergir: `08_verify` falla si algún `status` no proyecta su
  `state`.

## Orden de aplicación (una sola transacción)

| Archivo | Qué hace |
|---|---|
| `00_destination_and_meta.sql` | Identidad del destino: huella **estable** `sha256(base, oid, dueño, encoding, collate, ctype)` guardada en `hive.meta` — sin IP, porque Neon la cambia al reiniciar. Primera aplicación exige `hive.confirm_first_apply=APLICAR`; una huella v1 (con IP) exige `hive.confirm_fingerprint_reanchor=APLICAR` y queda auditada en `destination_fingerprint_v1`. Rechaza bases con huella de Arena. |
| `01_roles.sql` | `hive_migrator` (único con DDL), `hive_worker`, `hive_reader`; `revoke all from public`. |
| `02_catalog.sql` | 13 departamentos, `agent_key` único derivado de `name`, `state` conservador, trigger `status ⇄ state`, 118 agentes del canon, `activate_agent` con candado. |
| `03_queue.sql` | Adaptación al esquema real de `jobs`, traducción de estados, prohibición de re-encolar tareas terminadas, índices y trigger. |
| `04_job_effects.sql` | Efectos externos idempotentes por `effect_key`. |
| `05_provider_budget.sql` | Presupuesto USD 0, escalera 50/70/85/95 %, `monthly_quota: UNKNOWN`. |
| `06_functions.sql` | `enqueue_job` (exige `prompt`), `reserve_job` (sólo agentes operativos), `heartbeat_job`, `complete_job`, `fail_job` (valida vencimiento), `recover_expired_leases`, `queue_metrics`, `lease_state`. |
| `07_grants.sql` | Privilegios mínimos por rol; sin `EXECUTE` para `PUBLIC`. |
| `08_verify.sql` | Lanza excepción si falta algo, si **una tarea terminada quedó encolada**, si hay tareas sin `prompt`, si `agent_key` está duplicado, o si algún `status` sale del dominio real o no proyecta su `state`. |

## Uso

```bash
hive/neon/apply.sh preflight            # inventario real: agentes, status, tareas
HIVE_CONFIRM_FIRST_APPLY=APLICAR hive/neon/apply.sh apply   # sólo la primera vez
hive/neon/apply.sh apply                # posteriores: idempotente
hive/neon/apply.sh verify
```

La URL viaja en `HIVE_TEST_DATABASE_URL` (secreto). Los parámetros de la puerta de destino
viajan en `PGOPTIONS`, nunca en `argv` ni en logs. Si se conoce la huella esperada:
`HIVE_EXPECTED_FINGERPRINT=<sha256>`.

**Qué prueba la identidad del destino y qué no.** La variable `hive.target_project` la
escribe el cliente: no demuestra nada. La identidad se ancla en la huella del servidor
(`sha256` de base, oid, rol dueño, `encoding`, `collate` y `ctype`), que el cliente no puede
falsificar con `SET` y que hace abortar cualquier aplicación posterior sobre otra base.
La dirección observada se registra **sólo como dato informativo**: en v2.1.0 formaba parte
de la huella y un reinicio del compute de Neon la habría invalidado sin cambiar de base.
Lo que **no** demuestra: que el host sea de Neon — Postgres no expone el id de proyecto de
Neon en SQL. Está declarado así en `hive.meta` y en `08_verify`.

## Cola: contrato del worker

1. Reservar en **transacción corta**; nunca mantenerla abierta mientras se trabaja.
2. `RESERVE_BUSY` → reintentar con backoff acotado + jitter; jamás bucle cerrado.
3. Toda transición exige `job_id` + `lease_owner` + `lease_token`. Códigos:
   `LEASE_LOST` (no es tuyo / token viejo), `LEASE_EXPIRED` (era tuyo y venció),
   `TERMINAL` (ya está cerrada).
4. `reserve_job` **no** entrega trabajo dirigido a un agente que no esté `OPERATIVE`, ni
   acepta ejecutar en nombre de uno: `AGENT_NOT_AUTHORIZED`. Lo no entregado se informa en
   `skipped_unauthorized` y sigue en cola.
5. `prompt` es obligatorio (`PROMPT_REQUIRED`): la tabla real lo exige `NOT NULL`.

## Pruebas (43, todas en verde)

| Suite | Casos | Qué demuestra |
|---|---|---|
| `neon-queue.test.mjs` | 13 | cola, leases, reintentos acotados, cuotas, privilegios |
| `neon-compat.test.mjs` | 7 | otro diseño previo de `agents`/`jobs`/`provider_circuits`: 0 filas perdidas, duplicados de idempotencia abortan sin borrar |
| `neon-real-schema.test.mjs` | 10 | **réplica exacta** (con el `CHECK` real): 9 agentes y la tarea `DONE` intactos, proyección `PENDING/RUNNING/DONE`, `CANCELLED` conservado en `state`, un `UPDATE` directo no revive una tarea cerrada, `RUNNING` externo recuperable |
| `neon-destination.test.mjs` | 4 | huella estable (sin IP), invariante ante cambio de dirección, re-anclaje v1→v2 con confirmación, primera aplicación sin confirmación no escribe nada |
| `neon-concurrency.test.mjs` | 13 | PostgreSQL 16.2 real con un proceso `psql` por sesión, **sobre la réplica**: 20 sesiones por una plaza, fencing, doble `complete`, activación simultánea de 10 agentes (1 solo `OPERATIVE`), `fail_job` con lease vencido, huella intacta tras reiniciar el servidor |

```bash
python3 -m venv /tmp/pgenv && /tmp/pgenv/bin/pip install pgserver
PG_VENV=/tmp/pgenv HIVE_REQUIRE_REAL_POSTGRES=1 node --test --test-concurrency=1 tests/hive/*.test.mjs
node scripts/hive/neon-evidence.mjs   # regenera docs/ugo-hive/evidence/hive-neon-package.json
```

El arnés crea la base en **UTF8** (como Neon): en `SQL_ASCII` los acentos se pliegan byte a
byte y `agent_key` saldría corrupto — se descubrió probando, no leyendo.

## Rollback NO destructivo

`hive/neon/rollback/rollback_non_destructive.sql` retira permisos y funciones de cola,
libera leases y conserva **todas** las tablas y filas (verificado: 127 agentes y la tarea
`SUCCEEDED` siguen ahí). Reaplicar devuelve el sistema a operativo. Nunca
`drop schema … cascade`, nunca `reset`, nunca `force push`.

## Lo que esto NO es

- Los 118 agentes están **catalogados**; **0 operativos**, 0 departamentos funcionales.
- No se ha ejecutado ningún job real contra ningún proveedor: consumo **USD 0**, cuotas
  mensuales **DESCONOCIDAS** con límites conservadores (20 llamadas / 20 000 tokens por
  proveedor y día).
- No hay URL de Hive TEST y esta sesión no ha aplicado nada a Neon.
