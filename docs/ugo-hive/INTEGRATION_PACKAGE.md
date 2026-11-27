# Paquete de integración UGO Hive · v2.1.0

Documento de entrega para que **otra sesión con acceso independiente** (ChatGPT, u otro
operador) aplique y verifique el paquete de datos de Hive sin depender de esta sesión.

- Repositorio: `sebastisnzoth/ugo-admin-panel`
- Rama: `arena/6f95c7c3-ugo-admin-panel` (PR #633, **sin fusionar**)
- Base: `d2fe61e9ecc85e491d3839cb6885d3802d9c06de` de `main`
- Paquete: `hive/neon/` (versión `2.1.0`, registrada en `hive.meta.schema_version`)
- Evidencia: `docs/ugo-hive/evidence/hive-neon-package.json`

Este paquete **no está aplicado a Neon**: sigue sin haber credencial disponible en la
sesión que lo escribió. Aplicarlo es el primer paso que falta.

---

## 1. Qué recibe y qué NO recibe

| Recibe | No recibe (y no debe pedir por chat) |
|---|---|
| 10 archivos SQL aditivos e idempotentes | contraseñas, tokens personales, `service_role` |
| `apply.sh` (preflight · apply · verify) y rollback no destructivo | `DATABASE_URL` de Arena/Supabase |
| 38 pruebas automáticas (13 cola · 7 compatibilidad · 6 réplica exacta · 12 concurrencia real) | permiso para fusionar a `main` |
| evidencia JSON regenerable | instrucción de desplegar a producción |
| contrato del worker y códigos de respuesta | autorización para crear otro proyecto Neon |

Regla dura: **una sola base**. Proyecto Neon `dry-heart-24391962`, base `hive`. No crear
otro proyecto, no crear otra base, no usar Arena como respaldo.

---

## 2. Requisitos previos

```bash
git fetch origin arena/6f95c7c3-ugo-admin-panel
git checkout arena/6f95c7c3-ugo-admin-panel
node --version          # >= 22
psql --version          # >= 15
```

Credencial: se carga en el entorno, nunca en el repositorio ni en la conversación.

```bash
export HIVE_TEST_DATABASE_URL='postgresql://<rol>:<clave>@<host>/hive?sslmode=require'
export HIVE_PROJECT_ID='dry-heart-24391962'
export HIVE_DATABASE_NAME='hive'
```

Si el rol aún no existe, créelo con privilegios mínimos **sólo** en esta base (paso 4).

---

## 3. Verificación antes de escribir nada

```bash
node scripts/hive/neon-evidence.mjs            # 3 suites + evidencia JSON
hive/neon/apply.sh preflight                   # inventario real del destino
```

Esperado del preflight: lista de esquemas, tablas de `hive` con conteos **exactos**,
columnas de `agents` / `jobs` / `provider_circuits`, índices, roles `hive_*` y huella de
Arena en `public` (**debe salir vacía**).

Si el preflight muestra tablas de Arena en `public` o el host es Supabase → **detenerse**:
el destino no es Hive.

---

## 4. Aplicación

> **v2.1.0 se adapta al esquema real que verificaste:** `agents(id,name UNIQUE,status,last_heartbeat)`
> con 9 filas y `jobs(id,idempotency_key,agent_name,prompt NOT NULL,status,created_at)` con
> 1 tarea `DONE`. Nada se borra y la tarea terminada **no** vuelve a la cola.

```bash
# primera vez en esta base (identidad no registrada todavía):
HIVE_CONFIRM_FIRST_APPLY=APLICAR hive/neon/apply.sh apply

# posteriores (idempotente, sin confirmación):
hive/neon/apply.sh apply
```

La primera aplicación registra en `hive.meta` la **huella del servidor**
(`sha256` de base + oid + rol dueño + `inet_server_addr()` + puerto). No es una variable del
cliente: si más adelante alguien apunta a otra base, la migración aborta con
`DESTINATION_FINGERPRINT_MISMATCH`. Si ya conocés la huella, pasala con
`HIVE_EXPECTED_FINGERPRINT=<sha256>` para atar la primera aplicación también.

`apply.sh` hace, en este orden y sin intervención:

1. rechaza por host cualquier destino Supabase/Arena;
2. corre el preflight (sólo lectura) y muestra el resumen;
3. aplica `00`…`08` en **una única transacción** (`--single-transaction`);
4. imprime el estado final: `schema_version`, departamentos, agentes, operativos, jobs,
   `queue_metrics()`.

Si algo falla, la transacción revierte completa: no queda un esquema a medias.
Esperado al terminar (con los datos reales de hoy):

```
schema_version           | 2.1.0
destination_fingerprint  | <primeros 16 hex>…
departments              | 13
agents_total             | 127      (9 existentes + 118 del canon)
agents_legacy_preserved  | 9        (status original guardado en legacy_status)
agents_operative         | 0
jobs                     | 1
jobs_finished            | 1        (la tarea DONE sigue terminada)
jobs_queued              | 0
```

Si `agents_total` no es 127 o `jobs_finished` no es 1, **detenerse**: algo no cuadra con el
estado verificado y hay que revisar el preflight antes de seguir.

`agents_operative = 0` es **correcto**: catalogar no es operar. El mapeo es conservador a
propósito: los 9 agentes reales están en `active/idle/paused/disabled` y ninguno se
promueve a `OPERATIVE` automáticamente (9 operativos habrían roto el límite de 1).

### Rol de ejecución separado (opcional, recomendado)

El paquete crea los roles `hive_migrator`, `hive_worker` y `hive_reader` (NOLOGIN, grupos).
Si se necesita login para el worker, el operador crea el rol de login y lo añade al grupo
— con `hive_worker`, que **no** puede escribir tablas ni hacer DDL:

```sql
create role hive_worker_login login password '<generada por el operador>';
grant hive_worker to hive_worker_login;
```

---

## 5. Verificación posterior (obligatoria)

```bash
hive/neon/apply.sh verify
```

`08_verify.sql` lanza excepción (no "aviso") si falta: los 13 departamentos, los 118
agentes del canon, columnas críticas, funciones operativas, roles separados, o si
aparece cualquier tabla de Arena dentro de `hive`.

Comprobaciones manuales de cierre:

```sql
select count(*) from hive.agents where state = 'OPERATIVE';   -- 0 hasta que se active uno
select name, status, state, legacy_status from hive.agents where legacy_status is not null;  -- los 9 reales
select state, status, legacy_status, prompt from hive.jobs;  -- SUCCEEDED / succeeded / DONE
select hive.queue_metrics();                                  -- conteos reales
select key, value from hive.settings order by key;             -- límites conservadores
select count(*) from information_schema.tables
 where table_schema = 'hive'
   and table_name in ('usuarios','autonomous_jobs','autonomous_agents','servicos','solicitudes'); -- 0
```

---

## 6. Activar **un** agente (no 118)

```sql
select hive.activate_agent('<agent_key o name>', true);   -- OPERATIVE: uno solo por defecto
select hive.activate_agent('<otro>', true);               -- falla: OPERATIVE_LIMIT_REACHED
select hive.activate_agent('<otro>', false);              -- CONNECTED: permitido
select hive.deactivate_agent('<agent_key>');
```

La activación es segura en concurrencia: dos sesiones simultáneas no pueden superar el
límite (una recibe `ACTIVATE_BUSY`, la otra activa). Está probado con 10 sesiones reales
sobre PostgreSQL 16.2: exactamente 1 queda `OPERATIVE`.

`max_operative_agents = 1` es un ajuste, no una sugerencia. Subirlo exige decisión
explícita del operador y medición previa de consumo.

---

## 7. Rollback (si algo sale mal)

```bash
psql "$HIVE_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f hive/neon/rollback/rollback_non_destructive.sql
```

Retira permisos y funciones de operación, libera leases abiertos y **conserva todas las
tablas y filas**. Prohibido `drop schema ... cascade`, `drop table`, `reset` o
`force push`. Para volver a operar: `hive/neon/apply.sh apply` de nuevo.

---

## 8. Qué devolver a esta sesión (evidencia, sin secretos)

1. Salida de `hive/neon/apply.sh apply` (últimas líneas de estado).
2. Salida de `hive/neon/apply.sh verify`.
3. `docs/ugo-hive/evidence/hive-neon-package.json` regenerado en su entorno.
4. `select version();` y `select value from hive.meta where key='schema_version';`
5. Cantidad de agentes por estado (`agent_census()`).

Nunca: la URL, el usuario con clave, ni capturas del panel de Neon.

---

## 9. Límites que este paquete NO cruza

- No crea ni modifica nada en UGO Arena/Supabase (`trfsjuseqjxlhrxuvdsm`).
- No usa `service_role` ni claves privilegiadas.
- No toca PIX, Asaas, GPS, matching, realtime ni autenticación operativa.
- No despliega, no crea builds, no contrata servicios: presupuesto **USD 0**.
- No declara operativos a los agentes: eso exige jobs reales y consumo medido.
- No fusiona a `main`.
