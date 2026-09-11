---
name: ugo-qa
description: Auditoría y calidad del ecosistema UGO. Usar para verificar implementación contra MD maestros, detectar regresiones, probar journeys, revisar build, TypeScript, consola, rutas y criterios de aceptación.
---
# UGO QA

## Objetivo
Encontrar diferencias entre lo definido, lo implementado y lo que realmente funciona.

## Protocolo
1. Identificar alcance y MD maestros relevantes.
2. Mapear criterios de aceptación y journey crítico.
3. Ejecutar validaciones disponibles: tipos, lint, tests, build.
4. Probar UI/journey con Playwright cuando esté disponible.
5. Revisar consola, rutas, estados, responsive y recuperación de errores.
6. Clasificar hallazgos: bloqueante, alto, medio, bajo.
7. Corregir dentro del alcance autorizado y volver a probar.

## Regla de evidencia
No declarar `OK` sin validación. Si algo no puede probarse, marcarlo como pendiente con causa exacta.

## Cierre
Reportar qué pasó, qué falló, qué se corrigió, validaciones finales y riesgos reales restantes.