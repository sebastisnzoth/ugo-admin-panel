---
name: ugo-rideshare-ui
description: Diseño de interfaz gráfica de apps tipo Uber/Rappi para UGO (Cliente y Proveedor, móvil y web responsive). Usar para pantallas de mapa en vivo, búsqueda de servicio, bottom sheets de proveedor, seguimiento en tiempo real, estados de asistente (Hugo) y calificación. Complementa ugo-design-system; no lo reemplaza.
---

# UGO Rideshare UI — skill de diseño de apps tipo Uber

## Misión
Crear interfaces modernas, limpias y atractivas para flujos de movilidad y servicios a domicilio de UGO (solicitud → matching → proveedor en camino → llegada → cierre), siguiendo la dirección visual de referencia **"UGO · Cliente"** (4 pantallas: Home/Radar, Proveedor seleccionado, Hugo escuchando, Proveedor en camino) y los tokens de `DESIGN.md`.

Autoridad: `DESIGN.md` y `src/mvp/ugo-design-system.css` mandan sobre colores, tipografía y radios. Esta skill define **patrones de composición**. Si hay conflicto, gana `DESIGN.md`.

## Pregunta obligatoria
> ¿Qué impide hoy que esta pantalla ayude a que el cliente solicite, o que el proveedor acepte y ejecute, un servicio?

Los bloqueos de solicitud, matching, confianza y cierre tienen prioridad sobre el pulido visual.

## Referencia visual (resumen)
- **Mapa a pantalla completa** como lienzo base; tonos verde-grisáceos suaves, calles discretas, etiquetas de barrio en gris medio.
- **Header flotante** con píldoras blancas: menú, selector de ubicación ("Mi ubicación · dirección"), campana con punto de notificación, avatar.
- **Bottom sheet blanco** con radio grande (24px), asa central, sombra suave; contiene el buscador y las categorías en círculos.
- **Pins de servicio** en el mapa: marcador verde (`primary`) para el proveedor seleccionado; iconos grises para el resto.
- **Tarjeta de proveedor**: foto redonda, nombre en `headline-sm`, calificación con estrella, badges de confianza (Verificado, Seguro, años de experiencia), precio en `headline-md` con unidad pequeña, carrusel de trabajos, CTA verde full-width de 48–56px.
- **Seguimiento**: ruta verde curvada sobre el mapa, burbuja flotante con "Llegando en 8 min", tarjeta inferior con foto, vehículo/placa, ETA y botones Mensaje / Llamar en pill outline.
- **Banner de estado** verde claro (`status-banner`) con icono de persona caminando y texto de qué sigue.
- **Modo oscuro de asistente**: mapa atenuado con overlay oscuro, orbe cian central con halo, texto de transcripción en tarjeta translúcida, tres acciones en fila y botón cerrar circular.

## Tokens a usar (de DESIGN.md)
- Acción principal: `primary` #006948 (hover/activo `primary-container` #00855D).
- Hugo / asistente: `secondary-container` #57DFFE con halo suave. **Solo para Hugo.**
- Geografía / utilidades: `tertiary` #0058BE.
- Superficies: `surface` #FAF8FF, `surface-container` #EAEDFF, `surface-lowest` #FFFFFF.
- Texto: `on-surface` #131B2E, `on-surface-variant` #3D4A42. Bordes: `outline-variant` #BCCAC0.
- Radios: inputs/botones 12px, cards 16px, sheets 24px, pills y avatares full.
- Targets táctiles ≥ 48px. Texto relevante ≥ 12px.

## Reglas de composición
1. **Mapa primero**: el contenido vive sobre el mapa; la hoja inferior se puede arrastrar en 2–3 alturas (colapsada, media, completa).
2. **Un CTA principal por pantalla**, siempre abajo y en verde. Acciones secundarias en pills outline.
3. **Estado siempre visible**: ETA, estado del servicio y próximo paso en un banner o burbuja.
4. **Confianza explícita**: verificación, calificación y número de reseñas junto al nombre del proveedor; nunca solo por color.
5. **Sombras** solo en controles flotantes (`--ugo-shadow-float`) y sheets (`--ugo-shadow-sheet`).
6. **Movimiento**: transiciones de 200–300 ms; la ruta se dibuja progresivamente; respetar `prefers-reduced-motion`.
7. **Safe areas** en iOS/Android (bottom nav y sheets).
8. **Bottom nav** de 4 ítems: Inicio, Mis servicios, Mensajes, Perfil (64px, icono + etiqueta).

## Variantes por plataforma
- **Móvil (Android WebView / 360–430px)**: layout de referencia; mapa full-bleed, sheet inferior.
- **Web responsive (≥ 768px)**: panel lateral izquierdo de 380–420px con la misma tarjeta de proveedor, mapa a la derecha; el sheet se convierte en columna.

## Hugo (asistente)
- El orbe y la UI de voz están **deshabilitados** en el producto según `README.md` y `DESIGN.md`. Diseñar las pantallas de Hugo como **mockup o prototipo**, detrás de feature flag, sin activarlas en producción.
- No usar Hugo como fuente de decisiones de pago, asignación o permisos.

## Entregables esperados
- Especificación por pantalla: objetivo, jerarquía, estados (vacío, cargando, error, en curso, completado), tokens usados.
- Componentes React reutilizando clases de `src/mvp/ugo-design-system.css`; no introducir librerías de UI nuevas.
- Accesibilidad: contraste AA, foco visible (halo 3px `tertiary`), etiquetas en iconos, lectores de pantalla en botones de mapa.
- Verificación: `npm run lint`, `npm run build` y, si cambia copy o flujos, `npm test`.

## Anti-patrones
- Neón dominante, gradientes decorativos, glassmorphism pesado.
- Mapas sin contraste con el sheet o con pins tapando el CTA.
- Precios o ETA sin unidad o sin fecha/hora.
- Mezclar radios arbitrarios o nuevas familias de iconos.
