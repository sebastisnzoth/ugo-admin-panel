# UGO Cliente · Handoff de UI/UX & Guía de Integración React + Vite + Supabase

Este documento define la arquitectura integral del frontend, el catálogo de componentes modulares, el contrato de props e interfaces TypeScript, y el mapeo exacto de pantallas para integrar en la aplicación existente de **UGO** alojada en GitHub.

---

## 1. Stack Tecnológico de Destino

- **Framework / Runtime:** React 18/19 + TypeScript + Vite
- **Backend / Auth:** Supabase (PostgreSQL, Realtime subscriptions, Storage, Auth) — *Sin backend ficticio ni duplicado*
- **Diseño & Estilos:** Tailwind CSS con tokens semánticos oficiales de UGO
- **Form Factor:** Mobile-first (Viewport base `390 × 844 px`, adaptable entre `360 px` y `430 px`, Safe Areas iOS/Android)
- **Touch Targets:** Mínimo de `48 × 48 px` en todos los elementos interactivos

---

## 2. Design System: Urban Kinetic (Tokens Oficiales)

```css
:root {
  /* Marca Primaria y Secundaria */
  --ugo-primary: #006948;        /* Verde Esmeralda Urbano */
  --ugo-primary-hover: #005238;
  --ugo-secondary: #00687A;      /* Azul Petróleo / Teal */
  --ugo-secondary-hover: #005362;
  
  /* Hugo IA (Copiloto Contextual) */
  --ugo-hugo-cyan: #57DFFE;      /* Cyan Eléctrico / Copiloto */
  --ugo-hugo-surface: #E6FAFF;   /* Fondo tenue para intervenciones Hugo */
  --ugo-hugo-border: #99EEFD;    /* Borde distintivo */

  /* Neutros y Superficies */
  --ugo-bg: #F8FBF9;             /* Fondo general */
  --ugo-card: #FFFFFF;           /* Superficies elevadas */
  --ugo-border: #E2E8F0;         /* Líneas divisorias */
  --ugo-text-main: #0F172A;      /* Títulos y textos principales */
  --ugo-text-muted: #64748B;     /* Subtítulos y metadatos */
  --ugo-text-inverse: #FFFFFF;

  /* Semántica y Estados */
  --ugo-success: #16A34A;
  --ugo-warning: #D97706;
  --ugo-error: #DC2626;
  --ugo-info: #0284C7;

  /* Safe Area Mobile */
  --sab: env(safe-area-inset-bottom, 20px);
  --sat: env(safe-area-inset-top, 44px);
}
```

---

## 3. Catálogo de Componentes Reutilizables (React / TSX)

Los componentes están estructurados para recibir datos directos de tablas de Supabase (`profiles`, `service_requests`, `providers`, `escrow_transactions`, `messages`):

1. **`AppHeader`**: Cabecera móvil con selector de dirección, botón Hugo IA contextual y badge de notificaciones.
2. **`BottomNavigation`**: Barra inferior de 4 destinos fijos (`Inicio`, `Servicios`, `Actividad`, `Perfil`) con soporte de Safe Area y badge en vivo.
3. **`SearchBar`**: Input de búsqueda con disparador de categorías y comandos rápidos por voz o IA.
4. **`PrimaryButton` & `SecondaryButton`**: Altura mínima de 48px, estados `loading` con spinner, variantes con iconos y disabled state.
5. **`IconButton`**: Botón táctil circular o redondeado de 48x48px para acciones rápidas en mapa y cards.
6. **`CategoryCard`**: Acceso directo por especialidad (Electricidad, Plomería, Climatización, Cerrajería) con arancel de referencia.
7. **`ProviderCard`**: Tarjeta de prestador matriculado con avatar, score, badge CREA/CFT, ETA y tarifas.
8. **`ProviderMarker`**: Pin interactivo sobre el mapa (Leaflet/MapLibre) con pulso de disponibilidad y categoría.
9. **`StatusBadge`**: Pill semántico (`En camino`, `En curso`, `Ampliación pendiente`, `Concluido`, `Disputa`).
10. **`BottomSheet`**: Hoja inferior deslizable con estados de altura (`collapsed`, `half`, `expanded`) para interactuar sobre el mapa (estilo Uber).
11. **`Modal`**: Diálogo accesible para confirmaciones críticas, autorizaciones de pago y liberación de PIN.
12. **`Toast`**: Mensajes de feedback no intrusivos (`Éxito`, `Error`, `Sin conexión`).
13. **`StateViews` (`LoadingState`, `EmptyState`, `ErrorState`, `SuccessState`)**: Vistas estándar para gestionar asincronía y fallos sin romper el layout.
14. **`HugoAssistant`**: Burbuja o banner copiloto en color cyan (#57DFFE) para diagnóstico predictivo, explicación de aranceles y soporte.
15. **`ServiceTimeline`**: Bitácora visual de hitos de la orden con timestamp y sellos de verificación.
16. **`PaymentSummary`**: Desglose financiero claro (Mano de obra, tareas adicionales, protección UGO Shield).
17. **`UGOShield`**: Componente de garantía, cobertura y mediación sin dependencias externas.

---

## 4. Mapa del Flujo de Pantallas (Mobile-First)

| Código | Pantalla | Descripción y Estados Clave |
|---|---|---|
| **P-01** | `UGO Cliente / Home · Radar` | Mapa interactivo, proveedores en tiempo real, bottom sheet desplegable, copiloto Hugo IA |
| **P-02** | `UGO Cliente / Solicitud · Descripción & Hugo IA` | Diagnóstico asistido, fotos de la falla, transcripción y selección de urgencia |
| **P-03** | `UGO Cliente / Matching · Buscando Profesional` | Radar de búsqueda algorítmica, tiempo estimado, cancelar solicitud |
| **P-04** | `UGO Cliente / Profesional · Encontrado & Perfil` | Datos del técnico CREA, rating, antecedentes, tarifas y botón contratar |
| **P-05** | `UGO Cliente / Tracking · En camino` | Telemetría GPS en tiempo real sobre mapa, ETA, llamada segura y chat |
| **P-06** | `UGO Cliente / Servicio · En curso & Cronómetro` | Cronómetro en vivo, bitácora de tareas, botón de soporte y reporte de avance |
| **P-07** | `UGO Cliente / Servicio · Ampliación Solicitada` | Modal/Sheet con tarea adicional, desglose financiero, aceptación o rechazo |
| **P-08** | `UGO Cliente / Finalización · PIN & Calificación` | Liberación de PIN de 4 dígitos, activación de seguro Tokio Marine, rating y propina |
| **P-09** | `UGO Cliente / Actividad · Historial de Servicios` | Lista cronológica, estados (completado, en curso, cancelado), comprobantes PDF |
| **P-10** | `UGO Cliente / UGO Shield · Garantía & Mediación` | Cobertura activa, reporte de anomalías, mediación y carga de evidencias |
| **P-11** | `UGO Cliente / Estados · Vacío, Error & Offline` | Gestión de conectividad desactivada, radar sin técnicos y errores de pago |

---

## 5. Reglas de Integración con Supabase

- **Autenticación:** Utilizar `supabase.auth.getUser()` y flujos de sesión existentes.
- **Consultas Realtime:** Subscripción a cambios en `service_requests` (`status = 'EN_ROUTE'`, `'IN_PROGRESS'`, `'COMPLETED'`) para actualizar el `ServiceTimeline` y la telemetría del mapa sin recargar la página.
- **Storage:** Subida directa de imágenes y fotos de diagnósticos al bucket `service-evidence` existente.