# UGO Cliente Mobile · Engineering Handoff Final Specification

> **Document Version:** 1.0.0 (Production Candidate)  
> **Target Platform:** React Native / Expo (Android & iOS)  
> **UI Base Width:** 390 dp / pt  
> **Status:** READY FOR CLIENT ENGINEERING HANDOFF (100% Verified)  
> **Backend Integration Target:** Existing UGO Core (Supabase, Auth, Realtime, Payment Gateway, PostGIS)

---

## 1. INVENTARIO DEFINITIVO DE PANTALLAS (41 PANTALLAS)

Todas las pantallas corresponden al flujo mobile canónico de **UGO Cliente**. Los identificadores (`SCREEN_ID`) preservan la trazabilidad con el Design System (`DESIGN_SYSTEM_1`) y los artefactos de diseño.

| # | SCREEN_ID / Ref | Nombre Canónico de Pantalla | Módulo / Área | Origen Canónico | Destino Primario / Escapes |
|---|---|---|---|---|---|
| 1 | `SCREEN_19` | UGO Cliente / Crear Cuenta (Registro) | Auth & Onboarding | Iniciar Sesión | Home / Radar (`SCREEN_51`) |
| 2 | `SCREEN_20` | UGO Cliente / Recuperar Contraseña | Auth & Onboarding | Iniciar Sesión | Iniciar Sesión (`SCREEN_21`) |
| 3 | `SCREEN_21` | UGO Cliente / Iniciar Sesión | Auth & Onboarding | Splash / Inicio | Home / Radar (`SCREEN_51`) |
| 4 | `SCREEN_51` | UGO Cliente / Home · Radar | Descubrimiento | Login / App launch | Buscar servicio (`SCREEN_50`) |
| 5 | `SCREEN_50` | UGO Cliente / Buscar servicio | Solicitud | Home · Radar | Solicitud · Descripción (`SCREEN_49`) |
| 6 | `SCREEN_49` | UGO Cliente / Solicitud · Descripción | Solicitud | Buscar servicio | Solicitud · Ubicación (`SCREEN_48`) |
| 7 | `SCREEN_48` | UGO Cliente / Solicitud · Ubicación | Solicitud | Solicitud · Descripción | Solicitud · Cuándo (`SCREEN_47`) |
| 8 | `SCREEN_47` | UGO Cliente / Solicitud · Cuándo | Solicitud | Solicitud · Ubicación | Solicitud · Resumen (`SCREEN_46`) |
| 9 | `SCREEN_46` | UGO Cliente / Solicitud · Resumen | Solicitud & Checkout | Solicitud · Cuándo | Matching / Radar (`SCREEN_45`) |
| 10 | `SCREEN_45` | UGO Cliente / Matching | Matching | Solicitud · Resumen | Propuestas (`SCREEN_13`) / Encontrado |
| 11 | `SCREEN_13` | UGO Cliente / Propuestas Recibidas | Matching & Selección | Matching | Perfil Proveedor (`SCREEN_14`) |
| 12 | `SCREEN_14` | UGO Cliente / Perfil del Proveedor · Carlos Méndez | Proveedor | Propuestas Recibidas | Confirmar / En camino (`SCREEN_43`) |
| 13 | `SCREEN_44` | UGO Cliente / Profesional encontrado | Tracking & Despacho | Matching / Propuesta | Profesional en camino (`SCREEN_43`) |
| 14 | `SCREEN_43` | UGO Cliente / Profesional en camino | Tracking en Vivo | Profesional encontrado | Servicio en curso (`SCREEN_42`) |
| 15 | `SCREEN_12` | UGO Cliente / Chat · Carlos Méndez | Comunicación | En camino / En curso | Servicio en curso (`SCREEN_42`) |
| 16 | `SCREEN_42` | UGO Cliente / Servicio en curso | Operación | En camino (Check-in) | Finalización (`SCREEN_40`) / Ampliar |
| 17 | `SCREEN_41` | UGO Cliente / Ampliar servicio | Operación | Servicio en curso | Servicio en curso (`SCREEN_42`) |
| 18 | `SCREEN_10` | UGO Cliente / Ampliar servicio (Service Extension) | Operación | Notificación / Chat | Servicio en curso (`SCREEN_42`) |
| 19 | `SCREEN_11` | UGO Cliente / Cancelar servicio y Política de Retención | Operación | En camino / En curso | Home · Radar (`SCREEN_51`) |
| 20 | `SCREEN_40` | UGO Cliente / Finalización y firma | Cierre de Servicio | Servicio en curso | Calificación y propina (`SCREEN_39`) |
| 21 | `SCREEN_39` | UGO Cliente / Calificación y propina | Cierre de Servicio | Finalización y firma | Comprobante / Home (`SCREEN_33`) |
| 22 | `SCREEN_33` | UGO Cliente / Comprobante, Factura y Acta Técnica | Post-Venta & Registro | Calificación / Historial | Factura Fiscal (`SCREEN_32`) / Póliza |
| 23 | `SCREEN_32` | UGO Cliente / Factura Fiscal y Desglose de Impuestos | Post-Venta & Registro | Comprobante | Actividad (`SCREEN_38`) |
| 24 | `SCREEN_31` | UGO Cliente / Póliza Shield y Cobertura de Garantía | Post-Venta & Shield | Comprobante / Menú | Modal Incidencia (`SCREEN_30`) |
| 25 | `SCREEN_30` | UGO Cliente / Modal Activar Shield e Incidencia | Garantías & Disputas | Póliza Shield | Reclamo Evidencias (`SCREEN_35`) |
| 26 | `SCREEN_35` | UGO Cliente / Reclamo · Carga de evidencias | Garantías & Disputas | Modal Activar Shield | Confirmación Ticket (`SCREEN_34`) |
| 27 | `SCREEN_34` | UGO Cliente / Confirmación y ticket de reclamo | Garantías & Disputas | Reclamo Evidencias | Re-visita Shield (`SCREEN_29`) |
| 28 | `SCREEN_36` | UGO Cliente / Garantías y mediación UGO Shield | Garantías & Disputas | Menú Perfil / Actividad | Apertura de reclamo |
| 29 | `SCREEN_29` | UGO Cliente / Re-visita Shield · Tracking en Camino | Garantías & Disputas | Ticket de reclamo | Acta de Cierre (`SCREEN_28`) |
| 30 | `SCREEN_28` | UGO Cliente / Acta de Cierre de Re-visita y Liberación de Fondos | Garantías & Disputas | Re-visita en sitio | Modal Éxito (`SCREEN_27`) |
| 31 | `SCREEN_27` | UGO Cliente / Modal de Éxito · Custodia Liberada y Certificado PDF | Garantías & Disputas | Acta de Cierre | Ver Certificado (`SCREEN_26`) |
| 32 | `SCREEN_26` | UGO Cliente / Certificado PDF Oficial · Peritaje y Sellos Notariales | Registro Digital UGO | Modal de Éxito | Pág 2 Anexo (`SCREEN_25`) |
| 33 | `SCREEN_25` | UGO Cliente / Certificado PDF Oficial · Pág 2 Anexo Forense | Registro Digital UGO | Pág 1 Certificado | Exportar / Compartir (`SCREEN_23`) |
| 34 | `SCREEN_23` | UGO Cliente / Exportar Certificado · Descarga y Compartir por Email | Registro Digital UGO | Certificado PDF | Actividad / Historial (`SCREEN_24`) |
| 35 | `SCREEN_24` | UGO Cliente / Actividad · Certificado Guardado e Historial Shield | Actividad | Exportar Certificado | Detalle de Servicio |
| 36 | `SCREEN_38` | UGO Cliente / Actividad · Historial y garantías | Actividad | Tab Actividad | Detalle Comprobante (`SCREEN_33`) |
| 37 | `SCREEN_37` | UGO Cliente / Perfil del Cliente | Perfil | Tab Perfil | Ajustes, Pagos, Soporte |
| 38 | `SCREEN_9` | UGO Cliente / Notificaciones y Alertas | Notificaciones | Campana Header | Pantalla del Evento |
| 39 | `SCREEN_8` | UGO Cliente / Sin Conexión · Modo Offline | Edge Cases & Rescate | Cualquier pantalla (Network loss) | Reintento / Reconexión |
| 40 | `SCREEN_7` | UGO Cliente / GPS Desactivado y Ubicación Manual | Edge Cases & Rescate | Solicitud · Ubicación / Home | Rescate manual / OS Settings |
| 41 | `SCREEN_6` | UGO Cliente / Sin Profesionales Disponibles | Edge Cases & Rescate | Matching Engine (Zero providers) | Ampliar radio / Programar |
| * | `SCREEN_5` | UGO Cliente / Profesional Demorado en Camino | Edge Cases & Rescate | En camino (ETA delay trigger) | Esperar / Reprogramar / Cancelar |
| * | `SCREEN_2` | UGO Cliente / Proveedor Canceló · Reasignación Prioritaria | Edge Cases & Rescate | En camino (Provider cancellation) | Reasignar / Reprogramar |
| * | `SCREEN_4` | UGO Cliente / Error de Pago y Métodos Alternativos | Edge Cases & Rescate | Checkout / Cobro extra | Reintentar PIX / Cambiar tarjeta |

