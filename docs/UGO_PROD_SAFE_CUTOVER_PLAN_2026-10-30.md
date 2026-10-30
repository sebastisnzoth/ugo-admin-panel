# UGO — Plan seguro de compatibilidad y activación Cliente / Proveedor / Admin en PROD

**Estado:** NO CUTOVER / NO GO-LIVE. Auditoría de solo lectura. 2026-10-30.

## Sistemas
- PROD: `trfsjuseqjxlhrxuvdsm` — **protegido, sin escrituras ni migraciones autorizadas automáticamente**.
- TEST: `tmossnqfwfwjrtzwcbmm` — datos y Auth diferentes; estuvo intermitente.
- Repo: `sebastisnzoth/ugo-admin-panel`, rama `main` actualmente fija `UGO_ENVIRONMENT='test'` y URL/ref de TEST en `src/lib/supabaseProject.ts`; también `.env.example` apunta a TEST. No cambiar a PROD sin gates.

## Evidencia confirmada
- En PROD `SELECT 1` responde y hay 9 usuarios, 3 perfiles cliente, 3 proveedor y 56 servicios; en TEST se han observado 148 usuarios, 87 clientes, 34 proveedores y 1752 servicios. Las identidades de Supabase Auth, no solo los datos, requieren migración/registro seguro si se opta por cutover.
- Las 8 tablas básicas están en ambas bases. Columnas: PROD `perfiles_proveedor` 29, TEST 32; PROD `servicios` 25, TEST 26. PROD carece de `perfiles_proveedor.faxina_productos_lleva`, `faxina_productos_valor`, `pilot_capabilities`; y de `servicios.zona`.
- Los historiales de migraciones PROD y TEST difieren; igualdad de nombres de tablas NO garantiza compatibilidad.

## Gates obligatorios (en orden)
1. **Backup PROD probado** (incluye Auth/esquema/datos) y backup TEST verificado. No subir dumps ni secretos a GitHub.
2. Inventario de **todas** las diferencias de columnas, tipos, constraints, índices, triggers, funciones RPC, roles/claims, RLS policies, storage y realtime publications, migraciones y Edge Functions, por lector de solo lectura.
3. Verificar en PROD rutas de AUTH para cuenta **cliente**, **proveedor** y **admin**, sesión/logout/refresh, perfiles existentes, claim de rol y lectura mínima autenticada sujeta a RLS. Nunca exponer credenciales de usuarios.
4. Preparar en rama y PR las migraciones **aditivas y reversibles** necesarias, con tests, `EXPLAIN` y evidencia de que no bloquean escrituras existentes. No ejecutarlas hasta backup confirmado y aprobación expresa.
5. Preparar configuración separada por entorno para Cliente, Proveedor y Admin sin mezclar claves/sesiones ni redirigir el público prematuramente. Preferir despliegue **preview restringido** con autenticación test dedicada a PROD y sin emitir pedidos/pagos reales.
6. E2E por rol: registro/login cliente → onboarding → solicitud de Faxina; proveedor → GPS/online → matching → aceptar → en camino → llegada → evidencias → cierre → pago TEST; admin → autenticación, aprobar/rechazar proveedores, visibilidad de solicitudes, auditoría. No enviar pagos reales en preview.
7. Check CI, migraciones, backup, rollback y protección de datos; exigir aprobación explícita para activar tráfico real o escribir migraciones PROD; cutover controlado y seguimiento.

## Restricciones
No aplicar `supabase db reset`, restauración, borrado, copia ciega de `auth.users`, cambios de credenciales, migraciones o redireccionamiento a PROD durante auditoría. No asumir que mover URL migrará usuarios. No tocar PROD hasta superar gates. Presupuesto USD 0.

## Estado del intento
Auditoría de tabla y columnas **PARCIAL PASS**; compatibilidad total **PENDIENTE**; backup **PENDIENTE**; Auth/RLS real por rol **PENDIENTE**; CI/E2E **PENDIENTE**; activación PROD **BLOQUEADA**.
