# UGO — UI/UX Master · Google Stitch

**Versión:** 2.0 · 11 de septiembre de 2026  
**Estado:** contrato de diseño asistido  
**Herramienta:** Google Stitch

> Stitch ayuda a explorar y producir interfaces. **No define dominio, permisos, estados, pagos ni arquitectura.** Todo resultado debe traducirse al sistema maestro UGO.

---

# 1. Regla principal

Toda propuesta Stitch debe respetar:

```text
Governance
→ Flujo funcional
→ UI/UX + Usabilidad
→ Arquitectura
→ Data/Backend
```

Stitch nunca crea un UGO alternativo.

---

# 2. Principio UX

```text
Estado → contexto → próxima acción
```

Toda pantalla generada debe responder:

1. ¿Dónde estoy?
2. ¿Qué está pasando?
3. ¿Qué hago ahora?

---

# 3. Lenguaje visual

**Kinetic Trust**:

```text
claridad
confianza
movimiento/progreso
jerarquía fuerte
minimalismo funcional
consistencia
```

Evitar futurismo decorativo que compita con la tarea real.

---

# 4. Mobile reference

Frame principal de referencia:

```text
390 × 844
```

Validar adaptación a `360–430px`.

Requisitos:

- safe areas;
- targets ≥48px;
- nav inferior clara;
- scroll predecible;
- teclado no tapa CTA;
- sheets/modales con salida visible.

---

# 5. Cliente

Pantallas prioritarias:

```text
Auth/Onboarding
Home · Radar
Búsqueda/Categorías
Solicitud + Evidencia
Matching
Proveedor seleccionado
Pago
Tracking/Servicio activo
Ampliación
Aprobación/Disputa
Historial/Reputación
```

Home debe priorizar:

```text
ubicación
¿Qué servicio necesitás?
categorías
CTA Encontrar profesionales
servicio activo
```

---

# 6. Proveedor

Pantallas prioritarias:

```text
Auth/Onboarding/KYC
Home
Demanda
Oportunidades
Detalle de oportunidad
Trabajo activo
Ganancias
Perfil/Historial
```

**Demanda ≠ Oportunidades.**

Demanda = mercado agregado.  
Oportunidades = trabajos concretos vinculados a `serviceId`.

Trabajo activo debe mostrar sólo acciones válidas para el estado persistido.

---

# 7. Pagos en diseño

Nunca diseñar un camino universal llamado `Pago protegido`.

Electrónico:

```text
pago online
procesamiento
autorizado/retenido cuando aplique
liberación
```

Efectivo:

```text
pago presencial
importe
confirmación de recepción
sin custodia UGO
```

No usar escudos, locks o copy de protección electrónica para efectivo.

---

# 8. Estado de servicio

Labels visuales deben derivar de:

```text
solicitado
buscando
ofertado
asignado
pago_pendiente / pago_habilitado
en_camino
llegado
en_progreso
esperando_aprobacion
completado
```

Stitch puede cambiar el wording visible, pero no inventar transiciones.

---

# 9. Estado del proveedor

No confundir con servicio:

```text
offline
available
opportunity_pending
assigned
busy
completion_pending
available
```

---

# 10. Componentes reutilizables

Diseñar pensando en primitivas:

```text
AppBar
BottomNav
StatusCard
PrimaryCTA
SecondaryCTA
SearchField
CategoryCard
OpportunityCard
ServiceTimeline
PaymentMethodCard
EvidenceCard
EmptyState
ErrorState
OfflineBanner
BottomSheet
ConfirmationDialog
```

Antes de crear una variante nueva, comprobar si puede resolverse con componente/tokens existentes.

---

# 11. Estados obligatorios por pantalla

Stitch debe contemplar, no sólo happy path:

```text
loading
loaded
empty
error/retry
offline/degraded
submitting
success
```

Una pantalla sin estados de error no está lista para implementación.

---

# 12. Admin

Diseñar para decisiones y excepciones, no para decorar métricas.

Prioridad:

```text
alertas
servicios trabados
KYC
pagos/retiros
disputas
acciones
```

Super Admin separa claramente configuración de operación.

---

# 13. Hugo

Hugo puede aparecer como:

```text
contextual hint
assistant sheet
checklist
suggested action
```

No debe tapar CTA primario ni ejecutar fuera del permiso/estado.

---

# 14. Entrega Stitch → implementación

Antes de llevar una pantalla a código:

```text
[ ] actor correcto
[ ] estado real definido
[ ] CTA corresponde a transición válida
[ ] método de pago correcto
[ ] errores/offline diseñados
[ ] responsive definido
[ ] accesibilidad básica
[ ] reutiliza tokens/componentes
[ ] no duplica una pantalla existente
```

---

# 15. Regla final

**Stitch acelera diseño; los contratos UGO gobiernan el producto. Una pantalla visualmente excelente que contradice el dominio debe corregirse antes de implementarse.**