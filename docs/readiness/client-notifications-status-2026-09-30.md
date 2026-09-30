# UGO Readiness — Client Notifications

**READINESS_ID:** `client-notifications`  
**Área:** App Cliente  
**Control:** Notificaciones Cliente  
**Fecha:** 2026-09-30  
**Objetivo funcional:** verificar notificaciones de ciclo de vida para **asignado → en camino → llegó → cambios → cierre**, usando canal web/push TEST o evidencia equivalente del canal soportado.

## Estado autoritativo actual

- **Estado del lock:** `IN_PROGRESS`
- **task_id:** `readiness-client-notifications`
- **job_id:** `UGO-READINESS-CLIENT-NOTIFICATIONS`
- **Owner:** UGO
- **Assigned agent:** `Client Notifications Runtime Agent`
- **Attempt:** 3
- **Current step:** `FIX_CANONICAL_UI_AUTH_AND_RERUN`
- **Correlation ID:** `readiness-client-notifications-20260930T134500Z-781755c3-r2`
- **Started SHA:** `781755c316850babf3c7e28d76e8b6639da4578f`
- **Heartbeat observado:** `2026-09-30T13:49:00Z`
- **Lease observado:** `2026-09-30T14:34:00Z`
- **Production touched:** `false`
- **Recursos reservados:** `notifications`, `shared-provider-fixture`, `preview-runtime`

Fuente autoritativa: `docs/ugo-work-locks/readiness-client-notifications.json`.

## Reconciliación del STALE_LOCK

El pedido original llegó con estado `STALE_LOCK`, pero al revalidar `main` y el lock persistido se comprobó que el control ya había sido re-adquirido por un agente activo.

Por regla de exclusión de UGO, **no se creó una segunda ejecución**, no se pisó el lock y no se abrió trabajo duplicado sobre el recurso `notifications`.

## Runtime TEST — hallazgo actual

El primer runtime de esta ejecución no demuestra todavía un defecto funcional de notificaciones. El fallo observado fue del harness de autenticación del navegador:

- **Run:** `36723968599`
- **Resultado:** fallo por timeout del diálogo Cliente
- **Causa persistida:** el browser harness inyectó una sesión por local storage y nunca alcanzó el diálogo de detalle Cliente.
- **Siguiente corrección definida por el agente:** autenticar mediante el `Client AuthScreen` canónico, preservando el deep link `serviceId`, y volver a ejecutar la prueba.

Esto separa el problema de infraestructura/harness de la funcionalidad que realmente se quiere validar.

## Evidencia persistida

Hasta este snapshot:

- `github-run:36723968599:FAIL_DIALOG_TIMEOUT`
- `github-artifact:11101693090`

La evidencia anterior es diagnóstica; **no alcanza para VERIFIED**.

## Criterio pendiente para VERIFIED

El control solo puede cerrar cuando exista evidencia verificable en UGO TEST del flujo soportado:

1. Cliente recibe evento de profesional **asignado**.
2. Cliente recibe cambio a **en camino**.
3. Cliente recibe evento **llegó**.
4. Cliente recibe **cambios relevantes** del servicio sin depender de refresh manual cuando corresponda.
5. Cliente recibe **cierre/finalización**.
6. Preferencias y fallback no silencian indebidamente eventos críticos.
7. La prueba utiliza autenticación/ruta canónica y no un atajo frágil del harness.
8. Evidencia persistida queda asociada al mismo trabajo mediante `correlation_id`, `job_id` y/o `serviceId`.
9. **Judge = PASS**.
10. **Sentinel = PASS**.
11. El lock autoritativo cambia a `DONE`.

## Regla de cierre

No marcar manualmente el catálogo como VERIFIED.

La fuente autoritativa es:

`docs/ugo-work-locks/readiness-client-notifications.json`

y el cierre requiere simultáneamente:

- `status: DONE`
- evidencia persistida
- Judge PASS
- Sentinel PASS
- `production_touched: false`

## Restricciones de ejecución

- No tocar producción.
- No duplicar el job mientras el lease esté vigente.
- No reset / force push.
- No revertir trabajo válido ajeno.
- No exponer secretos.
- Mantener heartbeat/lease durante la ejecución.
- Revalidar `main` antes de cualquier modificación posterior.
- Revalidar Command Center / Pages al finalizar.

## Snapshot de coordinación

Durante esta documentación se verificó además que:

- `cross-errors` ya había cerrado como `DONE` con Runtime PASS, Judge PASS y Sentinel PASS.
- `client-payment` estaba siendo ejecutado en paralelo bajo su propio lock.
- Por lo tanto, un snapshot anterior que mostraba únicamente `cross-errors` como habilitado ya no debe considerarse autoritativo sin una nueva derivación del Command Center.

## Próxima acción segura

Continuar **en el job existente**, corregir el flujo de autenticación del runtime browser, re-ejecutar el escenario de notificaciones Cliente sobre UGO TEST, persistir evidencia same-job/same-correlation y someter el resultado a Judge + Sentinel.

No iniciar una segunda ejecución sobre `client-notifications` mientras el lock actual continúe vigente.
