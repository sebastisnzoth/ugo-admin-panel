# UGO Pro Mobile — Engineering Handoff Final & Auditoría Pre-Export
**Versión:** 2.0 (Alineada con Ecosistema UGO Real) • **Target:** iOS / Android (React Native / Flutter) • **Backend Baseline:** Supabase / Realtime / Storage

---

## 1. Declaración de Alcance y Principios de Integración

> **DIRECCIÓN ARQUITECTURAL:**
> - UGO Pro Mobile **NO** es una aplicación aislada ni define un nuevo backend.
> - Se integra directamente sobre la infraestructura existente de **Supabase** (Auth, PostgREST, Realtime, Storage).
> - **NO** reemplaza autenticación, matching, dispatch ni el backend de pagos existente de UGO.
> - **NO** define esquemas SQL prescriptivos ni migraciones obligatorias: los contratos aquí definidos son **Contratos de UI / Dominio Agnósticos en TypeScript**.
> - **Saneamiento de Claims:** Todos los términos hiperbólicos o no soportados (*fideicomiso bancario Bacen mTLS, ISPB directo, liquidación estricta en 1.8 segundos, peritajes forenses, pólizas externas CREA/CFT*) quedan **eliminados**. Se adopta el lenguaje canónico oficial de UGO: **Pago Protegido por UGO, Saldo UGO, Retiro por PIX, Protección UGO Shield, Mediación UGO, Evidencias del Servicio y Profesional Verificado**.
> - Conceptos avanzados como **UGO Lens** y **Hugo Copilot** se documentan explícitamente con el tag: `[CONCEPT / REQUIRES AI / COMPUTER VISION INTEGRATION]`.

---

## 2. Matriz de Simetría y Sincronización Canónica: Cliente ↔ Proveedor

Esta matriz es el estándar técnico vinculante para Ingeniería, asegurando que cada evento y transición de estado mantenga coherencia exacta entre la app de UGO Cliente y UGO Pro.

| CLIENT_STATE | PROVIDER_STATE | CLIENT_SCREEN | PROVIDER_SCREEN | EVENT | EXPECTED_RESULT |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `REQUEST_POSTED` | `ONLINE_IDLE` | Solicitud Publicada | Home / Radar de Demanda | `order:broadcast` | El proveedor recibe notificación/tarjeta de oportunidad en radar geolocalizado. |
| `REVIEWING_PROPOSALS`| `PROPOSAL_SENT` | Comparativa de Profesionales | Detalle / Cotizador Enviado | `onSendProposal` | Cliente ve la tarjeta del profesional; proveedor ve estado "Propuesta enviada - Esperando cliente". |
| `HIRED_ESCROW_LOCKED`| `JOB_CONFIRMED` | Profesional Contratado | Propuesta Aceptada / Checklist | `client:hire_specialist` | Se bloquea el pago protegido en UGO; proveedor desbloquea dirección exacta y checklist de viaje. |
| `SPECIALIST_IN_ROUTE`| `TRAIN_DISPATCH` | Seguimiento en Vivo / Mapa | En Camino / Navegación GPS | `onStartRoute` | Cliente ve posición/ETA en tiempo real; proveedor ve mapa de ruta y botón de reporte de demora. |
| `SPECIALIST_DELAYED` | `DELAY_REPORTED` | Notificación de Demora / Nuevo ETA | En Camino (Alerta Demora) | `onNotifyDelay` | Cliente recibe push con tiempo estimado ajustado sin penalización inmediata. |
| `SPECIALIST_ARRIVED` | `AT_DOORSTEP` | Notificación: Profesional en puerta | Llegada al Domicilio / PIN Check-In | `onArrive` | Proveedor visualiza pantalla de ingreso de PIN; cliente visualiza su código PIN de seguridad de 4 dígitos. |
| `SERVICE_IN_PROGRESS`| `SERVICE_ACTIVE` | Servicio en Curso / Vista de Tareas | Servicio en Curso / Cronómetro | `onCheckIn` (PIN ok) | Se inicia cronómetro sincronizado; se activa la cobertura de Protección UGO Shield. |
| `EXTENSION_PENDING` | `EXTENSION_SENT` | Aprobación de Adicional / Repuesto | Ampliar Servicio (Enviada) | `onSubmitExtension` | Cliente recibe modal con foto, descripción y costo adicional; proveedor queda en espera sin detener labor base. |
| `SERVICE_IN_PROGRESS`| `SERVICE_ACTIVE` | Resumen de Adicional Aprobado | Servicio en Curso (+Item) | `client:approve_extension` | Se suma el monto/tiempo adicional a la orden de servicio activa con trazabilidad completa. |
| `SERVICE_IN_PROGRESS`| `SERVICE_ACTIVE` | Notificación: Adicional Declinado | Servicio en Curso (Rechazo) | `client:reject_extension` | La ampliación se descarta; el servicio original continúa normalmente. |
| `SERVICE_REVIEW` | `PENDING_CLIENT_APPROVAL`| Revisión Final / Evidencias | Finalización / Bóveda Evidencias | `onCompleteService` | Proveedor sube fotos Antes/Después; cliente recibe solicitud de inspección y conformidad. |
| `SERVICE_COMPLETED` | `JOB_FINISHED` | Conformidad & Calificación | Resumen de Cierre & Calificación | `client:confirm_completion` | Fondos pasan a Saldo UGO del proveedor; ambos completan calificación bilateral de 1 a 5 estrellas. |
| `DISPUTE_OPENED` | `IN_MEDIATION` | Reportar Inconformidad / Soporte | Centro de Mediación UGO | `onOpenDispute` | Se pausa liberación de saldo en controversia; interviene mediador de soporte UGO con chat tripartito. |

