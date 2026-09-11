---
name: ugo-client
description: Desarrollo y auditoría de UGO Cliente. Usar para Home, Radar, mapa, categorías, búsqueda, solicitud guiada, pago, seguimiento, ejecución, ampliación, cierre, actividad y perfil.
---
# UGO Cliente

## Objetivo
La persona cuenta lo que necesita; Hugo/UGO convierten el problema en una solicitud estructurada y la persona confirma. Mantener el journey simple sin esconder ni falsificar contratos críticos.

## Flujo canónico
`necesidad → Hugo interpreta → confirmación guiada + evidencia → búsqueda → asignación → elección de pago → proveedor en camino → llegada → ejecución → ampliación si aplica → aprobación/disputa → reputación → nueva necesidad`

## Solicitud guiada
- Una pregunta principal por paso y una CTA primaria.
- Voz y texto alimentan el mismo draft; no crear conversación paralela al formulario.
- No volver a preguntar información ya entendida.
- Foto sólo cuando aporta contexto; explicar por qué.
- No inventar tarifa. Mostrar referencia real cuando exista o indicar que está por confirmar.
- Preservar draft y recuperación ante back/reload/error de red cuando sea posible.

## Pagos
La UI deriva condición financiera desde `pagos`, no desde estados ficticios de `servicios`. Una vez elegido método válido, no permitir cambio silencioso salvo recuperación backend explícita/estado fallido. Efectivo nunca se presenta como protegido. Electrónico sólo se presenta confirmado/protegido con evidencia real del procesador.

## Seguimiento
Cliente y Proveedor observan el mismo `serviceId` y estado persistido. `en_camino` muestra tracking disponible; `llegado` comunica llegada; `en_progreso` comunica trabajo en ejecución; `esperando_aprobacion` exige evidencia final válida antes de aprobar.

## Ampliación
`Agregar trabajo / Ampliar servicio` sincroniza descripción, costo, tiempo, aprobación y trazabilidad con Proveedor. No permitir aprobación engañosa de un delta electrónico todavía no financiado. Efectivo sigue contrato presencial auditable.

## UX
`Estado → contexto → próxima acción`. Reutilizar design system/tokens/componentes. Targets ≥48 px, safe areas, contraste, keyboard sin ocultar CTA, loading/empty/error/retry/offline y disabled comprensibles.

## QA
Validar TypeScript/build, `npm test`, lint crítico y journey afectado; Playwright cuando esté disponible. Revisar responsive, consola, realtime y recuperación. No declarar OK sin evidencia. Al cerrar cambios contractuales, actualizar maestros afectados y Roadmap.