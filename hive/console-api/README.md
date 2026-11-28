# UGO Hive · endpoint de la consola Super Admin (TEST)

`GET /api/hive/snapshot` — una instantánea de la cola real de `hive`, autenticada, con un rol
de **sólo lectura** distinto del worker. Sin dependencias nuevas (`node:http` + `psql`).

```
HiveConsole ──(JWT Supabase)──▶ hive-console-api ──(hive_reader)──▶ Neon/hive
```

## Por qué existe

La consola mostraba `READ_ONLY` porque no había forma de leer cifras reales sin inventarlas.
Este endpoint resuelve eso sin dar a la consola privilegios de worker ni la service role de
Supabase en el navegador.

## Reglas (todas probadas)

| Regla | Cómo |
|---|---|
| Autenticación obligatoria | `Authorization: Bearer <jwt>`; sin token → `401` |
| Autorización de Super Admin | verificada en el servidor contra Supabase Auth + `usuarios.activo/tipo` |
| Sólo lectura | arranca únicamente si el rol no es superusuario, no puede escribir y no puede `reserve_job`; si no, `REFUSED` y exit 3 |
| Sin escritura | un solo `SELECT`; `default_transaction_read_only=on` en el rol |
| Sin fugas | nunca devuelve el error de PostgreSQL (puede traer la cadena de conexión); `cache-control: no-store` |
| Sin superficie extra | sólo `GET`, sin query strings, orígenes acotados, 60 req/min por usuario |
| Nada de datos simulados | si la base no responde, `503` con un código; la consola lo dice |

## Contrato

```json
{
  "environment": "TEST",
  "read_only": true,
  "source": "hive_reader",
  "schema_version": "2.2.0",
  "generated_at": "2026-11-28T00:00:00Z",
  "queue": { "queued": 0, "leased": 0, "succeeded": 2, "failed": 0, "cancelled": 0,
             "stale_leases": 0, "effects_applied": 1 },
  "census": { "total": 127, "operative": 1, "connected": 0, "registered": 123,
              "disabled": 3, "max_operative_agents": 1 },
  "emergency": { "stop": false, "code": null },
  "quotas": { "openrouter": { "level": "NORMAL", "percent_used": 0, "monthly_quota": "UNKNOWN" } },
  "circuits": [],
  "recent_events": [{ "job_id": "…", "event": "SUCCEEDED", "actor": "…", "created_at": "…" }]
}
```

La cuota mensual real sigue siendo **UNKNOWN**: el endpoint lo declara así en vez de estimarlo.

## Variables del servidor

| Variable | Obligatoria | Nota |
|---|---|---|
| `HIVE_READER_DATABASE_URL` | sí | login **miembro de `hive_reader`** (no el del worker) |
| `HIVE_CONSOLE_SUPABASE_URL` | sí | proyecto TEST usado para verificar la sesión |
| `HIVE_CONSOLE_SUPABASE_ANON_KEY` | sí | sólo para `GET /auth/v1/user` |
| `HIVE_CONSOLE_SUPABASE_SERVICE_KEY` | sí | lectura del perfil (`usuarios`); vive **sólo** en el servidor |
| `PORT` / `HOST` | no | `8790` / `0.0.0.0` |

## Puesta en marcha

```bash
# 1 · crear el login de lectura (una vez, con el rol de migraciones)
psql "$HIVE_MIGRATOR_DATABASE_URL" -v hive_confirm=APLICAR \
     -v hive_password="$(openssl rand -base64 32)" -v hive_login=hive_console_ro \
     -f hive/reader/sql/reader_login.sql

# 2 · secretos de GitHub (por stdin, sin imprimirlos)
HIVE_READER_DATABASE_URL_FILE=./reader.url node scripts/hive/secret-setup.mjs --set-github-secret

# 3 · arranque local
HIVE_READER_DATABASE_URL=… HIVE_CONSOLE_SUPABASE_URL=https://…supabase.co \
HIVE_CONSOLE_SUPABASE_ANON_KEY=… HIVE_CONSOLE_SUPABASE_SERVICE_KEY=… \
node hive/console-api/server.mjs

# 4 · la consola lo usa sólo si está configurado
VITE_HIVE_CONSOLE_API=https://<host-del-endpoint>
```

Sin `VITE_HIVE_CONSOLE_API` el frontend **no hace ninguna petición** y muestra
«endpoint de producción no configurado». No hay valores por defecto ni datos de ejemplo.

## Pruebas

```bash
node --test tests/hive/console-api.test.mjs        # 8 · auth, CORS, cuotas, validación
HIVE_REQUIRE_REAL_POSTGRES=1 PG_VENV=/tmp/pgenv \
  node --test tests/hive/console-api-db.test.mjs   # 7 · rol real + HTTP + vigilancia
node --test tests/hive/console-client.test.mjs     # 2 · cliente TS real (16 comprobaciones)
```

Evidencia: `docs/ugo-hive/evidence/hive-console-api.json`
(`PG_VENV=/tmp/pgenv node scripts/hive/console-evidence.mjs`).
