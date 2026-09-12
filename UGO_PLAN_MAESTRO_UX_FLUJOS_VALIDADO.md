# UGO — Plan Maestro General de UX y Flujos

**Estado:** Documento maestro general de producto  
**Rama de referencia:** `main`  
**Alcance:** Cliente · Proveedor · Admin · Super Admin · Scout  
**Objetivo:** definir la experiencia y el contrato operativo del ecosistema UGO de punta a punta.

---

## 1. Principio rector

UGO no debe pensarse como dos aplicaciones separadas, sino como **una sola transacción con dos caras: Cliente ↔ Proveedor**.

> **Cada cambio operativo que afecta a una parte debe tener una representación coherente para la otra.**

La experiencia debe optimizar:

> **Menor esfuerzo + mayor claridad + confianza suficiente + resolución completa.**

Se elimina como regla cualquier objetivo arbitrario del tipo “pedir en 3 toques”. La regla oficial es:

> **UGO debe pedir la menor cantidad de decisiones posible, pero nunca menos de las necesarias para que Cliente y Proveedor sepan exactamente qué aceptaron.**

---

## 2. Benchmark y criterio de adopción

UGO usa referencias conceptuales de productos exitosos, sin copiar interfaces.

### Uber
Adoptar:
- estados claros;
- matching;
- ETA;
- identidad de contraparte;
- seguimiento en tiempo real;
- precio/estimación antes del compromiso;
- pago integrado;
- rating.

No copiar el supuesto de que todo servicio es tan estandarizado como un viaje A→B.

### Taskrabbit
Adoptar:
- categorías de servicio;
- información suficiente antes de aceptar;
- tarifas visibles;
- servicios por hora;
- algunos servicios con precio fijo;
- reputación del profesional;
- transparencia económica.

### Thumbtack
Adoptar el patrón:

`Search → Chat/Aclaración → Hire`

Especialmente para servicios complejos o ambiguos.

### Airbnb
Adoptar:
- confianza progresiva;
- identidad/verificación;
- reputación;
- pagos dentro de plataforma;
- protección de datos sensibles;
- resolución de conflictos.

---

## 3. Qué está validado, qué decide UGO y qué sigue como hipótesis

### VALIDADO POR BENCHMARK
- transparencia de precio antes del compromiso;
- señales de identidad y reputación;
- seguimiento de estado;
- pago integrado;
- rating;
- profesional con información suficiente antes de aceptar;
- modelos por hora y fijo;
- conversación/aclaración para trabajos complejos;
- verificación como herramienta de confianza.

### DECISIÓN UGO
- estados Cliente/Proveedor simétricos;
- ScopeChange formal para cambios de alcance/precio;
- Payment y Payout separados;
- cuatro modelos económicos;
- Scout como asistente, no como decisor;
- Admin con timeline completo;
- servicio activo como prioridad visual;
- dirección/contacto con exposición progresiva;
- cero callejones sin salida.

### HIPÓTESIS A VALIDAR
- “Encontrar por mí” vs “Elegir profesional”;
- qué categorías son Express;
- qué categorías requieren diagnóstico;
- cantidad óptima de preguntas;
- cuándo activar chat;
- radios/olas de matching;
- mínimos por hora;
- comisiones;
- reglas exactas de cancelación;
- política exacta de timeout;
- formato del radar de demanda.

Nada de esta última lista debe considerarse confirmado sin prueba de producto/negocio.

---

## 4. Flujo maestro UX

```text
NECESIDAD
   ↓
UGO INTERPRETA
   ↓
¿FALTA INFORMACIÓN CRÍTICA?
   ├── NO → continuar
   └── SÍ → pedir únicamente lo faltante
   ↓
DEFINIR SERVICIO + UBICACIÓN + MOMENTO
   ↓
DEFINIR MODELO DE PRECIO
   ↓
MOSTRAR CONDICIONES
   ↓
CONFIRMACIÓN CLIENTE
   ↓
MATCHING / ELECCIÓN SEGÚN SERVICIO
   ↓
PROVEEDOR ACEPTA
   ↓
PREPARANDO
   ↓
EN CAMINO
   ↓
LLEGÓ
   ↓
DIAGNÓSTICO SI ES NECESARIO
   ↓
¿CAMBIÓ ALCANCE/PRECIO?
   ├── NO → iniciar
   └── SÍ → propuesta → aprobación Cliente
   ↓
TRABAJO EN CURSO
   ↓
PROVEEDOR FINALIZA
   ↓
CLIENTE CONFIRMA / REPORTA PROBLEMA
   ↓
PAGO
   ↓
PAYOUT
   ↓
RATING
   ↓
HISTORIAL / REPETIR
```