---

## 3. Máquina de Estados del Servicio (UGO Pro State Machine)

```
[ ONLINE_IDLE / RADAR ]
         │
         ▼ (onOpenOpportunity / onSendProposal)
  [ PROPOSAL_SENT ]
         │
         ├─────────────────────────────────────────┐
         │ (client rejects / expires)              ▼ (client accepts)
         ▼                                  [ JOB_CONFIRMED ]
  [ PROPOSAL_DECLINED ]                            │
                                                   ▼ (onStartRoute)
                                            [ IN_ROUTE ] ◄──► [ DELAY_REPORTED ]
                                                   │
                                                   ▼ (onArrive)
                                            [ ARRIVED_AT_DOOR ]
                                                   │
                                                   ▼ (onCheckIn via PIN)
                                            [ SERVICE_IN_PROGRESS ] ◄──┐
                                                   │                   │ (client approves/rejects extension)
                                                   ├───────────────────┘
                                                   ▼ (onOpenExtensionComposer)
                                            [ EXTENSION_PROPOSED ]
                                                   │
                                                   ▼ (onCompleteService + Evidences)
                                            [ PENDING_CLIENT_APPROVAL ]
                                                   │
                                ┌──────────────────┴──────────────────┐
                                ▼ (client:confirm_completion)         ▼ (client/pro opens claim)
                        [ COMPLETED ]                         [ IN_MEDIATION / DISPUTE ]
                                │                                     │
                                ▼ (onBalanceCredit)                   ▼ (resolution)
                        [ BALANCE_AVAILABLE ]                 [ RESOLVED / CLOSED ]
```

---

## 4. Gestión de Ampliación de Servicio (Agregar Trabajo / Repuesto)

- **Regla Fundamental:** NO genera una nueva orden ni rompe el contrato original. Se anexa a la orden existente como un `ServiceExtensionItem`.
- **Campos del Item:**
  - `title`: Tarea o repuesto identificado.
  - `category`: `MATERIAL` | `LABOR_TIME` | `UNFORESEEN_TASK`.
  - `description`: Justificación técnica para el cliente.
  - `additional_amount`: Importe monetario exacto.
  - `estimated_minutes`: Tiempo adicional proyectado.
  - `evidence_photo_url`: Fotografía de la pieza averiada o situación no contemplada.
