Generá un **diagrama de flujo funcional y una arquitectura técnica detallada y revisada para UGO Cliente**, correspondiente a una plataforma móvil de contratación de servicios por hora.

El objetivo es representar claramente:

1. El recorrido completo del cliente.
2. Las pantallas principales.
3. Los estados de cada servicio.
4. La interacción con proveedores.
5. Pagos.
6. Chat.
7. Geolocalización.
8. Hugo, asistente con IA.
9. Notificaciones.
10. Backend y base de datos.
11. Integraciones externas.
12. Seguridad y trazabilidad.

El resultado debe poder ser utilizado como referencia por:
- UX/UI
- frontend
- backend
- mobile developers
- producto
- QA
- DevOps

---

# 1. FLUJO DE ACCESO

Representar:

Splash

→ Login

→ Login con teléfono / email / Google

→ Verificación OTP

→ Crear cuenta

→ Datos personales

→ Permisos

→ Ubicación

→ Home

También contemplar:

Usuario autenticado
→ sesión persistente
→ entrar directamente al Home

Recuperación:

Login
→ Olvidé contraseña
→ OTP
→ nueva contraseña
→ Login

---

# 2. HOME CLIENTE

Pantalla principal:

Home / Radar

Debe contener:

- ubicación actual
- mapa
- Hugo
- buscador:
  "¿Qué servicio necesitás?"
- categorías
- proveedores cercanos
- servicios destacados
- botón:
  "Encontrar profesionales"

Categorías iniciales:

- Limpieza
- Electricidad
- Plomería
- Reparaciones
- Montaje
- Pintura
- Aire acondicionado
- Tecnología
- Jardinería

Flujo:

Home

→ seleccionar categoría

o

→ escribir necesidad

o

→ hablar con Hugo

→ crear solicitud

---

# 3. HUGO · ASISTENTE IA

Hugo debe funcionar como asistente de contratación.

Flujo:

Cliente:
"Necesito instalar un ventilador de techo."

↓

Hugo interpreta intención.

↓

Detecta:

categoría:
Electricidad

subcategoría:
Instalación

urgencia

ubicación

duración estimada

información faltante

↓

Hugo pregunta solamente los datos necesarios.

Ejemplo:

"¿Ya tenés el ventilador?"

"¿El punto eléctrico está instalado?"

↓

Hugo genera una solicitud estructurada.

↓

Cliente revisa.

↓

Publicar solicitud.

---

# 4. CREAR SOLICITUD

Pantalla:

"Contanos qué necesitás"

Datos:

- categoría
- título
- descripción
- fotografías
- videos opcionales
- dirección
- ubicación GPS
- fecha
- horario
- urgencia
- duración estimada
- modalidad de precio

Opciones:

Por hora

Precio cerrado

Solicitar presupuesto

CTA:

"Buscar profesionales"

---

# 5. MATCHING

Después de publicar:

Solicitud

↓

Matching Engine

Debe analizar:

- categoría
- especialización
- distancia
- disponibilidad
- reputación
- precio
- cantidad de servicios
- tasa de aceptación
- historial
- compatibilidad
- urgencia

↓

Crear ranking de proveedores.

↓

Mostrar:

"Encontramos profesionales para vos"

---

# 6. RESULTADOS

Lista + mapa.

Cada proveedor muestra:

- foto
- nombre
- verificado
- rating
- servicios realizados
- distancia
- precio aproximado
- disponibilidad
- especialidad

Ejemplo:

Carlos
★ 4.9
127 servicios
1,4 km
Desde R$ 80/h
Disponible hoy

Acciones:

"Ver perfil"

"Solicitar"

---

# 7. PERFIL DEL PROVEEDOR

Mostrar:

- foto
- nombre
- badge verificado
- rating
- cantidad de servicios
- experiencia
- descripción
- categorías
- certificados
- portfolio
- fotos
- opiniones
- zona de cobertura
- tarifa
- disponibilidad

CTA:

"Solicitar servicio"

---

# 8. PROPUESTAS

La solicitud puede recibir varias propuestas.

Estado:

Solicitud publicada

↓

Proveedores reciben oportunidad

↓

Proveedor envía propuesta

↓

Cliente recibe notificación

Pantalla:

"Propuestas recibidas"

Cada propuesta contiene:

- proveedor
- rating
- precio
- tiempo estimado
- fecha
- mensaje
- distancia

