# UGO Hive / Empresa Autónoma — plan de aislamiento (31-10-2026)

## Alcance ejecutado
Documento de seguridad y preflight local. **No habilita** inferencia, workers, servicios remotos ni accesos a Arena.
Rama aislada; sin cambios de Vercel, Supabase, main ni secrets.

## Hallazgos confirmados en main
- `supabase/functions/ugo-hive-model-router/index.ts`: `inferenceEnabled=false`, endpoint TEST fijo (`tmossnqfwfwjrtzwcbmm`); responde `HIVE_INFERENCE_NOT_ENABLED`.
- `scripts/autonomous-worker-cycle.mjs`: requiere `UGO_TEST_SUPABASE_SERVICE_ROLE_KEY`, restringido a TEST; **no reutilizar para PROD**.
- `src/mvp/HiveConsole.tsx`: chat no habilitado y estado TEST.
- Los informes históricos de backup FreeLLMAPI no equivalen a una prueba actual de restauración. Backup de Arena PROD recuperable: **NO VERIFICADO**.

## Diseño a implementar
1. Plano IA independiente: OpenClaw + FreeLLMAPI, con memoria / cola local o BD independiente, identidades distintas y sin claves de Arena.
2. API intermedia de solo lectura: consultas predefinidas, lista blanca de campos, JWT comprobado del lado servidor, RLS, paginación, rate limit, auditoría, timeouts y circuito abierto ante fallos. Nada de SQL arbitrario, service_role ni datos privados enviados al LLM.
3. Kill switch persistente global y por agente, con arranque en OFF; ninguna función de control en producción ni workers heredados.
4. Trabajos de desarrollo: GitHub branches, PRs y tests sin conexión a bases productivas. Deploy/merge sólo tras revisión humana.
5. Verificar backup real + restore en entorno separado antes de habilitar acceso de lectura. No restaurar sobre PROD.

## Preflight disponible
`UGO_HIVE_MODE=isolated UGO_HIVE_READ_ONLY=true UGO_HIVE_DATA_DIR=/ruta/local/ugo-hive node scripts/hive-isolation-preflight.mjs`

El preflight falla si ve variables privilegiadas conocidas, referencias de PROD/TEST o flags de escritura. No inicia servicios ni garantiza por sí solo aislamiento; debe ser llamado como condición **obligatoria** del launcher y acompañarse de credenciales de mínima autorización y controles de red.

## Gates pendientes
- [ ] Inventario de secrets y permisos **sin mostrar sus valores**.
- [ ] Verificación de backup y restauración de Arena fuera de PROD.
- [ ] Revisión del servicio Render activo, modelo gratuito y política de costos US$0.
- [ ] Backend IA local autenticado y almacenamiento aislado de memoria/cola.
- [ ] Tests negativos: agente con URL PROD, credencial elevada, fallo modelo, pérdida de red, restart y kill switch.
- [ ] Conectar preflight a launcher real y probar arranque sin Arena.
- [ ] Auditoría y pruebas del API gateway de solo lectura.
- [ ] CI y aprobación antes de fusionar código.

**Estado actual: PREPARACIÓN, NO ACTIVADO.** No se declara Hive ni Empresa Autónoma funcionales.