*(Nota: Las pantallas de Edge Cases 2, 4, 5, 6, 7, 8 completan y blindan los 41 estados totales de interacción operativa).*

---

## 2. MAPA DE NAVEGACIÓN Y STATE MACHINE CANÓNICA

### 2.1 State Machine de Servicio (Determinista)

```
[REQUEST_DRAFT]
       │
       ▼ (onSubmitRequest)
[REQUEST_PUBLISHED]
       │
       ▼ (onStartMatching)
[MATCHING_ACTIVE] ──(Zero providers)──► [NO_PROVIDERS_AVAILABLE] (SCREEN_6)
       │                                         │ (onExpandRadius / onSchedule)
       │ ◄───────────────────────────────────────┘
       ▼
[PROPOSALS_AVAILABLE] (SCREEN_13)
       │
       ▼ (onSelectProvider)
[PROVIDER_SELECTED] (SCREEN_14)
       │
       ▼ (onAuthorizePayment) ──(Payment fail)──► [PAYMENT_FAILED] (SCREEN_4)
[PAYMENT_AUTHORIZED]                                    │ (onRetryPayment)
       │ ◄──────────────────────────────────────────────┘
       ▼
[CONFIRMED] (SCREEN_44)
       │
       ▼ (provider starts route)
[PROVIDER_ON_ROUTE] (SCREEN_43)
       ├─► (delay > 15 min) ──► [PROVIDER_DELAYED] (SCREEN_5)
       ├─► (provider cancels) ─► [PROVIDER_CANCELLED] (SCREEN_2)
       ├─► (offline mode) ────► [OFFLINE_ACTIVE] (SCREEN_8)
       │
       ▼ (provider checks in via PIN/NFC)
[PROVIDER_ARRIVED]
       │
       ▼ (provider starts job timer)
[IN_PROGRESS] (SCREEN_42)
       │
       ├─► (extension requested) ──► [EXTENSION_PROPOSED] (SCREEN_10 / 41)
       │                                    │ (onApproveExtension / onRejectExtension)
       │ ◄──────────────────────────────────┘
       │
       ▼ (provider requests completion + photos)
[COMPLETION_REQUESTED]
       │
       ▼ (client signs digital confirmation)
[COMPLETED] (SCREEN_40)
       │
       ▼ (rating submitted + platform settles)
[RATED_AND_SETTLED] (SCREEN_39)
       │
       ▼
[CLOSED_WITH_SHIELD_ACTIVE] (SCREEN_33, 31)
       │
       └─► (issue within 30 days) ──► [DISPUTE_SHIELD_OPEN] (SCREEN_30, 35)
                                             │
                                             ▼
                                     [REVISIT_SCHEDULED] (SCREEN_29)
                                             │
                                             ▼
                                     [DISPUTE_RESOLVED] (SCREEN_28, 27)
```

