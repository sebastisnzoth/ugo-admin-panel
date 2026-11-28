# Evaluación de alojamiento del endpoint TEST — Vercel Preview vs Render Free

**Fecha:** 2026-11-28 · **Coste:** USD 0 · **Despliegue:** NO ejecutado (decisión documentada)
**Restricción aplicada:** no crear infraestructura duplicada; el frontend ya vive en GitHub
Pages/Vercel y esta evaluación es sólo del servicio `hive-console-api`.

---

## Qué hay que alojar (y por qué condiciona la decisión)

`hive/console-api/server.mjs` es un **proceso Node de larga vida** que:

1. ejecuta el binario **`psql`** (no usa driver de PostgreSQL: cero dependencias nuevas);
2. comprueba al arrancar que el rol de lectura no puede escribir y, si puede, **no arranca**;
3. guarda el límite de peticiones por usuario en memoria del proceso;
4. mantiene la cadena de conexión **sólo** en variables de entorno del servidor.

Los puntos 1–3 son propiedades de seguridad probadas. Cambiarlas no es «un detalle de
hosting»: es otro diseño.

## Vercel (Preview / Hobby)

| Hecho | Consecuencia para nosotros |
|---|---|
| Las funciones son *serverless* y efímeras; no hay binario `psql` en la imagen | Habría que reescribir el servicio con un driver HTTP (`@neondatabase/serverless`) |
| Duración máxima por invocación 10 s (Hobby; 60 s en configuraciones con Fluid) [2](https://prismix.dev/guides/vercel-function-timeout) [3](https://www.fencode.dev/en/blog/vercel-free-vs-pro-2026-official-limits-pricing) | Cada petición paga arranque en frío de la función y no hay estado entre invocaciones |
| Sin proceso persistente | Se pierde el límite por usuario en memoria y la comprobación «no arranca si el rol escribe» deja de existir |
| Plan Hobby: uso no comercial, 1 M invocaciones/mes [3](https://www.fencode.dev/en/blog/vercel-free-vs-pro-2026-official-limits-pricing) | Aceptable para preview, pero exige reescritura del servicio |

**Veredicto Vercel:** bueno para el frontend (ya está), **no** para este servicio tal como
está. Portarlo es posible, pero implicaría un driver nuevo y perder dos garantías.

## Render Free (Hobby)

| Hecho | Consecuencia para nosotros |
|---|---|
| Servicio web con **0,1 CPU / 512 MB**, 1 instancia [1](https://convika.com/compare/render-free-tier-production/) | Suficiente: una consulta por carga de consola |
| **Se duerme a los 15 min** sin tráfico y tarda ~1 min en despertar [3](https://actualdatabase.com/render-free-vs-starter-pricing/) | La primera petición tras el reposo puede superar el timeout de 8 s de la consola → la UI muestra «sin respuesta» y ofrece reintentar (no hay polling) |
| **750 horas/mes** por espacio ≈ un servicio siempre encendido [3](https://actualdatabase.com/render-free-vs-starter-pricing/) | Cabe **un** servicio; no se crean duplicados |
| Sin disco persistente; los archivos locales se pierden en cada reinicio [1](https://convika.com/compare/render-free-tier-production/) | Irrelevante: no escribimos nada |
| Permite Docker | El `Dockerfile` de `hive/console-api/` sirve tal cual |

**Veredicto Render Free:** es el encaje técnico del servicio **sin reescribirlo**. Riesgo
conocido y aceptado para TEST: el arranque en frío (~1 min) y la suspensión mensual si se
agotan las 750 h.

## Decisión

1. **Servicio:** Render Free con el `Dockerfile` de `hive/console-api/` (o cualquier host que
   ejecute procesos con `psql`). **No** Vercel para el servicio.
2. **Frontend:** sigue donde está (GitHub Pages/Vercel). Sólo cambia `VITE_HIVE_CONSOLE_API`.
3. **Sin despliegue ahora:** esta fase no crea el servicio. El workflow
   `hive-console-api-test.yml` valida rol + `/healthz` antes de exponerlo, y la vigilancia de
   24 h no arranca hasta que exista un runtime funcional.

## Checklist de despliegue (cuando se autorice)

- [ ] `hive_console_ro` activado con contraseña (`scripts/hive/activate-logins.mjs --apply`).
- [ ] Secretos de GitHub creados por **stdin** (`secret-setup.mjs --set-github-secret`), nunca
      por chat ni en el repositorio.
- [ ] Variables del servicio: `HIVE_READER_DATABASE_URL`, `HIVE_CONSOLE_SUPABASE_URL`,
      `HIVE_CONSOLE_SUPABASE_ANON_KEY`, `HIVE_CONSOLE_AUTH_MODE=user` (o `allowlist` con
      `HIVE_CONSOLE_SUPERADMIN_IDS`). **Sin** clave de servicio.
- [ ] `/healthz` responde 200; el log de arranque dice `read_only: true` y `privileged_credentials: false`.
- [ ] Primera carga de la consola con sesión Super Admin real (401/403 verificados antes).
- [ ] `VITE_HIVE_CONSOLE_API` apuntando al host; si no está, la consola no pide nada.
- [ ] Vigilancia de 24 h con `watch-24h.mjs` **después** de la primera tarea real.

## Coste

**USD 0.** Render Free no se cobra sin método de pago; Vercel Hobby no se usa para el
servicio. Queda registrado que al agotar 750 h Render suspende los servicios gratuitos del
espacio hasta el mes siguiente (degradación, no cargo).
