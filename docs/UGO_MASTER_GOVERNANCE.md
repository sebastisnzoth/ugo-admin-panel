# UGO — Master Governance

**Versión:** 2.1 · 11 de septiembre de 2026  
**Estado:** contrato superior de compatibilidad documental  
**Rama de verdad:** `main`

> UGO mantiene una sola realidad de producto. Este documento fija las reglas que ningún flujo, pantalla, prototipo o implementación puede contradecir.

## 1. Autoridades

- `UGO_MASTER_INDEX.md`: entrada y visión transversal.
- `UGO_DEVELOPMENT_MASTER.md`: proceso de desarrollo.
- `UGO_ECOSISTEMA_FLUJO.md`: producto y journeys.
- `UGO_UIUX_MAESTRO.md`: experiencia y Design System.
- `UGO_MAESTRO_USABILIDAD_ECOSISTEMA.md`: claridad operacional.
- `UGO_UIUX_STITCH_MASTER.md`: referencia visual asistida.
- `UGO_ARQUITECTURA_TECNICA_MASTER.md`: arquitectura.
- `UGO_DATA_BACKEND_MASTER.md`: datos, permisos, dinero e integridad.
- `UGO_TESTING_RELEASE_MASTER.md`: validación y release.
- `UGO_ROADMAP_MASTER.md`: prioridad y madurez.

## 2. Jerarquía de conflicto

```text
integridad ejecutable
→ estado persistido real
→ Governance
→ Producto/Flujo
→ Arquitectura
→ UI/UX + Usabilidad
→ Stitch
→ Roadmap
```

La UI no habilita transiciones prohibidas por backend. Stitch no inventa estados. Un mock no es función real. Un commit no equivale a release.

## 3. Invariantes

### Un solo servicio
Cliente, Proveedor y Admin observan el mismo `serviceId` y el mismo estado persistido.

### Asignación única
Aceptar una oportunidad debe ser atómico y resistente a doble aceptación.

### Estado persistido de servicio
```text
borrador → buscando → ofrecido → asignado
→ en_camino → llegado → en_progreso
→ esperando_aprobacion → completado
```
Excepciones: `cancelado`, `disputado`.

La condición financiera entre `asignado` y `en_camino` se deriva de `pagos` y no crea un segundo lifecycle del servicio:

```text
electrónico retenido/protegido con referencia verificable
O
efectivo explícitamente seleccionado
```

`pago_pendiente`, `pago_habilitado` y `pago_protegido` son condiciones financieras/UX, no estados persistidos de `servicios`, salvo migración futura explícita.

### Estado operacional del proveedor
```text
offline → available → opportunity_pending → assigned
→ busy → completion_pending → available
```
Nunca mezclar la máquina del proveedor con la del servicio.

### Llegada
Cuando existe ubicación exacta de cliente y aplica validación geográfica, la autoridad es backend. Radio operativo vigente: **200 m** para `en_camino → llegado`.

### Evidencia temporal
```text
llegado              → Antes
en_progreso          → Durante / Después
esperando_aprobacion → Después sólo para recuperación histórica
```
Una evidencia final no puede pre-cargarse antes de iniciar y luego usarse para cerrar el servicio.

## 4. Pagos

Electrónico:
```text
pendiente → autorizado → retenido/protegido
→ liberación pendiente → liberado/pagado
```

Efectivo:
```text
seleccionado → presencial pendiente → servicio habilitado
→ proveedor confirma recepción → registrado
```

**Efectivo no tiene custodia electrónica UGO y nunca se presenta como pago protegido.**

Una vez elegido un método válido, no se sustituye silenciosamente por otro. Cambios requieren estado fallido o contrato backend explícito de recuperación.

Toda ampliación, disputa, cierre y timeline debe ser consciente del método.

## 5. Evidencia y ampliaciones

Solicitud y ejecución deben conservar evidencia asociada inequívocamente al trabajo.

```text
Cliente o Proveedor propone ampliación
→ descripción + costo + tiempo
→ Cliente aprueba/rechaza
→ registro auditable
→ reconciliación según método
→ continuación
```

No modificar silenciosamente alcance o dinero.

## 6. Roles

```text
Cliente       solicita, elige método, sigue, aprueba, disputa, califica
Proveedor     se disponibiliza, acepta, ejecuta, evidencia, cobra
Admin         opera excepciones, personas, finanzas, disputas y calidad
Super Admin   gobierna permisos, reglas, configuración e integraciones
Hugo          asistencia contextual autorizada
Scout         inteligencia y recomendaciones
Academia      formación y mejora de calidad
```

Hugo, Scout y Academia no crean dominios paralelos.

## 7. Confianza UGO

Toda función debe mejorar al menos uno de:

```text
Identidad · Trazabilidad · Pago claro · Evidencia
Reputación · Soporte/Disputa · Seguridad · Calidad
```

## 8. Prioridad

```text
P0 integridad/auth/permisos/dinero/serviceId/core
P1 operación necesaria/UX crítica/tracking/notificaciones
P2 inteligencia/optimización/automatización
P3 expansión/polish/experimentos
```

Ningún P2/P3 desplaza un P0 abierto sin decisión explícita.

## 9. Madurez

```text
IDEA → DEFINED → READY → IN PROGRESS
→ IMPLEMENTED → VALIDATED → RELEASED → MEASURED
```

`✅ HECHO` exige validación aplicable.

## 10. Experiencia transversal

```text
Estado → contexto → próxima acción
```

Datos: `loading · loaded · empty · error/retry · offline/degraded`.

Mutaciones: `idle → submitting → success / error + recovery`.

Referencia mobile `390×844`, rango `360–430`, targets `≥48px`. Desktop es aplicación real.

## 11. Sostenibilidad del negocio

UGO debe proteger monetización sin degradar confianza. En pagos electrónicos la comisión se concilia con el pago real. En efectivo la comisión UGO debe quedar registrada mediante mecanismo auditable cuando corresponda. El producto debe reducir acuerdos fuera de plataforma ofreciendo trazabilidad, evidencia, reputación, ampliaciones y soporte.

## 12. Conciencia documental

Todo cambio que altere contratos reales de estado, dinero, permisos, evidencia o lifecycle debe actualizar en el mismo bloque los maestros afectados y el Roadmap. `main` y la documentación maestra no deben divergir conscientemente.

## 13. Regla final

**Ante cualquier duda, gana la opción que preserve una sola fuente de verdad, claridad para el usuario, integridad operacional y capacidad de auditar el servicio extremo a extremo.**