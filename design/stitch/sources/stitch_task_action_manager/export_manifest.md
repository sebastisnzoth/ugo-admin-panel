# UGO ADMIN + SUPER ADMIN — EXPORT MANIFEST (FINAL PRODUCTION HANDOFF)
**Project:** UGO Admin Panel (Agnostic Frontend UI Reference: React + TypeScript + Vite + Supabase existing)  
**Cluster:** Florianópolis Hub (`sa-east-1-fln`)  
**Package:** `ugo-admin-stitch-final/`  
**Status:** PRODUCTION_UI_REFERENCE & SANITIZED (Zero Unverified Claims · All Mock Metrics Tagged `[DEMO DATA]`)

---

## 1. FILE-BY-FILE AUDIT & REGISTRY TABLE

| # | FILE PATH | SCREEN_ID / ASSET_ID | SCREEN / ARTIFACT NAME | ROLE | ROUTE | TYPE | STATUS |
|---|:---|:---|:---|:---:|:---|:---:|:---:|
| 1 | `shared/AdminLoginMfa.tsx` | `{{DATA:SCREEN:SCREEN_20}}` | Acceso Administrativo & MFA | SHARED | `/login` | SCREEN | PRODUCTION_UI_REFERENCE |
| 2 | `shared/UnauthorizedError.tsx` | `COMPONENT_SHARED_01` | Unauthorized & Role Denied View | SHARED | `/unauthorized` | COMPONENT | PRODUCTION_UI_REFERENCE |
| 3 | `shared/HugoAssistantDrawer.tsx` | `{{DATA:SCREEN:SCREEN_7}}` | Hugo Copilot Operational Drawer | SHARED | `DRAWER / GLOBAL` | SCREEN | REQUIRES_BACKEND_INTEGRATION |
| 4 | `shared/ZonesAndCategories.tsx` | `{{DATA:SCREEN:SCREEN_21}}` | Zonas Territoriales & Categorías | SHARED | `/admin/zonas-categorias` | SCREEN | PRODUCTION_UI_REFERENCE |
| 5 | `admin/DashboardOverview.tsx` | `{{DATA:SCREEN:SCREEN_35}}` | Dashboard Ejecutivo & Decisiones | ADMIN | `/admin/dashboard` | SCREEN | PRODUCTION_UI_REFERENCE |
| 6 | `admin/LiveOperationsMap.tsx` | `{{DATA:SCREEN:SCREEN_31}}` | Operaciones en Tiempo Real | ADMIN | `/admin/operaciones` | SCREEN | PRODUCTION_UI_REFERENCE |
| 7 | `admin/ServicesDirectory.tsx` | `{{DATA:SCREEN:SCREEN_17}}` | Servicios · Monitoreo y Ciclo de Vida | ADMIN | `/admin/servicios` | SCREEN | PRODUCTION_UI_REFERENCE |
| 8 | `admin/ServiceDetailView.tsx` | `{{DATA:SCREEN:SCREEN_33}}` | Detalle de Servicio, Timeline & Ampliaciones | ADMIN | `/admin/servicios/:id` | SCREEN | PRODUCTION_UI_REFERENCE |
| 9 | `admin/ClientsDirectory.tsx` | `{{DATA:SCREEN:SCREEN_24}}` | Directorio & Expediente de Clientes | ADMIN | `/admin/clientes` | SCREEN | PRODUCTION_UI_REFERENCE |
| 10 | `admin/ClientProfileView.tsx` | `COMPONENT_ADMIN_01` | Expediente Detallado Cliente (Modal/Drawer) | ADMIN | `/admin/clientes/:id` | COMPONENT | PRODUCTION_UI_REFERENCE |
| 11 | `admin/ProvidersDirectory.tsx` | `{{DATA:SCREEN:SCREEN_27}}` | Directorio & Rendimiento de Proveedores | ADMIN | `/admin/proveedores` | SCREEN | PRODUCTION_UI_REFERENCE |
| 12 | `admin/ProviderProfileView.tsx` | `{{DATA:SCREEN:SCREEN_15}}` | Expediente 360° Proveedor & Documentación | ADMIN | `/admin/proveedores/:id` | SCREEN | PRODUCTION_UI_REFERENCE |
| 13 | `admin/KycVerificationList.tsx` | `{{DATA:SCREEN:SCREEN_30}}` | Verificación de Proveedores KYC | ADMIN | `/admin/verificaciones` | SCREEN | PRODUCTION_UI_REFERENCE |
| 14 | `admin/KycReviewSplitView.tsx` | `{{DATA:SCREEN:SCREEN_5}}` | Revisión Pericial KYC & Validación Identidad | ADMIN | `/admin/verificaciones/:id` | SCREEN | PRODUCTION_UI_REFERENCE |
| 15 | `admin/FinanceOperations.tsx` | `{{DATA:SCREEN:SCREEN_28}}` | Finanzas & Retiros PIX Diarios | ADMIN | `/admin/finanzas` | SCREEN | PRODUCTION_UI_REFERENCE |
| 16 | `admin/PaymentDetailView.tsx` | `{{DATA:SCREEN:SCREEN_13}}` | Detalle de Pago & Conciliación MP | ADMIN | `/admin/finanzas/pagos/:id` | SCREEN | PRODUCTION_UI_REFERENCE |
| 17 | `admin/PayoutsListView.tsx` | `{{DATA:SCREEN:SCREEN_11}}` | Retiros de Proveedores & Liquidación PIX | ADMIN | `/admin/finanzas/retiros` | SCREEN | PRODUCTION_UI_REFERENCE |
| 18 | `admin/DisputesDirectory.tsx` | `{{DATA:SCREEN:SCREEN_29}}` | Centro de Disputas & Mediación | ADMIN | `/admin/disputas` | SCREEN | PRODUCTION_UI_REFERENCE |
| 19 | `admin/DisputeResolutionView.tsx` | `{{DATA:SCREEN:SCREEN_14}}` | Centro Evidencias & Resolución Disputa | ADMIN | `/admin/disputas/:id` | SCREEN | PRODUCTION_UI_REFERENCE |
| 20 | `admin/ScoutOperativoView.tsx` | `{{DATA:SCREEN:SCREEN_26}}` | Scout · Inteligencia Territorial Operativa | ADMIN | `/admin/scout` | SCREEN | PRODUCTION_UI_REFERENCE |
| 21 | `admin/BroadcastNotices.tsx` | `{{DATA:SCREEN:SCREEN_22}}` | Comunicaciones & Notificaciones Masivas | ADMIN | `/admin/notificaciones` | SCREEN | PRODUCTION_UI_REFERENCE |
| 22 | `super-admin/CommandCenterView.tsx` | `{{DATA:SCREEN:SCREEN_18}}` | Command Center · Misión Crítica | SUPER_ADMIN | `/super-admin/command-center` | SCREEN | PRODUCTION_UI_REFERENCE |
| 23 | `super-admin/AdminsAndRolesMatrix.tsx` | `{{DATA:SCREEN:SCREEN_25}}` | Roles, Permisos & Matriz de Operadores | SUPER_ADMIN | `/super-admin/roles-permisos` | SCREEN | PRODUCTION_UI_REFERENCE |
| 24 | `super-admin/GlobalAuditLogView.tsx` | `COMPONENT_SUPER_01` | Registro de Auditoría (Audit Trail) | SUPER_ADMIN | `/super-admin/auditoria` | COMPONENT | PRODUCTION_UI_REFERENCE |
| 25 | `super-admin/GlobalSettingsView.tsx` | `{{DATA:SCREEN:SCREEN_23}}` | Configuración General & Parámetros Sensibles | SUPER_ADMIN | `/super-admin/configuracion` | SCREEN | PRODUCTION_UI_REFERENCE |
| 26 | `super-admin/ScoutEstrategicoView.tsx` | `{{DATA:SCREEN:SCREEN_19}}` | Reportes Ejecutivos & Scout Estratégico | SUPER_ADMIN | `/super-admin/reportes` | SCREEN | PRODUCTION_UI_REFERENCE |
| 27 | `super-admin/SystemTelemetryLogs.tsx` | `{{DATA:SCREEN:SCREEN_16}}` | Logs del Sistema & Telemetría Backend | SUPER_ADMIN | `/super-admin/system-logs` | SCREEN | PRODUCTION_UI_REFERENCE |
| 28 | `docs/NAVIGATION_ROUTING_MATRIX.md` | `DOC_NAV_01` | Matriz de Rutas, Entry/Exit Actions & CTAs | SHARED | `N/A` | DOCUMENT | PRODUCTION_UI_REFERENCE |
| 29 | `docs/SERVICE_STATE_UX_MATRIX.md` | `DOC_STATE_01` | Matriz Tripartita Cliente ↔ Proveedor ↔ Admin | SHARED | `N/A` | DOCUMENT | PRODUCTION_UI_REFERENCE |
| 30 | `docs/DESIGN_SYSTEM_TOKENS.md` | `DOC_DS_01` | Design System Tokens & Component Guide | SHARED | `N/A` | DOCUMENT | PRODUCTION_UI_REFERENCE |
| 31 | `docs/ENGINEERING_HANDOFF.md` | `DOC_ENG_01` | Guía de Handoff Técnico, RBAC & DevOps | SHARED | `N/A` | DOCUMENT | PRODUCTION_UI_REFERENCE |
| 32 | `docs/EXPORT_MANIFEST.md` | `DOC_MAN_01` | Manifiesto Oficial de Conformidad y Checksum | SHARED | `N/A` | DOCUMENT | PRODUCTION_UI_REFERENCE |
| 33 | `assets/logo.svg` | `{{DATA:IMAGE:IMAGE_36}}` | Logotipo Vectorial Oficial UGO Admin | SHARED | `N/A` | ASSET | PRODUCTION_UI_REFERENCE |
| 34 | `assets/avatar-supervisor.png` | `{{DATA:IMAGE:IMAGE_37}}` | Avatar Oficial Mateo Silva (SUPER_ADMIN) | SHARED | `N/A` | ASSET | PRODUCTION_UI_REFERENCE |
| 35 | `assets/architecture-master.png` | `{{DATA:IMAGE:IMAGE_8}}` | Diagrama Arquitectura & CI/CD Maestro | SHARED | `N/A` | ASSET | PRODUCTION_UI_REFERENCE |