Acciones:

"Ver perfil"

"Rechazar"

"Aceptar propuesta"

---

# 9. CONFIRMACIÓN

Cliente selecciona proveedor.

Mostrar resumen:

Servicio

Proveedor

Fecha

Hora

Dirección

Precio

Comisión / cargos si corresponde

Método de pago

CTA:

"Confirmar contratación"

↓

crear Service / Job.

---

# 10. PAGO

Integración principal:

Mercado Pago.

Opciones:

PIX

Tarjeta

Saldo UGO futuro

Flujo recomendado:

Cliente confirma contratación

↓

UGO crea Payment Intent / Preference

↓

Mercado Pago

↓

Pago autorizado

↓

UGO guarda estado:

AUTHORIZED / RESERVED

↓

servicio confirmado.

El dinero no debe liberarse inmediatamente al proveedor.

El backend debe controlar el estado de pago hasta la finalización del servicio.

---

# 11. SERVICIO CONFIRMADO

Mostrar:

"Tu servicio está confirmado."

Información:

Proveedor

Foto

Rating

Fecha

Hora

Dirección

Precio

Status

CTA:

"Ver seguimiento"

"Chatear"

---

# 12. CHAT

Crear chat interno asociado al servicio.

Cliente ↔ Proveedor.

Permitir:

- texto
- imágenes
- ubicación
- mensajes automáticos del sistema

No exponer innecesariamente información personal.

Registrar mensajes relacionados al servicio para trazabilidad.

---

# 13. PROVEEDOR EN CAMINO

Proveedor toca:

"Ir al servicio"

↓

cliente recibe:

"Carlos está en camino."

Mostrar mapa.

Datos:

Distancia:
2,4 km

ETA:
8 min

Mapa actualizado en tiempo real.

Estados:

CONFIRMED

↓

PROVIDER_ON_ROUTE

↓

PROVIDER_ARRIVED

---

# 14. PROVEEDOR LLEGÓ

Cliente recibe:

"Tu profesional llegó."

Mostrar:

Carlos está en el lugar.

CTA:

"Ver servicio"

---

# 15. INICIAR SERVICIO

Proveedor solicita inicio.

Cliente puede recibir confirmación.

Status:

IN_PROGRESS

Registrar:

started_at

ubicación

proveedor

cliente

precio original

duración estimada.

---

# 16. SERVICIO EN CURSO

Cliente ve:

"Servicio en progreso"

Tiempo transcurrido.

Proveedor.

Trabajo contratado.

Precio acordado.

Chat.

Hugo.

CTA:

"Agregar trabajo"

---

# 17. AGREGAR TRABAJO / AMPLIAR SERVICIO

Función crítica de UGO.

Durante el servicio:

Cliente o proveedor detecta trabajo adicional.

Ejemplo:

Solicitud original:

"Instalar dos luminarias"

Trabajo adicional:

"Instalar tercer punto de luz"

Proveedor propone:

+30 minutos
+R$ 60

↓

Cliente recibe:

"Tu proveedor propone ampliar el servicio."

Mostrar:

Trabajo:
Instalar tercer punto.

Tiempo adicional:
30 min

Valor:
R$ 60

Botones:

"Rechazar"

"Aprobar"

Si cliente aprueba:

crear:

ServiceExtension

Registrar:

- descripción
- proveedor
- cliente
- valor
- tiempo
- timestamp
- estado
- aprobación

Actualizar:

precio total

duración

alcance.

Nunca modificar silenciosamente el servicio original.

Debe existir trazabilidad.

---

# 18. FINALIZACIÓN

Proveedor toca:

"Finalizar servicio"

Puede cargar:

- fotos
- notas
- materiales
- evidencias

↓

Cliente recibe:

"El proveedor indicó que terminó el trabajo."

Mostrar:

Resumen.

Fotos.

Trabajo original.

Trabajos adicionales.

Tiempo.

Monto.

CTA:

"Confirmar finalización"

o

"Reportar problema"

---

# 19. CONFIRMACIÓN DEL CLIENTE

Cliente confirma:

"Trabajo completado correctamente."

↓

status:

COMPLETED

↓

autorizar liberación del pago.

---

# 20. LIQUIDACIÓN

Payment Service:

Pago reservado

↓

Servicio completado

↓

Calcular:

precio base

extras

comisión UGO

importe proveedor

