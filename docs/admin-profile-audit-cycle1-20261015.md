# UGO Admin — Auditoría del ciclo 1 (15 oct 2026)

## Alcance y fuentes
Repositorio `sebastisnzoth/ugo-admin-panel`, base `main` en `1b234345d323361296cf3fb7538a37a725faccd6`; PR #454 y #455 abiertos en borrador. Inspección de `api/operations.ts`, `AdminUsersPanel`, `AdminUserTracePanel`, `AdminProviderVerificationPanel`, `ProviderOnboardingGate` y esquema UGO Arena TEST (`tmossnqfwfwjrtzwcbmm`). No se tocó producción ni se cambió información real de usuarios.

## HECHO VERIFICADO — Implementaciones ya presentes
- Admin Gate autentica sesión y comprueba rol activo `admin`/`superadmin`; autorización server-side en `requireAdmin`.
- Menú Personas > Usuarios y ficha con historial de servicios, reseñas, documentos y auditoría. La ficha actual **no es un editor integral**.
- Panel de revisión documental y decisión del proveedor; documentos privados mediante signed URLs.
- RPC existentes para activar/desactivar cuentas y otras operaciones; creación/importación de usuarios, recuperación de contraseñas.
- Admin y Super Admin diferenciados en la navegación, pero no se verificó la autorización de cada ruta/RPC individualmente.
- UGO TEST: seis perfiles de proveedor al momento de la consulta (dos registrados y cuatro verificados). No implica seis proveedores de producción.

## Hallazgos P0 y cambios en esta rama
1. **P0: tipo KYC de domicilio desalineado.** El proveedor y Admin usaban `comprobante_domicilio`; API exigía `domicilio`, impidiendo aprobaciones legítimas. Se alineó la validación de los cuatro tipos requeridos; continúa exigiendo el estado documental `aprobado`.
2. **P0: revisión documental reactivaba cuentas.** `verifyKyc` actualizaba `usuarios.activo=true` cuando todos los documentos estaban aprobados, confundiendo aprobación de archivo con reactivación de cuenta. Se eliminó esa mutación y su notificación incorrecta. KYC no puede conferir el estado `verificado` ni reactivar usuarios.
3. Se añadieron contratos de regresión para la coincidencia KYC y la separación entre documento, cuenta y autorización de proveedor.

## PENDIENTE / BLOQUEADO
- **P0: atomicidad:** `changeProviderVerification` modifica estado y escribe `audit_log` en dos peticiones. Si falla el segundo paso, puede quedar cambio sin registro. Requiere RPC transaccional en backend y validación TEST antes de migración.
- **P0: perfiles editables:** `AdminUserTracePanel` visualiza historia, no edita todos los campos. Diseñar una operación server-side con lista blanca de campos por rol, sesión activa, autorización del actor, validación de datos, auditoría atómica, transacciones y protección contra escalada. NO hacer updates ad hoc desde frontend.
- **P1: Admin > Mi perfil** no tiene editor personal completo de preferencias y datos; administrar roles ajenos solo desde Super Admin.
- **P1: exportaciones e importaciones, finanzas, Scout y disputas:** necesitan pruebas reales de consistencia, idempotencia y límites de acceso.
- PR #455 de registro desde Perfil continúa borrador y puede necesitar reconciliación antes de unir cambios.
- CI deberá pasar TypeScript, build, contratos y lint en la rama nueva; la presencia de código no sustituye una prueba de datos autenticada.

## DESCONOCIDO
- Experiencia real en celular del Admin y rutas autentificadas con cuentas humanas.
- Flujo de decisión KYC aprobado/rechazado contra un proveedor de prueba con documentos válidos.
- Si hay otras RPC antiguas capaces de reactivar o autorizar incorrectamente un perfil sin pasar por Admin.

## PRÓXIMA ACCIÓN
Construir un editor integral seguro en `Personas > Usuarios > Ver perfil / Editar`, iniciando con campos no sensibles de Cliente y Proveedor; implementar primero la RPC atómica en UGO TEST y probar que un usuario no administrador no puede modificar datos ajenos. Luego incorporar Mi Perfil Admin. Mantener cambios sensibles y financieros fuera del editor genérico.
