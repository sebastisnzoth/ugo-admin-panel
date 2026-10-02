# UGO — Piloto: Faxina + Marido de Aluguel

Estado inicial: **IMPLEMENTAR Y VALIDAR**. Este documento crea trabajo ejecutable; no declara ningún flujo VERIFIED sin evidencia runtime del mismo SHA.

## Objetivo de lanzamiento

Las dos primeras categorías del piloto son **Faxina** y **Marido de Aluguel**. Ambas deben funcionar de punta a punta en Cliente, Proveedor, Admin/Command Center, backend, pagos, notificaciones, disputa, rating y auditoría.

## Contrato común del pedido

Todo pedido debe capturar y persistir: categoría y tarea concreta; dirección y ubicación; fecha; **hora de inicio y hora de fin**; contacto; observaciones; fotos opcionales cuando aporten contexto; precio/cotización y qué incluye; cancelación; aceptación del proveedor; estados EN_CAMINO/LLEGO/INICIADO/FINALIZADO; evidencia inicial/final cuando corresponda; aprobación del cliente; pago; rating bilateral; disputa y audit trail.

No permitir enviar un pedido si faltan campos obligatorios. La oferta al proveedor debe mostrar la información necesaria antes de aceptar, sin exponer datos personales innecesarios.

## Faxina — formulario Cliente

Obligatorio:
- dirección/ubicación;
- fecha, hora desde y hora hasta;
- tipo: estándar, pesada/profunda, entrada/salida o posobra (si está habilitada);
- tipo de inmueble;
- cantidad de dormitorios y baños;
- tamaño aproximado o rango de m²;
- estado/necesidad principal y tareas esperadas;
- si hay mascotas y cuáles;
- escaleras o condiciones relevantes de acceso;
- quién aporta productos de limpieza;
- quién aporta equipamiento (aspiradora, escalera u otros);
- instrucciones de acceso/portería;
- observaciones y fotos opcionales.

Antes de confirmar, Cliente ve resumen, duración, alcance, precio/cotización, política de extras/cancelación y qué debe estar disponible al llegar.

## Faxina — perfil/configuración Proveedor

Debe configurar: zonas/radio de cobertura; días y franjas disponibles; tipos de faxina aceptados; duración/capacidad; si lleva productos; si lleva equipamiento; restricciones declaradas; medio de cobro cuando corresponda; contacto operativo.

Verificación para piloto: identidad oficial válida; CPF cuando corresponda al proceso brasileño; comprobante de domicilio si la política de onboarding lo exige; datos de cobro; aceptación de términos/privacidad; selfie/verificación de identidad si está habilitada. Referencias: hasta 2 referencias laborales con nombre, relación (cliente/empleador), teléfono/WhatsApp y autorización de contacto. Antecedentes u otros documentos sólo si Legal/Compliance define base, necesidad y tratamiento; no convertirlos en requisito silencioso.

La oferta debe mostrar: zona aproximada/dirección según etapa, fecha, desde/hasta, tipo/tamaño del inmueble, dormitorios/baños, mascotas, productos/equipamiento, tareas, fotos permitidas, duración/precio y observaciones.

## Marido de Aluguel — formulario Cliente

Obligatorio:
- dirección/ubicación;
- fecha, hora desde y hora hasta;
- tarea concreta y cantidad de ítems;
- ambiente/local de la tarea;
- descripción del problema o resultado esperado;
- fotos del lugar/objeto cuando sean necesarias para cotizar;
- materiales/repuestos: cliente ya tiene / proveedor debe cotizar / no sabe;
- herramientas o condiciones especiales conocidas;
- altura aproximada cuando haya trabajo en altura;
- acceso, estacionamiento/portería y observaciones;
- confirmación de que entiende qué está incluido y qué requiere nueva cotización.

Catálogo inicial permitido debe ser explícito (ej.: montaje/instalación ligera, fijaciones, pequeños ajustes y reparaciones no reguladas). Electricidad, gas, trabajos estructurales, altura/riesgo u oficios que exijan habilitación deben derivarse a categoría/profesional habilitado según reglas vigentes; el formulario no debe inducir a aceptar trabajo inseguro.

## Marido de Aluguel — perfil/configuración Proveedor