↓

liberar pago según reglas de negocio.

Guardar:

Payment

Transaction

PlatformFee

ProviderPayout

---

# 21. CALIFICACIÓN

Cliente evalúa proveedor.

Rating:

1–5 estrellas.

Tags:

- puntual
- profesional
- buen trabajo
- limpio
- buena comunicación
- recomendado

Comentario opcional.

↓

actualizar rating proveedor.

---

# 22. RESUMEN

Timeline completo:

Solicitud creada

↓

Propuestas recibidas

↓

Proveedor seleccionado

↓

Pago autorizado

↓

Servicio confirmado

↓

Proveedor en camino

↓

Proveedor llegó

↓

Servicio iniciado

↓

Trabajo adicional

↓

Trabajo finalizado

↓

Cliente confirmó

↓

Pago liquidado

↓

Rating enviado

---

# 23. ACTIVIDAD

Bottom navigation:

Inicio

Servicios

Actividad

Perfil

Pantalla Actividad:

Próximos

En curso

Finalizados

Cancelados

Cada registro debe abrir:

Service Detail.

---

# 24. ARQUITECTURA MOBILE

Representar:

UGO Cliente Mobile App

↓

Presentation Layer

Screens

Components

Navigation

State Management

↓

Application Layer

Auth

Service Requests

Providers

Matching

Bookings

Chat

Payments

Location

Hugo AI

Notifications

↓

API Layer

REST / WebSocket

↓

UGO Backend.

---

# 25. BACKEND

Proponer arquitectura modular.

API Gateway

↓

Auth Service

User Service

Provider Service

Service Request Service

Matching Service

Booking / Job Service

Payment Service

Chat Service

Location Service

Notification Service

Rating Service

Hugo AI Service

Admin Service

Analytics / Scout

---

# 26. BASE DE DATOS

Base principal:

PostgreSQL.

Entidades:

users

customer_profiles

provider_profiles

provider_services

service_categories

service_requests

service_request_media

provider_proposals

services

service_status_history

service_extensions

service_extension_approvals

payments

payment_transactions

provider_payouts

ratings

chat_rooms

chat_messages

notifications

locations

provider_availability

provider_certifications

audit_logs

---

# 27. SERVICE_REQUEST

Campos conceptuales:

id

customer_id

category_id

title

description

latitude

longitude

address

status

urgency

scheduled_at

estimated_duration

pricing_type

created_at

updated_at.

---

# 28. PROPOSAL

provider_proposals

id

service_request_id

provider_id

price

estimated_duration

message

status

created_at.

Estados:

PENDING

ACCEPTED

REJECTED

EXPIRED.

---

# 29. SERVICE

services

id

service_request_id

customer_id

provider_id

proposal_id

status

original_price

current_price

estimated_duration

actual_duration

scheduled_at

started_at

completed_at.

---

# 30. ESTADOS DEL SERVICIO

Definir state machine estricta:

REQUEST_DRAFT

↓

REQUEST_PUBLISHED

↓

MATCHING

↓

PROPOSALS_AVAILABLE

↓

PROVIDER_SELECTED

↓

PAYMENT_PENDING

↓

CONFIRMED

↓

PROVIDER_ON_ROUTE

↓

PROVIDER_ARRIVED

↓

IN_PROGRESS

↓

COMPLETION_REQUESTED

↓

COMPLETED

↓

PAID

↓

CLOSED

Estados alternativos:

CANCELLED

DISPUTED

PAYMENT_FAILED

NO_SHOW.

No permitir saltos arbitrarios de estado.

---

# 31. SERVICE EXTENSION

service_extensions

id

service_id

requested_by

description

additional_price

additional_minutes

status

created_at

approved_at.

Estados:

PROPOSED

APPROVED

REJECTED

CANCELLED.

---

# 32. REALTIME

Utilizar WebSocket / realtime events para:

- chat
- propuestas
- status del servicio
- tracking
- trabajo adicional
- pagos
- notificaciones

Ejemplo:

provider.location.updated

service.status.changed

proposal.created

service_extension.requested

payment.confirmed

chat.message.created.

---

# 33. GEOLOCALIZACIÓN

Mobile GPS

↓

Location Service

↓

Proveedor cercano

↓

Matching.

No guardar más ubicación histórica de la necesaria.

Tracking en tiempo real solamente cuando el servicio lo requiera.

---

