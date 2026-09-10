# UGO Cliente · Stitch Web reference

Source reviewed: `stitch_ugo_client_web_app.zip`.

## What the export contains

The export contains 27 visual assets/screens, including the complete client web journey: Home, Home UX Cleanup, Buscar servicio, Nueva solicitud, Matching en vivo, Profesional seleccionado, Servicio en camino, Chat en vivo, Llegada al domicilio, Servicio en ejecución, Ampliar servicio, Contratación con saldo, Recarga de billetera, Comprobante fiduciario, Pagos, Actividad, Perfil, Configuración, Ayuda, UGO Shield and final service/review views.

The generated HTML is kept as design/reference material, not copied wholesale into the production React application.

## Design system extracted from Stitch

Design name: **Kinetic Trust**.

Core intent:
- modern high-trust marketplace
- operational clarity
- real-time map context
- trust/security surfaced as product UI
- responsive web shell with sidebar + topbar + main canvas

Primary tokens:
- primary cyan: `#00B4D8`
- primary dark cyan: `#00677D`
- deep navy: `#0F172A`
- fresh emerald: `#10B981`
- background: `#F8FAFC`
- surface: `#FFFFFF`
- border: `#E2E8F0`
- muted text: `#64748B`
- danger: `#BA1A1A`

Typography:
- Plus Jakarta Sans
- display 40/48
- headline 28/36, 22/30, 18/26
- body 16/24, 14/20, 12/16

Shape system:
- cards: 16–24px radius
- controls: 12px radius
- pills/avatars: full radius

Responsive shell:
- desktop >=1280: persistent sidebar, map/content split
- tablet 768–1279: collapsed sidebar
- mobile <768: off-canvas navigation and bottom-sheet flows

## Integration rule

UGO keeps its real React/Supabase/routing/payment logic. Stitch is used to drive visual hierarchy, responsive layout, component styling and UX states. Do not iframe or paste the generated HTML as the application.

## Screen mapping to UGO

- Home / Home UX Cleanup → `ClientQuantumExperience` and client shell
- Buscar servicio / Nueva solicitud → existing client request flow
- Matching en vivo → provider radar/matching state
- Profesional seleccionado → provider card/detail state
- Servicio en camino / llegada → active map + tracking
- Chat en vivo → client/provider conversation surface
- Servicio en ejecución → active-service state and timeline
- Ampliar servicio → in-service change request
- Contratar con saldo / Pagos / Recarga → payment and wallet layer
- Actividad → service history
- Perfil / Configuración → client account settings
- Ayuda / UGO Shield → support, trust and dispute modules

## Product direction

Use the Stitch web work to replace the narrow centered mobile-card appearance on desktop with a true responsive web application. Desktop should feel like a service marketplace console, not an enlarged phone screen.
