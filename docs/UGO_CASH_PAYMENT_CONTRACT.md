# UGO · Contrato canónico de pago en efectivo

**Versión:** 3.1 · 20 de septiembre de 2026  
**Estado:** P0 · flujo financiero presencial

## Regla de negocio

El efectivo es un medio de pago presencial. UGO registra el servicio y su economía, pero **no custodia el dinero físico**.

El cliente paga el importe total directamente al proveedor. Por eso ese dinero:

- aparece como **Cobrado en efectivo** para el proveedor;
- no se suma al **Saldo UGO**;
- no puede retirarse otra vez desde UGO;
- genera una deuda separada del proveedor hacia UGO por la comisión de plataforma.

## Flujo canónico de cierre

```text
servicio en_progreso
→ proveedor carga evidencia final
→ servicio esperando_aprobacion
→ cliente CONFIRMA TRABAJO
→ UGO muestra cuánto pagar al proveedor
→ cliente entrega efectivo
→ cliente pulsa YA PAGUÉ
→ pago efectivo queda confirmado/liberado como registro contable
→ servicio completado
→ UGO crea deuda de comisión del proveedor
→ proveedor ve DEBÉS A UGO
→ proveedor paga la comisión e informa referencia
→ Admin concilia la referencia
→ deuda UGO pagada
```

El proveedor no tiene que volver a confirmar que recibió el efectivo para cerrar el servicio. La confirmación final pertenece al cliente que entregó el dinero.

## Economía del servicio

La misma tarifa se conserva en todo el flujo:

```text
tarifa cliente = monto del servicio
comisión UGO = tarifa × comisión vigente
neto proveedor = tarifa - comisión UGO
```

Cuando existe una tarifa UGO cotizada por categoría/zona, su snapshot queda guardado en el servicio y se congela al asignar proveedor. Una oferta o tarifa_base del proveedor no puede reemplazar silenciosamente una tarifa UGO ya cotizada.

## Ejemplo

Servicio: R$ 120,00  
Comisión UGO 15%: R$ 18,00  
Neto económico del proveedor: R$ 102,00

Si el cliente paga en efectivo:

- el proveedor recibe físicamente **R$ 120,00**;
- UGO registra **R$ 120,00 cobrado en efectivo**;
- UGO registra **R$ 18,00 Debés a UGO**;
- el saldo retirable UGO no aumenta por esos R$ 120,00;
- cuando el proveedor paga R$ 18,00 y Admin concilia la referencia, la deuda queda saldada.

## Fuentes canónicas

- `servicios.tarifa`: precio total congelado del servicio.
- `servicios.comision_ugo`: comisión económica.
- `servicios.ganancia_proveedor`: neto del proveedor.
- `pagos`: registro del medio de pago y confirmación del cliente.
- `deudas_ugo_proveedor`: libro separado de comisiones adeudadas por cobros presenciales.

## Estados de deuda UGO

- `pendiente`: existe una comisión a pagar.
- `informado`: el proveedor informó una referencia; todavía no está conciliada.
- `parcial`: reservado para pagos parciales.
- `pagado`: Admin verificó y concilió el pago.
- `anulado`: deuda anulada administrativamente.

Informar una referencia **no** salda la deuda. Sólo `admin_confirmar_deuda_ugo_pagada` puede conciliarla.

## RPC canónicos

### Flujo del cliente

- `seleccionar_pago_efectivo(p_servicio_id uuid)`
- `aprobar_servicio(p_servicio_id uuid)`
- `confirmar_pago_efectivo_cliente(p_servicio_id uuid)`

### Comisión del proveedor

- `informar_pago_deuda_ugo(p_deuda_id uuid, p_referencia text)`
- `admin_confirmar_deuda_ugo_pagada(p_deuda_id uuid, p_referencia text, p_notas text)`

## UI obligatoria

### Cliente

Después de aprobar el trabajo:

**Pagá R$ X al proveedor**

y luego:

**YA PAGUÉ R$ X**

### Proveedor

En Ganancias:

- **Saldo UGO** — sólo dinero digital liberado;
- **En proceso** — dinero digital protegido;
- **Cobrado en efectivo** — dinero recibido directamente del cliente;
- **Debés a UGO** — comisión pendiente de los cobros presenciales.

Por servicio en efectivo debe poder ver total cobrado, comisión, neto y estado de la deuda.

### Admin / Super Admin

Finanzas debe mostrar por separado:

- GMV real;
- saldo digital de proveedores;
- efectivo cobrado por proveedores;
- deuda UGO por efectivo;
- comisión UGO efectivamente cobrada;
- retiros y reembolsos.

La conciliación de deuda requiere una referencia externa y queda auditada.

## Invariantes

1. Un cobro en efectivo nunca se contabiliza como saldo custodio de UGO.
2. Un mismo pago en efectivo genera como máximo una deuda de comisión.
3. Realtime puede refrescar la UI, pero la deuda vive en PostgreSQL.
4. El proveedor sólo ve sus deudas; Admin/Super Admin puede ver todas.
5. `anon` no puede leer el libro de deuda.
6. El cliente confirma el efectivo sólo después de aprobar el trabajo.
7. La comisión de efectivo no se considera cobrada hasta conciliación Admin.
8. DEMO y REAL permanecen separados.


## Límite de deuda para nuevos pedidos

UGO permite que el proveedor complete y cobre normalmente los trabajos ya asignados. La deuda de comisión sólo afecta la **elegibilidad para trabajos nuevos**.

Regla vigente:

```text
0–2 servicios con comisión UGO pendiente → puede seguir Online y aceptar nuevos pedidos
3 o más servicios con comisión UGO pendiente → Offline obligatorio + sin nuevas ofertas + aceptación bloqueada
```

Cuenta como pendiente toda fila REAL de `deudas_ugo_proveedor` con saldo mayor a cero y estado distinto de `pagado` o `anulado`. El estado `informado` sigue siendo deuda abierta hasta que Admin/Super Admin la concilie.

Al alcanzar el tercer servicio pendiente, backend fuerza `perfiles_proveedor.online=false` y `disponible=false`, expira ofertas todavía pendientes y rechaza cualquier asignación nueva. Los servicios ya asignados **no se cancelan ni se bloquean**.

Cuando el total vuelve a menos de 3 deudas conciliadas, el proveedor puede ponerse Online manualmente otra vez. UGO no lo reactiva automáticamente.

### Botón PAGAR UGO

Ganancias ofrece `PAGAR UGO · PIX` por comisión pendiente. El backend autentica al proveedor, toma el saldo real de la deuda y genera un Pix BRL hacia la chave `UGO_PIX_KEY`. Generar o copiar el Pix no salda la deuda. Después del pago, el proveedor informa la referencia y la conciliación administrativa continúa siendo la autoridad para marcar `pagado`.
