# UGO Pro Mobile — Engineering Handoff Final & Gap Check Oficial (v3.0 Sanity Checked)
**Versión:** 3.0 (Canónica & Sanity Checked) • **Target:** iOS / Android (React Native / Flutter) • **Backend Baseline:** Supabase / Realtime / Storage

---

## 1. Declaración de Alcance y Principios de Integración

> **DIRECCIÓN ARQUITECTURAL ESTRICTA:**
> - UGO Pro Mobile se integra directamente sobre la infraestructura existente de **Supabase** (Auth, PostgREST, Realtime, Storage).
> - **NO** define esquemas SQL prescriptivos ni migraciones obligatorias: los contratos aquí definidos son **Contratos de UI / Dominio Agnósticos en TypeScript**.
> - **Saneamiento Total de Claims:** Quedan formalmente eliminados y neutralizados todos los términos no verificados o de infraestructura bancaria no productiva:
>   - *Escrow / Custodia bancaria* ➔ **Pago protegido por UGO / Saldo pendiente**.
>   - *Bacen mTLS / ISPB directo / Liquidación estricta en 1.8 segundos / Código E2E oficial Bacen* ➔ **Retiro por PIX / Comprobante UGO de retiro / Procesamiento de pagos UGO**.
>   - *Pólizas externas CREA/CFT/SUSEP/SEFAZ* ➔ **Protección UGO Shield**.
>   - *Peritajes forenses judiciales* ➔ **Mediación UGO / Evidencias del servicio**.
>   - *Prescripción de motores locales rígidos (SQLite/MMKV/IndexedDB/WebSockets fijos)* ➔ **Comportamiento requerido: conservación temporal de estado local, cola de acciones pendientes, reconexión con deduplicación y resincronización**.
> - Conceptos avanzados:
>   - **Hugo Copilot:** Asistente y copiloto contextual de obra (Analiza, Sugiere y Recomienda; NO certifica ni actúa como perito legal).
>   - **UGO Lens:** `[CONCEPT / REQUIRES AI / COMPUTER VISION INTEGRATION]` con confirmación manual obligatoria del profesional.

---

## 2. Matriz Canónica de Cobertura y Brechas Visuales (Gap Check)

### 2.1. ONBOARDING / CUENTA
- **Verificación pendiente:** `EXISTS` — `SCREEN_30` & `SCREEN_29` (Banners de revisión y badge de cuenta en proceso).
- **Documento rechazado / reenviar:** `EXISTS` — `SCREEN_29` (Banner interactivo de corrección documental con acción directa).
- **Selección de oficios:** `EXISTS` — `SCREEN_31` (Selector matricial de especialidades técnicas).
- **Tarifas:** `EXISTS` — `SCREEN_31` (Editor paramétrico de precios por hora y valores sugeridos).
- **Radio de trabajo:** `EXISTS` — `SCREEN_31` & `SCREEN_30` (Ajuste de radio operativo en km con mapa).
- **Horarios / disponibilidad:** `EXISTS` — `SCREEN_30` (Selector de turnos semanales y guardias).
- **Perfil del proveedor:** `EXISTS` — `SCREEN_30` & `SCREEN_15` (Ficha del profesional verificado, categoría, reputación y métricas).
- **Editar perfil:** `COVERED_AS_STATE` — `SCREEN_30` / `SCREEN_31` (Módulos accesibles y editables en todo momento).

### 2.2. DEMANDA
- **Sin oportunidades disponibles:** `COVERED_AS_STATE` — `SCREEN_29` (`EmptyState` en radar con radio expandible y tips de horario).

