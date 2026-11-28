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
| `HIVE_CONSOLE_SUPABASE_ANON_KEY` | sí | clave **pública**: todo lo que hace el servidor con ella está sujeto a RLS |
| `HIVE_CONSOLE_AUTH_MODE` | no | `user` (por defecto) · `allowlist` · `service` |
| `HIVE_CONSOLE_SUPERADMIN_IDS` | en `allowlist` | ids de usuario superadmin (coma-separados) |
| `HIVE_CONSOLE_SUPABASE_SERVICE_KEY` | sólo en `service` | credencial privilegiada; el arranque lo anuncia como `PRIVILEGED_MODE` |
| `HIVE_CONSOLE_ALLOWED_ORIGINS` | no | orígenes extra (coma-separados). Sin `*` ni rutas; una entrada inválida impide arrancar (`CONFIG_ERROR`) |
| `PORT` / `HOST` | no | `8790` / `0.0.0.0` |

### Modos de autenticación (ninguno confía en el cliente)

| Modo | Cómo autoriza | Credenciales que usa |
|---|---|---|
| `user` (recomendado) | token del usuario → `/auth/v1/user`; luego `GET /rest/v1/usuarios` **con ese token**, y RLS decide | clave anónima + token del usuario |
| `allowlist` | el id verificado debe estar en `HIVE_CONSOLE_SUPERADMIN_IDS`; no consulta tablas de perfil | clave anónima + token del usuario |
| `service` | perfil leído con clave de servicio | **privilegiada** — se anuncia `PRIVILEGED_MODE` al arrancar |

Si el perfil no se puede leer, la respuesta es **503 `AUTH_UNAVAILABLE`**, nunca un 200 con
datos. El modo `service` existe para una urgencia puntual, no es la ruta normal: el usuario
del endpoint en TEST es el rol de lectura + la clave pública.

## Puesta en marcha

```bash
# 1 · activar los roles ya creados en Neon (NOLOGIN → LOGIN) sin recrearlos
node scripts/hive/activate-logins.mjs                    # simulación: dice qué haría
HIVE_CONFIRM_ACTIVATION=APLICAR node scripts/hive/activate-logins.mjs --apply
#    (opcional --set-github-secrets: publica las dos URLs por stdin)

# 2 · secretos de GitHub (por stdin, sin imprimirlos)
HIVE_READER_DATABASE_URL_FILE=./reader.url node scripts/hive/secret-setup.mjs --set-github-secret

# 3 · arranque local (sin credenciales privilegiadas)
HIVE_READER_DATABASE_URL=… HIVE_CONSOLE_SUPABASE_URL=https://…supabase.co \
HIVE_CONSOLE_SUPABASE_ANON_KEY=… node hive/console-api/server.mjs

# 4 · la consola lo usa sólo si está configurado
VITE_HIVE_CONSOLE_API=https://<host-del-endpoint>
```

Sin `VITE_HIVE_CONSOLE_API` el frontend **no hace ninguna petición** y muestra
«endpoint de producción no configurado». No hay valores por defecto ni datos de ejemplo.

## Pruebas

```bash
node --test tests/hive/console-api.test.mjs          # 12 · modos de auth, CORS, cuotas, 503
HIVE_REQUIRE_REAL_POSTGRES=1 PG_VENV=/tmp/pgenv \
  node --test tests/hive/console-api-db.test.mjs     # 9 · rol real, 13 departamentos, HTTP
node --test tests/hive/console-client.test.mjs       # 2 · cliente TS real (19 comprobaciones)
node --test tests/hive/frontend-secret-guard.test.mjs # 6 · ni credenciales ni polling en el cliente
```

Evidencia: `docs/ugo-hive/evidence/hive-console-api.json`
(`PG_VENV=/tmp/pgenv node scripts/hive/console-evidence.mjs`) y la de la fase operativa
completa en `docs/ugo-hive/evidence/hive-ops-fase8.json`
(`PG_VENV=/tmp/pgenv npm run hive:ops-evidence`).

## Despliegue (TEST, todavía sin ejecutar)

`Dockerfile` incluido (Node 22 + `psql`, usuario sin privilegios, healthcheck a `/healthz`).
Host elegido y por qué: `docs/ugo-hive/TEST_HOST_EVALUATION.md`.
Procedimiento paso a paso, condiciones del plan gratuito y reversión: `docs/ugo-hive/RENDER_DEPLOY.md`
(blueprint en `render.yaml`). Puerta de comprobación: `npm run hive:go-live`.
Vercel **no** sirve para este proceso (necesita `psql` y estado en memoria).