- **Ciclo de Vida:**
  `DRAFT ➔ SENT_TO_CLIENT ➔ [ APPROVED | REJECTED ]`
  - Si el cliente **aprueba**: el monto se adiciona al total protegido del servicio y el cronómetro suma los minutos adicionales.
  - Si el cliente **rechaza**: el servicio base prosigue sin modificaciones.

---

## 5. Hugo Copilot & UGO Lens (Especificación y Deslinde de Integración)

### 5.1. Hugo Copilot (Copiloto de Trabajo Contextual)
- **Rol:** Analiza el contexto de la orden y emite recomendaciones no vinculantes.
- **Límites de Copy y UX:** Queda prohibido afirmar que Hugo *"certifica"*, *"garantiza"*, *"aprueba legalmente"* o *"actúa como perito judicial"*. Hugo **recomienda y asiste**.
- **Etapas Operativas:**
  1. *Antes del trabajo:* Resume solicitud del cliente, checklist sugerido de herramientas y precauciones.
  2. *Durante el trabajo:* Diagnóstico paso a paso sugerido, redacción asistida de explicaciones para el cliente y checklist de evidencias.
  3. *Después del trabajo:* Checklist de cierre (limpieza, prueba de estanqueidad/tensión) y recordatorio de fotos pendientes.

### 5.2. UGO Lens `[CONCEPT / REQUIRES AI / COMPUTER VISION INTEGRATION]`
- **Rol:** Identificación visual orientativa de piezas, niples, válvulas y componentes.
- **UX Requerida:** Muestra porcentaje de aproximación o nivel de confianza, alternativas sugeridas y **requiere confirmación manual obligatoria del proveedor** antes de asociarlo a un presupuesto o ampliación.

---

## 6. Tratamiento de Pagos y Saldo UGO

En la UI de UGO Pro, la estructura financiera se desglosa con máxima transparencia:
1. **Total Pagado por el Cliente:** Importe del servicio base + adicionales aprobados (retenido bajo Protección UGO Shield).
2. **Comisión por Servicio UGO:** Tarifa de intermediación visible.
3. **Monto Neto del Proveedor:**
   - **Saldo Disponible:** Fondos de órdenes finalizadas y confirmadas por el cliente, listos para retiro.
   - **Saldo Retenido / En Curso:** Montos de servicios actualmente en ejecución o en proceso de mediación.
4. **Retiro vía PIX:** El proveedor solicita la transferencia a su llave PIX registrada (CPF, teléfono, e-mail o llave aleatoria) sujeta al procesamiento del motor de pagos de UGO.

---

## 7. Manejo Canónico de Edge Cases y Resiliencia Offline

| Escenario | Comportamiento UI & Estrategia de Resiliencia |
| :--- | :--- |
| **Pérdida de Conexión / Subsuelo** | Almacenamiento local (IndexedDB / SQLite / MMKV) del estado de la orden activa, fotos tomadas y timestamp de inicio/fin. El servicio no se interrumpe ni resetea. Banner sutil: *"Modo sin conexión - Los cambios se sincronizarán al recuperar señal"*. |
| **Reconexión de Red** | Sincronización transparente vía WebSocket Realtime con debounce y deduplicación basada en `client_event_id`. |
| **GPS Desactivado / Señal Débil** | Diálogo modal nativo solicitando activación; fallback a confirmación manual de llegada con notificación al cliente. |
| **Sin Oportunidades en el Radar** | `EmptyState` optimizado con consejos para mejorar radio de atención, horarios o categorías habilitadas. |
| **Cliente Cancela en Ruta** | Notificación push inmediata, cálculo automático de tarifa de compensación por desplazamiento (si aplica bajo reglas UGO) y retorno seguro a estado `ONLINE_IDLE`. |
| **Cliente Ausente en Puerta** | Temporizador de espera reglamentario (10 minutos) con botón para llamar al cliente y opción de cancelar con motivo *"Cliente no responde"*. |
| **Proveedor Demorado** | Botón directo de 1-toque *"Avisar demora"* con presets (+10 min, +20 min, tráfico pesado) que actualiza la pantalla del cliente en tiempo real. |
| **Ampliación Rechazada** | Notificación en pantalla con confirmación de que el trabajo pactado originalmente sigue en curso sin penalidad. |
| **Disputa / Inconformidad** | Transición a pantalla `26. Centro de Mediación UGO` donde ambos exponen argumentos y evidencias fotográficas ante el equipo de soporte. |