### 2.3. OPERACIÓN
- **Sin conexión:** `COVERED_AS_STATE` — `SCREEN_22` / `SCREEN_24` (`OfflineState` con retención temporal de estado y orden).
- **Reconectando:** `COVERED_AS_STATE` — Global (`ProAppHeader` con sincronización en streaming y debounce).
- **GPS desactivado:** `COVERED_AS_STATE` — `SCREEN_25` / `SCREEN_24` (Modal nativo de solicitud de permisos y fallback a check-in manual).
- **Cliente no responde:** `EXISTS` — `SCREEN_24` (Flujo guiado para contactar cliente en puerta).
- **Cliente ausente:** `COVERED_AS_STATE` — `SCREEN_24` (Temporizador de espera de 10 min y cancelación asistida sin penalidad).
- **Proveedor demorado:** `EXISTS` — `SCREEN_25` (Botón de 1-toque *"Avisar demora"* con presets).
- **Problema con vehículo:** `COVERED_AS_STATE` — `SCREEN_25` (Sub-causa de demora e imprevisto en ruta).
- **Imposibilidad técnica:** `EXISTS` — `SCREEN_22` & `SCREEN_8` (Enlace de contingencia directo al Centro de Mediación).
- **Material faltante:** `EXISTS` — `SCREEN_22` & `SCREEN_11` (Flujo de adición de repuesto imprevisto vía ampliación).
- **Servicio pausado:** `EXISTS` — `SCREEN_22` (Pausa de cronómetro para tiempos de secado o espera).

### 2.4. EVIDENCIAS / UGO LENS
- **Error al subir evidencia:** `COVERED_AS_STATE` — `SCREEN_22` / `SCREEN_17` (Cola local con estado `PENDING_UPLOAD` y reintento en background).
- **Reintento de evidencia:** `EXISTS` — `SCREEN_24` & `SCREEN_22` (Acción interactiva de recaptura).
- **Error de cámara:** `COVERED_AS_STATE` — `SCREEN_11` (Fallback a carga desde galería o selección manual de catálogo).
- **UGO Lens sin resultado / baja confianza:** `EXISTS` — `SCREEN_11` (Puntaje de aproximación, opciones alternativas y confirmación manual).

### 2.5. AMPLIACIÓN DE SERVICIO
- **Ampliación pendiente:** `EXISTS` — `SCREEN_22` & `SCREEN_9` (Banner y mensaje en chat: esperando confirmación del cliente).
- **Ampliación aprobada:** `EXISTS` — `SCREEN_8` & `SCREEN_17` (Badge verificado: adenda aprobada sumada a la orden).
- **Ampliación rechazada:** `COVERED_AS_STATE` — `SCREEN_22` (El servicio original pactado continúa normalmente sin interrupción).

### 2.6. PAGOS / SALDO
- **Saldo pendiente:** `EXISTS` — `SCREEN_15` (Widget de saldo retenido bajo Pago protegido por UGO de orden activa).
- **Retiro PIX pendiente:** `COVERED_AS_STATE` — `SCREEN_15` (Estado en procesamiento de liquidación bancaria).
- **Retiro fallido:** `COVERED_AS_STATE` — `SCREEN_15` (Alerta de error con notificación y botón de reintento).
- **Comprobante de retiro:** `EXISTS` — `SCREEN_6` (Comprobante UGO de retiro con ID de transacción, detalles y descarga de recibo).

### 2.7. POST-SERVICIO
- **Actividad / Historial de Servicios:** `EXISTS` — `SCREEN_112` (Pantalla canónica dedicada: filtro Todos/Activos/Finalizados/Cancelados, detalle de cliente, importe, categorías y estado de cobro).
- **Detalle de servicio finalizado:** `EXISTS` — `SCREEN_21` (Resumen económico completo, desglose de mano de obra y garantía).
- **Calificación recibida:** `EXISTS` — `SCREEN_21` & `SCREEN_111` (Tarjeta de evaluación mutua de 5 estrellas, propina recibida y feedback).

### 2.8. SISTEMA
- **Centro de notificaciones:** `EXISTS` — `SCREEN_111` (Pantalla dedicada con pestañas Todas/Servicios/Pagos y Saldo/Sistema, contador de no leídas, badges de estado y marcar como leídas).
- **Ayuda / soporte general:** `EXISTS` — `SCREEN_113` (Centro de ayuda general, FAQs interactivas, guías de servicio/saldo/cuenta y canales de contacto 24/7 y 0800).
- **Mediación / disputa de orden:** `EXISTS` — `SCREEN_8` (Centro de Mediación UGO exclusivo para controversias sobre órdenes activas con mediador asignado).
- **Configuración:** `EXISTS` — `SCREEN_30`, `SCREEN_31`, `SCREEN_15` (Gestión de perfil, llaves PIX, preferencias de notificación y seguridad).

---

## 3. Matriz de Simetría y Sincronización Canónica: Cliente ↔ Proveedor

