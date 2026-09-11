# Inventario de Penpot — UGO

Fecha de inventario: 2026-09-09  
Fuente: archivo Penpot conectado mediante MCP y el rastreo local existente en `docs/penpot_rows.json`.

Archivo enlazado por el usuario: `40e06342-8830-80d6-8008-9acb96612f91`.  
Página enlazada por el usuario: `40e06342-8830-80d6-8008-9acb96612f92`.

## Estado de la extracción

La sesión MCP se usó en modo de solo lectura. La consulta mínima de páginas/página activa, su reintento después de recibir el enlace, y una exportación PNG directa de `UGO Landing / Home` devolvieron HTTP 504. Por ello, no fue posible confirmar la página activa actual, recorrer el árbol en vivo ni descargar binarios durante esta ejecución.

No se realizaron cambios en Penpot. No se cambió `src/`, no se hizo commit ni push.

`design/penpot-assets/` está preparado, pero no contiene assets exportados: no se incluyeron sustitutos, placeholders ni copias de las capturas locales para evitar atribuirles falsamente una exportación desde Penpot.

## Páginas y frames detectados

El rastreo local de Penpot contiene 90 boards raíz distribuidos así:

| Página | Frames raíz detectados | Cobertura |
|---|---:|---|
| `Page 1` | 28 | Cliente mobile, Provider mobile, Admin/Super Admin y shared design system |
| `UGO Web` | 50 | Design system, Cliente, Provider, responsive y acceso/auth |
| `UGO Landing` | 14 | Landing desktop y responsive |
| `UGO Admin Panel` | 34 | Detectados previamente; falta su listado por frame en el JSON actual |

### UGO Landing (14 boards con ID y tamaño)

| Frame | Penpot ID | Tamaño | React actual |
|---|---|---:|---|
| Responsive / 768 | `00f45a67-eb06-809d-8008-9b367b0be415` | 768×760 | `src/mvp/UgoLanding.tsx` |
| Responsive / 390 | `00f45a67-eb06-809d-8008-9b367d5acc3c` | 390×844 | `src/mvp/UgoLanding.tsx` |
| Home | `00f45a67-eb06-809d-8008-9b39a3c91b66` | 1440×960 | `src/mvp/UgoLanding.tsx` |
| Cómo funciona | `00f45a67-eb06-809d-8008-9b3bba114e56` | 1440×960 | `src/mvp/UgoLanding.tsx` |
| Servicios | `00f45a67-eb06-809d-8008-9b3bbba123b8` | 1440×960 | `src/mvp/UgoLanding.tsx` |
| Para proveedores | `00f45a67-eb06-809d-8008-9b3bbc7a42c6` | 1440×960 | `src/mvp/UgoLanding.tsx` |
| Seguridad y confianza | `00f45a67-eb06-809d-8008-9b3bbdc501a8` | 1440×960 | `src/mvp/UgoLanding.tsx` |
| FAQ | `00f45a67-eb06-809d-8008-9b3bbf293152` | 1440×960 | `src/mvp/UgoLanding.tsx` |
| Contacto | `00f45a67-eb06-809d-8008-9b3bbfb8b57b` | 1440×960 | `src/mvp/UgoLanding.tsx` |
| Términos | `00f45a67-eb06-809d-8008-9b3bc033e326` | 1440×960 | `src/mvp/UgoLanding.tsx` |
| Privacidad | `00f45a67-eb06-809d-8008-9b3bc0d4b7fc` | 1440×960 | `src/mvp/UgoLanding.tsx` |
| Acceso | `00f45a67-eb06-809d-8008-9b3bc1658331` | 1440×960 | `src/mvp/UgoLanding.tsx` |
| Crear cuenta | `00f45a67-eb06-809d-8008-9b3bc3f8401a` | 1440×960 | `src/mvp/UgoLanding.tsx` |
| Responsive / 1024 | `00f45a67-eb06-809d-8008-9b3bc4d7be55` | 1024×760 | `src/mvp/ugo-landing-responsive.css` |

### UGO Web (50 boards)

Los IDs, dimensiones y posiciones de los 50 boards están preservados en `docs/penpot_rows.json`. Mapeo de alto nivel:

