# UGO — Documento Maestro de Usabilidad del Ecosistema

**Versión:** 1.0  
**Fecha:** 11/09/2026  
**Estado:** Norma obligatoria de UX/UI para Cliente, Proveedor y Administración  
**Objetivo:** que cualquier persona pueda entender qué está pasando, qué puede hacer y cuál es el próximo paso sin instrucciones externas.

---

## 1. Principio rector

UGO debe sentirse simple aunque por detrás sea complejo.

En cada pantalla el usuario debe poder responder en menos de 3 segundos:

1. **¿Dónde estoy?**
2. **¿Qué está pasando?**
3. **¿Qué tengo que hacer ahora?**

Toda decisión de interfaz debe priorizar **claridad, continuidad del flujo, prevención de errores y accesibilidad** sobre decoración.

### Regla de oro

> **Una pantalla = un objetivo principal = una acción primaria claramente visible.**

Nunca deben competir dos acciones principales, ni aparecer elementos flotantes que oculten información o controles necesarios para completar el flujo.

---

## 2. Alcance del ecosistema

Este documento aplica a:

- **UGO Cliente**
- **UGO Proveedor**
- **UGO Admin**
- **UGO Super Admin**
- Landing/web institucional cuando conduzca a un flujo operativo
- Componentes compartidos: autenticación, mapas, chat, notificaciones, pagos, fotos, soporte y estados de servicio

Los tres entornos deben compartir lenguaje visual, reglas de interacción y significado de estados.

---

# 3. Hallazgos críticos observados en la pantalla actual

La captura de **Seguimiento del pedido / Servicio #58** muestra problemas que este documento declara como bloqueantes antes de considerar una pantalla terminada.

### UX-01 — Elementos superpuestos

El bloque inferior **“Pago seguro / Pagar con Pix”** tapa contenido de la pantalla. El usuario no puede leer ni operar cómodamente lo que queda detrás.

**Norma:** ningún panel fijo puede ocultar contenido necesario. El contenido desplazable debe reservar un `padding-bottom` equivalente a la altura real del panel fijo + safe area.

### UX-02 — Botón “Fotos del trabajo” flotando sobre otros controles

El botón aparece por encima del área de pago y cambia visualmente de posición respecto del contenido.

**Norma:** una acción secundaria nunca debe invadir la zona de una acción primaria. “Fotos del trabajo” debe vivir dentro de una sección estable del servicio o en una barra de acciones definida.

### UX-03 — Contradicción en forma de pago

La pantalla muestra **“Forma de pago: Efectivo”** y simultáneamente exige **“Pagá con Pix para confirmar el servicio”** / **“Pagar con Pix”**.

**Norma:** el sistema debe tener una sola fuente de verdad para `paymentMethod` y `paymentStatus`. La interfaz nunca puede mostrar métodos incompatibles simultáneamente.

### UX-04 — Jerarquía de capas confusa

Campana, fotos, tarjeta de forma de pago y panel de pago compiten en distintas capas.

**Norma:** usar un contrato global de capas (`z-index`) y no valores arbitrarios por componente.

### UX-05 — Acción primaria ocupa demasiado espacio

El bloque de pago fijo domina gran parte de la pantalla y reduce la visibilidad del seguimiento, que es el objetivo principal de esta vista.

**Norma:** la acción fija debe usar la mínima altura necesaria. Información ampliada debe mostrarse bajo demanda.

### UX-06 — Estado y acción no están totalmente sincronizados

La pantalla indica **Etapa 3 de 5 / Proveedor asignado**, pero el panel inferior introduce una nueva obligación de pago sin integrarla claramente en el timeline.

**Norma:** si el pago es requisito para avanzar, debe representarse explícitamente como estado o subestado del servicio.

---

# 4. Arquitectura mental única de UGO

El ecosistema debe usar siempre este modelo:

**Descubrir → Solicitar → Asignar → Confirmar → Ejecutar → Revisar → Cerrar**

Cada rol ve la misma operación desde su perspectiva.

| Etapa | Cliente | Proveedor | Sistema/Admin |
|---|---|---|---|
| Descubrir | Busca servicio | Define disponibilidad | Gestiona oferta/categorías |
| Solicitar | Crea pedido | Recibe oportunidad | Valida pedido |
| Asignar | Espera profesional | Acepta/rechaza | Hace matching |
| Confirmar | Confirma condiciones/pago | Confirma llegada | Registra acuerdo |
| Ejecutar | Sigue trabajo | Realiza servicio | Monitorea |
| Revisar | Revisa resultado | Entrega evidencia | Gestiona incidencias |
| Cerrar | Aprueba/califica | Finaliza | Liquida/registra |