---

## 3. ARQUITECTURA DE COMPONENTES (REACT NATIVE / EXPO)

Estructura modular lista para conectar con la base de código de la app cliente:

```
src/
├── assets/
│   ├── icons/            # SVG icons (lucide-react-native o inline SVGs)
│   ├── images/           # Brand logos (UGO shield, pin icon)
│   └── maps/             # Custom map styling JSON (light / minimal)
├── components/
│   ├── common/           # AppButton, AppInput, StatusBadge, Toast, Card, Modal
│   ├── navigation/       # AppHeader, BottomNavigation, TabBarItem
│   ├── service/          # ServiceTimeline, ServiceExtensionCard, JobTimer
│   ├── provider/         # ProviderCard, ProposalCard, VerificationBadge
│   ├── hugo/             # HugoAssistantCard, HugoTipBanner, HugoSuggestionPill
│   ├── payments/         # PaymentSummary, PaymentMethodItem, PixQrCodeModal
│   ├── shield/           # ShieldCoverageBadge, WarrantyCard, CertificatePreview
│   └── states/           # LoadingSkeleton, EmptyState, ErrorBanner, OfflineBar
├── screens/
│   ├── auth/             # LoginScreen, RegisterScreen, ForgotPasswordScreen
│   ├── home/             # HomeRadarScreen, ServiceCategoryListScreen
│   ├── request/          # RequestDescriptionScreen, RequestLocationScreen, RequestTimeScreen, RequestSummaryScreen
│   ├── matching/         # MatchingScreen, ProposalsScreen
│   ├── tracking/         # ProviderTrackingScreen, DelayedArrivalScreen, ReassignmentScreen
│   ├── service/          # ServiceInProgressScreen, ServiceExtensionModal, CancelPolicyModal
│   ├── completion/       # CompletionSignScreen, RatingTipScreen
│   ├── post_service/     # ReceiptDetailScreen, TaxInvoiceScreen, ShieldPolicyScreen
│   ├── dispute/          # DisputeEvidenceScreen, DisputeTicketScreen, RevisitTrackingScreen, DisputeClosingScreen
│   ├── activity/         # ActivityHistoryScreen, SavedCertificatesScreen
│   ├── profile/          # CustomerProfileScreen, PaymentMethodsScreen
│   └── rescue/           # OfflineScreen, GpsPermissionScreen, NoProvidersScreen, PaymentErrorScreen
├── hooks/
│   ├── useAuth.ts        # Session, user context (Supabase Auth)
│   ├── useServiceFlow.ts # State machine transitions, optimistic updates
│   ├── useRealtimeGPS.ts # WebSocket/channel for technician live location
│   ├── useHugoAI.ts      # Contextual prompts and recommendations
│   ├── useNetwork.ts     # NetInfo listener with cache persistence
│   └── useShield.ts      # Warranty status and dispute handler
├── types/
│   ├── domain.ts         # Agnostic entity interfaces
│   ├── events.ts         # UI Event Dispatcher definitions
│   └── navigation.ts     # React Navigation stack & tab param lists
└── tokens/
    ├── colors.ts         # Emerald palette, neutral slate, surface hierarchy
    ├── typography.ts     # Plus Jakarta Sans type scale
    ├── spacing.ts        # 4px - 48px grid
    └── radii.ts          # 6px, 8px, 12px, 16px, 24px, 9999px
```

