# UGO — UX Contract

**Estado:** contrato mantenido de comportamiento frontend  
**Fuentes de negocio:** `UGO_PLAN_MAESTRO_UX_FLUJOS_VALIDADO.md`, `docs/UGO_UIUX_MAESTRO.md`, `docs/UGO_MAESTRO_USABILIDAD_ECOSISTEMA.md`

## Propiedad

`DESIGN.md` define la intención visual durable. `src/mvp/ugo-design-system.css` es dueño de tokens y primitivas runtime. El lifecycle de negocio sigue perteneciendo a los maestros UGO y contratos backend/API.

## Baseline global de interacción

UGO apunta a WCAG 2.2 AA. Las interacciones táctiles primarias usan un target mínimo de 48 px. Todos los controles habilitados muestran foco visible. El color nunca es la única señal de estado. Se respeta movimiento reducido.

## Cliente

Home mantiene una intención dominante: “¿Qué necesitás?”. Voz, texto y categorías alimentan el mismo borrador. Un servicio activo se puede retomar sin bloquear otro pedido válido. La búsqueda muestra una acción explícita para limpiar cuando tiene contenido y al limpiar devuelve foco al campo.

### Mapa degradado

Un fallo de mapa o geolocalización nunca bloquea pedir. La pantalla conserva Hugo y las acciones de solicitud, y muestra un estado degradado veraz en lugar de simular disponibilidad.

## Proveedor

El happy path visible sigue siendo: ver problema → aceptar → estoy yendo → empezar trabajo → listo. Un trabajo actual no oculta oportunidades futuras o de agenda que la política backend permita.

## Admin

Admin usa densidad operacional legible, estados degradados veraces y colores semánticos canónicos. Los selectores de vista deben usar semántica accesible completa; un grupo simple de botones no declara pestañas ARIA si no implementa el contrato completo de tabs.

## Feedback y recuperación

Loading, vacío, sin resultados, degradado, error y retry conservan geometría estable y explican la próxima acción recuperable. La UI de producto no usa `alert()`, `confirm()` ni `prompt()` del navegador.

## Rutas y frontera demo

Cliente, Proveedor y Admin de producción usan datos persistidos reales. La ruta legacy `?app=web` debe mostrar una frontera persistente **DEMO · DATOS FICTICIOS** antes de cualquier nombre, precio, ETA o estado ficticio.

## Responsive

La referencia móvil primaria es 390×844 y debe mantenerse usable de 360–430 px. Navegación persistente respeta safe areas. Desktop amplía composición sin crear otro lenguaje.

## Scroll y movimiento

El documento usa los tokens compartidos de scrollbar de `ugo-design-system.css`. Los scrollbars permanecen visibles y operables. `prefers-reduced-motion: reduce` elimina movimiento no esencial.


## Finanzas presenciales

El efectivo lo confirma el cliente después de aprobar el trabajo. UGO registra el total cobrado por el proveedor y mantiene la comisión como deuda separada hasta conciliación. A partir de 3 servicios con comisión pendiente, el proveedor no recibe ni acepta pedidos nuevos; los trabajos ya asignados continúan normalmente.
