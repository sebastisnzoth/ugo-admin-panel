# UGO — Mejoras UI/UX Cliente ↔ Proveedor · Ideas y ejecución

**Fecha:** 2026-10-11 (America/Sao_Paulo)
**Rama:** `arena/16caf25b-ugo-admin-panel` (base `15d04fa` de `main`)
**Alcance:** auditoría de experiencia Cliente y Proveedor, ideas priorizadas y primera ola implementada sin tocar lógica de negocio, pagos, RLS ni RPC.

---

## 1. Resumen ejecutivo

Se auditó la experiencia real de **Cliente** (`src/features/client/**`) y **Proveedor** (`src/mvp/provider/**`) contra los contratos vigentes (`DESIGN.md`, `UX-CONTRACT.md`, `PLAN_REDISENO_UI_UGO.md`, `UGO_PLAN_MAESTRO_UX_FLUJOS_VALIDADO.md`) y los 394 contratos automatizados de `tests/contracts`.

Se implementó una primera ola con impacto inmediato y bajo riesgo:

| # | Mejora | Rol | Archivos |
|---|---|---|---|
| 1 | Aviso de conectividad con resincronización al volver internet | Cliente + Proveedor | `src/shared/ux/ConnectionBanner.tsx`, `useNetworkStatus.ts`, `ux-refresh.css` |
| 2 | Skeletons con geometría real (pedidos y categorías) | Cliente | `shared/ux/Skeleton.tsx`, `ClientHomeScreen.tsx`, `clientUxRefresh.css` |
| 3 | Progreso visual del pedido activo (4 pasos, nunca solo color) | Cliente | `ClientHomeScreen.tsx`, `clientUxRefresh.css` |
| 4 | "Repetir último servicio" en un toque | Cliente | `ClientHomeScreen.tsx` |
| 5 | Vacío real de categorías con reintento | Cliente | `ClientHomeScreen.tsx` |
| 6 | Estado operativo explícito ("por qué no recibo pedidos") | Proveedor | `ProviderHome.tsx`, `provider-ux-2026.css` |
| 7 | Radar de demanda resumido en Inicio | Proveedor | `ProviderHome.tsx`, `provider-ux-2026.css` |
| 8 | Vencimiento visible por pedido (lista) y barra de tiempo (detalle) | Proveedor | `ProviderOpportunities.tsx`, `provider-ux-2026.css` |
| 9 | Barra fija con el próximo paso durante un trabajo activo | Proveedor | `ProviderActiveJob.tsx`, `provider-ux-2026.css` |
| 10 | Foco + scroll + anuncio al cambiar de pantalla | Cliente + Proveedor | `shared/ux/useScreenFocus.ts`, `ScreenAnnouncer.tsx`, ambos roots |

**Validación de esta ola:** `npx tsc -b` 0 errores · `npm test` 1337 tests / 1329 pass / 0 fail / 8 skip · nuevo contrato `tests/contracts/uiux-client-provider-refresh-2026.test.mjs`.

---

## 2. Hallazgos de la auditoría (con evidencia)

### 2.1 Transversal

1. **No existe aviso de conectividad.** `OfflineState` (`ugo-ds-offline`) estaba definido en `src/mvp/shared.tsx` pero sin consumidores. El cliente solo muestra un texto dentro del flujo de matching (`ClientPostConfirmFlow`); el proveedor no avisa nada.
2. **Sin gestión de foco entre pantallas.** Cliente y Proveedor navegan por estado (`flow.navigate`) sin devolver foco ni scroll al inicio: en mobile se aterriza a mitad de pantalla y un lector de pantalla no sabe que cambió la vista.
3. **Skeletons inexistentes.** `.ugo-ds-skeleton` existía en `ugo-design-system.css` sin un solo consumidor TSX: las pantallas muestran vacío o saltan de layout al llegar los datos.
4. **Dos sistemas de primitivas en paralelo:** `src/mvp/shared.tsx` (Cliente: Card, BottomSheet, FAB, GlobalState) y `src/shared/ui/index.tsx` (Proveedor: SectionHeader, EmptyState, StatusPill). Mismo producto, dos vocabularios.
5. **Estados obligatorios del PLAN §20 incompletos:** faltan explícitos para *sin oportunidades* (parcial), *pago fallido*, *proveedor desconectado*, *ubicación denegada* (parcial) y *matching sin resultado* (existe en home/cliente).
6. **Accesibilidad:** 0 `loading="lazy"` en 18 `<img>`; sin skip-link; 4 tarjetas con `role="button"` manual; vibración solo en `NotificationCenter`.

