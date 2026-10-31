# UGO Arena — inventario de recuperación y resguardo seguro
Fecha: 2026-10-31
Estado: DOCUMENTACIÓN / NO ES UN DUMP RESTAURABLE.

## Objetivo y reglas
- Supabase PROD: `trfsjuseqjxlhrxuvdsm` (São Paulo, PostgreSQL 17).
- Repositorio aplicación: `sebastisnzoth/ugo-admin-panel`.
- No alterar PROD, no ejecutar migraciones, no restaurar ni reiniciar servicios.
- Mantener plan gratuito, evitar cargos y no copiar usuarios, tokens o secretos a GitHub.
- Conservar GitHub Pages TEST (`tmossnqfwfwjrtzwcbmm`) separado de Arena PROD.
- Referencia Vercel: `ugo-admin-panel.vercel.app`.
- Google OAuth callback de PROD: `https://trfsjuseqjxlhrxuvdsm.supabase.co/auth/v1/callback`.
- Copiar y conservar el inventario de variables de Vercel **sin sus valores secretos**; credenciales en gestor seguro fuera del repositorio.

## Evidencia existente
- Supabase informó `ACTIVE_HEALTHY` el 31-10-2026.
- Edge Function encontrada: `ugo-push-worker`, versión 1, ACTIVE.
- Migraciones y funciones pueden inventariarse desde Supabase, pero **no equivalen a un respaldo íntegro**.
- El código fuente y su historial están en GitHub; los datos de PostgreSQL, auth y los objetos Storage NO están respaldados aquí.

## Respaldo real pendiente (NO ejecutar automáticamente)
1. Obtener snapshot/exportación completa mediante una conexión administrativa autorizada usando herramientas oficiales de Supabase/PostgreSQL. Incluir esquemas `public`, `auth`, `storage`, funciones, triggers, políticas, migraciones y datos.
2. Hacer una exportación separada de los **archivos binarios** de Storage; el dump de PostgreSQL por sí solo NO los contiene.
3. Documentar nombres de Edge Functions, descargar fuente desplegada si es posible, y conservar variables privadas fuera de GitHub. Google Client Secret y secretos de Vercel **no deben versionarse**.
4. Cifrar respaldos que contengan datos personales antes de almacenarlos, preferiblemente en almacenamiento privado fuera del repo público. No subir dumps sin cifrar ni llaves de descifrado al mismo destino.
5. Calcular checksums y verificar restauración **en un entorno aislado**, sin tocar Arena; registrar fecha, herramienta, tamaño y resultado de prueba.
6. Restaurar producción **solo** tras aprobación explícita, backup validado y plan de rollback.

## Estado de recuperación
- Código GitHub: DISPONIBLE.
- Configuración pública: DOCUMENTADA.
- PostgreSQL + Auth: PENDIENTE de exportación íntegra.
- Archivos Storage: PENDIENTE.
- Credenciales privadas OAuth, Vercel y Supabase: NO INCLUIDAS por seguridad.
- Prueba de restauración: PENDIENTE.
- Este archivo es un punto de referencia de recuperación, **no un backup completo**.
