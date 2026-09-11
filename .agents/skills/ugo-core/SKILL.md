---
name: ugo-core
description: Núcleo de arquitectura y gobierno técnico de UGO. Usar para decisiones transversales, contratos compartidos, documentos maestros, arquitectura, design system, integraciones entre roles y coordinación del ecosistema.
---
# UGO Core

## Objetivo
Mantener coherencia técnica y funcional entre Cliente, Proveedor, Admin, Super Admin, backend e integraciones.

## Reglas
1. Leer primero los documentos maestros relevantes y el estado actual del código.
2. Prioridad: pedido actual > MD maestros vigentes > contratos/design system > tests > implementación > inferencias.
3. No duplicar componentes, contratos, tipos ni lógica compartida.
4. No romper journeys cerrados para resolver otro módulo.
5. Mantener compatibilidad entre frontend, backend y modelo de datos.
6. No introducir dependencias innecesarias ni secretos.
7. Ante información recuperable por repo/MCP, investigar antes de preguntar al usuario.

## Checkpoint de deriva
Después de cada bloque comparar: objetivo original, MD maestros, contratos afectados y resultado implementado. Corregir desviaciones antes de continuar.

## Terminado
Arquitectura consistente, contratos preservados, validaciones aplicables ejecutadas y cambio trazable.