Debe configurar: tareas que realiza; zonas/radio; disponibilidad; herramientas; transporte; si compra/transporta materiales; forma de cotización (hora/tarea/visita cuando esté habilitada); límites de trabajo; habilitaciones/certificaciones aplicables; contacto y cobro.

Documentos base del piloto: identidad oficial; CPF cuando corresponda; comprobante de domicilio si lo exige onboarding; datos de cobro; términos/privacidad; verificación de identidad si está habilitada. Certificaciones sólo para tareas que legalmente/técnicamente las requieran. Referencias laborales con el mismo esquema de Faxina.

## Flujo E2E obligatorio para ambas categorías

Cliente crea pedido → validación de campos → matching sólo con proveedor apto/disponible/en zona → proveedor recibe oferta completa → acepta de forma idempotente → Cliente recibe asignación → proveedor EN CAMINO con ubicación según permisos → YA LLEGUÉ/geofence → evidencia inicial cuando aplique → COMENZAR → ejecución → extras/cambio de alcance requieren aceptación explícita → evidencia final → FINALIZAR → Cliente aprueba o abre disputa → pago digital o YA PAGUÉ/efectivo según flujo UGO → deuda/comisión UGO si corresponde → completado → rating bilateral → historial con datos/evidencias permitidos → audit trail.

Debe soportar cancelación, no-show, GPS fallido, notificación fallida, doble toque/reintento, conexión intermitente, proveedor no apto, horario solapado, cambio de alcance, pago repetido y disputa.

## Command Center — tareas ejecutables

Crear/mostrar un grupo **PILOTO · FAXINA + MARIDO DE ALUGUEL**, ordenado por dependencias, sin mezclar IMPLEMENTED con VERIFIED:

1. PILOT-CATEGORY-CONTRACT — modelo/catálogo y reglas de las 2 categorías.
2. PILOT-CLIENT-FAXINA — formulario, validación, resumen y persistencia.
3. PILOT-PROVIDER-FAXINA — onboarding/configuración, oferta y aceptación.
4. PILOT-E2E-FAXINA — recorrido completo Cliente↔Proveedor.
5. PILOT-CLIENT-MARIDO — formulario, seguridad, cotización y persistencia.
6. PILOT-PROVIDER-MARIDO — capacidades/documentos/oferta/aceptación.
7. PILOT-E2E-MARIDO — recorrido completo Cliente↔Proveedor.
8. PILOT-DOCUMENTS-REFERENCES — documentos, referencias, consentimiento y privacidad.
9. PILOT-MATCHING-SCHEDULE — aptitud, zona, disponibilidad, desde/hasta y conflictos.
10. PILOT-PAYMENTS — digital/efectivo/deuda UGO/idempotencia.
11. PILOT-NOTIFICATIONS — oferta, asignado, en camino, llegó, cambios y cierre.
12. PILOT-DISPUTES — apertura, evidencia, estado, SLA y cierre.
13. PILOT-RATINGS-HISTORY — rating bilateral e historial.
14. PILOT-FAULTS-SECURITY — errores claros, permisos, RLS/RPC, concurrencia y fail-closed.
15. PILOT-RUNTIME-FAXINA — prueba UGO TEST del mismo SHA.
16. PILOT-RUNTIME-MARIDO — prueba UGO TEST del mismo SHA.
17. PILOT-JUDGE-SENTINEL — Judge + Sentinel sin findings críticos.
18. PILOT-HUMAN-ACCEPTANCE — pruebas físicas finales que no puedan automatizarse.
19. PILOT-GATE — sólo READY cuando todas las anteriores tengan evidencia válida del mismo SHA.

Responsables primarios: ugo-client, ugo-provider, ugo-backend y ugo-qa. Orquestación: ugo-readiness-orchestrator. Evidencia: ugo-evidence-judge. Runtime: ugo-runtime-validation. No tocar producción para cerrar estas tareas.

## Pruebas mínimas

Automatizadas: schema/validaciones; campos obligatorios; horarios inválidos; persistencia; matching; permisos; idempotencia de aceptación/pago/cierre/rating; transiciones de estado; RLS/RPC; notificaciones; cancelación; disputa; historial; regresión y build/TypeScript.

