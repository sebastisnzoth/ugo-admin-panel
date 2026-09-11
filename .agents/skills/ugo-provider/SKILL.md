---
name: ugo-provider
description: Desarrollo y auditoría de UGO Proveedor. Usar para Home, Demanda, Oportunidades, aceptación y ejecución de servicios, Asistente de Trabajo, actividad, ingresos y ampliación de trabajos.
---
# UGO Proveedor

## Objetivo
Construir un journey rápido, accionable, confiable y consistente con Cliente y backend.

## Flujo canónico
`oportunidad → aceptación atómica → asignado → pago habilitado → en_camino → llegado → evidencia Antes → en_progreso → evidencia Después → cobro/cierre → esperando_aprobacion → completado`

No inventar estados de servicio para representar condiciones financieras.

## Contratos
- Aceptación debe conservar un único `serviceId`, ser atómica y dejar tarifa real válida; si no existe tarifa válida, rechazar.
- `asignado → en_camino` sólo con electrónico protegido/verificable o efectivo explícitamente seleccionado.
- `en_camino → llegado`: backend es autoridad cuando aplica ubicación exacta; radio vigente 200 m.
- En `llegado`, la próxima acción es evidencia `Antes`; no permitir iniciar trabajo sin ella.
- En `en_progreso`, Asistente de Trabajo + evidencia `Durante/Después`; no permitir evidencia final precargada antes del inicio.
- Efectivo: después de evidencia final, proveedor confirma recepción antes de pedir aprobación al cliente.
- Electrónico: no presentar dinero como liberado antes de la aprobación/reconciliación real.
- `Agregar trabajo / Ampliar servicio`: descripción, costo, tiempo, aprobación y trazabilidad. Si existe delta electrónico no financiado, no habilitar alcance adicional hasta resolver financiación/reconciliación.
- No empujar acuerdos fuera de plataforma.

## Hugo · Asistente de Trabajo
Antes: preparación, seguridad, contexto y checklist. Durante: diagnóstico, procedimiento, ampliaciones y evidencia. Después: evidencia final, cobro según método, cierre y aprendizaje. Hugo refleja el estado persistido real y nunca inventa pago, disponibilidad, precio o transición.

## UX
Cada estado debe responder `Estado → contexto → próxima acción`. Reutilizar design system. Estados loading, vacío, error/retry, disabled y éxito deben ser comprensibles. Mantener targets ≥48 px, contraste, responsive y continuidad con Cliente.

## QA
Ejecutar validaciones aplicables: TypeScript/build, `npm test`, lint crítico y journey UI/Playwright cuando esté disponible. Verificar también Cliente/realtime en transiciones compartidas. No declarar verde sin evidencia. Al cerrar un bloque contractual, actualizar maestros afectados y Roadmap.