---

## 5. Dos velocidades de experiencia

### Flujo Express
Para necesidades suficientemente estructuradas:

`Necesidad → Confirmación → Matching → Profesional`

### Flujo Asistido
Para trabajos ambiguos o complejos:

`Necesidad → Scout/Aclaración → Diagnóstico/Profesional → Presupuesto → Aprobación`

UGO no debe obligar a un Cliente con algo simple a conversar innecesariamente, ni a uno con un problema complejo a fingir que conoce el alcance.

---

## 6. Modelos de precio

UGO debe soportar:

### A. Precio fijo
Para trabajos altamente predecibles.

### B. Precio por hora
Para trabajos cuyo esfuerzo depende del tiempo real.

### C. Estimación/rango
Cuando UGO puede orientar pero no garantizar el total.

### D. Diagnóstico + presupuesto
Cuando no existe información suficiente para comprometer un precio responsablemente.

**Regla:** el Cliente debe conocer antes de solicitar cuál modelo está contratando.

---

## 7. Cliente — flujo completo

### C01 Home
Debe permitir:
- búsqueda por texto;
- voz/Scout;
- categorías;
- servicios recientes;
- repetir servicio;
- retomar servicio activo.

Estados mínimos:
- normal;
- loading;
- sin ubicación;
- permiso denegado;
- error de red;
- sin contenido;
- servicio activo.

### C02 Interpretación
Scout puede estructurar:
- categoría;
- subcategoría;
- descripción;
- urgencia;
- datos faltantes.

Debe pedir confirmación cuando una inferencia afecte operación, precio o seguridad.

### C03 Categoría
Resolver:
- categorías parecidas;
- fuera de catálogo;
- múltiples especialidades;
- cambio sin perder datos.

### C04 Descripción/evidencia
- problema/necesidad;
- notas;
- fotos/video según categoría;
- autoguardado del borrador.

### C05 Ubicación
Opciones:
- actual;
- guardada;
- nueva;
- mapa.

Validar cobertura, precisión, edificio/unidad y acceso.

**Privacidad:** dirección exacta solo cuando sea operativamente necesaria.

### C06 Momento
- Ahora;
- Hoy;
- Programar.

Resolver franja horaria, reprogramación, fecha inválida y disponibilidad.

### C07 Precio
Mostrar modalidad, rango/tarifa/total, cargos y política relevante.

### C08 Revisión
Resumen + CTA inequívoco **Solicitar servicio**.

La acción debe ser idempotente.

### C09 Matching
Cliente ve progreso y puede cancelar/modificar lo permitido.

Resolver:
- cero proveedores;
- rechazos;
- expiraciones;
- matching largo;
- pérdida de red;
- carrera cancelar/aceptar.

Nunca dejar loop infinito.

### C10 Profesional asignado
Mostrar:
- identidad;
- rating;
- verificaciones;
- especialidad;
- ETA;
- condiciones económicas;
- contacto protegido;
- soporte.

### C11 Preparación / En camino
Estados:

`PROVIDER_PREPARING → PROVIDER_EN_ROUTE`

Mostrar ETA y cambios relevantes.

### C12 Llegada
`PROVIDER_ARRIVED`

Cliente puede:
- confirmar encuentro;
- indicar que no lo encuentra;
- contactar;
- pedir soporte.

### C13 Diagnóstico
Tres salidas:
1. coincide → iniciar;
2. requiere cambio → ScopeChange;
3. imposible → cierre/cancelación justificada.

### C14 ScopeChange
Proveedor propone:
- motivo;
- nuevo trabajo;
- importe;
- tiempo;
- materiales;
- evidencia.

Cliente aprueba/rechaza/pide aclaración.

Nunca cobrar ni ejecutar adicional como aprobado mientras esté pendiente.

### C15 Inicio
`IN_PROGRESS`

Solo con asignación válida y condiciones resueltas.

### C16 Ejecución
Resolver:
- pausa;
- imprevisto;
- daño;
- imposibilidad técnica;
- abandono;
- emergencia;
- pérdida de conexión.

