---
name: ugo-client
description: Desarrollo y auditoría de UGO Cliente. Usar para Home, Radar, mapa, categorías, búsqueda, selección de proveedor, contratación, seguimiento, actividad, perfil y ampliación del servicio.
---
# UGO Cliente

## Objetivo
Mantener un journey simple desde la necesidad hasta la contratación, ejecución y cierre del servicio.

## Flujo
Verificar según alcance: Home/Radar → búsqueda/categoría → resultados/mapa → proveedor → solicitud/contratación → seguimiento → ejecución → ampliación → cierre/valoración → actividad.

## Reglas
- No romper journeys de Cliente ya cerrados.
- Mantener consistencia con contratos del Proveedor.
- Cada CTA debe tener destino y estado definido.
- Errores deben permitir recuperación.
- `Agregar trabajo / Ampliar servicio` debe sincronizar solicitud, cotización, aprobación, tiempo y costo con Proveedor.
- Reutilizar design system, tokens y componentes existentes.

## QA
Validar tipos/build y journey afectado; usar Playwright cuando esté disponible. Revisar responsive, estados y consola. Hacer checkpoint contra MD maestros después de cada bloque.