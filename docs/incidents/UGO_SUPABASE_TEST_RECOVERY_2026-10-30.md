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

## Evidencia oficial — High Disk I/O (Supabase KB, editado 2026-10-13)
Fuente: https://supabase.com/kb/troubleshooting/exhaust-disk-io

Según Supabase, cuando se agota Disk I/O Budget, la instancia vuelve a su throughput base (el documento menciona 5 MB/s para su caso descrito), puede aumentar el tiempo de respuesta y el I/O wait, perjudicar procesos internos y llegar a ser no responsiva. El presupuesto se repone cuando la demanda de I/O es igual o inferior a la capacidad base. **Hipótesis fuerte, no causa raíz demostrada para UGO Arena.** Se necesita evidencia temporal de métricas IOPS/throughput, CPU/iowait, RAM/swap, cache hit ratio y disponibilidad de Postgres para confirmarla.

Acción conservadora: mantener pausadas consultas repetitivas de monitores, evitar scans de logs y sentencias estadísticas pesadas, no alterar cron de matching ni RLS sin prueba. No borrar datos ni logs y no cambiar de plan. Tras recuperar acceso: respaldo y análisis breve de consultas lentas e índices antes de optimizaciones persistentes.

**Comprobación en esta revisión:** `SELECT 1` en TEST sigue fallando con `Connection terminated due to connection timeout`. P0 continúa BLOCKED. La documentación no prueba pérdida de datos.

## Confirmación del bloqueo de conexión — 2026-10-30
Lectura directa del conector de Supabase: PgBouncer registra `connect timeout (age=15s)` hacia PostgreSQL local (`[::1]:5432`), `server login has been failing` para `supabase_storage_admin` y `query_wait_timeout`. PostgreSQL registra cancelaciones repetidas por `statement timeout`. Dos consultas de Observability para tamaños de relaciones tardaron ~46.97s y ~53.59s. Esto confirma bloqueo de disponibilidad de conexiones y consultas, pero **no determina causa raíz** (Disk I/O, saturación de recursos, locks o infraestructura). Conector actual no expone `restart database` ni creación de tickets. No se realizó reinicio, restore, pause, ni modificación de datos.

**Escalamiento requerido:** solicitar a Supabase revisión/reinicio asistido de PostgreSQL/pooler con preservación de datos; verificar respaldos y estado del servicio primero. No repetir consultas a ciegas ni usar pause/restore como sustituto de restart.