### C17 Finalización por proveedor
`IN_PROGRESS → COMPLETED_BY_PROVIDER`

Debe incluir resumen, evidencia cuando aplique, hora y valor final.

### C18 Confirmación Cliente
- confirmar → `CONFIRMED_BY_CLIENT`;
- reportar problema → `DISPUTED`.

Timeout debe tener política explícita.

### C19 Pago
Separar:
- autorización;
- pendiente;
- éxito;
- fallo;
- refund;
- chargeback.

### C20 Rating
Rápido, útil y no obligatorio para acceder al historial/comprobante.

### C21 Historial
Mostrar servicio, profesional, total, timeline, comprobante, soporte y rating.

“Repetir” crea un nuevo borrador y no hereda silenciosamente precio/disponibilidad.

---

## 8. Proveedor — flujo completo

### P01 Home operativa
Prioridad visual:
1. servicio activo;
2. oportunidad por vencer;
3. online/offline;
4. demanda;
5. ganancias.

### P02 Disponibilidad
Proveedor controla online/offline.

No permitir desconexión silenciosa si existe obligación activa.

### P03 Demanda/Radar
Mostrar señales útiles, no falsa precisión:
- zonas;
- categorías;
- distancia;
- tendencia.

### P04 Oportunidad
Antes de aceptar mostrar:
- categoría;
- resumen;
- zona/distancia;
- fecha/hora;
- modalidad de precio;
- ingreso estimado cuando corresponda;
- requisitos;
- expiración.

### P05 Aceptar/Rechazar
Aceptación atómica: un solo ganador.

Si otro gana primero, mostrar “oportunidad tomada”.

### P06 Servicio confirmado
Proveedor recibe datos necesarios, navegación, contacto protegido, condiciones económicas y política de cancelación.

### P07 Preparación
`ACCEPTED → PROVIDER_PREPARING`

### P08 En camino
`PROVIDER_EN_ROUTE`

Acciones:
- navegar;
- contactar;
- reportar demora/problema;
- cancelar con motivo permitido.

### P09 Llegada
`PROVIDER_ARRIVED`

Registrar timestamp y fallback si GPS falla.

### P10 Diagnóstico
- iniciar;
- proponer cambio;
- declarar imposibilidad.

Nunca editar directamente el precio final.

### P11 ScopeChange
Qué cambió, por qué, importe, tiempo, materiales y evidencia.

Esperar aprobación.

### P12 Ejecución
Checklist solo si agrega seguridad/calidad.

### P13 Terminar
Resumen de tiempo, extras aprobados, materiales y total.

Finalización idempotente.

### P14 Espera
Distinguir:
- Cliente revisando;
- Payment pendiente;
- Dispute.

Trabajo terminado ≠ dinero acreditado.

### P15 Ganancias
Mostrar bruto, comisión, ajustes, neto, estado y fecha estimada.

### P16 Rating Cliente
Breve y orientado a calidad/seguridad.

### P17 Historial/Agenda
Separar próximos, activos, completados, cancelados y disputados.

---

## 9. Matching — contrato

Un proveedor entra al pool solo si:
- cuenta activa;
- categoría habilitada;
- zona/radio compatible;
- disponibilidad;
- verificaciones vigentes;
- sin conflicto de agenda;
- requisitos compatibles.

El ranking puede considerar:
- ETA;
- compatibilidad;
- disponibilidad;
- reputación;
- cumplimiento;
- distribución justa;
- preferencias permitidas.

Definir olas de oferta, expiración, ampliación de radio y aceptación simultánea.

Sin match, ofrecer recuperación: ampliar, programar, modificar, soporte o cancelar.

---

## 10. Estados operativos

Servicio:

```text
DRAFT
REQUESTED
MATCHING
ACCEPTED
PROVIDER_PREPARING
PROVIDER_EN_ROUTE
PROVIDER_ARRIVED
IN_PROGRESS
COMPLETED_BY_PROVIDER
CONFIRMED_BY_CLIENT
CLOSED
CANCELLED
DISPUTED
```

`OFFERED` pertenece a Opportunity, no al servicio global.

### ScopeChange
```text
CHANGE_REQUESTED
CHANGE_APPROVED
CHANGE_REJECTED
CHANGE_EXPIRED
```

