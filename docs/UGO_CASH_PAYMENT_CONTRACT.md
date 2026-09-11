# UGO · Contrato de pago en efectivo

**Versión:** 2.0 · 11 de septiembre de 2026  
**Estado:** P0 · contrato operativo de método presencial

## Regla funcional

Un cliente puede elegir **Efectivo** una vez que el servicio tiene proveedor asignado. Ese servicio queda habilitado para avanzar sin custodia electrónica de UGO.

Flujo canónico:

`asignado → efectivo pendiente → en_camino → llegado → en_progreso → evidencia final → proveedor confirma recepción → esperando_aprobacion → cliente aprueba → completado`

## Invariante de cierre

Mientras el efectivo siga `pendiente`, el servicio **permanece en `en_progreso`**, aunque ya exista evidencia final.

La evidencia final significa **trabajo terminado físicamente**; no significa todavía **servicio listo para aprobación** cuando el método es efectivo.

`confirmar_pago_efectivo(p_servicio_id)` es el paso de dominio que, una vez verificada la evidencia final:

1. registra la recepción presencial del dinero;
2. cambia el pago a `liberado/registrado` según el contrato actual;
3. habilita y lleva el servicio a `esperando_aprobacion`;
4. notifica al cliente para que revise y apruebe.

Nunca debe existir como estado normal:

`esperando_aprobacion + efectivo pendiente`.

Si aparece por datos históricos, el sistema debe tratarlo como un estado de recuperación: el cliente no puede aprobar y el proveedor debe completar la confirmación del efectivo.

## Seguridad y dinero

- Efectivo **no** se etiqueta como pago protegido.
- UGO registra método, monto, comisión, ganancia y confirmación, pero no custodia el dinero físico.
- No se permite cambiar a efectivo si ya existe un pago electrónico `autorizado`, `retenido`, `liberado`, `reembolsado` o `disputado`.
- La selección y la confirmación son idempotentes y serializadas por servicio.
- Sólo el cliente del servicio puede seleccionar efectivo.
- Sólo el proveedor asignado puede confirmar recepción.
- Confirmar efectivo requiere evidencia final.
- El cliente sólo puede aprobar después de la confirmación del efectivo.
- Repetir la confirmación no puede duplicar cobros, notificaciones ni transiciones.

## RPC canónicos

- `seleccionar_pago_efectivo(p_servicio_id uuid)`
- `confirmar_pago_efectivo(p_servicio_id uuid)`
- `aprobar_servicio(p_servicio_id uuid)`

Las rutas HTTP son sólo compatibilidad. El contrato de dominio vive en Supabase/RPC y no puede depender de que Vercel tenga un backend financiero alternativo configurado.

## UI obligatoria

Proveedor, al terminar con efectivo pendiente:

**Próximo paso: Confirmar efectivo recibido**

Cliente, mientras no exista confirmación:

**Esperando confirmación del cobro por parte del proveedor.**

Sólo después debe aparecer como acción principal:

**Aprobar trabajo**
