# UGO Neon — migración TEST aislada (2026-10-30)

## Entorno verificado
- Neon project: `patient-haze-05892538`, PostgreSQL 17.11, database `ugodbapp`.
- Neon primary `production`: NO MODIFICAR durante preparación.
- Neon TEST branch `ugo-test-migration`, ID `br-tiny-field-b6v07tb3`: creada y SQL read-only OK; **0 tablas en public**.
- Supabase UGO Arena TEST `tmossnqfwfwjrtzwcbmm`: project API ACTIVE_HEALTHY pero SQL timeout; no asumir recuperabilidad.
- Supabase UGO PROD `trfsjuseqjxlhrxuvdsm`: solo lectura de metadatos funcionó; no modificar, exportar datos personales ni cambiar entorno sin autorización.
- GitHub `supabase/migrations`: 400 archivos detectados; dependen de Supabase Auth, storage, realtime, extensiones, enums/RPC/RLS y del esquema base. No ejecutarlos indiscriminadamente.
- Neon Managed Better Auth y Data API están activos en la rama principal, pero **no** equivalen a Supabase Auth/Reatime. Neon Realtime no disponible según API actual.

## Procedimiento obligatorio
1. Inventariar todas las tablas, tipos/enums, PK/FK, índices, funciones/triggers, vistas, políticas, extensiones y dependencias desde migraciones versionadas + catálogos Supabase en solo lectura.
2. Escribir migraciones Neon idempotentes en `db/neon/migrations/` junto con pruebas automatizadas; sustituir dependencias Supabase (auth.uid, storage, realtime) mediante arquitectura de API y autorización explícita. No utilizar service role en navegador.
3. Ejecutar migraciones **solo** en rama `ugo-test-migration` utilizando conexión directa, no pooler; verificar tablas/constraints/RPC y reversión. Los datos de prueba deben ser ficticios.
4. Conservar Auth actual hasta diseñar la migración de identidades; no copiar hashes ni cuentas reales sin un plan seguro autorizado. Implementar control de acceso por usuario y por rol.
5. Construir backend servidor para Cliente y Proveedor: Vite jamás debe recibir `DATABASE_URL`; revisar notificaciones, matching, GPS y chat sin Realtime Supabase.
6. Probar `npm run build`, tests de contrato e integración, E2E cliente↔proveedor y permisos negativos en SAME SHA; sólo después discutir cambio de entorno.
7. No copiar datos reales, eliminar ramas, activar deploy público, cambiar PROD ni hacer cutover hasta una autorización específica y respaldo probado.

## Resultado de esta fase
Preparación/inventario solamente. Migración funcional no realizada. Neon TEST todavía no aloja tablas UGO.