---

## 8. Inventario de Componentes UI Reutilizables

Todos los componentes cumplen con el estándar de accesibilidad **Touch Target >= 48x48px**, contraste de texto WCAG AAA y uso estricto de los tokens del sistema `DESIGN_SYSTEM_1`.

1. `ProAppHeader`: Barra superior con estado de red, switch rápido online y perfil.
2. `ProviderStatusToggle`: Control segmentado Online / Pausa / Offline.
3. `DemandRadar`: Componente interactivo de radio de oportunidad con filtros de distancia.
4. `OpportunityCard`: Tarjeta de solicitud cercana con badge de categoría, urgencia y distancia.
5. `ServiceRequestCard`: Ficha descriptiva con problema, dirección aproximada y tiempo estimado.
6. `ProposalComposer`: Editor de propuesta con mano de obra sugerida y nota técnica.
7. `RouteStatus`: Panel de estado de navegación GPS con ETA y botón de aviso de demora.
8. `ArrivalCheckIn`: Pantalla de umbral con teclado numérico para validación de PIN del cliente.
9. `WorkTimer`: Cronómetro flotante/fijado con horas, minutos y segundos activos de labor.
10. `WorkChecklist`: Lista de verificación técnica interactiva con checkbox nativos.
11. `HugoWorkAssistant`: Drawer/tarjeta contextual con recomendaciones de Hugo Copilot.
12. `UGOLens`: Visor de cámara con retícula de escaneo de piezas y confirmación manual.
13. `EvidenceUploader`: Módulo de carga de evidencias fotográficas Antes / Después con metadata.
14. `ServiceExtensionComposer`: Formulario de propuesta de tareas o repuestos adicionales.
15. `ClientApprovalStatus`: Banner de estado en tiempo real (Pendiente, Aprobado, Rechazado).
16. `ServiceSummary`: Desglose final de tiempos, repuestos utilizados y monto a liquidar.
17. `ProviderBalance`: Widget de billetera con saldo disponible vs. pendiente de acreditación.
18. `WithdrawalPanel`: Formulario de retiro a cuenta con confirmación de llave PIX.
19. `RatingCard`: Evaluación mutua con selector de 1 a 5 estrellas y etiquetas de feedback.
20. `DisputeStatus`: Tarjeta de mediación con cronología de mensajes y estado de revisión.
21. `OfflineState`: Alerta no bloqueante indicando almacenamiento local activo.
22. `EmptyState`: Ilustración y mensaje motivador cuando no hay pedidos cercanos.
23. `ErrorState`: Tarjeta con acción de reintento (`Retry`) ante fallos de conexión.
24. `Skeleton`: Placeholders de carga suave para tarjetas y listados en streaming.
25. `Toast`: Notificaciones flotantes de retroalimentación inmediata.
26. `BottomNavigation`: Barra inferior persistente de 4 accesos: Radar, Trabajos, Mensajes, Perfil.

---

## 9. Contratos de Dominio Agnósticos en TypeScript (UI Interfaces)

