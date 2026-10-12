# UGO — Especificación de interfaz: flujo de pedido estilo Uber (Cliente)

**Estado:** propuesta de diseño (no implementada)
**Alcance:** Cliente, móvil (390×844, rango 360–430 px) y web responsive (1440×900 de referencia)
**Autoridad:** `DESIGN.md`, `UX-CONTRACT.md`, `docs/UGO_UIUX_MAESTRO.md`, `docs/UGO_ECOSISTEMA_FLUJO.md`. Esta especificación no cambia lifecycle, permisos, pagos ni estados persistidos.

## 1. Idea rectora

Pedir un servicio debe sentirse como pedir un viaje:

```text
mapa visible → intención clara → una acción primaria → estado en vivo → cierre
```

Toda pantalla responde: **¿Dónde estoy? ¿Qué está pasando? ¿Qué hago ahora?**

## 2. Mockups de referencia

| Archivo | Uso |
|---|---|
| `docs/design/mockups/ugo-cliente-movil-390x844.png` | Home con mapa y hoja inferior "¿Qué necesitás?" |
| `docs/design/mockups/ugo-cliente-web-1440.png` | Seguimiento del pedido con panel lateral y mapa |

Son bocetos generados por IA para fijar composición y jerarquía. No son fuente de copy, precios, ETAs ni datos reales: el texto de ejemplo ("8 min", "Proveedor asignado", la URL del navegador) es ficticio y debe reemplazarse por datos persistidos. Según `UX-CONTRACT.md`, cualquier dato ficticio fuera de la ruta demo no puede mostrarse en producción.

## 3. Mapa de pantallas

```text
Home (mapa + "¿Qué necesitás?")
  → Necesidad (categoría / voz / texto → mismo borrador)
  → Ubicación (pin de origen, confirmar dirección)
  → Cuándo (ahora / programar)
  → Resumen (servicio, zona, evidencia opcional, CTA "Pedir servicio")
  → Buscando proveedor (estado en mapa, cancelar disponible)
  → Seguimiento (aceptado → en camino → llegó → en trabajo)
  → Aprobación final y evidencia
  → Pago (efectivo confirmado por el cliente o pago digital)
  → Calificación
```

Los componentes existentes ya cubren gran parte: `ClientLocationScreen`, `ClientWhenScreen`, `ClientSummaryScreen`, `ClientLiveTracking`, `ClientActiveMap`, `ClientCompletionReview`. La propuesta es reordenar la composición, no crear un lenguaje nuevo.

## 4. Móvil (390×844)

### 4.1 Home
- **Mapa a pantalla completa** detrás de todo, con el pin de ubicación actual.
- **Botón de retroceso flotante** circular (≥48 px) arriba a la izquierda.
- **Chip de estado** arriba al centro: texto veraz ("Buscando proveedor · 2 min"). Si el mapa falla, el chip muestra "Mapa no disponible" y el resto sigue funcionando.
- **Hoja inferior** (bottom sheet) con:
  - Título "¿Qué necesitás?" (intención dominante).
  - Fila de categorías (4 visibles, con texto debajo del icono, nunca solo icono).
  - CTA primario "Pedir servicio" a ancho completo, alto ≥48 px, color `primary` `#006948`.
  - Enlace secundario "Hablar con Hugo" en texto, no compite con el CTA.
- **Barra de navegación inferior** fija con safe area respetada.

### 4.2 Seguimiento
- Mapa ocupa la mitad superior; la hoja inferior muestra proveedor, ETA y próxima acción.
- Progreso de 4 pasos (Solicitado · Aceptado · En trabajo · Completado) con **texto además del color**.
- Una sola acción primaria visible por estado; la cancelación es secundaria.
- Un trabajo activo del proveedor mantiene su acción en barra fija (`provider-sticky-step`); en cliente se aplica el mismo patrón para "Confirmar llegada" cuando corresponda.

### 4.3 Estados obligatorios (geometría estable)
Cargando (skeleton con la forma real), vacío, sin resultados, degradado (mapa o geolocalización), error con reintento, y conexión inestable (`ConnectionBanner`, sin bloquear taps).

## 5. Web responsive (1440×900 de referencia)

- **Columna izquierda fija de 400 px** con el flujo (progreso, tarjeta de proveedor, acciones).
- **Mapa a la derecha** que ocupa el resto de la pantalla.
- Cabecera con logo UGO y avatar; sin navegación inferior.
- En anchos menores a ~900 px el panel se convierte en hoja inferior, igual que en móvil. Desktop amplía la composición sin cambiar el lenguaje.
- Los controles conservan foco visible y orden de tabulación coherente con la lectura izquierda → derecha.

## 6. Tokens y componentes

- Colores y tipografía desde `DESIGN.md` (`primary #006948`, `surface #FAF8FF`, `on-surface #131B2E`, `error #BA1A1A`; fuente Plus Jakarta Sans con fallbacks).
- Primitivas desde `src/mvp/ugo-design-system.css` y `src/shared/ui`. No crear botones ni chips nuevos si ya existen.
- Transiciones de pantalla con `useScreenFocus` y anuncio `ScreenAnnouncer`.
- `prefers-reduced-motion: reduce` elimina animaciones de la hoja y del pin.

## 7. Accesibilidad (WCAG 2.2 AA)

- Targets táctiles ≥48 px.
- Contraste de texto cumpliendo AA sobre `surface` y sobre el mapa (usar fondo sólido o velo detrás de chips).
- El color nunca es la única señal: estado siempre con texto.
- Lectura de estado en vivo con `aria-live` controlado (sin spam por cada actualización de GPS).

## 8. Criterios de aceptación

1. Un usuario nuevo llega a "Pedir servicio" en ≤2 toques desde Home.
2. Ninguna pantalla muestra dos acciones primarias a la vez.
3. Con mapa caído, la solicitud sigue siendo posible.
4. Ningún precio, ETA o proveedor aparece sin dato persistido (fuera de la ruta demo).
5. Layout estable en 360, 390 y 430 px sin scroll horizontal.

## 9. Próximos pasos sugeridos

1. Validar esta composición con 3–5 clientes reales en prototipo (Figma o Penpot, ver `docs/penpot-implementation-matrix.md`).
2. Aplicar la hoja inferior y el chip de estado en `ClientNeedScreen` y `ClientLiveTracking` como cambio incremental.
3. Agregar pruebas de contrato para tamaños de target y estados degradados, siguiendo `tests/contracts/`.
