# UGO Hive / Empresa Autónoma — preflight de producción (SOLO LECTURA)

Fecha de auditoría: 2026-10-19. Entorno PROD `trfsjuseqjxlhrxuvdsm`; TEST Arena `tmossnqfwfwjrtzwcbmm`.

## Resultados comprobados mediante SELECT
| Elemento | Producción | TEST | Clasificación |
|---|---:|---:|---|
| Tablas públicas | 42 | 106 | DIFFERENT |
| Funciones públicas | 59 | 164 | DIFFERENT |
| Políticas RLS públicas | 88 | 148 | DIFFERENT |
| Migraciones registradas | 123 | 362 | DIFFERENT |
| Tablas public.autonomous_* | 0 | 33 | MISSING en PROD |
| Tablas public.hive_* | 0 | 4 | MISSING en PROD |
| `autonomous_company_state` | No | Sí | MISSING |
| `autonomous_release_gate` | No | Sí | MISSING |
| `autonomous_kill_switches` | No | Sí | MISSING |
| Edge Functions | `ugo-push-worker` | `push-dispatch`, `hugo-runtime`, `ugo-hive-backup-receiver`, `ugo-hive-status` | DIFFERENT |
| Bucket backup Hive | No | Privado | MISSING |

Buckets adicionales de producción conocidos por lectura: `client-public`, `documentos`, `provider-kyc`, `provider-public`, `request-evidence`, `service-evidence`.

La cantidad de migraciones no equivale a una lista de migraciones a aplicar: hay divergencias históricas entre los proyectos; **no correr en producción el directorio entero de migraciones**. El estado `READY` del Autonomy Gate en TEST no es trasladable a producción.

## BLOQUEOS REALES
1. **BLOCKED — respaldo/restauración PROD:** no se verificó un backup PostgreSQL completo y restaurable de producción. Los snapshots SQLite cifrados de Render cubren FreeLLMAPI en Arena TEST, no PostgreSQL PROD.
2. **BLOCKED — esquema y gate PROD:** no existe la base de datos de Empresa Autónoma/Hive en PROD. No activar nada ni copiar `READY`.
3. **BLOCKED — plan incremental:** identificar dependencias de las ~239 migraciones de diferencia y reconciliar esquemas y RLS con una restauración aislada de PROD. Debe construirse un manifiesto/plan de migraciones seleccionadas, idempotentes y revisadas, no un SQL masivo ciego.
4. **BLOCKED — integración Hive PROD:** `ugo-hive-status` actual tiene project ref de TEST restringido de forma explícita. Se requiere servicio, credenciales, autorización y aislamiento nuevos para PROD sin exponer service-role en frontend.
5. **HUMAN_REQUIRED — activación y aceptación:** autorización separada de cambio PROD, verificación Super Admin, pruebas cliente/proveedor reales y aceptación `CUSTOMER_1`.

## Plan ejecutable secuencial (sin tocar PROD)
- 1. Exportar inventario de SOLO LECTURA de funciones, RLS, permisos y migraciones de ambos proyectos. Clasificar drift, especialmente objetos con nombres coincidentes.
- 2. Obtener/validar backup PostgreSQL PROD con verificación de restauración fuera de PROD, coste cero comprobado antes de crear recursos.
- 3. Generar diff estructural respecto a la restauración de producción en sandbox aislado. Seleccionar dependencias mínimas de Empresa Autónoma y Hive y diseñar scripts versionados; revisar propietarios, GRANT, RLS, SECURITY DEFINER y capacidad de reversión.
- 4. Probar migraciones seleccionadas en clon aislado y repetir contratos DB, seguridad, regresión de Cliente/Proveedor/Admin, Autonomy Gate y kill-switch.
- 5. Preparar cambio para autorización humana explícita. No ejecutar migraciones ni activar trabajos automáticamente.
- 6. Si y solo si PROD pasa gate propio `READY` y controles de costes/permisos, pedir autorización separada de activación. `CUSTOMER_1` debe permanecer independiente y no quedar autorizado por error.

## Evidencia y límites
- Acceso empleado: SQL SELECT contra PROD y TEST; consulta metadata de Edge Functions.
- Ninguna escritura de base de datos, secretos, alteración de Render, migración ni despliegue en PROD.
- No se accedió a contenido ni se demostraron permisos de todos los secretos y roles; se clasifica UNVERIFIED.
- No hay recuperación verificada de backup PostgreSQL PROD; es bloqueo absoluto para escritura.
- Rollback de este trabajo: cerrar PR y borrar su rama documental; no afecta producción.
- `VERIFIED`: inventario resumido anterior. `BLOCKED`: cambios PROD y activación. `UNVERIFIED`: recuperabilidad, integridad RLS detallada, readiness PROD, costes de recursos nuevos, E2E usuario real.

## Próximo paso verificable
Confirmar la disponibilidad de exportación PostgreSQL PROD y restauración aislada sin crear ni pagar recursos; luego documentar diff de esquema y sólo entonces proponer migraciones específicas.
