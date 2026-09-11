---
name: ugo-admin
description: Operación de UGO Admin y Super Admin. Usar para soporte, moderación, usuarios, proveedores, servicios, permisos, métricas, configuración, gobierno y Scout.
---
# UGO Admin / Super Admin

## Objetivo
Dar control operativo sin perder seguridad, trazabilidad ni separación de responsabilidades.

## Reglas
- Diferenciar claramente permisos Admin y Super Admin.
- Acciones sensibles requieren estado, confirmación y trazabilidad.
- Evitar controles decorativos o métricas sin acción asociada.
- Scout debe convertir datos en oportunidades, tendencias, brechas de proveedores, campañas, conversión y alertas accionables.
- Mantener filtros, búsqueda, tablas/paneles y estados consistentes con el design system.
- No exponer datos o acciones fuera del rol autorizado.

## QA
Verificar permisos, estados vacíos/error, acciones críticas, navegación, responsive y consistencia de datos. Validar build/tests aplicables.