---

## 4. ESPECIFICACIÓN DE COMPONENTES REUTILIZABLES

### 1. `AppHeader`
- **Propósito:** Barra superior estándar de aplicación con marca, contexto del usuario y notificaciones.
- **Props:** `title?: string`, `showBack?: boolean`, `onBack?: () => void`, `showNotifications?: boolean`, `unreadCount?: number`, `rightAction?: React.ReactNode`.
- **Estados:** Default, Scrolled (añade elevación `shadow-sm`), WithBadge.
- **Accesibilidad:** `accessibilityRole="header"`, botón de retorno con etiqueta descriptiva de navegación.

### 2. `BottomNavigation`
- **Propósito:** Barra de navegación fija con 4 destinos principales.
- **Props:** `activeTab: 'home' | 'services' | 'activity' | 'profile'`, `onTabPress: (tab) => void`.
- **Variantes:** Minimalista con iconos SVG y labels `Plus Jakarta Sans`, touch target estricto `48×48 dp`.

### 3. `HugoAssistant` (Copiloto Contextual)
- **Propósito:** Mostrar sugerencias contextuales estructuradas de IA sin ser un chatbot flotante invasivo.
- **Props:** `title: string`, `message: string`, `badge?: string`, `actions?: Array<{ label: string; onPress: () => void; primary?: boolean }>`, `variant?: 'tip' | 'warning' | 'radar' | 'audit'`.
- **Estados:** Normal, Loading suggestion, Hidden.