No se deben inventar nombres diferentes para el mismo estado en distintas aplicaciones.

---

# 5. Contrato maestro de navegación

## 5.1 Navegación principal

La navegación persistente debe contener únicamente destinos de primer nivel.

### Cliente

**Inicio · Servicios · Actividad · Perfil**

### Proveedor

**Inicio · Oportunidades · Actividad · Perfil**

### Admin

Navegación orientada a operación:

**Dashboard · Servicios · Usuarios · Proveedores · Pagos · Incidencias**

### Regla

La barra inferior móvil:

- no puede quedar tapada;
- no puede superponerse con CTA flotantes;
- debe respetar safe area;
- debe indicar claramente la sección activa;
- no debe cambiar de orden entre pantallas.

---

# 6. Contrato de pantalla

Toda pantalla operativa debe respetar, en este orden:

1. **Contexto:** título, servicio, ubicación o sección.
2. **Estado:** qué está ocurriendo.
3. **Información esencial:** quién, cuándo, dónde, cuánto.
4. **Acciones secundarias:** chat, fotos, ayuda, detalles.
5. **Acción primaria:** siguiente paso.
6. **Navegación global**, cuando corresponda.

La interfaz no debe obligar al usuario a interpretar elementos dispersos para descubrir el próximo paso.

---

# 7. Sistema de acciones

## Acción primaria

Solo una por contexto.

Ejemplos:

- **Encontrar profesionales**
- **Confirmar pedido**
- **Aceptar oportunidad**
- **Estoy en camino**
- **Iniciar trabajo**
- **Finalizar trabajo**
- **Pagar con Pix**
- **Aprobar trabajo**

Debe:

- tener texto con verbo;
- ocupar una posición predecible;
- ser visualmente dominante;
- permanecer habilitada únicamente cuando la acción sea válida.

## Acción secundaria

Ejemplos:

- Ver fotos
- Ver detalles
- Contactar
- Reprogramar
- Reportar problema

No debe competir visualmente con la acción primaria.

## Acción destructiva

Cancelar, rechazar, eliminar o bloquear requiere diferenciación visual y, cuando tenga consecuencias relevantes, confirmación.

---

# 8. Regla absoluta de superposiciones

UGO no acepta superposiciones accidentales.

### Capas oficiales

```css
--z-content: 0;
--z-sticky: 10;
--z-bottom-nav: 20;
--z-floating-action: 30;
--z-backdrop: 80;
--z-modal: 90;
--z-toast: 100;
```

Ningún componente puede introducir un `z-index` fuera de esta escala sin documentarlo.

### Bottom sheets y barras fijas

Si existe un elemento fijo inferior:

```css
.page-scroll {
  padding-bottom: calc(var(--fixed-action-height) + env(safe-area-inset-bottom) + 16px);
}
```

El último elemento de contenido debe poder desplazarse completamente por encima de la barra fija.

### Prohibido

- CTA sobre CTA.
- Botón flotante sobre texto.
- Modal sin backdrop cuando bloquea interacción.
- Campana o avatar invadiendo contenido.
- Dos bottom sheets abiertos simultáneamente.
- Elementos `position: fixed` sin reservar espacio.
- Contenido importante detrás de barras del navegador o safe areas.

---

# 9. Safe areas y responsive

La aplicación debe funcionar primero en móvil real, no solo en viewport de escritorio.

Usar:

```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

### Viewports mínimos de QA

- 320 × 568
- 360 × 800
- 390 × 844
- 412 × 915
- tablet
- desktop para Admin

No debe existir scroll horizontal.

Los componentes no deben depender de una altura fija de pantalla.

---

# 10. Seguimiento del servicio

El seguimiento debe ser una **máquina de estados**, no una colección de textos independientes.

Estados maestros sugeridos:

```text
REQUESTED
MATCHING
ASSIGNED
CONFIRMATION_REQUIRED
PROVIDER_ON_THE_WAY
IN_PROGRESS
REVIEW_REQUIRED
COMPLETED
CANCELLED
DISPUTED
```

Cada estado define:

- título visible;
- explicación;
- actor responsable;
- CTA permitido;
- acciones secundarias;
- notificación asociada;
- siguiente estado válido.

### Ejemplo

**ASSIGNED**

Título: **Proveedor asignado**  
Mensaje: **Sebastian aceptó tu pedido.**  
Información: profesional + calificación + categoría.  
CTA: depende del contrato de pago.  
Siguiente estado: `CONFIRMATION_REQUIRED` o `PROVIDER_ON_THE_WAY`.

La UI nunca debe inferir el estado usando múltiples booleanos contradictorios.

---

# 11. Contrato de pagos

Pagos debe tener una fuente de verdad única:

```ts
paymentMethod:
  | "pix"
  | "cash"
  | "card"
  | "mercado_pago";

