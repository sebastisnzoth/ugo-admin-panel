# UGO · Contrato de pago en efectivo

Estado: P0 · método de pago presencial de primera clase.

## Regla funcional

Un cliente puede elegir **Efectivo** una vez que el servicio tiene proveedor asignado. Ese servicio queda habilitado para avanzar sin custodia electrónica de UGO.

Flujo canónico:

`asignado → efectivo pendiente → en_camino → llegado → en_progreso → evidencia final → proveedor confirma recepción → cliente aprueba → completado`

## Seguridad y dinero

- Efectivo **no** se etiqueta como pago protegido.
- UGO registra método, monto, comisión, ganancia y confirmación, pero no custodia el dinero físico.
- No se permite cambiar a efectivo si ya existe un pago electrónico `autorizado`, `retenido`, `liberado`, `reembolsado` o `disputado`.
- La selección y la confirmación son idempotentes y serializadas por servicio.
- Sólo el cliente del servicio puede seleccionar efectivo.
- Sólo el proveedor asignado puede confirmar recepción.
- El cierre requiere evidencia final y efectivo confirmado.

## RPC canónicos

- `seleccionar_pago_efectivo(p_servicio_id uuid)`
- `confirmar_pago_efectivo(p_servicio_id uuid)`

Las rutas HTTP existentes quedan como compatibilidad; el contrato de dominio vive en Supabase/RPC.