---

## 2. NAVIGATION & ROUTING MATRIX (ZERO BROKEN LINKS · ZERO ORPHAN SCREENS)

| PANTALLA | RUTA | ROL | ENTRY ACTION | EXIT ACTION | NEXT SCREEN | BACK DESTINATION |
|:---|:---|:---:|:---|:---|:---|:---|
| **Acceso Administrativo & MFA** | `/login` | SHARED | Form submit + OTP | Auth verify | `/admin/dashboard` o `/super-admin/command-center` | N/A (Root) |
| **Dashboard Ejecutivo** | `/admin/dashboard` | ADMIN | Click sidebar / Post login | Click alert CTA / metric | `/admin/verificaciones`, `/admin/disputas`, `/admin/finanzas` | N/A |
| **Operaciones en Tiempo Real** | `/admin/operaciones` | ADMIN | Click sidebar | Click Pin / Feed item | `/admin/servicios/:id` | `/admin/dashboard` |
| **Servicios Directorio** | `/admin/servicios` | ADMIN | Click sidebar | Click fila tabla | `/admin/servicios/:id` | `/admin/dashboard` |
| **Detalle de Servicio** | `/admin/servicios/:id` | ADMIN | Click ID servicio | Auditar ampliación / pago | `/admin/finanzas/pagos/:id` o `/admin/proveedores/:id` | `/admin/servicios` |
| **Clientes Directorio** | `/admin/clientes` | ADMIN | Click sidebar | Click ver cliente | `/admin/clientes/:id` | `/admin/dashboard` |
| **Proveedores Directorio** | `/admin/proveedores` | ADMIN | Click sidebar | Click ver proveedor | `/admin/proveedores/:id` | `/admin/dashboard` |
| **Expediente 360° Proveedor** | `/admin/proveedores/:id` | ADMIN | Click fila proveedor | Auditar KYC / saldo | `/admin/verificaciones/:id` | `/admin/proveedores` |
| **Verificaciones KYC** | `/admin/verificaciones` | ADMIN | Click sidebar | Click "Revisar" | `/admin/verificaciones/:id` | `/admin/dashboard` |
| **Revisión Pericial KYC** | `/admin/verificaciones/:id` | ADMIN | Click item cola KYC | Dictaminar (Aprobar/Rechazar) | `/admin/verificaciones` (Toast) | `/admin/verificaciones` |
| **Finanzas Operativas** | `/admin/finanzas` | ADMIN | Click sidebar | Click ver pago / retiros | `/admin/finanzas/pagos/:id`, `/admin/finanzas/retiros` | `/admin/dashboard` |
| **Detalle de Pago** | `/admin/finanzas/pagos/:id` | ADMIN | Click fila pago | Conciliar / ver orden | `/admin/servicios/:id` | `/admin/finanzas` |
| **Liquidación Retiros PIX** | `/admin/finanzas/retiros` | ADMIN | Click tab retiros | Aprobar lote PIX | `/admin/finanzas` (Modal feedback) | `/admin/finanzas` |
| **Disputas Directorio** | `/admin/disputas` | ADMIN | Click sidebar | Click abrir caso | `/admin/disputas/:id` | `/admin/dashboard` |
| **Resolución de Disputa** | `/admin/disputas/:id` | ADMIN | Click fila disputa | Emitir laudo asistido | `/admin/disputas` (Audit logged) | `/admin/disputas` |
| **Scout Operativo** | `/admin/scout` | ADMIN | Click sidebar | Click CTA "Activar campaña" | `/admin/notificaciones` o `/admin/zonas-categorias` | `/admin/dashboard` |
| **Notificaciones Masivas** | `/admin/notificaciones` | ADMIN | Click sidebar | Enviar broadcast | `/admin/notificaciones` (Feed enviado) | `/admin/dashboard` |
| **Zonas & Categorías** | `/admin/zonas-categorias` | SHARED | Click sidebar | Guardar reglas / pausar zona | `/admin/zonas-categorias` (Toast) | `/admin/dashboard` |
| **Command Center** | `/super-admin/command-center` | SUPER_ADMIN | Click switch rol / login | Click alerta global | `/super-admin/system-logs`, `/super-admin/configuracion` | N/A |
| **Roles & Permisos Matrix** | `/super-admin/roles-permisos` | SUPER_ADMIN | Click sidebar | Modificar permisos operador | `/super-admin/auditoria` | `/super-admin/command-center` |
| **Configuración General** | `/super-admin/configuracion` | SUPER_ADMIN | Click sidebar | Rotar credencial / cambiar take | `/super-admin/configuracion` (Reason required) | `/super-admin/command-center` |
| **Scout Estratégico** | `/super-admin/reportes` | SUPER_ADMIN | Click sidebar | Abrir análisis de cohorte | `/super-admin/reportes` | `/super-admin/command-center` |
| **Logs del Sistema** | `/super-admin/system-logs` | SUPER_ADMIN | Click sidebar | Inspeccionar error webhook | `/super-admin/system-logs` (Modal inspector) | `/super-admin/command-center` |
| **Hugo Copilot Drawer** | `GLOBAL DRAWER` | SHARED | Click botón cyan persistente | Ejecutar comando sugerido | Navegación contextual a pantalla target | Cierra Drawer |

