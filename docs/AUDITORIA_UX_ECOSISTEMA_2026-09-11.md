# UGO — Auditoría UX del Ecosistema

**Fecha:** 11/09/2026  
**Rama auditada:** `main`  
**Commit base:** `21960e89ec9e03fe82276638a91927c30c94541e`  
**Norma de referencia:** `docs/UGO_MAESTRO_USABILIDAD_ECOSISTEMA.md`

## Resumen ejecutivo

UGO ya posee un MVP funcional considerable en Cliente, Proveedor y Administración. El foco inmediato debe pasar de sumar pantallas a estabilizar contratos UX, estados operativos, pagos y responsive móvil.

El commit base ya cerró una parte crítica del P0 de pagos Cliente↔Proveedor: unificación del timeline, selección de método dentro del flujo, eliminación del overlay flotante de efectivo y visibilidad de pagos para Proveedor. Vercel reporta `success` para este commit.

### Semáforo actual

| Área | Estado | Prioridad |
|---|---|---|
| Arquitectura base | 🟢 | Mantener |
| Cliente — flujo funcional | 🟢 | No reescribir |
| Cliente — UX móvil | 🟡 | P1 |
| Seguimiento del servicio | 🟡 | P1 |
| Pagos Cliente↔Proveedor | 🟡 | P1 QA |
| Evidencias/fotos | 🟡 | P1 QA |
| Proveedor Home/Demanda/Oportunidades | 🟡 | P1 |
| Trabajo activo Proveedor | 🟡 | P1 |
| Admin | 🟢/🟡 | P2 |
| Design System | 🟡 | P1 |
| Responsive real | 🟡/🔴 | P1 |
| Accesibilidad | 🟡 | P2 |

---

## 1. Hallazgos verificados en código

### 1.1 Cliente: el flujo operativo existe

`src/mvp/ClientApp.tsx` contiene:

- máquina visual de 5 etapas;
- estados `buscando`, `ofrecido`, `asignado`, `en_camino`, `llegado`, `en_progreso`, `esperando_aprobacion`, `completado`;
- perfil del profesional asignado;
- categorías;
- creación de servicio;
- dispatch;
- realtime Supabase;
- refresh periódico del servicio activo;
- persistencia de borrador de solicitud;
- manejo offline/online;
- carga de evidencias de solicitud;
- integración de pagos.

**Decisión:** conservar la lógica y corregir presentación/contratos, no reconstruir desde cero.

### 1.2 Seguimiento del servicio

El componente `ClientFlow` ya expresa el estado principal y el timeline. Esto es correcto conceptualmente, pero la UI debe asegurar que:

- el estado principal sea siempre la jerarquía dominante;
- los pagos sean subestado/acción y no compitan con el seguimiento;
- evidencias, notificaciones y acciones secundarias no tapen contenido;
- el CTA visible corresponda exactamente al estado actual.

### 1.3 Pagos

`src/mvp/PaymentTimeline.tsx` ya diferencia:

- efectivo;
- electrónico;
- pendiente;
- protegido/retenido;
- liberado;
- fallido;
- reembolsado.

También separa `metodo`, `modelo_pago` y `estado`.

**Riesgo residual:** existen dos vocabularios diferentes entre la norma UX y el modelo actual de base (`efectivo/presencial/retenido/liberado` frente a `cash/pending/paid`). No hace falta cambiar la base hoy, pero sí debe existir un adaptador único de dominio para que los componentes no interpreten pagos por su cuenta.

### 1.4 P0 original de la captura

Los commits recientes muestran avances concretos:

- `efdf6bc` — elimina overlay flotante de evidencia;
- `a61f1fcd` — alinea el flujo activo con pagos en efectivo;
- `21960e89` — cierra el flujo P0 de pagos Cliente-Proveedor y elimina el overlay flotante de efectivo.

**Estado:** P0 técnico encaminado/cerrado en código; queda validación visual en dispositivos reales.

### 1.5 Proveedor

`src/mvp/provider/ProviderRoot.tsx` ya separa pantallas:

- `ProviderHome`;
- `ProviderDemand`;
- `ProviderOpportunities`;
- `ProviderOpportunityDetail`;
- `ProviderActiveJob`;
- Ganancias;
- Perfil;
- Historial;
- Disputas.

La navegación inferior actual usa:

**Inicio · Demanda · Trabajos · Perfil**

Esto difiere del contrato maestro sugerido **Inicio · Oportunidades · Actividad · Perfil**.

**Decisión requerida:** no renombrar todavía por estética. Primero definir semántica:

- `Demanda` = radar de mercado;
- `Oportunidades` = pedidos accionables para ese proveedor;
- `Trabajos` = actividad operativa propia.

Si se mantienen como conceptos distintos, la navegación debe evitar que `Demanda` y `Oportunidades` parezcan sinónimos.

### 1.6 Arquitectura de navegación

`src/mvp/MvpApp.tsx` sigue seleccionando aplicación mediante query string:

- `?app=client`
- `?app=provider`
- `?app=admin`
- `?app=web`

Además carga múltiples hojas CSS globales en el mismo punto de entrada.

**Riesgo:** cada nueva capa visual aumenta la posibilidad de colisiones CSS.

**Acción recomendada:** no migrar a router formal durante estabilización. Primero congelar contrato visual y reducir CSS conflictivo; router será refactor P2.

---

