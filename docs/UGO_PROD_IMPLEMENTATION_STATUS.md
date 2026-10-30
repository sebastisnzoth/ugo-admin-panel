# UGO PROD — Estado de implementación y gates

Fecha: 2026-10-30. Rama: `feat/ugo-prod-safe-activation-audit`. Objetivo: Cliente / Proveedor / Admin usando PROD `trfsjuseqjxlhrxuvdsm` sin pérdida de datos.

## Hecho y evidencia
- Supabase PROD respondió SELECT 1 y conteos previos: usuarios 9, perfiles cliente 3, proveedor 3 y servicios 56. PROD preservado, sin escritura.
- TEST conserva más datos (últimos conteos exitosos: usuarios 148, clientes 87, proveedores 34, servicios 1752), no equivalentes a PROD.
- Las ocho tablas principales están presentes en ambos proyectos.
- Diferencias confirmadas en columnas: PROD no tiene `perfiles_proveedor.faxina_productos_lleva`, `faxina_productos_valor`, `pilot_capabilities`; falta `servicios.zona`.
- `src/lib/supabaseProject.ts` sigue apuntando a TEST. Ningún cutover aplicado.
- Corrección propuesta en esta rama: las claves de almacenamiento Auth de Cliente/Proveedor/Admin usan `UGO_ENVIRONMENT`; en TEST conservan sus valores originales. Es una preparación para aislar sesiones por entorno. **No implica que el inicio de sesión esté validado.**

## Gate de seguridad
- Backups PROD/TEST: NO VERIFICADOS.
- Inventario completo de RPC, RLS, Storage, Edge Functions, Auth identities: PENDIENTE.
- Autenticación real Cliente/Proveedor/Admin PROD: PENDIENTE.
- Build, TS, lint, CI y E2E en esta rama: PENDIENTE.
- Pagos reales: PROHIBIDOS en pruebas.
- Migraciones PROD y redireccionamiento: BLOQUEADOS hasta respaldos, compatibilidad, autorización explícita.

## Próxima tarea verificable
1. Comprobar CI del PR y compatibilidad actual del almacenamiento Auth.
2. Confirmar backups en Dashboard sin restaurar.
3. Reconciliar funciones/constraints/roles/RLS, preparar migraciones aditivas en rama; no ejecutarlas en PROD.
4. Implementar preview restringido y E2E de cada rol sin operaciones reales de pago.
5. Solicitar autorización antes de cualquier cambio de producción o cutover.

## Ejecución posterior al Prompt Maestro — 2026-10-30
- PR #603 abierta, draft y mergeable; CI disponible: estado `pending` de Vercel para SHA `e9f9ab607d573c03186b645304776b5b82e8a030`. No equivale a CI PASS.
- Configuración actual en la rama: sigue apuntando a TEST; sin cutover.
- Se confirmaron en TEST los tipos exactos de diferencias conocidas: `faxina_productos_lleva boolean NOT NULL DEFAULT false`, `faxina_productos_valor numeric NOT NULL DEFAULT 0`, `pilot_capabilities jsonb NOT NULL DEFAULT '{}'::jsonb` y `servicios.zona text NULL`.
- Preparado el candidato de migración **no ejecutable automáticamente** en `docs/sql/UGO_PROD_COMPATIBILITY_CANDIDATE_REVIEW_ONLY.sql`, commit `359e584f`. No se alteró PROD.
- Gates todavía pendientes: backup validado, comparación de RPC/RLS/identidades, CI PASS, Auth y E2E por rol. Próxima tarea: validar compatibilidad funcional y seguridad sin escribir en PROD.