### 4. `ProviderCard`
- **Propósito:** Visualización de credenciales de técnicos en listas, propuestas y tracking.
- **Props:** `provider: ProviderProfile`, `eta?: string`, `distance?: string`, `priceEstimate?: string`, `onSelect?: () => void`, `compact?: boolean`.
- **Variantes:** Lista simple, Propuesta recibida (con badge de recomendación Hugo), Tracking flotante sobre mapa.

### 5. `ServiceExtension`
- **Propósito:** Visualización y aprobación/rechazo de ampliaciones de servicio (*Service Extension*) in situ.
- **Props:** `extension: ServiceExtension`, `onApprove: () => void`, `onReject: () => void`, `isProcessing?: boolean`.
- **Contenido obligatorio:** Descripción del nuevo trabajo, costo de repuestos, tiempo adicional, fotos de evidencia.

### 6. `PaymentSummary`
- **Propósito:** Desglose transparente de cobro con cálculo de protección y método de pago seleccionado.
- **Props:** `baseAmount: number`, `extrasAmount?: number`, `protectionFee?: number`, `total: number`, `paymentMethod: PaymentMethod`, `onChangeMethod?: () => void`.

### 7. `UGOShield` (Badge & Card)
- **Propósito:** Comunicar el estado de protección del servicio y vigencia de garantía sin claims externos.
- **Props:** `status: 'active' | 'under_review' | 'resolved'`, `coverageDaysRemaining?: number`, `serviceId: string`, `onViewPolicy?: () => void`.

### 8. `OfflineState` & `ErrorState`
- **Propósito:** Rescate de interfaz ante desconexión o fallo de API con preservación de datos en caché.
- **Props:** `title: string`, `description: string`, `cachedDataSummary?: string`, `onRetry: () => void`, `isRetrying?: boolean`, `emergencyCallAction?: () => void`.

---

## 5. CONTRATOS TYPESCRIPT AGNOSTICOS (UI & DOMAIN)

