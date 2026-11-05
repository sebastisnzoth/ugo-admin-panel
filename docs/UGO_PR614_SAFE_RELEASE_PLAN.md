# PR #614 — Plan de despliegue seguro (UGO)

**Alcance:** `arena/17f78bc1-ugo-admin-panel` → `main`. Este documento NO autoriza cambios en Arena PROD ni los ejecuta.

## Gates obligatorios

1. Congelar y registrar SHA de `main` y de PR; crear tag/branch de respaldo inmutable apuntando a `main` antes de cualquier merge; no usar force push.
2. Exigir todos los checks críticos de GitHub Actions verdes para el SHA exacto de PR: Core CI, autenticación, matching P0, GPS, Cliente/Proveedor, notificaciones, UI, Realtime y runtime. Confirmar deploy preview de Vercel sobre ese SHA y que apunta exclusivamente a TEST.
3. Confirmar en UGO TEST las migraciones exactas `20261105120000_provider_accept_outside_availability.sql` y `20261105130000_provider_pending_request_pool.sql`, sin divergencias de definición. Validar revocación de EXECUTE a `anon` y `PUBLIC`, exposición de RPC solo a `authenticated`, autenticación con JWT real, rol proveedor y RLS. Comprobar ausencia de efectos en pagos y servicio cancelado o vencido.
4. Ejecutar prueba REAL de concurrencia en TEST con dos sesiones independientes, dos cuentas proveedor verificadas y GPS elegible, y UN servicio efímero inequívocamente etiquetado; ambas sesiones deben invocar `tomar_pedido_pendiente` simultáneamente. Aceptar solo resultado: exactamente 1 asignación persistida, 1 ganador, segundo rechazado o informado como no disponible, ausencia de doble cobro/ofertas ganadoras. Repetir 10 veces con nuevos fixtures; verificar idempotencia del ganador. Guardar evidencia y limpiar solo fixtures propios. No reutilizar pedidos de usuarios reales.
5. Verificar explícitamente el umbral de antigüedad de 5 minutos respecto del ciclo real de matching; confirmar política de agenda/zonas y licencias de imágenes JPG.

## Orden seguro de publicación

**No desplegar frontend que invoque RPC inexistentes.** La sección de bolsa debe tener compatibilidad hacia atrás: si faltan RPC en PROD, ocultar sección sin errores visibles; las ofertas normales continúan. Preferible **feature flag desactivada por defecto** hasta autorizar cambios de DB y validarlos.

En una ventana de lanzamiento **separada y explícitamente autorizada** para producción: obtener respaldo verificable de la DB, registrar esquema/versiones/hashes y capacidad de restauración; aplicar las dos migraciones SQL, en orden, con conexión de privilegio mínimo y supervisión; ejecutar smoke de permisos, matching, una sola asignación, Realtime, autenticación y pagos; recién después habilitar bolsa y publicar frontend a usuarios. **La instrucción actual prohíbe migrar PROD, por lo que esta fase queda BLOQUEADA.**

## Rollback

- Código: revertir al SHA de `main` previo a la fusión mediante revert normal; preservar auditoría y respaldos, nunca force push.
- Feature: desactivar bolsa de pedidos inmediatamente. Si el código contiene fallback de RPC ausente, el resto debe seguir activo.
- Base: no ejecutar `DROP FUNCTION` a ciegas sobre producción. Restaurar solo con plan aprobado y previa revisión de dependencias, grants, contratos, servicios/pagos afectados y backups.

## Evidencia requerida para cierre

SHA exactos, 0 checks críticos fallidos, deploy URL y commit, test de concurrencia y su log, migrations TEST y grants, banderas de exposición, plan de rollback y aprobación de ventana PROD. Si algo falta, **NO MERGE**.