```typescript
// ============================================================================
// UGO PRO MOBILE — UI & DOMAIN CONTRACTS (AGNOSTIC TYPESCRIPT)
// ============================================================================

export type ProviderStatus = 'ONLINE' | 'BUSY_IN_ROUTE' | 'BUSY_WORKING' | 'OFFLINE';

export type ServiceStatus = 
  | 'OPPORTUNITY'
  | 'PROPOSAL_SUBMITTED'
  | 'ACCEPTED_PENDING_DISPATCH'
  | 'SPECIALIST_IN_ROUTE'
  | 'ARRIVED_CHECKIN_PENDING'
  | 'IN_PROGRESS'
  | 'EXTENSION_REQUESTED'
  | 'AWAITING_CLIENT_APPROVAL'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'CANCELLED';

export interface ProviderProfile {
  id: string;
  fullName: string;
  cpfMasked: string; // Formato: ***.123.456-**
  profileImageUrl: string;
  ratingAverage: number;
  completedJobsCount: number;
  verificationBadge: 'VERIFIED_PRO' | 'PENDING' | 'REJECTED';
  tierLevel: 'BRONZE' | 'SILVER' | 'GOLD';
  primaryCategories: string[];
  operationalRadiusKm: number;
  pixKeyFormatted: string;
}

export interface ServiceOpportunity {
  id: string;
  orderNumber: string; // Ej: "#8492"
  clientFirstName: string;
  categoryName: string;
  subCategoryName: string;
  problemTitle: string;
  problemDescription: string;
  approximateLocation: {
    neighborhood: string;
    city: string;
    distanceKm: number;
    latitude: number;
    longitude: number;
  };
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  suggestedEstimatedAmount?: number;
  clientImagesUrls: string[];
  createdAt: string;
  expiresInSeconds: number;
}

export interface ServiceProposal {
  opportunityId: string;
  laborAmount: number;
  materialsEstimatedAmount: number;
  totalProposalAmount: number;
  estimatedDurationHours: number;
  technicalNotes: string;
  validUntilTimestamp: string;
}

export interface ServiceExtension {
  id: string;
  serviceId: string;
  type: 'SPARE_PART' | 'EXTRA_LABOR';
  title: string;
  description: string;
  additionalAmount: number;
  estimatedAdditionalMinutes: number;
  evidencePhotoUrl?: string;
  status: 'DRAFT' | 'SENT_TO_CLIENT' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
}

export interface ServiceEvidence {
  id: string;
  serviceId: string;
  stage: 'BEFORE_WORK' | 'AFTER_WORK' | 'INSPECTION';
  imageUrl: string;
  capturedAt: string;
  localSyncStatus: 'SYNCED' | 'PENDING_UPLOAD';
  notes?: string;
}

export interface HugoSuggestion {
  id: string;
  stage: 'PREPARATION' | 'DIAGNOSTIC' | 'COMPLETION';
  title: string;
  recommendedTools: string[];
  technicalAdvice: string;
  suggestedChecklist: string[];
  disclaimer: 'CONCEPT / REQUIRES AI INTEGRATION';
}

export interface LensSuggestion {
  detectedPartName: string;
  confidenceScore: number; // 0.00 a 1.00
  suggestedSpecifications: string;
  requiresManualConfirmation: true;
  disclaimer: 'CONCEPT / REQUIRES COMPUTER VISION INTEGRATION';
}

export interface ProviderBalance {
  currency: 'BRL';
  availableBalance: number;
  pendingClearanceBalance: number;
  totalEarnedThisMonth: number;
  lastWithdrawalDate?: string;
}

export interface WithdrawalRequest {
  amount: number;
  pixKey: string;
  pixKeyType: 'CPF' | 'PHONE' | 'EMAIL' | 'RANDOM';
  requestedAt: string;
}
```

---

## 10. Eventos de Intención de UI (Interaction & Domain Events)

