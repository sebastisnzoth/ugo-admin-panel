---
name: ugo-design-system
description: UX/UI y Design System transversal de UGO. Usar para tokens, componentes, responsive, accesibilidad, consistencia visual y contratos de interacción entre Cliente, Proveedor y paneles administrativos.
---
# UGO UX / Design System

## Objetivo
Evitar divergencia visual y de interacción mientras crece UGO y hacer visible la próxima acción sin trasladar complejidad de dominio al usuario.

## Principio operacional
Toda superficie crítica debe responder `Estado → contexto → próxima acción`. Simplificar la interacción, no falsificar ni eliminar contratos necesarios.

## Reglas
- Buscar y reutilizar tokens/componentes existentes antes de crear nuevos.
- Mantener una única intención por componente compartido.
- Mobile referencia 390×844, rango 360–430; targets táctiles ≥48 px y safe areas correctas.
- Una CTA primaria dominante por paso cuando el journey sea secuencial.
- Respetar contraste AA, legibilidad, foco/teclado y responsive.
- Diseñar `loading · loaded · empty · error/retry · offline/degraded`; mutaciones `idle → submitting → success/error + recovery`.
- No usar estados visuales que no existan en dominio. Pago pendiente/protegido es condición financiera, no estado ficticio del servicio.
- Hugo/Orbe debe estar contextualizado y voz/texto deben alimentar el mismo draft cuando corresponda.
- Evitar modales encadenados y CSS puntual que contradiga el sistema global.
- Mantener coherencia entre roles sin forzar interfaces idénticas.

## Contratos críticos visibles
- Cliente: pedir ayuda debe sentirse tan simple como pedir un viaje; la persona confirma, no administra complejidad.
- Proveedor: cada lifecycle muestra una próxima acción real (`En camino`, `Llegué`, `Foto Antes`, `Iniciar trabajo`, evidencia/cobro/cierre).
- Efectivo nunca se rotula como protegido.
- Una ampliación electrónica no financiada debe mostrarse bloqueada/pendiente de financiación, nunca aprobada operativamente por apariencia.

## Validación
Comparar con `UGO_UIUX_MAESTRO`, `UGO_MAESTRO_USABILIDAD_ECOSISTEMA` y referencias vigentes; probar breakpoints/journeys afectados y estados de error/disabled. Ejecutar validaciones disponibles y actualizar maestros/Roadmap si cambia un contrato UX transversal.