Runtime UGO TEST: crear un pedido real de cada categoría; aceptar con proveedor elegible; recorrer llegada/inicio/fin; evidencia; aprobación; pago TEST/efectivo TEST; rating; historial; repetir acciones críticas para probar idempotencia; inyectar al menos fallas de GPS, red/API y notificación.

Criterio **VERIFIED** por categoría: implementación + wiring + consumidor real + datos TEST + ejecución E2E + evidencia persistida + verificación determinista + CI del mismo SHA + runtime UGO TEST del mismo SHA + Judge/Sentinel sin finding crítico. Si falta una pieza, queda pendiente y el Command Center debe decir exactamente cuál.

## Fuera de alcance de este cambio

No declarar que el piloto está listo sólo por agregar este documento. No usar producción para demostrar readiness. No inventar documentos legales obligatorios: cualquier requisito adicional debe ser aprobado por Legal/Compliance y reflejado explícitamente en onboarding.


## Registro de implementación — 30/09/2026

Rama de trabajo: `feat/pilot-faxina-marido-flows-20260930`. PR: **#313**. Base observada al iniciar: `db5bad8a239ec67b84e1fec48a7dfc7e3e68a8da`.

Implementado en esta iteración:
- Cliente/Faxina: captura específica de tipo de faxina, inmueble, dormitorios, baños, m² aproximados, mascotas, acceso/escaleras, productos y equipamiento.
- Cliente/Marido de Aluguel: captura específica de tarea, cantidad, ambiente, materiales/repuestos y altura; advertencia para trabajos regulados o de riesgo.
- Programados: captura explícita de hora **desde** y **hasta**, con validación de que el fin sea posterior al inicio.
- Confirmación/persistencia: `pilot_kind`, `pilot_details`, `preferences` y `scheduled_end_at` quedan asociados al pedido en metadata.
- Resumen Cliente: muestra el final programado y los datos específicos capturados.
- Oferta Proveedor: recibe contexto persistido del pedido y hora de finalización dentro de las indicaciones.
- Catálogo TEST/piloto: migración idempotente para `faxina` y `marido-de-aluguel`.
- Gate estático: `scripts/pilot-category-contract.mjs` verifica que las piezas contractuales mínimas estén presentes.

Commits de implementación registrados:
- `0d4f0be61e0114b7f83927bc3dfcc7e75bccf01e` — formularios específicos.
- `ebbb37856483faeaed78741dc6331e7217b3db05` — estilos de formularios.
- `20677e5d4c27f0ec4055c77d04455737454c7ab2` — horario desde/hasta.
- `b0173432185ce9eaf05b8a639c14b95ebbe49d2d` — metadata del pedido.
- `aee2e732b13a67811eabbd2e5b850fe2bce9505e` — resumen Cliente.
- `a68792268f1579e227b8cd647706decb8dd07077` — contexto para oferta Proveedor.
- `46df1a89d696dbbbee922cfd61a85e6fb79c2355` — categorías piloto.
- `48a4e17560223728ddd47ce1fe6e166242422bc7` — gate estático.

### Estado de cierre

**NO DECLARAR DONE/VERIFIED todavía.** En el último chequeo, el PR era mergeable pero GitHub reportaba estado `unstable` y no había workflow del HEAD que demostrara CI/runtime. Antes de cerrar deben ejecutarse y conservarse en el **mismo SHA**: build/TypeScript/tests, UGO TEST E2E de Faxina, UGO TEST E2E de Marido de Aluguel, Judge/Sentinel y las pruebas humanas/físicas no automatizables. La ausencia de esas pruebas es un bloqueo de evidencia, no permiso para degradar el criterio de DONE.

### Próximo orden de ejecución

Continuar por dependencias: validar compilación/gate estático → completar configuración específica del proveedor/documentos/referencias → validar matching y conflictos usando desde/hasta → recorrer E2E Faxina → recorrer E2E Marido de Aluguel → pagos/notificaciones/disputas/rating → fault injection/seguridad → runtime del mismo SHA → Judge/Sentinel → aceptación humana → PILOT-GATE. Mantener TEST; no desplegar ni modificar producción para obtener evidencia.