---

## 3. TRIPARTITE SERVICE STATE UX MATRIX (CLIENT ↔ PROVIDER ↔ ADMIN)

| SERVICE STATE | CLIENT VIEW | PROVIDER VIEW | ADMIN VIEW | AVAILABLE ACTIONS (ADMIN) | TRIGGER EVENT | NEXT STATE |
|:---|:---|:---|:---|:---|:---|:---|
| **REQUESTED** | Pantalla buscando técnico con radar | Notificación push de oportunidad entrante | Fila amarilla en `/admin/servicios` | Cancelar por inactividad, reasignar zona manual | Cliente confirma solicitud en app | `MATCHING` |
| **MATCHING** | "Localizando al mejor profesional..." | Contador de 45s para aceptar trabajo | Card en feed de `/admin/operaciones` | Forzar despacho manual (`/despachar`) | Proveedor acepta en app | `ACCEPTED` / `CONFIRMED` |
| **QUOTED** | Resumen de presupuesto y método PIX/Tarjeta | Desglose de mano de obra y materiales | Inspección de cotización en `/admin/servicios/:id` | Validar dispersión o desvío de tarifa | Cliente aprueba presupuesto | `ACCEPTED` |
| **ACCEPTED** | "Servicio confirmado. Profesional asignado" | Datos de contacto y dirección del cliente | Badge `CONFIRMADO` · Pago retenido en UGO | Contactar cliente/técnico, reasignar | Técnico presiona "Iniciar viaje" | `IN_ROUTE` |
| **IN_ROUTE** | Mapa con ubicación del técnico en tiempo real | Ruta en Waze/Google Maps hacia domicilio | Pin activo con vector en mapa Florianópolis | Monitorear desvío GPS, contactar | Técnico arriba al punto georreferenciado | `ARRIVED` |
| **ARRIVED** | "Tu profesional llegó al domicilio" | Botón "Iniciar servicio" habilitado por GPS | Timestamp verificado en Timeline | Auditar tolerancia perimetral (+14m) | Técnico pulsa "Iniciar trabajo" | `IN_PROGRESS` |
| **IN_PROGRESS** | Temporizador de servicio activo en app | Temporizador y botón "Solicitar ampliación" | Badge verde `EN PROGRESO` con métricas | Pausar por incidente, intermediar | Técnico solicita tarea adicional (+R$ 60) | `EXTENSION_REQUESTED` |
| **EXTENSION_REQUESTED** | Modal de aprobación con foto y costo extra | "Esperando autorización del cliente (+R$ 60)" | Panel "Ampliaciones" en `/admin/servicios/:id` | Observar solicitud (Admin NO sustituye al cliente) | Cliente pulsa "Aprobar ampliación" | `EXTENSION_APPROVED` |
| **EXTENSION_APPROVED** | Total actualizado (R$ 180 + R$ 60 = R$ 240) | "+R$ 60 agregados a tu saldo garantizado" | Timeline auditada con desglose transparente | Auditar cobro complementario Mercado Pago | Cliente o técnico rechaza ampliación | `EXTENSION_REJECTED` |
| **EXTENSION_REJECTED** | "Ampliación rechazada. Manteniendo tarifa base"| Notificación: Continuar únicamente trabajo base | Log registrado en historial del servicio | Mediación en caso de que técnico decline | Técnico finaliza labor y carga foto de cierre | `COMPLETION_PENDING` |
| **COMPLETION_PENDING** | "Revisá el trabajo y confirmá finalización" | "Esperando confirmación final del cliente" | Alerta en `/admin/dashboard` si excede SLA | Llamado de cortesía para destrabar | Cliente pulsa "Todo perfecto" o pasan 24h | `COMPLETED` |
| **COMPLETED** | Calificación (1-5 estrellas) y recibo oficial | Saldo acreditado a "Disponible para retiro" | Badge `COMPLETADO` · Fondos listos para dispersión | Auditar liquidación de Take Rate (15%) | Cliente o técnico abre reclamo formal | `DISPUTED` |
| **CANCELLED** | Motivo de cancelación y reembolso aplicado | Penalidad o compensación según tiempo transcurrido | Trazabilidad en Audit Log con motivo | Eximir penalidad, ordenar reembolso | Mediación no resuelta por acuerdo directo | `DISPUTED` |
| **DISPUTED** | Chat de soporte y subida de fotos de reclamo | Carga de contra-evidencias y descargo | Expediente en `/admin/disputas/:id` con laudo | Emitir laudo asistido con motivo obligatorio | Admin confirma resolución con firma de sesión | `RESOLVED` / `COMPLETED` |