### 2.2 Cliente

7. **Doble identidad visual.** En mobile el home vive sobre shell oscuro (`#07131d` en `clientHomeScreen.css`) con tarjetas claras; el resto del producto es claro (`--ugo-color-surface:#faf8ff`). Es el salto visual más grande del producto.
8. **Pedido activo sin noción de avance.** La tarjeta solo mostraba texto de estado; no había Stepper ni barra de progreso.
9. **Sin atajo de recompra.** Un cliente recurrente tenía que volver a describir todo el pedido desde cero.
10. **Categorías sin estado de carga ni de error:** si `categorias` fallaba, la grilla aparecía con botones deshabilitados sin explicación ni reintento.

### 2.3 Proveedor

11. **"¿Por qué no me llegan pedidos?"** El estado se comunicaba con un botón Online/GPS/Offline y textos largos; no había un bloque único con razones (Offline / GPS vencido / comisiones).
12. **Inicio sin contexto de demanda:** el radar existía en otra pantalla (`ProviderDemand`), obligando a un viaje extra para decidir si convenía estar Online.
13. **Ofertas sin reloj visible en la lista:** el countdown solo existía en el detalle; en la lista no se veía cuánto faltaba para que la oportunidad venciera.
14. **El CTA del trabajo activo requería scrollear.** El propio brief tenía un botón "Ver acción principal ↓": síntoma de que la acción real quedaba fuera de vista durante el trabajo.
15. **Detalle de oferta sin motivos:** el proveedor veía datos, pero no un resumen de "por qué este pedido" (urgente / distancia / duración / programado).

---

## 3. Ideas priorizadas (backlog sugerido)

Escala: **Impacto** (Alto/Medio/Bajo) · **Esfuerzo** (S/M/L) · **Riesgo** contractual.

### P0 — Alto impacto, bajo esfuerzo (siguientes candidatos)

| Idea | Rol | Impacto | Esf. | Detalle |
|---|---|---|---|---|
| ETA y "faltan N min" en la tarjeta del pedido activo del home | Cliente | Alto | S | Reusar datos de `ClientLiveTracking`; evita abrir el detalle para saber cuándo llega. |
| `loading="lazy"` + `decoding="async"` en evidencia y fotos de perfil | Ambos | Medio | S | 18 `<img>` sin lazy; mejora directa en 3G. |
| Skip-link "Saltar al contenido" en shells de rol | Ambos | Medio | S | A11y AA-; bajo riesgo. |
| Unificar `role="button"` de tarjetas con `<button>` real | Proveedor | Medio | S | 4 casos; elimina handlers manuales de teclado. |
| Estado explícito de "sin oportunidades" con próximo paso temporal | Proveedor | Medio | S | Hoy: `EmptyState` genérico; sumar "volvé más tarde / activá otra zona". |
| Confirmación post-acción con feedback háptico en aceptar/completar | Proveedor | Medio | S | `navigator.vibrate` ya existe en `NotificationCenter`; extraer helper. |
| "Repetir último servicio" también en Actividad (historial) | Cliente | Medio | S | Mismo patrón ya implementado en Home. |

### P1 — Alto impacto, esfuerzo medio

| Idea | Rol | Impacto | Esf. | Detalle |
|---|---|---|---|---|
| Unificar el sistema visual en un solo shell claro | Cliente | Alto | M | Eliminar el shell oscuro mobile del home o adoptarlo en todo Cliente (decisión de producto). |
| Cola offline de acciones con reintento automático | Ambos | Alto | M | `ConnectionBanner` ya detecta reconexión; falta encolar mutaciones y mostrarlas como pendientes. |
| Selector de zona/radio del proveedor visible en Inicio | Proveedor | Alto | M | Hoy el radio existe (`zona_radio_km`) pero no se ve su efecto en la demanda. |
| Presupuesto guiado en la solicitud (rango sugerido por categoría) | Cliente | Alto | M | Reduce fricción de "¿cuánto cobra?" y evita pedidos sin tarifa. |
| Migrar ClientHomeScreen a los componentes de `src/shared/ui` | Ambos | Medio | M | Unifica Card/Skeleton/EmptyState y reduce CSS legacy. |
| Instalación PWA / aviso "agregar a pantalla de inicio" | Ambos | Medio | M | Ya hay APK y `capacitor.config.json`; web puede guiar el mismo camino. |
| Chat con respuestas rápidas contextuales ("voy en 10 min") | Ambos | Medio | M | `ServiceChat` ya existe; sumar plantillas por estado. |