# 2. Prioridades de implementación

## P1-A — QA del flujo activo Cliente

Validar obligatoriamente en 320, 360, 390 y 412 px:

- [ ] timeline completo visible;
- [ ] forma de pago visible sin tapar contenido;
- [ ] evidencias/fotos integradas en sección estable;
- [ ] ningún CTA encima de otro;
- [ ] campana dentro de header;
- [ ] último elemento alcanza posición visible sobre navegación/CTA;
- [ ] safe area inferior correcta;
- [ ] no existe scroll horizontal;
- [ ] efectivo nunca muestra CTA Pix obligatorio;
- [ ] electrónico pendiente sí muestra acción de pago clara.

## P1-B — Crear adaptador único de estado de pago

Crear una capa conceptual, por ejemplo:

`src/mvp/domain/paymentState.ts`

Responsabilidad:

- leer `payment.metodo`;
- leer `payment.modelo_pago`;
- leer `payment.estado`;
- devolver un estado UI normalizado;
- definir CTA válida;
- definir etiqueta visible;
- definir si Cliente o Proveedor debe actuar.

Ningún componente nuevo debería volver a interpretar directamente esos campos.

## P1-C — Proveedor · Home / Demanda / Oportunidades

Orden de revisión:

1. `ProviderRoot.tsx`
2. `ProviderHome.tsx`
3. `ProviderDemand.tsx`
4. `ProviderOpportunities.tsx`
5. `providerData.tsx`
6. `providerFlow.tsx`
7. `provider-flow.css`

Contrato mínimo:

### Home

Prioridad visual:

1. disponibilidad online/offline;
2. trabajo activo;
3. oportunidades accionables;
4. demanda del mercado;
5. ganancias/resumen.

### Demanda

Debe responder: **¿dónde hay trabajo?**

No debe parecer una bandeja de pedidos dirigidos al proveedor.

### Oportunidades

Debe responder: **¿qué trabajo puedo aceptar ahora?**

Cada tarjeta debe mostrar como mínimo:

- categoría;
- distancia;
- valor estimado;
- urgencia;
- zona;
- tiempo desde publicación;
- CTA inequívoca.

### Detalle de oportunidad

Una única acción primaria: **Aceptar oportunidad**.

`Rechazar` debe ser secundaria/destructiva y no competir visualmente.

## P1-D — Trabajo activo Proveedor

El flujo debe ser estrictamente secuencial:

**Aceptado → Preparación → En camino → Llegué → Iniciar → Evidencias → Finalizar → Cobro**

No permitir acciones incompatibles con el estado actual.

---

# 3. Deuda UX detectada

## UX-D01 — CSS global acumulativo

`MvpApp.tsx` importa simultáneamente:

- `mvp.css`
- `ugo-design-system.css`
- `ugo-uiux.css`
- `mobile-runtime-fixes.css`
- `service-history.css`
- `stitch-client-provider-alignment.css`
- `request-evidence.css`

**Riesgo:** especificidad y orden de carga deciden visuales accidentalmente.

**Plan:** migrar gradualmente a tokens + estilos por dominio y eliminar parches al validar cada journey.

## UX-D02 — Estado de servicio codificado en múltiples componentes

Los estados actuales son razonables, pero las etiquetas y CTAs pueden dispersarse.

**Plan:** crear un contrato único `serviceStateUI` para Cliente y Proveedor.

## UX-D03 — Navegación Proveedor semánticamente ambigua

`Demanda` y `Oportunidades` existen como pantallas distintas, pero la barra lleva `Demanda` a ambas.

**Plan:** mantener ambas funciones, pero clarificar navegación y microcopy.

## UX-D04 — Query-string routing

Funciona para MVP, pero no escala bien para deep links y navegación compleja.

**Plan:** P2 después de estabilización, no bloquear lanzamiento piloto.

---

# 4. Definition of Done para la fase actual

La fase de estabilización Cliente/Proveedor termina cuando:

- [ ] no quedan P0 visuales;
- [ ] pagos no presentan contradicciones;
- [ ] Cliente y Proveedor ven el mismo servicio con estados equivalentes;
- [ ] flujo Proveedor Home/Demanda/Oportunidades es comprensible sin explicación;
- [ ] trabajo activo solo ofrece acciones válidas;
- [ ] 4 viewports móviles pasan QA;
- [ ] TypeScript/build pasan;
- [ ] Vercel deployment pasa;
- [ ] no hay regresión de realtime;
- [ ] no hay doble ejecución de acciones críticas;
- [ ] Maestro de Usabilidad se usa como criterio de revisión.

---

# 5. Orden recomendado de trabajo desde este commit

1. **QA visual Cliente — seguimiento + pago + evidencias.**
2. **Normalizar estado UI de pagos.**
3. **Auditar y ajustar Provider Home.**
4. **Separar claramente Demanda vs Oportunidades.**
5. **Auditar Provider Active Job.**
6. **QA Cliente↔Proveedor con el mismo servicio.**
7. **Después:** Admin y refactors arquitectónicos.

---

# 6. Estado de producción

UGO no debe considerarse terminado únicamente porque compile o Vercel esté verde.

El criterio actual es:

> **Build estable + estado coherente + acción correcta + responsive real + flujo completo Cliente↔Proveedor.**

Con la línea base actual, el producto está en fase de **estabilización avanzada del MVP**, no en fase de reconstrucción.