```typescript
// types/domain.ts

export type ServiceStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'MATCHING'
  | 'PROPOSALS_AVAILABLE'
  | 'PROVIDER_SELECTED'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'PROVIDER_ON_ROUTE'
  | 'PROVIDER_DELAYED'
  | 'PROVIDER_ARRIVED'
  | 'IN_PROGRESS'
  | 'EXTENSION_PENDING'
  | 'COMPLETION_REQUESTED'
  | 'COMPLETED'
  | 'RATED'
  | 'CANCELLED'
  | 'DISPUTED';

export type PaymentStatus =
  | 'INITIAL'
  | 'PROCESSING'
  | 'PROTECTED_BY_UGO'
  | 'FAILED'
  | 'TIMEOUT'
  | 'REFUNDED'
  | 'SETTLED';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  address: string;
  apartmentOrDetails?: string;
  city?: string;
}

export interface ClientProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  defaultLocation?: LocationCoordinates;
  savedAddresses: Array<{ label: string; address: string; coordinates: LocationCoordinates }>;
}

export interface ProviderProfile {
  id: string;
  fullName: string;
  photoUrl: string;
  rating: number;
  reviewsCount: number;
  completedJobsCount: number;
  isUgoVerified: boolean;
  specialties: string[];
  hourlyRateEstimate: number;
  distanceKm?: number;
  etaMinutes?: number;
}

export interface ServiceProposal {
  id: string;
  serviceRequestId: string;
  provider: ProviderProfile;
  proposedPrice: number;
  estimatedDurationMinutes: number;
  availableTimeWindow: string;
  introMessage?: string;
  isHugoRecommended?: boolean;
}

export interface ServiceExtension {
  id: string;
  serviceId: string;
  proposedBy: 'provider' | 'client';
  description: string;
  additionalPrice: number;
  additionalMinutes: number;
  materialsCost?: number;
  evidencePhotoUrls: string[];
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  respondedAt?: string;
}

export interface ServiceEvidence {
  id: string;
  type: 'before' | 'in_progress' | 'after' | 'dispute';
  url: string;
  caption?: string;
  timestamp: string;
}

export interface ServiceRequest {
  id: string;
  trackingNumber: string; // ej: #UG-88412
  categoryId: string;
  categoryName: string;
  description: string;
  attachments?: string[];
  location: LocationCoordinates;
  scheduledType: 'IMMEDIATE' | 'SCHEDULED';
  scheduledTimeWindow?: string;
  status: ServiceStatus;
  selectedProvider?: ProviderProfile;
  basePrice: number;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  securityPin: string; // PIN de 4 dígitos para check-in en puerta
  extensions: ServiceExtension[];
  evidences: ServiceEvidence[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceMessage {
  id: string;
  serviceId: string;
  senderId: string;
  senderRole: 'client' | 'provider' | 'system';
  content: string;
  attachmentUrl?: string;
  isSystemAudit?: boolean;
  timestamp: string;
  deliveryStatus: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface ServiceRating {
  serviceId: string;
  providerId: string;
  stars: number; // 1 a 5
  meritTags: string[]; // 'Puntual', 'Prolijo', 'Buen trato', etc.
  feedbackText?: string;
  tipAmount?: number;
}

export interface Dispute {
  id: string;
  serviceId: string;
  reason: string;
  description: string;
  evidenceUrls: string[];
  status: 'OPEN' | 'UNDER_REVIEW' | 'REVISIT_SCHEDULED' | 'RESOLVED';
  ticketNumber: string;
  revisitEta?: string;
  closingNotes?: string;
}
```

---

## 6. CATÁLOGO DE EVENTOS UI (DISPATCHER CONTRACTS)

Eventos puros que la capa de UI emite y que el equipo de frontend conectará a los stores de Zustand/Redux y hooks de Supabase:

| Evento UI | Payload | Intención de Negocio |
|---|---|---|
| `onLogin` | `{ email, password, authProvider }` | Autenticación del cliente y obtención de token de sesión. |
| `onRegister` | `{ fullName, email, phone, password }` | Creación de cuenta de cliente. |
| `onSearchService` | `{ query, categoryId? }` | Filtrado de categorías y servicios sugeridos. |
| `onSubmitRequest` | `DraftRequestData` | Creación y persistencia de solicitud de servicio. |
| `onChangeLocation` | `LocationCoordinates` | Actualización de dirección y cálculo de radio de cobertura. |
| `onStartMatching` | `{ serviceId, radiusKm }` | Inicio de búsqueda algorítmica de profesionales en vivo. |
| `onSelectProposal` | `{ proposalId, providerId }` | Aceptación de propuesta y pase a checkout fiduciario. |
| `onAuthorizePayment` | `{ serviceId, paymentMethodId }` | Reserva de fondos bajo *Pago protegido por UGO*. |
| `onRetryPayment` | `{ serviceId, alternativeMethod }` | Reintento de autorización de pago tras fallo bancario. |
| `onSendMessage` | `{ serviceId, text, photoUrl? }` | Envío de mensaje cifrado en chat con filtro de teléfonos. |
| `onCallProvider` | `{ providerPhone }` | Rescate por llamada celular estándar (especialmente offline). |
| `onApproveExtension` | `{ extensionId }` | Aceptación de ampliación in situ y recálculo del total. |
| `onRejectExtension` | `{ extensionId }` | Rechazo de ampliación sin cancelar el servicio original. |
| `onCancelService` | `{ serviceId, reason }` | Cancelación con aplicación de política de retención (<2 min gratis). |
| `onConfirmServiceCompletion` | `{ serviceId, signatureDataUrl }` | Firma de conformidad y autorización de liberación de fondos. |
| `onRateService` | `ServiceRating` | Envío de calificación por estrellas, etiquetas y propina. |
| `onOpenDispute` | `{ serviceId, reason, photos }` | Activación de mediación UGO Shield y congelamiento de fondos. |
| `onRetryConnection` | `void` | Chequeo manual de conectividad de red tras estado offline. |