### Payment
```text
PAYMENT_METHOD_REQUIRED
PAYMENT_AUTHORIZED
PAYMENT_PENDING
PAYMENT_SUCCEEDED
PAYMENT_FAILED
REFUND_PENDING
REFUNDED
PARTIALLY_REFUNDED
```

### Payout
```text
PAYOUT_PENDING
PAYOUT_AVAILABLE
PAYOUT_PROCESSING
PAYOUT_PAID
PAYOUT_FAILED
PAYOUT_HELD
```

### Dispute
```text
DISPUTE_OPEN
DISPUTE_REVIEW
DISPUTE_WAITING_CLIENT
DISPUTE_WAITING_PROVIDER
DISPUTE_RESOLVED
```

**Regla:** no mezclar dominios distintos en una única columna `status`.

---

## 11. Cancelaciones

Toda cancelación guarda:
- actor;
- motivo;
- momento;
- costo/penalización si existe;
- efecto operativo;
- auditoría.

Casos:
- antes del matching;
- después de aceptación;
- en camino;
- proveedor llegó;
- servicio iniciado;
- pago realizado.

Una cancelación durante `IN_PROGRESS` puede convertirse en cierre parcial o disputa; no siempre es una cancelación simple.

---

## 12. Reprogramación

Definir:
- quién propone;
- nueva fecha/franja;
- aceptación;
- expiración;
- impacto sobre proveedor;
- precio vigente;
- notificaciones.

Nunca sobrescribir silenciosamente timestamps históricos.

---

## 13. No-show y demoras

### Cliente ausente
Llegada → contacto → espera configurada → no-show → política/Admin.

### Proveedor ausente
Alerta → contacto → reemplazo/cancelación → re-matching prioritario.

Tiempos configurables por categoría/negocio.

---

## 14. Disputas y soporte

Una disputa es un caso real, no una etiqueta.

Debe contener:
- servicio;
- partes;
- motivo;
- descripción;
- evidencias;
- timeline;
- importe en disputa;
- estado;
- responsable Admin;
- resolución.

La disputa no borra el historial original.

---

## 15. Admin

Admin necesita vista única con:
- Cliente;
- Proveedor;
- timeline;
- estado operativo;
- Payment;
- Payout;
- ScopeChanges;
- cancelaciones;
- disputa;
- evidencias;
- notificaciones;
- auditoría.

Acciones controladas:
- re-match;
- cancelar;
- reprogramar;
- resolver disputa;
- refund/ajuste;
- suspender/escalar cuentas;
- nota interna.

Toda acción manual requiere motivo y `AuditEvent`.

---

## 16. Scout

Scout debe reducir esfuerzo cognitivo.

Puede:
- interpretar lenguaje natural;
- sugerir categoría;
- detectar datos faltantes;
- resumir lo contratado;
- explicar precio/estado;
- ayudar ante no-match;
- asistir en ScopeChange.

No puede:
- aceptar dinero por el usuario;
- inventar información;
- ocultar incertidumbre;
- cambiar alcance sin confirmación;
- hacer que el flujo dependa obligatoriamente del chat.

---

## 17. Fricción inteligente

Cada dato debe pasar esta prueba:

**¿Necesitamos esta información ahora para hacer avanzar correctamente la transacción?**

- sí → pedir;
- puede inferirse con seguridad → sugerir y permitir corregir;
- puede pedirse después → postergar;
- no cambia matching, ejecución, precio, seguridad o cumplimiento → eliminar del flujo principal.

---

## 18. Progressive disclosure

No mostrar veinte decisiones a la vez.

Ejemplo:
1. ¿Qué necesitás?
2. UGO interpreta.
3. Solo pregunta lo que falta.
4. Confirma ubicación/momento.
5. Muestra precio/modalidad.
6. Usuario confirma.

Cada categoría puede requerir preguntas distintas.

---

## 19. Simetría Cliente ↔ Proveedor ↔ Admin

| Evento | Cliente | Proveedor | Admin |
|---|---|---|---|
| Solicitud | Buscando | — | Requested |
| Oportunidad | Buscando | Nueva oportunidad | Offered |
| Aceptación | Profesional asignado | Servicio confirmado | Accepted |
| En camino | ETA | Navegación | En route |
| Llegada | Llegó | Llegada registrada | Arrived |
| ScopeChange | Aprobar/rechazar | Esperando | Change requested |
| Finalización | Revisar | Esperando confirmación | Completed |
| Pago | Comprobante | Neto/acreditación | Payment/Payout |
| Problema | Caso abierto | Caso abierto | Disputed |

