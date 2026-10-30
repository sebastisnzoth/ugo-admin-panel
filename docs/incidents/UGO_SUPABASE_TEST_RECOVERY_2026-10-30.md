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

## Escalamiento enviado — 2026-10-30
Se envió un correo desde el Gmail conectado a `support@supabase.com` con asunto `URGENT P0 — UGO Arena TEST PostgreSQL/PgBouncer connection timeout — preserve data (Free plan)`. Gmail confirmó etiqueta `SENT`, mensaje/hilo ID `1a18da7adb181def`. **No confundir ID de Gmail con número de ticket de Supabase; ticket oficial pendiente de respuesta/confirmación.** Se solicitó restauración de conectividad conservando datos y sin modificar PROD ni contratar plan pago. Adjuntos: ninguno (detalles y errores incluidos en el mensaje). La vía de soporte por email está documentada por Supabase para dificultades con Dashboard.

## Recuperación inicial de conectividad SQL — 2026-10-30
**Cambio confirmado:** `SELECT 1 AS ok` responde `ok=1` desde el conector Supabase en TEST (sin cambios de esquema). Conteos de solo lectura: `auth.users=153`, `public.usuarios=148`, `public.perfiles_cliente=87`, `public.perfiles_proveedor=34`, `public.servicios=1752`, `public.ofertas_servicio=1372`, `public.eventos_servicio=107`, `public.evidencias_servicio=2256`, `public.pagos=1282`. Estos conteos corroboran presencia de datos, **no** integridad exhaustiva, funcionamiento Auth/RLS ni recuperación E2E. No se ha creado dump ni restaurado backup. **Estado: DEGRADED / SQL RECOVERED**, no GO-LIVE. Mantener pruebas de carga y supervisores de polling pausados hasta respaldo y validación de estabilidad, Auth y E2E.

## Verificación adicional tras recuperación parcial — 2026-10-30
- `SELECT 1 AS ok`: PASS, `ok=1`.
- Lectura de `pg_tables` para RLS: timeout de conexión.
- Lectura de `pg_proc` para funciones de onboarding: timeout de conexión.
- **Interpretación:** conexión intermitente; no es seguro declarar estabilidad, Auth o E2E aprobados.
- **Acción:** detener verificaciones repetidas; mantener pausados monitores de TEST, sin ejecutar `pg_dump` pesado ni cambios DDL durante el estado degradado. Verificar backups disponibles por Dashboard y esperar ventana de estabilidad para exportación supervisada.
- Cuando esté estable, hacer dump con herramientas oficiales y conexión del proyecto TEST, almacenar localmente con permisos restrictivos, revisar existencia/tamaño y restaurabilidad en entorno aislado si fuera posible; nunca copiar secretos ni datos sensibles al repositorio GitHub.

## Recaída confirmada — 2026-10-30 (última verificación)
Tras una ventana de respuesta (`SELECT 1`, conteos, RLS metadatos), nuevas pruebas de `SELECT 1`, `count(*) usuarios` y `count(*) servicios` terminaron **todas** en `Connection terminated due to connection timeout`. Logs PostgreSQL siguen disponibles y muestran `canceling statement due to statement timeout` repetidamente (hasta 16:58:39Z). **Estado corregido: P0 BLOCKED / DB INTERMITENTE, no RECUPERADO.** No se debe declarar UGO operativo ni reiniciar pruebas E2E o monitores. Escalamiento por email enviado a soporte; aún no se acreditó un ticket. Ninguna operación de reparación del servidor realizada.
