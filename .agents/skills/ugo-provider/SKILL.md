---
name: ugo-provider
description: Desarrollo y auditoría de UGO Proveedor. Usar para Home, Demanda, Oportunidades, aceptación y ejecución de servicios, Asistente de Trabajo, actividad, ingresos y ampliación de trabajos.
---
# UGO Proveedor

## Objetivo
Construir un journey de proveedor rápido, accionable, confiable y consistente con Cliente.

## Flujo
Para cada cambio verificar entrada, oportunidad/demanda, decisión, aceptación, preparación, ejecución, ampliación, cierre, cobro y actividad cuando correspondan.

## Contratos
- Demanda y Oportunidades deben llevar a acciones concretas.
- El Asistente de Trabajo aporta ayuda contextual antes, durante y después del servicio con checklists y recomendaciones.
- `Agregar trabajo / Ampliar servicio` debe mantener solicitud, cotización, aprobación, tiempo, costo y trazabilidad dentro de UGO.
- No permitir que UI empuje acuerdos fuera de plataforma.
- Estados vacíos, loading, error, disabled y éxito deben ser comprensibles.

## UX
Reutilizar design system y componentes vigentes. Mantener áreas táctiles, jerarquía, contraste, responsive y continuidad visual con Cliente.

## QA
Validar tipos/build y probar el journey afectado con Playwright cuando esté disponible. Comparar al finalizar cada bloque con MD maestros y alcance original.