```typescript
export interface UGOProUIEvents {
  onSetOnline: () => void;
  onSetOffline: () => void;
  onOpenOpportunity: (opportunityId: string) => void;
  onRejectOpportunity: (opportunityId: string) => void;
  onSendProposal: (proposal: ServiceProposal) => Promise<void>;
  onStartRoute: (serviceId: string) => void;
  onNotifyDelay: (serviceId: string, delayMinutes: number, reason: string) => void;
  onArrive: (serviceId: string) => void;
  onCheckIn: (serviceId: string, pinCode: string) => Promise<boolean>;
  onStartService: (serviceId: string) => void;
  onPauseService: (serviceId: string, reason: string) => void;
  onResumeService: (serviceId: string) => void;
  onAddEvidence: (evidence: Omit<ServiceEvidence, 'id' | 'capturedAt'>) => Promise<void>;
  onOpenHugo: (serviceId: string) => void;
  onOpenLens: () => void;
  onCreateExtension: (extensionDraft: Partial<ServiceExtension>) => void;
  onSubmitExtension: (extensionId: string) => Promise<void>;
  onCompleteService: (serviceId: string) => Promise<void>;
  onOpenDispute: (serviceId: string, disputeReason: string) => void;
  onWithdrawBalance: (withdrawal: WithdrawalRequest) => Promise<void>;
  onRetryConnection: () => void;
}
```

---

## 11. Inventario de Pantallas en Canvas y Mapeo de Rutas

| SCREEN_ID | Título en Canvas | Ruta / Rol | Dispositivo |
| :--- | :--- | :--- | :--- |
| `SCREEN_35` | 1. Splash Screen - UGO | `/splash` | Mobile |
| `SCREEN_34` | 2. Login - Entrá a UGO | `/auth/login` | Mobile |
| `SCREEN_32` | 3-4. Teléfono y Verificación OTP | `/auth/otp-verify` | Mobile |
| `SCREEN_33` | 5-6. Recuperar Acceso & Selección Rol | `/auth/role-select` | Mobile |
| `SCREEN_31` | 7-8. Registro y Perfil Personal (Paso 1/5) | `/onboarding/personal-data` | Mobile |
| `SCREEN_30` | 9-10. Servicios y Experiencia (Paso 2 y 3/5) | `/onboarding/services-rates` | Mobile |
| `SCREEN_29` | 11-13. Verificación, Disponibilidad y Perfil Listo | `/onboarding/documents-ready`| Mobile |
| `SCREEN_28` | 14. Home Radar y Oportunidades en Vivo | `/pro/radar` | Mobile |
| `SCREEN_27` | 15. Detalle de Trabajo y Solicitud | `/pro/job-detail/:id` | Mobile |
| `SCREEN_26` | 16. Envío de Presupuesto Interactivo | `/pro/job-quote/:id` | Mobile |
| `SCREEN_25` | 17. Propuesta Aceptada y Preparación de Viaje | `/pro/job-confirmed/:id` | Mobile |
| `SCREEN_24` | 18. Navegación GPS y En Ruta al Cliente | `/pro/navigation/:id` | Mobile |
| `SCREEN_23` | 19. Llegada al Domicilio y Validación OTP | `/pro/check-in/:id` | Mobile |
| `SCREEN_21` | 20. Servicio en Curso y Cronómetro de Trabajo | `/pro/job-active/:id` | Mobile |
| `SCREEN_16` | Visor de Evidencias HD - Comparativa Antes y Después | `/pro/evidences-viewer/:id` | Mobile |
| `SCREEN_17` | Visor Inmersivo de Evidencias - UGO Pro | `/pro/evidences-fullscreen` | Mobile |
| `SCREEN_10` | 24. Escáner Visual de Repuestos por Cámara IA | `/pro/ugo-lens` | Mobile |
| `SCREEN_12` | 23. Chat con IA Copilot - UGO Pro | `/pro/hugo-copilot` | Mobile |
| `SCREEN_8`  | 25. Chat con Cliente - Camila Duarte | `/pro/chat-client/:id` | Mobile |
| `SCREEN_7`  | 26. Centro de Soporte y Mediación de Disputas | `/pro/support-disputes` | Mobile |
| `SCREEN_20` | 21. Aprobación del Cliente, Pago Escrow y Calificación | `/pro/job-completion/:id`| Mobile |
| `SCREEN_14` | 22. Billetera y Retiro Inmediato PIX | `/pro/wallet` | Mobile |
| `SCREEN_5`  | 27. Comprobante Oficial de Transferencia Bancaria PIX | `/pro/wallet/receipt/:tx` | Mobile |
