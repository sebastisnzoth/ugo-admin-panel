# Paquete de integración UGO Hive · v2.0.0

Documento de entrega para que **otra sesión con acceso independiente** (ChatGPT, u otro
operador) aplique y verifique el paquete de datos de Hive sin depender de esta sesión.

- Repositorio: `sebastisnzoth/ugo-admin-panel`
- Rama: `arena/6f95c7c3-ugo-admin-panel` (PR #633, **sin fusionar**)
- Base: `d2fe61e9ecc85e491d3839cb6885d3802d9c06de` de `main`
- Paquete: `hive/neon/` (versión `2.0.0`, registrada en `hive.meta.schema_version`)
- Evidencia: `docs/ugo-hive/evidence/hive-neon-package.json`

Este paquete **no está aplicado a Neon**: sigue sin haber credencial disponible en la
sesión que lo escribió. Aplicarlo es el primer paso que falta.

---

## 1. Qué recibe y qué NO recibe

| Recibe | No recibe (y no debe pedir por chat) |
|---|---|
| 10 archivos SQL aditivos e idempotentes | contraseñas, tokens personales, `service_role` |
| `apply.sh` (preflight · apply · verify) y rollback no destructivo | `DATABASE_URL` de Arena/Supabase |
| 28 pruebas automáticas (13 PGlite · 7 compatibilidad · 8 concurrencia real) | permiso para fusionar a `main` |
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

```bash
hive/neon/apply.sh apply
```

`apply.sh` hace, en este orden y sin intervención:

1. rechaza por host cualquier destino Supabase/Arena;
2. corre el preflight (sólo lectura) y muestra el resumen;
3. aplica `00`…`08` en **una única transacción** (`--single-transaction`);
4. imprime el estado final: `schema_version`, departamentos, agentes, operativos, jobs,
   `queue_metrics()`.

Si algo falla, la transacción revierte completa: no queda un esquema a medias.
Esperado al terminar:

```
schema_version | 2.0.0
departments    | 13
agents_total   | 118          (o más, si el operador ya tenía agentes propios)
agents_operative | 0
```

`agents_operative = 0` es **correcto**: catalogar no es operar.

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
select hive.queue_metrics();                                  -- conteos reales
select key, value from hive.settings order by key;             -- límites conservadores
select count(*) from information_schema.tables
 where table_schema = 'hive'
   and table_name in ('usuarios','autonomous_jobs','autonomous_agents','servicos','solicitudes'); -- 0
```

---

## 6. Activar **un** agente (no 118)

```sql
select hive.activate_agent('<agent_key>', true);   -- OPERATIVE: uno solo por defecto
select hive.activate_agent('<otro>', true);        -- falla: OPERATIVE_LIMIT_REACHED
select hive.activate_agent('<otro>', false);       -- CONNECTED: permitido
select hive.deactivate_agent('<agent_key>');
```

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