### P2 — Experimentos / valor a validar

| Idea | Rol | Detalle |
|---|---|---|
| Modo manos libres del proveedor (voz para cambiar de estado) | Proveedor | Hugo ya entiende comandos; el valor es evitar tocar el teléfono con las manos ocupadas. |
| Ruta multi-trabajo del día | Proveedor | Ordenar agenda por cercanía y horario (`ProviderAgenda` + `ProviderDemandMap`). |
| Seguimiento compartible del pedido (link para un tercero) | Cliente | Útil para edificios/portería; requiere política de privacidad y expiración. |
| Adelanto de ganancias retenidas | Proveedor | Alto valor percibido, alto riesgo financiero: requiere contrato de dinero explícito. |
| Personalización del home por historial (categorías frecuentes primero) | Cliente | Con la data de `servicios` ya disponible; medir retención. |

---

## 4. Conflictos de sistema visual a resolver (decisión de producto)

1. **Paleta:** hay tres fuentes activas — `src/styles/tokens.css` (brand `#07804b`/`#067647`, acento mint `#20f29a`, primera importación del runtime), `src/mvp/ugo-design-system.css` + `DESIGN.md` (verde `#006948`, "Kinetic Trust") y `PLAN_REDISENO_UI_UGO.md` (cian `#16C7D9`). Conviene declarar una única autoridad y dejar las otras como alias.
2. **Navegación Proveedor:** el PLAN §18 pide `Inicio · Trabajos · Ganancias · Perfil`; el producto implementado usa `Inicio · Pedidos · Trabajo · Perfil` (con Ganancias dentro de Perfil). Está cubierto por contratos: no cambiarlo sin actualizar contrato y producto a la vez.
3. **Shell del Cliente:** decidir si el home mobile sigue oscuro o si Cliente queda 100% claro como Proveedor y Admin.
4. **Arquitectura CSS:** el PLAN §22 propone `src/design-system/{tokens,primitives,patterns}.css`; hoy siguen conviviendo capas legacy (`clientVisualPolish`, `clientRedesign2026`, `provider-redesign-2026`, `provider-premium-2026`) con `!important` en cascada.

---

## 5. Roadmap sugerido

**Ola 1 (hecha, esta sesión):** conectividad, skeletons, progreso, repetir servicio, estado operativo, radar en Inicio, vencimientos, barra fija, foco/scroll/anuncio.

**Ola 2 (P0 restante):** ETA en home, lazy images, skip-link, botones reales, empty states honestos, helper háptico, repetir desde Actividad.

**Ola 3 (P1):** decisión de shell visual, cola offline, presupuesto guiado, unificación de primitivas.

**Ola 4 (P2):** experimentos con medición (voz, ruta multi-trabajo, link compartible, personalización).

---

## 6. Métricas para validar la mejora

- **Cliente:** tiempo hasta crear el primer pedido; % de pedidos con categoría elegida sin buscar; reutilización de "Repetir"; abandono en el paso de descripción.
- **Proveedor:** tiempo entre "nuevo pedido" y primera acción; % de ofertas aceptadas antes de vencer; % de proveedores Online con GPS vencido (hoy invisible).
- **Ambos:** errores por conexión en acciones críticas; CLS en home; tareas de teclado/lector completables.

---

## 7. Evidencia técnica de esta ola

```text
npx tsc -b            → 0 errores
npm test              → 1337 tests · 1329 pass · 0 fail · 8 skip
node --test tests/contracts/uiux-client-provider-refresh-2026.test.mjs → 6/6 ok
```

Archivos nuevos: `src/shared/ux/{index.ts,ConnectionBanner.tsx,ScreenAnnouncer.tsx,Skeleton.tsx,useNetworkFocus*.ts,ux-refresh.css}`, `src/features/client/ui/clientUxRefresh.css`, `src/mvp/provider/provider-ux-2026.css`, `tests/contracts/uiux-client-provider-refresh-2026.test.mjs`.

Nota: ninguna transición de estado, precio, RPC o permiso fue modificada; todos los cambios son de presentación, feedback y accesibilidad sobre el estado ya persistido.
