# UGO Penpot Implementation Matrix

Fuente visual de verdad: Penpot `ugo`.
Fuente funcional de verdad: código existente (Supabase/RLS/Realtime/auth/pagos/matching).

## Resumen
| Categoría | Total | DONE | PARTIAL | TODO |
|---|---:|---:|---:|---:|
| SHARED / DESIGN SYSTEM | 1 | 0 | 1 | 0 |
| PROVEEDOR | 22 | 0 | 22 | 0 |
| CLIENTE | 1 | 0 | 1 | 0 |
| ADMIN | 2 | 0 | 0 | 2 |
| WEB / DESIGN SYSTEM | 50 | 0 | 32 | 18 |
| LANDING | 14 | 0 | 14 | 0 |
| **Total** | **90** | **0** | **70** | **20** |

## Estado actual de la Fase 1 (SHARED + PROVIDER AUTH/ONBOARDING/HOME)
- Capa shared de design system creada: `src/mvp/ugo-design-system.css`
- Auth Provider rediseñado a 390×844 Penpot mobile: `src/mvp/shared.tsx` (AuthScreen)
- Onboarding Provider mapeado a `src/mvp/ProviderOnboardingGate.tsx` (funcional intacta)
- Home Provider con estados loading/error/online/offline: `src/mvp/ProviderHomeStructural.tsx` + `src/mvp/ProviderApp.tsx`

## Próximo lote
1. Provider Onboarding completo (13 boards PARTIAL → DONE)
2. Provider Home completo (13 boards PARTIAL → DONE)
3. Provider Auth/Recuperación (restantes boards AUTH)
4. Provider Verificación / Cuenta states
5. Provider Ofertas / Detalle / Aceptar/Rechazar
6. Provider Servicio activo / Navegación / Evidencias
7. Provider Historial / Retiros / Perfil
8. Provider Permisos / Empty / Error states

## Cliente — mapeo funcional pendiente de contraste Penpot

`P1-001` queda en `PARTIAL`. El board del tracker agrupa el flujo Cliente que ya se distribuye entre:

- `ClientOnboardingGate.tsx`: bienvenida, iniciar sesión, crear cuenta y perfil inicial.
- `ClientQuantumExperience.tsx` y `ClientApp.tsx`: home, búsqueda, categorías, selección de proveedor, solicitud, sin proveedores y servicio activo con Realtime.
- `ClientQuickOrder.tsx`: solicitud guiada; `ServiceHistoryPanel.tsx`, pago existente y perfil cubren historial, pago y preferencias.
- `LoadingScreen` y avisos de `ClientApp.tsx`: loading, vacío y error.

No se marca `DONE`: aún falta contrastar el board con Penpot y validar los estados autenticados usando datos reales, sin crear pedidos ni pagos de prueba.

Validación local de este lote: Playwright comprobó login, registro y el error de rol real a 390×844 y 1366×768. No hubo scroll horizontal ni overlay de Vite. La única advertencia fue la meta `apple-mobile-web-app-capable` deprecada, sin error de ejecución.

## UGO Web — 50 boards raíz Penpot (primer lote)

`P1-025` fue sustituido por los 50 boards raíz individuales de la página `UGO Web` en `penpot_rows.json`; deja de representar el alcance Web. Clasificación: Design System (1), Cliente Desktop (14), Cliente Responsive (3), Cliente Acceso/Auth (7), Provider Desktop (13), Provider Responsive (3) y Provider Acceso/Auth (9).

Los seis lotes iniciales están en `PARTIAL`: Design System, Cliente Web completo (14 Desktop, 3 Responsive y 7 Auth) y Provider Desktop — Onboarding, Verificación, Home, Ofertas, Servicio aceptado, Servicio activo y Evidencia final. Provider se expone visualmente mediante `?app=web&role=provider&providerScreen=...`; el flujo funcional existente continúa en `?app=provider`.

## Landing — boards reales Penpot (2026-09-09)

La consulta dirigida a la página `UGO Landing` devolvió estos 14 boards raíz. Todos están `PARTIAL`: implementados y validados como lote, pendientes de contraste visual fino antes de `DONE`.

| Board | Penpot ID | Tamaño |
|---|---|---:|
| Responsive / 768 | `00f45a67-eb06-809d-8008-9b367b0be415` | 768×760 |
| Responsive / 390 | `00f45a67-eb06-809d-8008-9b367d5acc3c` | 390×844 |
| Home | `00f45a67-eb06-809d-8008-9b39a3c91b66` | 1440×960 |
| Cómo funciona | `00f45a67-eb06-809d-8008-9b3bba114e56` | 1440×960 |
| Servicios | `00f45a67-eb06-809d-8008-9b3bbba123b8` | 1440×960 |
| Para proveedores | `00f45a67-eb06-809d-8008-9b3bbc7a42c6` | 1440×960 |
| Seguridad y confianza | `00f45a67-eb06-809d-8008-9b3bbdc501a8` | 1440×960 |
| FAQ | `00f45a67-eb06-809d-8008-9b3bbf293152` | 1440×960 |
| Contacto | `00f45a67-eb06-809d-8008-9b3bbfb8b57b` | 1440×960 |
| Términos | `00f45a67-eb06-809d-8008-9b3bc033e326` | 1440×960 |
| Privacidad | `00f45a67-eb06-809d-8008-9b3bc0d4b7fc` | 1440×960 |
| Acceso | `00f45a67-eb06-809d-8008-9b3bc1658331` | 1440×960 |
| Crear cuenta | `00f45a67-eb06-809d-8008-9b3bc3f8401a` | 1440×960 |
| Responsive / 1024 | `00f45a67-eb06-809d-8008-9b3bc4d7be55` | 1024×760 |

## Descubrimiento dirigido pendiente de detalle

- `UGO Web`: los 50 boards raíz están detallados individualmente en `penpot_rows.json`. Los 44 aún `TODO` quedan fuera de este primer lote.
- `UGO Admin Panel`: 34 boards raíz reales encontrados, incluido `UGO Admin / Super Admin` (`00f45a67-eb06-809d-8008-9b2d97330100`). La fila agregada de Admin no representa ese conjunto y se mantiene `TODO` mientras se expande por board.
- El export de `UGO Landing / Home` devolvió texto colapsado en la imagen. No se implementó código visual con una referencia dañada; Landing, Admin y Super Admin quedan bloqueados de implementación visual, no de descubrimiento.

## Archivos raw
`docs/penpot_rows.json` contiene los 90 boards rastreados con id, tamaño, posición y estado actual.

## Lote operativo Provider — intento de validación (2026-09-09)

Boards rastreados: `P1-009` a `P1-018` (ofertas, detalle y decisión, navegación/llegada, servicio activo, evidencias, Hugo, historial y perfil).

- El conector de Penpot devolvió HTTP 504 tanto para la consulta acotada de boards como para la lectura mínima de páginas. No se enviaron más consultas.
- Playwright verificó el shell local de Provider a 390×844 y en el viewport desktop 1366×768: renderiza dentro de 390×844, no tiene scroll horizontal ni overlay de error de Vite.
- Los estados operativos requieren las ofertas, servicios y evidencias reales de una sesión autenticada. No se fabricaron datos ni se modificó Supabase; por ello estos boards continúan en `PARTIAL` hasta poder leer Penpot y validarlos autenticado.
