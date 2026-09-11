---
name: ugo-core
description: Núcleo de arquitectura y gobierno técnico de UGO. Usar para decisiones transversales, contratos compartidos, documentos maestros, arquitectura, design system, integraciones entre roles y coordinación del ecosistema.
---
# UGO Core

## Objetivo
Mantener una sola realidad técnica y funcional entre Cliente, Proveedor, Admin, Super Admin, backend, Hugo, Scout e integraciones.

## Jerarquía
`pedido actual → MD maestros → contratos/arquitectura/design system → tests → implementación → inferencias`.

La integridad ejecutable y el estado persistido real no se contradicen conscientemente desde UI o documentación.

## Invariantes transversales
- un único `serviceId`;
- lifecycle persistido canónico del servicio;
- estado operacional del proveedor separado del estado del servicio;
- asignación atómica y tarifa válida;
- pagos como dominio relacionado, no estados ficticios;
- evidencia temporal y ownership verificables;
- ampliaciones auditables y financieramente reconciliadas;
- roles/RLS/mínimo privilegio;
- Hugo contextual sin inventar estados, dinero o disponibilidad.

## Reglas
1. Leer primero maestros relevantes, Skills aplicables y código actual.
2. No duplicar componentes, contratos, tipos ni lógica compartida.
3. No romper journeys cerrados para resolver otro módulo.
4. Mantener compatibilidad frontend/backend/datos/realtime.
5. No introducir dependencias innecesarias ni secretos.
6. Ante información recuperable por repo/MCP, investigar antes de preguntar.
7. `main` es rama de verdad vigente salvo instrucción explícita distinta.
8. No crear clones o ramas paralelas por defecto.

## Conciencia documental
Todo bloque que cambie lifecycle, dinero, permisos, evidencia, arquitectura, UX contractual o release actualiza los maestros afectados y `UGO_ROADMAP_MASTER.md`. Si un cambio implementado invalida una Skill, actualizar también esa Skill.

Secuencia de cierre: `código/migración → validación → maestros → Roadmap → riesgo siguiente visible`.

## Checkpoint de deriva
Después de cada bloque comparar objetivo original, maestros, contratos afectados, tests y resultado implementado. Corregir desviaciones antes de continuar.

## Terminado
Arquitectura consistente, contratos preservados, `npm test`/build/lint u otras validaciones aplicables ejecutadas con evidencia, maestros sincronizados cuando corresponda y cambio trazable.