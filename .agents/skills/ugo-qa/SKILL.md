---
name: ugo-qa
description: Auditoría y calidad del ecosistema UGO. Usar para verificar implementación contra MD maestros, detectar regresiones, probar journeys, revisar build, TypeScript, consola, rutas y criterios de aceptación.
---
# UGO QA

## Objetivo
Encontrar diferencias entre lo definido, lo implementado y lo que realmente funciona, priorizando el circuito real Cliente ↔ Proveedor ↔ Backend.

## Gates vigentes
1. Dependencias/audit aplicable.
2. TypeScript + production build.
3. `npm test` — contratos core.
4. Lint de superficies críticas.
5. Journey UI/E2E cuando exista runner disponible.
6. Realtime, permisos/RLS, pagos, evidencia y recuperación según alcance.
7. Smoke/deploy sólo cuando realmente se ejecute.

## Contratos mínimos a vigilar
- lifecycle canónico y un único `serviceId`;
- aceptación atómica + tarifa real;
- pago listo antes de `en_camino`;
- llegada con autoridad backend/radio 200 m cuando aplica;
- evidencia temporal `Antes/Durante/Después`;
- efectivo recibido antes de aprobación;
- aprobación del cliente con ownership/evidencia válidos;
- ampliación con delta financiero reconciliado;
- método de pago no sustituido silenciosamente.

## Protocolo
1. Identificar alcance, Skills y MD maestros relevantes.
2. Mapear criterios de aceptación y journey crítico.
3. Ejecutar validaciones disponibles: tipos, `npm test`, lint, build.
4. Probar UI/journey con Playwright cuando esté disponible.
5. Revisar consola, rutas, realtime, estados, responsive y recuperación.
6. Clasificar hallazgos: bloqueante, alto, medio, bajo.
7. Corregir dentro del alcance autorizado y volver a probar.
8. Comparar implementación final con maestros y actualizar documentación/Roadmap si el contrato cambió.

## Regla de evidencia
No declarar `OK`, `CI verde`, `deploy exitoso`, migración aplicada o E2E validado sin evidencia de esa ejecución exacta. Un workflow en progreso no es verde. Si algo no puede probarse, marcar pendiente con causa exacta.

## Deuda de testing
Los contract tests actuales son un gate mínimo, no reemplazan E2E. El objetivo siguiente es automatizar Cliente ↔ Proveedor ↔ Backend sobre el lifecycle completo y escenarios de pago/evidencia/disputa.

## Cierre
Reportar qué pasó, qué falló, qué se corrigió, validaciones finales, commit correspondiente y riesgos reales restantes.