| CLIENT_STATE | PROVIDER_STATE | CLIENT_SCREEN | PROVIDER_SCREEN | EVENT | EXPECTED_RESULT |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `REQUEST_POSTED` | `ONLINE_IDLE` | Solicitud Publicada | Home / Radar de Demanda | `order:broadcast` | Proveedor recibe oportunidad en radar. |
| `REVIEWING_PROPOSALS`| `PROPOSAL_SENT` | Comparativa de Profesionales | Detalle / Cotizador Enviado | `onSendProposal` | Cliente ve propuesta; proveedor ve "Propuesta enviada". |
| `HIRED_PAYMENT_PROTECTED`| `JOB_CONFIRMED` | Profesional Contratado | Propuesta Aceptada / Checklist | `client:hire_specialist` | Pago protegido en UGO confirmado; se desbloquea dirección y checklist. |
| `SPECIALIST_IN_ROUTE`| `TRAIN_DISPATCH` | Seguimiento en Vivo / Mapa | En Camino / Navegación GPS | `onStartRoute` | Cliente ve ETA; proveedor ve mapa y aviso de demora. |
| `SPECIALIST_DELAYED` | `DELAY_REPORTED` | Notificación: Demora / Nuevo ETA | En Camino (Alerta Demora) | `onNotifyDelay` | Cliente recibe push con tiempo ajustado sin penalización injustificada. |
| `SPECIALIST_ARRIVED` | `AT_DOORSTEP` | Notificación: En puerta | Llegada al Domicilio / PIN | `onArrive` | Proveedor ingresa PIN de 4 dígitos provisto por cliente. |
| `SERVICE_IN_PROGRESS`| `SERVICE_ACTIVE` | Servicio en Curso | Servicio en Curso / Cronómetro | `onCheckIn` (PIN ok) | Inicia cronómetro sincronizado y cobertura de Protección UGO Shield. |
| `EXTENSION_PENDING` | `EXTENSION_SENT` | Aprobación de Adicional | Ampliar Servicio (Enviada) | `onSubmitExtension` | Cliente recibe modal con foto, descripción y valor; pro prosigue labor. |
| `SERVICE_IN_PROGRESS`| `SERVICE_ACTIVE` | Adicional Aprobado | Servicio en Curso (+Item) | `client:approve_extension` | Se suma monto y tiempo adicional a la orden de servicio activa. |
| `SERVICE_IN_PROGRESS`| `SERVICE_ACTIVE` | Adicional Declinado | Servicio en Curso (Rechazo) | `client:reject_extension` | La ampliación se descarta; el servicio original pactado continúa normalmente. |
| `SERVICE_REVIEW` | `PENDING_CLIENT_APPROVAL`| Revisión Final / Evidencias | Finalización / Bóveda Evidencias | `onCompleteService` | Proveedor sube fotos Antes/Después; cliente recibe solicitud de inspección. |
| `SERVICE_COMPLETED` | `JOB_FINISHED` | Conformidad & Calificación | Resumen de Cierre & Calificación | `client:confirm_completion` | Fondos pasan a Saldo disponible del proveedor; calificación bilateral. |
| `DISPUTE_OPENED` | `IN_MEDIATION` | Reportar Inconformidad / Soporte | Centro de Mediación UGO | `onOpenDispute` | Se pausa liberación de saldo controvertido; mediación tripartita de soporte UGO. |

---

## 4. Requerimientos de Resiliencia Offline y Sincronización en Tiempo Real

> **PAUTA NO PRESCRIPTIVA:** No se prescribe una tecnología propietaria fija de almacenamiento local (SQLite, MMKV o IndexedDB) ni de sockets de bajo nivel.
> La aplicación debe cumplir los siguientes comportamientos funcionales agnósticos:
1. **Conservación de Estado Local Temporal:** Preservar localmente en el dispositivo el estado de la orden activa, cronómetro de trabajo en ejecución y fotos de evidencias capturadas ante caídas de señal.
2. **Cola de Acciones Pendientes:** Encolar eventos como subida de fotos, notas de servicio y propuestas de ampliación cuando el dispositivo se encuentre sin red.
3. **Reconexión Automática:** Reintentar el enlace de red con debounce y backoff exponencial al detectar restablecimiento de conectividad.
4. **Deduplicación por Evento:** Identificar cada evento con un `client_event_id` único para prevenir duplicaciones de cobros o registros en la base de datos central.
5. **Resincronización Transparente:** Actualizar el estado de la orden con el servidor sin reiniciar pantallas activas ni interrumpir al especialista.

