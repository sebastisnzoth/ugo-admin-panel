---
name: ugo-backend
description: Backend y datos de UGO. Usar para Supabase/PostgreSQL, Auth, RLS, esquema, migraciones, APIs, Storage, Realtime, funciones e integraciones de datos.
---
# UGO Backend

## Objetivo
Mantener un backend seguro, trazable y autoridad de integridad para Cliente, Proveedor y administración.

## Invariantes actuales
- Un único `serviceId` por servicio extremo a extremo.
- Aceptación de oportunidad atómica; asignación y tarifa válida quedan resueltas bajo el mismo contrato o la operación falla.
- Lifecycle de servicio: `borrador → buscando → ofrecido → asignado → en_camino → llegado → en_progreso → esperando_aprobacion → completado`; excepciones `cancelado`, `disputado`.
- Pago es dominio relacionado, no lifecycle paralelo. `asignado → en_camino` requiere electrónico protegido/verificable o efectivo presencial explícitamente seleccionado.
- Método de pago elegido no se sustituye silenciosamente; recuperación sólo bajo contrato explícito (por ejemplo pago fallido).
- Llegada geográfica: backend autoridad; radio operativo vigente 200 m cuando aplica ubicación exacta.
- Evidencia: `Antes` sólo en `llegado`; `Durante/Después` en `en_progreso`; `Después` en `esperando_aprobacion` sólo recuperación histórica. Validar ownership del proveedor asignado.
- Efectivo pendiente debe confirmarse después de evidencia final y antes de `esperando_aprobacion`.
- Ampliaciones con costo extra deben reconciliar financiación. Delta electrónico no financiado no habilita alcance adicional ni cierre normal.

## Reglas
- Inspeccionar esquema, funciones/RPC, triggers, RLS y contratos existentes antes de migrar.
- Preferir migraciones reproducibles sobre cambios manuales opacos.
- Las reglas críticas de dinero/lifecycle/evidencia deben tener guard backend; no confiar sólo en UI.
- Aplicar mínimo privilegio en RLS y permisos; validar actor/ownership dentro de operaciones críticas.
- Nunca exponer service keys o secretos al frontend/repositorio.
- Preservar integridad, timestamps, idempotencia y trazabilidad.
- Evaluar impacto en Cliente/Proveedor/Admin/Hugo y Realtime antes de cambiar contratos.
- No borrar datos ni ejecutar operaciones destructivas sin autorización explícita.

## Pagos
Electrónico conserva procesamiento sensible server-side. Efectivo es first-class pero sin custodia UGO. No inventar confirmación, referencia externa, protección ni liberación. Las ampliaciones electrónicas requieren mecanismo explícito para cobrar/reconciliar el delta antes de considerarlas financiadas.

## Validación
Comprobar migraciones aplicadas cuando corresponda, consultas afectadas, RLS/permisos, invariantes, idempotencia y contratos frontend-backend. Ejecutar `npm test`/CI contractual cuando aplique. No declarar producción migrada o verde sin evidencia. Actualizar maestros de datos/gobernanza/flujo/testing y Roadmap cuando cambie un contrato.