paymentStatus:
  | "not_required"
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "refunded";
```

### Reglas

Si `paymentMethod === "cash"`:

- no mostrar **Pagar con Pix** como CTA obligatorio.

Si `paymentMethod === "pix"` y `paymentStatus === "pending"`:

- mostrar **Pagar con Pix**;
- explicar por qué se necesita;
- no mostrar “Efectivo” como método activo.

Si el usuario puede cambiar el método:

- mostrar **Cambiar forma de pago** como acción secundaria;
- actualizar todos los componentes desde el mismo estado.

El pago debe indicar siempre **importe, método, estado y consecuencia de la acción** antes de confirmar.

---

# 12. Fotos y evidencia del trabajo

“Fotos del trabajo” forma parte del servicio, no debe ser un elemento flotante arbitrario.

Ubicación recomendada:

**Servicio → Evidencias → Fotos del trabajo**

Puede mostrarse como tarjeta:

> **Fotos del trabajo · 1**  
> Ver evidencia enviada por el profesional.

Durante la ejecución, Proveedor debe poder:

- tomar/subir fotos;
- indicar antes/después;
- confirmar carga;
- asociarlas al ID del servicio.

Cliente debe poder verlas sin abandonar el contexto del pedido.

---

# 13. Notificaciones

La campana es navegación global, no decoración.

Debe:

- tener área táctil mínima de 44 × 44 px;
- mostrar badge solo cuando haya elementos nuevos;
- permanecer dentro del header;
- nunca flotar sobre tarjetas;
- abrir un centro de notificaciones coherente.

Una notificación debe llevar directamente al contexto que la generó.

---

# 14. Cliente — contrato de experiencia

El Cliente debe poder completar el ciclo sin aprender UGO previamente.

Flujo principal:

**Inicio/Radar → Buscar categoría → Definir necesidad → Ver/recibir profesional → Confirmar → Seguimiento → Trabajo → Revisión → Pago/cierre → Calificación**

En cada etapa debe verse:

- estado actual;
- profesional, cuando exista;
- precio/estimación;
- ubicación;
- método de pago;
- próxima acción.

---

# 15. Proveedor — contrato de experiencia

Flujo principal:

**Inicio → Demanda/Oportunidades → Detalle → Aceptar → Preparación → En camino → Llegada → Trabajo → Evidencias → Finalizar → Cobro**

La Home del proveedor debe priorizar:

1. estado online/offline;
2. trabajo activo;
3. oportunidades relevantes;
4. agenda;
5. ingresos/resumen.

Nunca mostrar una nueva oportunidad con mayor jerarquía que un servicio activo que requiere acción inmediata.

---

# 16. “Agregar trabajo / Ampliar servicio”

Debe existir dentro de **Mejoras de flujo de trabajo**.

Permite que Cliente y Proveedor incorporen una tarea adicional sin salir de UGO.

Flujo:

**Proponer adicional → Describir → Cotizar tiempo/costo → Cliente aprueba → Actualizar servicio → Ejecutar → Registrar**

Debe conservar:

- descripción;
- quién lo propuso;
- fecha/hora;
- costo anterior;
- costo adicional;
- nuevo total;
- tiempo adicional;
- aceptación explícita.

Nunca modificar silenciosamente el precio original.

---

# 17. Asistente de Trabajo UGO

El Proveedor debe disponer de ayuda contextual antes, durante y después del servicio.

El asistente puede ofrecer:

- checklist;
- preparación;
- recomendaciones;
- recordatorios;
- soporte técnico;
- pasos de cierre.

No debe bloquear la operación ni competir con el CTA principal.

---

# 18. Formularios

Cada campo debe tener:

- etiqueta persistente;
- ejemplo cuando sea útil;
- validación cercana al error;
- teclado/tipo de entrada adecuado;
- estado disabled claro;
- conservación de datos ante errores recuperables.

Evitar depender exclusivamente de placeholders.

Mensajes de error deben explicar **qué pasó y cómo corregirlo**.

Incorrecto:

> Error 422.

Correcto:

> No pudimos guardar el teléfono. Revisá el código de área e intentá nuevamente.

---

# 19. Lenguaje UGO

El lenguaje debe ser humano, breve y consistente.

Preferir:

- **Proveedor asignado**
- **Sebastian está en camino**
- **Trabajo iniciado**
- **Revisá el trabajo**
- **Confirmar y pagar**

Evitar tecnicismos internos:

- `job_id`
- `status_pending`
- `matching`
- códigos de backend

El ID del servicio puede mostrarse como referencia: **Servicio #58**.

---

# 20. Accesibilidad

Objetivo mínimo: **WCAG 2.2 AA**.

Requisitos:

- contraste suficiente;
- tamaño táctil mínimo 44 × 44 px;
- foco visible;
- navegación por teclado en web;
- labels accesibles para iconos;
- no comunicar estado solo mediante color;
- texto ampliable sin romper layout;
- mensajes compatibles con lectores de pantalla;
- animaciones respetando `prefers-reduced-motion`.

---

# 21. Estados obligatorios de componentes

Todo componente con datos debe diseñarse para:

- loading;
- empty;
- success;
- error;
- offline;
- disabled;
- permission denied, cuando corresponda.

No se considera terminado un componente diseñado únicamente para el “caso feliz”.

---

# 22. Feedback inmediato

Toda acción debe responder visualmente.

Ejemplos:

**Aceptar oportunidad →** loading → confirmación → nuevo estado.  
**Subir foto →** progreso → miniatura → éxito/error.  
**Pagar →** procesando → aprobado/rechazado.  
**Finalizar →** confirmación → revisión.

Evitar botones que parecen no hacer nada.

---

# 23. Prevención de acciones duplicadas

Mientras una operación crítica se procesa:

- deshabilitar el CTA;
- mostrar estado de procesamiento;
- usar idempotencia en backend cuando corresponda;
- evitar doble pago, doble aceptación o doble finalización.

---

# 24. Consistencia visual

Usar tokens compartidos para:

- tipografía;
- espaciado;
- radios;
- sombras;
- colores;
- alturas de controles;
- iconografía;
- estados.

No crear estilos específicos por pantalla cuando existe un componente del Design System.

### Escala de espaciado recomendada

`4 / 8 / 12 / 16 / 24 / 32 / 48`

---

# 25. Componentes maestros

El ecosistema debe tender a componentes reutilizables:

```text
AppHeader
BottomNavigation
PageContainer
ServiceStatusCard
ServiceTimeline
ProviderCard
PaymentCard
PaymentActionBar
EvidenceCard
PrimaryButton
SecondaryButton
IconButton
BottomSheet
Modal
Toast
EmptyState
ErrorState
LoadingState
ConfirmationDialog
```

Cada uno debe tener contrato de propiedades y estados.

---

# 26. Prioridad visual

Orden de atención esperado:

**Estado actual → Acción siguiente → Información esencial → Detalles → Navegación secundaria**

Una promoción, notificación o función auxiliar nunca debe desplazar el estado de un servicio activo.

---

# 27. Modales y bottom sheets

Usarlos únicamente cuando la decisión pertenece al contexto actual.

Un modal debe:

- tener título;
- explicar la decisión;
- tener cierre visible cuando pueda cancelarse;
- mantener foco;
- bloquear correctamente el fondo;
- devolver el foco al elemento que lo abrió.

Un bottom sheet no puede abrir otro bottom sheet encima.

---

# 28. Scroll

Debe existir **un contenedor principal de scroll** por pantalla móvil siempre que sea posible.

Evitar:

- scroll dentro de tarjetas;
- scroll dentro de modal + página simultáneamente;
- cuerpos con `overflow: hidden` persistente;
- elementos fijos que hagan inaccesible el final.

Prueba obligatoria: llegar al último elemento y verlo completamente por encima de cualquier navegación/CTA fijo.

---

# 29. Contrato de datos visible

La UI debe renderizar una misma entidad de servicio desde un modelo coherente.

Ejemplo conceptual:

```ts
type Service = {
  id: string;
  category: ServiceCategory;
  status: ServiceStatus;
  client: ClientSummary;
  provider?: ProviderSummary;
  location: ServiceLocation;
  price: Money;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  evidence: Evidence[];
  timeline: TimelineEvent[];
  additionalWork: AdditionalWork[];
};
```

No duplicar manualmente nombre, categoría, precio o forma de pago en estados locales independientes.

---

# 30. Manejo de errores y conectividad

UGO debe asumir conexiones móviles imperfectas.

Ante pérdida de conexión:

- conservar información ingresada cuando sea seguro;
- explicar que no hay conexión;
- permitir reintentar;
- no confirmar una operación que el servidor no confirmó;
- diferenciar “enviando” de “completado”.

---

# 31. Checklist obligatorio antes de merge

Una pantalla **NO está terminada** hasta aprobar:

- [ ] Se entiende el objetivo en 3 segundos.
- [ ] Hay una sola acción primaria.
- [ ] No hay controles superpuestos.
- [ ] El último contenido es completamente visible.
- [ ] Safe areas correctas.
- [ ] No hay scroll horizontal.
- [ ] Funciona en 320, 360, 390 y 412 px.
- [ ] Estados loading/empty/error definidos.
- [ ] Botones tienen feedback.
- [ ] Acciones críticas evitan doble ejecución.
- [ ] Textos son consistentes con el estado real.
- [ ] Precio y pago vienen de una única fuente de verdad.
- [ ] Navegación mantiene posición y orden.
- [ ] Áreas táctiles ≥ 44 × 44.
- [ ] Contraste y foco accesibles.
- [ ] Back/volver no destruye datos inesperadamente.
- [ ] Modal/bottom sheet no genera capas incompatibles.
- [ ] Cliente y Proveedor ven estados equivalentes.
- [ ] Build y TypeScript pasan.
- [ ] QA móvil real aprobado.

---

# 32. Criterios específicos para corregir Servicio #58

La pantalla mostrada se considera corregida únicamente cuando:

- [ ] **Pago seguro** no tapa la forma de pago, timeline ni tarjetas.
- [ ] **Fotos del trabajo** deja de flotar sobre el pago.
- [ ] La campana queda contenida en el header.
- [ ] “Efectivo” y “Pagar con Pix” nunca aparecen como decisiones activas contradictorias.
- [ ] El timeline indica con claridad si el pago es requisito de la etapa 3.
- [ ] La CTA fija ocupa solo la altura necesaria.
- [ ] Todo el contenido puede desplazarse por encima de la CTA.
- [ ] La pantalla sigue siendo usable con navegador móvil y safe area.
- [ ] El estado visible coincide con el estado del backend.
- [ ] La acción siguiente es inequívoca.

---

# 33. Severidad de bugs UX

### P0 — Bloqueante

Impide completar un servicio, pago, aceptación o cierre.

Ejemplos: CTA inaccesible, pago imposible, pantalla bloqueada.

### P1 — Crítico

Puede provocar una decisión incorrecta o pérdida de confianza.

Ejemplos: método de pago contradictorio, precio incorrecto, estado incorrecto.

### P2 — Importante

Dificulta significativamente la operación.

Ejemplos: botones superpuestos, scroll defectuoso, navegación confusa.

### P3 — Mejora

No impide la tarea pero reduce calidad o consistencia.

---

# 34. Definition of Done UX de UGO

Una funcionalidad está terminada cuando cumple simultáneamente:

**Funciona + se entiende + responde + no se superpone + es accesible + mantiene consistencia entre roles + refleja el estado real.**

Que el build compile no significa que la experiencia esté terminada.

---

# 35. Regla para desarrollo futuro

Antes de crear una pantalla nueva:

1. identificar rol;
2. identificar estado del servicio;
3. definir objetivo único;
4. definir CTA primaria;
5. definir datos requeridos;
6. reutilizar componentes;
7. definir loading/error/empty;
8. validar responsive y safe area;
9. probar continuidad con pantalla anterior y siguiente;
10. ejecutar checklist maestro.

---

# 36. Norma final

**UGO nunca debe obligar al usuario a pensar cómo usar UGO.**

La interfaz debe guiar naturalmente el servicio completo, mantener al Cliente y al Proveedor sincronizados y hacer visible en todo momento:

> **qué pasó → qué está pasando → qué sigue.**

Este documento debe utilizarse como **fuente maestra de criterios de usabilidad** para diseño, implementación, revisión de PRs y QA de todo el ecosistema UGO.
