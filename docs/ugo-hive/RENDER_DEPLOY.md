# Despliegue TEST en Render Free — procedimiento, sin ejecutar

**Estado:** declarado y validado en seco (`render.yaml` + `hive/console-api/Dockerfile`).
**Nada se ha desplegado.** Coste USD 0. El worker **no** va aquí: corre en la máquina del
fundador con el proveedor local.

Puerta automática de comprobación: `npm run hive:go-live` (sólo lee; no escribe ni despliega).

---

## 1. Qué se despliega (y qué no)

| Pieza | Dónde | Por qué |
|---|---|---|
| `hive/console-api` (endpoint de la consola) | Render Free, 1 servicio | proceso Node con `psql`, estado mínimo en memoria, 1 consulta por carga |
| Worker + proveedor local (OpenClaw / FreeLLMAPI) | máquina del fundador | gratis de verdad y verificable (`npm run hive:local-check`) |
| Frontend | donde ya está (GitHub Pages / Vercel) | sólo cambia `VITE_HIVE_CONSOLE_API` |
| Base de datos | Neon TEST (ya existe) | no se crea nada |

## 2. Condiciones del plan gratuito (verificadas antes de decidir)

- **750 h/mes por espacio** ≈ **un** servicio encendido: por eso hay **exactamente un**
  servicio en el blueprint y no se crean duplicados.
- **Se duerme a los 15 min** sin tráfico y tarda ~1 min en despertar: la consola tiene timeout
  de 8 s y botón de reintento, sin polling; el primer acceso tras el reposo puede fallar una vez.
- **0,1 CPU / 512 MB**, sin disco: el endpoint no escribe ni guarda archivos.
- **Sin plan de pago**: `plan: free` explícito y `npm run hive:go-live` falla si el blueprint
  pide `starter` o superior.
- **Sin credenciales privilegiadas**: el blueprint pide sólo la URL de lectura y la clave
  **anónima**; la puerta falla si aparece `service_role`/`SERVICE_KEY`.

## 3. Procedimiento (lo ejecuta una persona, con su cuenta)

```bash
# 0 · puerta de puesta en marcha: dice exactamente qué falta
npm run hive:go-live

# 1 · credenciales (una vez; escribe ~/.ugo-hive/secrets con modo 600)
HIVE_MIGRATOR_DATABASE_URL=… HIVE_CONFIRM_ACTIVATION=APLICAR \
  node scripts/hive/activate-logins.mjs --apply --set-github-secrets

# 2 · Render → New → Blueprint → repositorio + rama arena/6f95c7c3-ugo-admin-panel
#     El blueprint crea UN servicio `ugo-hive-console-api` con autoDeploy desactivado.

# 3 · rellenar en el panel del servicio (nunca en el repositorio):
#     HIVE_READER_DATABASE_URL, HIVE_CONSOLE_SUPABASE_URL,
#     HIVE_CONSOLE_SUPABASE_ANON_KEY, HIVE_CONSOLE_ALLOWED_ORIGINS,
#     (HIVE_CONSOLE_SUPERADMIN_IDS sólo si HIVE_CONSOLE_AUTH_MODE=allowlist)

# 4 · comprobar el arranque: /healthz → 200 y en el log
#     CONSOLE_API_LISTENING con "read_only": true y "privileged_credentials": false

# 5 · conectar la consola
VITE_HIVE_CONSOLE_API=https://<servicio>.onrender.com npm run build

# 6 · volver a pasar la puerta con el endpoint real
HIVE_CONSOLE_API_URL=https://<servicio>.onrender.com npm run hive:go-live

# 7 · recomendar el preflight de GitHub (opcional, no despliega)
#     Actions → "UGO Hive console API TEST (preflight)" → confirm=COMPROBAR
```

## 4. Qué se niega a arrancar (por diseño, ya probado)

| Situación | Resultado |
|---|---|
| Falta una variable | `CONFIG_ERROR` · exit 2, sin abrir el puerto |
| `HIVE_CONSOLE_ALLOWED_ORIGINS` con `*` o con ruta | `CONFIG_ERROR` · exit 2 |
| El rol de lectura puede escribir | `REFUSED` · exit 3 |
| Modo `service` | arranca, pero escribe `PRIVILEGED_MODE` en el log |
| Perfil ilegible en modo `user` | responde **503 `AUTH_UNAVAILABLE`**, no 200 |

## 5. Reversión

Parar el servicio desde Render (no borra la base), retirar `VITE_HIVE_CONSOLE_API` del build y
reconstruir el frontend: la consola vuelve a «endpoint no configurado» **sin hacer ninguna
petición**. La base no se toca y el interruptor de emergencia sigue disponible.

## 6. Coste

**USD 0** en las tres piezas: Render Free no cobra sin método de pago; Neon TEST ya estaba;
la inferencia es local. Al agotar 750 h, Render suspende los servicios gratuitos del espacio
hasta el mes siguiente: degradación, nunca un cargo.