# 34. HUGO AI ARCHITECTURE

Cliente

↓

Hugo UI

↓

Hugo Orchestrator

↓

Intent Classification

↓

Context Engine

↓

UGO Tools

Herramientas disponibles:

searchProviders()

createServiceRequest()

getServiceStatus()

getProvider()

estimateService()

getPaymentStatus()

getActiveService()

requestServiceExtension()

contactSupport()

Hugo no debe modificar pagos ni contratos directamente sin confirmación explícita del usuario.

---

# 35. NOTIFICACIONES

Notification Service

↓

Push Notifications

In-app Notifications

Email en casos seleccionados.

Eventos:

- propuesta nueva
- propuesta aceptada
- proveedor en camino
- proveedor llegó
- ampliación de servicio
- finalización
- pago
- mensaje
- cancelación

---

# 36. SEGURIDAD

Incluir:

JWT / secure sessions

refresh tokens

OTP

rate limiting

role-based access control

encryption

validación backend

auditoría

protección de endpoints

secure payment webhooks

idempotencia.

Roles:

CUSTOMER

PROVIDER

ADMIN

SUPER_ADMIN.

Nunca confiar solamente en permisos del frontend.

---

# 37. PAGOS Y WEBHOOKS

Arquitectura:

UGO Backend

↓

Mercado Pago

↓

Webhook

↓

Payment Service

↓

verificar firma

↓

validar transaction ID

↓

actualizar estado

↓

emitir evento interno.

Implementar idempotencia para evitar procesamiento duplicado.

---

# 38. AUDITORÍA

Todo evento importante debe quedar registrado.

Audit Log:

actor

action

entity

entity_id

previous_state

new_state

timestamp

metadata.

Especialmente:

- pagos
- cambios de precio
- trabajos adicionales
- cancelaciones
- disputas
- modificaciones administrativas.

---

# 39. INFRAESTRUCTURA PROPUESTA

Mobile:

React Native / Expo.

Frontend administrativo:

React / Next.js.

Backend:

Node.js / TypeScript.

API:

REST + WebSocket.

Database:

PostgreSQL.

Cache:

Redis.

Object Storage:

fotos
documentos
archivos del servicio.

Push:

Firebase Cloud Messaging.

Mapas:

Google Maps o Mapbox.

Pagos:

Mercado Pago.

IA:

Hugo AI orchestration layer.

Deployment:

Vercel para frontend web cuando corresponda.

Backend en infraestructura cloud escalable.

---

# 40. ARQUITECTURA GENERAL

Representar visualmente:

UGO CLIENT APP
        ↓
API GATEWAY
        ↓
────────────────────────────
AUTH
USERS
REQUESTS
MATCHING
SERVICES
PAYMENTS
CHAT
LOCATION
HUGO
NOTIFICATIONS
RATINGS
────────────────────────────
        ↓
PostgreSQL
Redis
Object Storage
Event System
        ↓
────────────────────────────
Mercado Pago
Maps
Firebase
AI Providers
────────────────────────────

---

# 41. PRINCIPIOS DEL SISTEMA

UGO debe garantizar:

TRAZABILIDAD

CONFIANZA

SEGURIDAD

VELOCIDAD

ESCALABILIDAD

CONTROL DE PAGOS

CONTROL DE ESTADOS

EXPERIENCIA SIMPLE

El cliente no debe sentir la complejidad técnica.

Para el cliente el proceso debe sentirse simplemente como:

Necesito algo

↓

UGO entiende

↓

Encuentro profesional

↓

Contrato

↓

Sigo el trabajo

↓

Apruebo

↓

Pago

↓

Califico.

Mientras que internamente UGO mantiene toda la trazabilidad del proceso.

---

# 42. FORMATO DEL DIAGRAMA

Generar al menos cuatro vistas:

A. USER FLOW
Recorrido completo del cliente.

B. SERVICE STATE MACHINE
Estados y transiciones del servicio.

C. SYSTEM ARCHITECTURE
Mobile → Backend → Database → Servicios externos.

D. DATA / DOMAIN FLOW
Customer → Request → Proposal → Service → Extension → Payment → Rating.

Usar flechas claras.

Diferenciar visualmente:

Frontend

Backend

Database

Servicios externos

IA

Realtime.

Evitar conexiones ambiguas.

El resultado debe ser suficientemente detallado para comenzar implementación real de UGO.