| Grupo de frames | Cantidad | Componentes React actuales |
|---|---:|---|
| Design system | 1 | `src/mvp/UgoWeb.tsx`, `src/mvp/ugo-web.css` |
| Cliente desktop: Radar, resultados, perfil, solicitud, búsqueda, asignado, activo, finalización, pago, recibo, calificación, historial, perfil y estados | 14 | `src/mvp/UgoWeb.tsx`; `ugo-web.css`, `ugo-web-batch2.css`, `ugo-web-batch3.css` |
| Provider desktop: onboarding, verificación, home, ofertas, servicio, evidencia, cobros, retiros, historial, perfil, portfolio y permisos | 13 | `src/mvp/UgoWeb.tsx`; `ugo-web-provider.css`, `ugo-web-provider-batch2.css` |
| Cliente responsive 1024/768/390 | 3 | `src/mvp/UgoWeb.tsx`, `src/mvp/ugo-web-responsive.css` |
| Provider responsive 1024/768/390 | 3 | `src/mvp/ProviderApp.tsx` |
| Cliente acceso/auth | 7 | `src/mvp/UgoWeb.tsx`, `src/mvp/ugo-web-auth.css` |
| Provider acceso/auth | 9 | `src/mvp/shared.tsx`, `src/mvp/ProviderOnboardingGate.tsx` |

### Page 1: mobile, shared y admin

| Frames / flujo | Componentes React actuales |
|---|---|
| Cliente mobile | `ClientOnboardingGate.tsx`, `ClientApp.tsx`, `ClientQuantumExperience.tsx`, `ClientQuickOrder.tsx` |
| Provider auth, registro y onboarding | `shared.tsx` (`AuthScreen`), `ProviderOnboardingGate.tsx` |
| Provider home, estado online/offline, demandas, ofertas, navegación y perfil | `ProviderApp.tsx`, `ProviderHomeStructural.tsx` |
| Servicio activo y evidencia | `ProviderActiveMap.tsx`, `ProviderEvidencePanel.tsx` |
| Hugo, historial, disputas, avisos, permisos y notificaciones | `VoiceHugoDock.tsx`, `ServiceHistoryPanel.tsx`, `DisputeDock.tsx`, `AppLocationButton.tsx`, `NotificationCenter.tsx` |
| Admin y Super Admin | `AdminGate.tsx` y paneles `Admin*.tsx` |
| Shared / Design System | `ugo-design-system.css` |

## Componentes, estilos y tokens reutilizables

La enumeración de componentes principales, instancias, variantes, estilos de biblioteca y tokens de Penpot requiere una respuesta de `execute_code`; quedó pendiente por el 504. Como referencia de integración ya codificada (no como confirmación en vivo de Penpot), el design system local usa:

| Área | Valores actuales en código |
|---|---|
| Tipografías | `Inter Tight` (mobile/provider); `Source Sans Pro` (web/landing), con fallbacks del sistema |
| Verde principal | `#087F5B` (DS provider) y `#159A63` (web/landing) |
| Tinta | `#0F1714`, `#17211F`, `#12322C` |
| Neutros | `#F3F5F3`, `#F5F7F6`, `#FFFFFF`, `#E2E8E4`, `#66736F` |
| Acentos/estado | `#16B7D0`/`#12B7CF` (Hugo/mapa), `#B42318` (error), `#B54708` (warning) |
| Radios | 10, 12, 14, 20, 24 y 28 px; píldora `999px` |
| Componentes codificados | botones primary/secondary, field, card, badge, navegación superior, cards de persona/proveedor, mapa/radar y dock de Hugo |

## Iconos, logos, vectores e imágenes

Estado: pendiente de lectura y exportación desde Penpot.

- SVG requeridos: logo UGO, iconografía de navegación/servicio, pin de mapa, vectores y componentes SVG crudos.
- PNG requeridos: imágenes usadas como fills, fotografía/evidencia y previews que sean parte del producto.
- No se pudo listar ni exportar ninguno por la indisponibilidad temporal del MCP; por tanto el directorio no reporta exportaciones falsas.

## Qué falta revisar cuando el MCP responda

1. Confirmar la página activa y obtener el árbol de cada página a profundidad suficiente.
2. Inventariar componentes de la biblioteca local/conectada, variantes e instancias.
3. Extraer colores, tipografías y tokens desde la biblioteca de Penpot, distinguiendo valores nombrados de valores ad hoc.
4. Identificar cada icono/vector e imagen por shape ID y exportar SVG/PNG a `design/penpot-assets/` con nombres estables.
5. Enumerar los 34 boards de `UGO Admin Panel` y asociarlos con los paneles `Admin*.tsx` correspondientes.
6. Contrastar visualmente cada frame con su componente React; los mapeos anteriores reflejan el tracker local y siguen siendo `PARTIAL` hasta la comparación en vivo.

## Referencias locales

- `docs/penpot_rows.json`: IDs, nombres, posiciones, dimensiones y mapeos históricos de 90 boards.
- `docs/penpot-implementation-matrix.md`: alcance, estado y notas de validación anteriores.
- `src/mvp/ugo-design-system.css`: tokens CSS existentes usados como referencia de implementación, no como sustituto de la extracción de Penpot.
