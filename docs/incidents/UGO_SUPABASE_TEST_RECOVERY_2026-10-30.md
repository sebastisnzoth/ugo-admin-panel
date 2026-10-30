# P0 — Recuperación Supabase UGO Arena TEST — 2026-10-30

**Estado:** BLOCKED — PostgreSQL TEST no acepta conexiones (no significa pérdida de datos).
**Proyecto TEST:** `tmossnqfwfwjrtzwcbmm` (`sa-east-1`).
**Producción protegida:** `trfsjuseqjxlhrxuvdsm` — no modificar.
**Presupuesto:** US$0.

## Evidencia aportada por ugo-maestro / ugo-datos
- `SELECT 1`, listado de tablas y migraciones en TEST: `Connection terminated due to connection timeout`.
- Logs API del 30/10: errores 522 en rutas REST/Auth y solicitudes HEAD repetidas; no demuestran corrupción ni borrado de datos.
- Workspace local `ugo-datos`: sin `.sql`, `.dump`, `.backup`, `schema.sql` o `data.*`; repositorio local del agente sin commits.
- Carpeta local `ugo-swarm/backups`: respaldos de gateway/OpenClaw, no de Supabase. **Esta búsqueda no descarta backups del proveedor, otros discos o el repositorio principal**.
- Estado reportado de agentes: `ugo-datos:main` failed; `ugo-infra:main` done; `ugo-maestro:dashboard` running.
- Dashboard advierte riesgo de agotamiento de presupuesto Disk I/O; existen indicios en logs de fallos de conexión de pooler y cron, aún sin causalidad demostrada.

## Cambios ya realizados en código
- `f293d6a6`: menos reintentos de carga de perfil y actualización Realtime.
- `27ab4915`, `fc32875c`: reducción del polling administrativo y frecuencia de Sentinel en `main`. Despliegue y ahorro real requieren comprobación independiente.
- Supervisor local `ugo-supervisor-5min` reportado pausado por el usuario; los demás jobs requieren revisión individual.

## Siguiente ejecución segura (A+B+C)
1. Documentar, conservar reportes de agentes y dejar incidencia abierta como BLOCKED.
2. Comprobar **una sola vez** DNS y conexión TCP a host directo y pooler con configuraciones oficiales del proyecto, límites de espera cortos, sin imprimir credenciales. `supabase status` normalmente describe el entorno Supabase **local**, no acredita la salud de un proyecto remoto.
3. Revisar backups desde Database > Backups en dashboard, sin restaurar.
4. Cuando responda Postgres: `SELECT 1`, conteos e integridad de `auth.users`, `usuarios`, perfiles, servicios, ofertas, eventos, evidencias y pagos; generar exportación segura antes de cambios persistentes.
5. En caso de persistir el timeout, escalar a soporte Supabase con proyecto, hora, errores 522 y evidencias de pooler; solicitar recuperación del servicio **sin eliminar datos**.

## Límites / prohibiciones
No tocar PROD; no resetear, pausar, restaurar, borrar, cambiar credenciales ni aplicar índices o migraciones sin conectividad y plan de reversión. No ejecutar sondeos de alta frecuencia. No declarar RECUPERADO hasta verificar SQL, Auth y el flujo Cliente → Pedido → Proveedor.

**Nota:** La inexistencia de dumps en el workspace del agente no demuestra pérdida de la base original.