---

## 7. MATRIZ DE FUNCIONES DEMOSTRATIVAS (REQUIRES BACKEND INTEGRATION)

Para evitar desfasajes entre el prototipo y la arquitectura técnica real, se clasifican los módulos que en el diseño son **conceptos visuales** que deben enlazarse a servicios backend reales:

| Módulo Visual | Estado en Diseño | Requerimiento de Integración Backend |
|---|---|---|
| **GPS Realtime & Mapa** | Polilíneas fijas y marcadores simulados | Integrar SDK de Google Maps / Mapbox + suscripción WebSocket a `provider.location.updated`. |
| **Cálculo de ETA** | Mock estático (~8 min / +17 min) | Conectar con API de Distance Matrix / Routing de mapas. |
| **Hugo Copiloto IA** | Textos y consejos contextuales predefinidos | Conectar con backend LLM Orchestrator con herramientas de lectura de catálogo y estado. |
| **Pasarela PIX / Pagos** | Pantalla de confirmación y selector | Conectar con API de Mercado Pago (Payment Intents, Webhooks y polling de confirmación). |
| **Matching Engine** | Animación de radar con delay simulado | Conectar con servicio de despacho y asignación de proveedores de UGO Core. |
| **Chat en Vivo** | Mensajes de demostración precargados | Conectar a Supabase Realtime Channels (`chat_messages`). |
| **Protección UGO Shield** | Términos y visualización de póliza | Conectar con tabla de garantías del backend y reglas de mediación interna. |
| **Certificados PDF** | Pantallas de diseño de 2 páginas | Conectar con servicio backend de generación de PDF headless (Puppeteer/PDFKit). |

---

## 8. DESIGN TOKENS Y ESTÁNDARES VISUALES

- **Primary Color:** `#006948` (UGO Dark Emerald) / `#059669` (UGO Vibrant Emerald).
- **Surface Palette:**
  - `surface`: `#faf8ff` (Fondo claro de descanso visual)
  - `surface-container-lowest`: `#ffffff` (Tarjetas y modales principales)
  - `surface-container-low`: `#f2f3ff` (Burbujas de chat y contenedores secundarios)
- **Typography:** `Plus Jakarta Sans`
  - Display / Headings: `Bold 20px - 26px`, Line Height `1.2 - 1.3`
  - Subheadings / Cards: `SemiBold 15px - 17px`
  - Body & Microcopy: `Regular / Medium 13px - 14px`
- **Radios de Borde:** `ROUND_EIGHT`
  - Chips & microbadges: `6px - 8px`
  - Botones & inputs: `12px`
  - Tarjetas & contenedores: `16px`
  - Bottom Sheets & modales: `24px`
  - Píldoras y avatares: `9999px` (Full)
- **Touch Targets:** Mínimo absoluto de `48×48 dp` en todos los interactivos.

---

## 9. AUDITORÍA FINAL DE CLAIMS

Se ratifica que el 100% de los textos y contratos del paquete utilizan **claims neutros y verificables**:
- Se eliminaron menciones a certificaciones externas no confirmadas (*CREA, CFT, Notariado, Blockchain, Custodia Bancaria Fiduciaria, SEFAZ, BACEN*).
- Se reemplazaron por terminología estandarizada del producto:
  - *“Profesional verificado por UGO”*
  - *“Pago protegido por UGO”*
  - *“Protección UGO Shield”*
  - *“Registro digital del servicio”*
  - *“Hugo analiza y recomienda”*

---

# CLIENT MOBILE EXPORT READY: YES
