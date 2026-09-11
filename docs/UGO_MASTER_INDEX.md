# UGO — Master Index

**Versión:** 2.0 · 11 de septiembre de 2026  
**Estado:** puerta de entrada única al sistema maestro de UGO  
**Rama de verdad:** `main`

> UGO mantiene **una sola realidad de producto**. Los documentos maestros se dividen por autoridad, pero nunca pueden crear flujos, estados o reglas paralelas.

---

# 1. North Star de UGO

UGO existe para lograr esto:

```text
Necesidad real
→ proveedor adecuado
→ contratación clara
→ ejecución trazable
→ resultado aprobado
→ cobro correcto
→ reputación
→ repetición/recomendación
```

La métrica principal de producto es:

**servicios confiables completados dentro de UGO.**

Métricas de soporte:

```text
time-to-match
aceptación de oportunidades
servicios iniciados / solicitudes válidas
completion rate
tiempo de llegada
cancelaciones
disputas
repetición
NPS/CSAT
GMV
take rate
ingreso neto
liquidez de proveedores
```

Regla estratégica:

**Primero cerrar el circuito real; después ampliar el ecosistema.**

---

# 2. Sistema maestro unificado

## Nivel 0 — Gobierno

`UGO_MASTER_GOVERNANCE.md`

Vocabulario, autoridad, conflictos, invariantes y reglas no negociables.

## Nivel 1 — Desarrollo

`UGO_DEVELOPMENT_MASTER.md`

Cómo una idea pasa a producción: priorización, vertical slices, Git, review, validación y release.

## Nivel 2 — Producto

`UGO_ECOSISTEMA_FLUJO.md`

Qué hace UGO: actores, journeys, estados y contrato Cliente↔Proveedor↔Admin.

## Nivel 3 — Experiencia

`UGO_UIUX_MAESTRO.md`  
`UGO_MAESTRO_USABILIDAD_ECOSISTEMA.md`  
`UGO_UIUX_STITCH_MASTER.md`

UI/UX gobierna experiencia y Design System. Usabilidad gobierna claridad operacional. Stitch es referencia visual y nunca reemplaza contratos de producto/runtime.

## Nivel 4 — Ingeniería

`UGO_ARQUITECTURA_TECNICA_MASTER.md`

Fronteras técnicas, routing, módulos, integraciones y responsabilidades.

## Nivel 5 — Datos y seguridad

`UGO_DATA_BACKEND_MASTER.md`

Persistencia, estados ejecutables, RLS, RPC, Realtime, Storage, concurrencia y dinero.

## Nivel 6 — Calidad

`UGO_TESTING_RELEASE_MASTER.md`

Cómo se demuestra que funciona y cuándo puede considerarse VALIDATED/RELEASED.

## Nivel 7 — Ejecución

`UGO_ROADMAP_MASTER.md`

Prioridades P0–P3 y madurez real.

---

# 3. Orden obligatorio de lectura

```text
1 UGO_MASTER_INDEX.md
2 UGO_MASTER_GOVERNANCE.md
3 UGO_DEVELOPMENT_MASTER.md
4 UGO_ECOSISTEMA_FLUJO.md
5 UGO_UIUX_MAESTRO.md
6 UGO_MAESTRO_USABILIDAD_ECOSISTEMA.md
7 UGO_ARQUITECTURA_TECNICA_MASTER.md
8 UGO_DATA_BACKEND_MASTER.md
9 UGO_TESTING_RELEASE_MASTER.md
10 UGO_ROADMAP_MASTER.md
```

Consultar `UGO_UIUX_STITCH_MASTER.md` cuando haya diseño/prototipado/migración desde Stitch.

---

# 4. Jerarquía de conflicto

```text
Seguridad/integridad ejecutable
→ estado persistido real
→ Governance
→ Producto/Flujo
→ Arquitectura
→ UI/UX + Usabilidad
→ Stitch
→ Roadmap
```

Testing determina si algo está validado. Development determina cómo cambiarlo.

---

# 5. Contrato transversal de servicio

Estado conceptual único:

```text
solicitado → buscando → ofertado → asignado
→ pago_pendiente / pago_habilitado
→ en_camino → llegado → en_progreso
→ esperando_aprobacion → completado
```

Excepciones:

```text
cancelado · disputado · reembolsado
```

`pago_protegido` **no es un estado universal del servicio**. Sólo aplica a métodos electrónicos con custodia.

Proveedor operacional:

```text
offline → available → opportunity_pending → assigned
→ busy → completion_pending → available
```

Nunca mezclar la máquina de estado del proveedor con la máquina del servicio.

---

# 6. Contrato de pagos

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

**Efectivo no tiene custodia electrónica UGO.**

Toda UI, flujo, disputa, ampliación y cierre debe ser consciente del método de pago.

---

# 7. Contrato Cliente ↔ Proveedor

```text
Cliente crea solicitud + evidencia
→ matching genera oportunidad para el mismo serviceId
→ Proveedor autorizado analiza
→ acepta/rechaza
→ aceptación atómica y asignación única
→ ambos observan el mismo servicio persistido
→ método de pago habilita ejecución
→ evidencia + aprobación cierran
```

`serviceId` es la identidad transversal del trabajo.

---

# 8. Madurez

```text
IDEA → DEFINED → READY → IN PROGRESS
→ IMPLEMENTED → VALIDATED → RELEASED → MEASURED
```

Un commit o una pantalla visible **no** significan `HECHO`.

---

# 9. Principios de éxito

1. Una sola fuente de verdad.
2. Confianza antes que crecimiento superficial.
3. Mobile-first sin degradar desktop.
4. Estado → contexto → próxima acción.
5. Dinero, identidad y evidencia siempre auditables.
6. Cliente y Proveedor comparten el mismo servicio, no copias.
7. Demanda de mercado y oportunidad concreta son conceptos distintos.
8. Hugo ayuda; no salta permisos ni estados.
9. Scout recomienda acciones; no crea otra operación paralela.
10. Academia mejora calidad; no entrega privilegios sin reglas de dominio.
11. Toda expansión debe justificar impacto en conversión, confianza, eficiencia o retención.
12. Cero lock-in innecesario y costos controlados mientras UGO valida mercado.

---

# 10. Regla final

**Si una nueva función no mejora confianza, conversión, ejecución, monetización o retención, no debe desplazar un P0/P1 del circuito principal.**