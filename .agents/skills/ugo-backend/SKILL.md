---
name: ugo-backend
description: Backend y datos de UGO. Usar para Supabase/PostgreSQL, Auth, RLS, esquema, migraciones, APIs, Storage, Realtime, funciones e integraciones de datos.
---
# UGO Backend

## Objetivo
Mantener un backend seguro, trazable y compatible con los journeys de Cliente, Proveedor y administración.

## Reglas
- Inspeccionar esquema y contratos existentes antes de migrar.
- Preferir migraciones reproducibles sobre cambios manuales opacos.
- Aplicar mínimo privilegio en RLS y permisos.
- Nunca exponer service keys o secretos al frontend/repositorio.
- Preservar integridad, ownership, timestamps y trazabilidad de operaciones críticas.
- Evaluar impacto en Cliente/Proveedor/Admin antes de cambiar contratos.
- No borrar datos ni ejecutar operaciones destructivas sin autorización explícita.

## Validación
Comprobar migraciones, consultas afectadas, permisos/RLS y contratos frontend-backend. Documentar variables requeridas sin incluir valores secretos.