---

## 5. Auditoría Global de Claims y Saneamiento (Search & Neutralize Report)

| Término / Concepto Detectado | Estado | Tratamiento Aplicado |
| :--- | :---: | :--- |
| `Escrow` / `En custodia Escrow` | `NEUTRALIZED` | Sustituido por **Pago protegido por UGO** / **Saldo pendiente**. |
| `Bacen` / `BACEN` / `ISPB` / `mTLS Bacen` | `NEUTRALIZED` | Sustituido por **Retiro por PIX** y motor transaccional de UGO. |
| `Liquidación en 1.8 seg` / `E2E Bacen` | `NEUTRALIZED` | Sustituido por **Comprobante UGO de retiro** con identificador de transacción estándar. |
| `Póliza CREA / CFT / SUSEP / SEFAZ` | `NEUTRALIZED` | Sustituido por **Protección UGO Shield** y términos de servicio UGO. |
| `Peritaje judicial forense` | `NEUTRALIZED` | Sustituido por **Centro de Mediación UGO** y evidencias documentales del servicio. |
| `SQLite / MMKV / WebSockets prescritos` | `NEUTRALIZED` | Convertido a **Comportamiento requerido de resiliencia local y sincronización**. |
| `Twilio / AWS S3 / Redis Multi-AZ productivo` | `CONCEPT / REQUIRES BACKEND INTEGRATION` | Documentado como patrón conceptual de infraestructura, no dependiente para la UI. |

---

## 6. Inventario Definitivo de Pantallas del Ecosistema UGO Pro Mobile

1. `SCREEN_36`: 1. Splash Screen - UGO Pro
2. `SCREEN_35`: 2. Login - Entrá a UGO Pro
3. `SCREEN_33`: 3-4. Teléfono y Verificación OTP
4. `SCREEN_34`: 5-6. Recuperar Acceso & Selección de Rol (Especialista)
5. `SCREEN_32`: 7-8. Registro y Perfil Personal (Paso 1/5)
6. `SCREEN_31`: 9-10. Servicios, Oficios y Tarifas (Paso 2 y 3/5)
7. `SCREEN_30`: 11-13. Verificación Documental, Disponibilidad y Perfil Listo
8. `SCREEN_29`: 14. Home Radar y Oportunidades en Vivo (Demanda)
9. `SCREEN_28`: 15. Detalle de Trabajo y Solicitud (Camila Duarte)
10. `SCREEN_27`: 16. Envío de Presupuesto Interactivo
11. `SCREEN_26`: 17. Propuesta Aceptada y Preparación de Viaje (Checklist)
12. `SCREEN_25`: 18. Navegación GPS y En Ruta al Cliente (Aviso Demora)
13. `SCREEN_24`: 19. Llegada al Domicilio y Validación PIN Check-In
14. `SCREEN_22`: 20. Servicio en Curso y Cronómetro de Trabajo
15. `SCREEN_17`: Visor de Evidencias HD - Comparativa Antes y Después
16. `SCREEN_18`: Visor Inmersivo de Evidencias - UGO Pro
17. `SCREEN_11`: 24. Escáner Visual de Repuestos por Cámara `[UGO Lens - Concept]`
18. `SCREEN_13`: 23. Hugo Copilot - Asistente Contextual de Obra
19. `SCREEN_9`: 25. Chat en Tiempo Real con la Clienta
20. `SCREEN_8`: 26. Centro de Mediación UGO (Disputas de Orden Activa)
21. `SCREEN_21`: 21. Aprobación del Cliente, Pago Protegido y Calificación
22. `SCREEN_15`: 22. Billetera, Saldo UGO y Retiro Inmediato PIX
23. `SCREEN_6`: 27. Comprobante UGO de Retiro por PIX
24. `SCREEN_111`: **UGO Pro · Centro de Notificaciones** *(Pantalla Canónica Nueva)*
25. `SCREEN_112`: **UGO Pro · Actividad e Historial de Servicios** *(Pantalla Canónica Nueva)*
26. `SCREEN_113`: **UGO Pro · Centro de Ayuda y Soporte General** *(Pantalla Canónica Nueva)*
