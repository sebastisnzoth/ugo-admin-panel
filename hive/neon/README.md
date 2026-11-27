# UGO Hive · capa de datos independiente (Neon TEST)

**Estado: PREPARADO Y VERIFICADO EN LOCAL — NO APLICADO A NEON.**
Motivo: en esta sesión no existe conector de Neon ni credencial disponible
(`list_connector_tools("neon")` → `unsupported`). Aplicarlo exige el secreto
`HIVE_TEST_DATABASE_URL`, que no se pide por chat.

## Qué es

`001_hive_core.sql` define el esquema `hive` en la base independiente de Hive
(proyecto `ugo-hive-test`, base `hive`, São Paulo, plan gratuito):

| Objeto | Para qué |
|---|---|
| `hive.departments` | catálogo canónico D1–D12 + D14 (no existe D13) |
| `hive.agents` | registro con `state` = REGISTERED · CONNECTED · OPERATIVE · DISABLED |
| `hive.settings` | límites conservadores (`max_concurrent_jobs = 1`, 3 reintentos, lease 120 s, 20 llamadas y 20 000 tokens por proveedor y día) |
| `hive.jobs` | cola persistente con `idempotency_key` única, lease, heartbeat, `max_attempts` |
| `hive.job_events` | bitácora append-only para Sentinel/Judge y recuperación |
| `hive.provider_daily_usage`, `hive.provider_circuits` | control de presupuesto USD 0 |
| funciones `hive.*` | enqueue, reserve, heartbeat, complete, fail, recover_expired_leases, record_provider_call, quota_state, queue_metrics |

### Garantías que las pruebas verifican de verdad

`tests/hive/neon-queue.test.mjs` · 13 pruebas contra Postgres embebido (PGlite):

1. el esquema es idempotente (aplicarlo dos veces no cambia nada) y el catálogo son 13 departamentos;
2. `enqueue_job` no crea duplicados para la misma `idempotency_key`;
3. la reserva respeta **un solo job simultáneo** y libera el turno al completar;
4. un lease sólo lo usa su dueño y sólo mientras es válido;
5. el trabajo interrumpido se recupera **exactamente una vez**, sin duplicar;
6. un heartbeat sano protege el job de la recuperación;
7. los reintentos son acotados, con backoff, y terminan en `FAILED` (sin bucle);
8. un lease vencido con intentos agotados falla en vez de recolarse para siempre;
9. la escalera de cuotas corta en 50 / 70 / 85 / 95 % y declara `monthly_quota: UNKNOWN`;
10. registrar consumo abre el circuito al agotar la cuota;
11. `queue_metrics` devuelve conteos reales y separa registrado / conectado / operativo;
12. privilegios mínimos: el worker **no** puede escribir tablas ni hacer DDL, el reader **no** puede ejecutar operaciones de cola;
13. el esquema no contiene ninguna sentencia sobre tablas de Arena ni `service_role`.

Las pruebas 7, 8 y 12 encontraron tres defectos reales en la primera versión de este
SQL (`available_at` nulo con parámetro explícito NULL, funciones `SECURITY INVOKER`
sin permisos de tabla, y `EXECUTE` heredado por `PUBLIC`). Corregidos y re-verificados.

### Aislamiento

- Un solo objeto de esquema propio: `hive`. No lee ni escribe `usuarios`,
  `autonomous_jobs`, `auth`, `storage` ni ninguna tabla de Arena.
- Sin fallback: si Neon no responde, Arena no consulta este esquema.
- Los workers no reciben credenciales privilegiadas: ejecutan funciones
  `SECURITY DEFINER` con `search_path = ''` y nombres totalmente calificados.

## Cómo aplicarlo (cuando el secreto exista)

Nunca pegando la URL en un chat, un issue o un log.

```bash
# 1. Secreto de repositorio (GitHub → Settings → Secrets and variables → Actions):
#    HIVE_TEST_DATABASE_URL = postgresql://<rol>:<clave>@<host>/hive?sslmode=require
# 2. Aplicación manual, idempotente y verificada:
gh workflow run hive-neon-migrate.yml
gh run watch
```

El workflow `hive-neon-migrate.yml` es **sólo `workflow_dispatch`** (nunca automático),
rechaza hosts de Supabase/Arena y no imprime la URL.

Aplicación local equivalente:

```bash
psql "$HIVE_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f hive/neon/001_hive_core.sql
```

## Rollback

```sql
drop schema if exists hive cascade;
```

Sólo destruye objetos creados por este archivo. No toca datos de Arena ni de otros
esquemas, y no requiere `reset` ni `force push` de ningún tipo.

## Lo que esto NO es

- No es evidencia de ejecución de agentes: define el contrato, no demuestra trabajo real.
- No sustituye al repositorio `ugo-hive`: cuando el acceso se habilite, estos archivos
  se mueven allí sin cambios y este directorio pasa a ser un espejo de referencia.