---

## 4. DESIGN TOKENS & SYSTEM CONTRACTS

```text
--ugo-primary: #059669 (Emerald Base UGO)
--ugo-primary-hover: #047857
--ugo-primary-light: #ecfdf5
--ugo-copilot-cyan: #0891b2 (Hugo Assistant)
--ugo-copilot-light: #ecfeff
--ugo-warning-amber: #d97706
--ugo-danger-rose: #e11d48
--ugo-surface-bg: #f8fafc (Light Slate Slate-50)
--ugo-surface-card: #ffffff (Radius: 12px-16px, Border: #e2e8f0)
--ugo-text-primary: #0f172a
--ugo-text-secondary: #475569
--ugo-font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
--ugo-touch-target: 48px min
```

---

## 5. VERIFICACIÓN FINAL Y AUDITORÍA DE ARCHIVOS FÍSICOS

1. **Claims Prohibidos Verificados (Zero Remaining):**
   - No hay menciones no verificadas de `Smart Escrow`, `Custodia Cripto`, `BACEN SPI Direct`, `ISPB`, `mTLS`, `SUSEP`, `AWS`, `Redis`, `WebSocket custom`, `Blockchain`, `Forense`, `Biometría Oficial SERPRO`.
2. **Métricas Ficticias Rotuladas:**
   - Todas las métricas mock de GMV, Take Rate y conversiones cuentan con el tag visible **`[DEMO DATA]`**.
3. **Navegación Completa:**
   - Todos los botones, CTAs, selectores y enlaces tienen definida su ruta de ida y regreso sin loops muertos.
4. **Roles Segregados:**
   - Supervisores operativos aislados en `/admin/*`; gobernanza crítica aislada en `/super-admin/*`.