---

## 20. Notificaciones

Eventos mínimos:
- solicitud creada;
- oportunidad recibida;
- oportunidad por vencer;
- profesional asignado;
- preparando;
- en camino;
- demora;
- llegada;
- ScopeChange;
- finalización;
- confirmación pendiente;
- pago exitoso/fallido;
- disputa;
- reprogramación;
- cancelación.

Cada notificación abre el contexto correcto.

---

## 21. Chat/contacto

- ligado a `service_id`;
- contacto protegido;
- mensajes del sistema identificables;
- bloqueo/reporte;
- evidencia preservada según política.

El chat no reemplaza estados ni aprobaciones estructuradas.

---

## 22. Entidades mínimas

```text
User
ClientProfile
ProviderProfile
ProviderCategory
Address
ServiceRequest
Service
Opportunity
Assignment
ScopeChange
ServiceEvidence
Conversation
Message
Payment
Refund
Payout
Rating
Cancellation
Dispute
Notification
AuditEvent
```

---

## 23. Estados UX obligatorios por pantalla

Toda pantalla dependiente de datos debe contemplar:
1. loading;
2. contenido;
3. empty state;
4. error + retry;
5. offline;
6. permiso denegado + alternativa;
7. acción en progreso;
8. éxito;
9. estado desactualizado;
10. accesibilidad.

---

## 24. Concurrencia y consistencia

QA obligatorio:
- dos proveedores aceptan simultáneamente;
- Cliente cancela mientras proveedor acepta;
- Cliente aprueba mientras proveedor propone otra versión;
- finalización con red inestable;
- pago confirmado después de timeout visual;
- doble toque;
- push tardío;
- dos dispositivos;
- Admin interviene al mismo tiempo;
- retry HTTP tras respuesta perdida.

**Fuente de verdad:** backend.

---

## 25. Privacidad y seguridad

- dirección exacta solo cuando sea necesaria;
- contacto protegido;
- RBAC en backend;
- evidencias restringidas;
- datos financieros mínimos;
- auditoría de acciones sensibles;
- confirmación reforzada para acciones económicas;
- acceso contextual a soporte/seguridad.

---

## 26. Analytics mínimo

```text
client_home_viewed
service_draft_created
service_category_selected
service_location_confirmed
service_request_submitted
matching_started
opportunity_sent
opportunity_viewed
opportunity_accepted
opportunity_rejected
provider_assigned
provider_en_route
provider_arrived
service_started
scope_change_requested
scope_change_approved
scope_change_rejected
service_completed_by_provider
service_confirmed_by_client
payment_succeeded
payment_failed
service_cancelled
dispute_opened
rating_submitted
service_closed
```

---

## 27. Matriz de decisión por categoría

Cada categoría debe configurarse, no hardcodearse en UI:

```text
category_id
pricing_model_allowed[]
requires_diagnosis
supports_express
supports_manual_provider_selection
required_questions[]
optional_questions[]
evidence_before_required
evidence_after_required
minimum_duration
matching_strategy
service_radius_policy
cancellation_policy_id
scope_change_allowed
safety_requirements[]
```

---

## 28. Contrato obligatorio de toda transición

Para cada CTA/transición resolver:
1. actor habilitado;
2. estado origen;
3. estado destino;
4. precondiciones;
5. datos leídos/escritos;
6. loading/doble envío;
7. éxito;
8. error/retry;
9. timeout;
10. cancelación/reversión;
11. concurrencia;
12. notificación;
13. AuditEvent;
14. analytics;
15. privacidad/permisos;
16. visibilidad/acción Admin.

Una sola respuesta faltante = punto **ABIERTO**.

---

## 29. Checklist de aceptación por transición

```text
[ ] Actor autorizado
[ ] Estado origen validado
[ ] Estado destino válido
[ ] Escritura atómica/idempotente
[ ] Loading
[ ] Éxito
[ ] Error + retry
[ ] Timeout
[ ] Cancelación/reversión
[ ] Concurrencia resuelta
[ ] Contraparte actualizada
[ ] Notificación
[ ] AuditEvent
[ ] Analytics
[ ] Privacidad
[ ] Admin
[ ] Mobile/responsive
[ ] Accesibilidad
[ ] QA
```

---

## 30. Definition of Done del flujo UGO

### Happy path
Solicitud → match → aceptación → viaje → llegada → ejecución → finalización → confirmación → pago → payout → rating → cierre.

### Variantes obligatorias
- sin proveedores;
- rechazo;
- expiración;
- cancelación Cliente;
- cancelación Proveedor;
- demora;
- no-show;
- ScopeChange aprobado;
- ScopeChange rechazado;
- fallo de pago;
- retry;
- disputa;
- refund;
- offline;
- doble acción;
- intervención Admin.

Si alguno no tiene comportamiento definido, el flujo sigue **ABIERTO**.

---

## 31. Orden de implementación

### P0 — cerrar transacción real
1. estados por dominio;
2. solicitud Cliente;
3. matching/Opportunity;
4. aceptación atómica;
5. servicio activo simétrico;
6. llegada/inicio/finalización;
7. ScopeChange;
8. Payment/Payout;
9. cancelaciones;
10. disputas;
11. Admin timeline;
12. error/retry/offline.

### P1 — confianza y retención
1. rating;
2. historial;
3. agenda/reprogramación;
4. evidencias;
5. chat protegido;
6. radar;
7. Scout.

### P2 — optimización
1. predicción de demanda;
2. matching avanzado;
3. recomendaciones;
4. automatización;
5. pricing avanzado.

---

## 32. Protocolo de validación UX

Antes de congelar un flujo:
1. prototipo navegable;
2. escenarios críticos;
3. observar usuarios sin explicar;
4. registrar dudas/retrocesos/abandono;
5. medir tiempo y errores, no solo toques;
6. revisar simultáneamente impacto en Proveedor;
7. validar economía/operación;
8. corregir;
9. repetir;
10. recién entonces marcar `VALIDATED`.

Estados de decisión:

```text
BENCHMARKED
UGO_DECISION
HYPOTHESIS
PROTOTYPED
USER_TESTED
VALIDATED
IMPLEMENTED
MEASURED
```

---

## 33. Regla maestra de auditoría

Para cada pantalla, CTA o transición responder:

1. ¿Quién puede hacerlo?
2. ¿Desde qué estado?
3. ¿A qué estado lleva?
4. ¿Qué ve Cliente?
5. ¿Qué ve Proveedor?
6. ¿Qué ve Admin?
7. ¿Qué se escribe?
8. ¿Qué pasa si falla?
9. ¿Qué pasa si tarda?
10. ¿Qué pasa si se repite?
11. ¿Qué pasa si se cancela?
12. ¿Qué pasa si ambos actúan a la vez?
13. ¿Qué notificación genera?
14. ¿Qué auditoría/evidencia queda?
15. ¿Qué métrica registra?
16. ¿Cuál es el criterio de aceptación?

Una sola respuesta faltante = **ABIERTO**.

---

## 34. Fuentes públicas de benchmark

- Uber — Upfront pricing: https://www.uber.com/br/pt-br/ride/how-it-works/upfront-pricing/
- Uber — How it works: https://www.uber.com/us/en/ride/how-it-works/
- Taskrabbit — Tarifas y horas mínimas: https://support.taskrabbit.com/hc/pt/articles/46260502667035
- Taskrabbit — Costos: https://support.taskrabbit.com/hc/pt/articles/46260499891355
- Taskrabbit — Transparencia de precios: https://support.taskrabbit.com/hc/pt/articles/46260394090651
- Thumbtack — How it works: https://www.thumbtack.com/how-it-works
- Airbnb — Booking requirements: https://www.airbnb.com/help/article/1170
- Airbnb — Identity verification: https://www.airbnb.com/help/article/3033

---

## 35. Criterio final de producto

La mejor experiencia es aquella en la que el Cliente piensa:

> **“UGO entendió lo que necesito, sé cuánto puede costarme, sé qué está pasando y sé qué hacer si algo cambia.”**

Y el Proveedor:

> **“Sé qué trabajo estoy aceptando, dónde/cuándo es, cómo se me pagará y qué hacer si el trabajo real es distinto.”**

Este documento es la referencia general para diseño, frontend, backend, QA, Admin, Scout y futuras decisiones de producto de UGO.
