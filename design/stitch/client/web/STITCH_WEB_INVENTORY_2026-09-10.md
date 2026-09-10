# UGO Cliente Web — Inventario y saneamiento del export Stitch

Fecha: 2026-09-10
Fuente revisada: `stitch_ugo_client_web_app(1).zip`
Rama de integración: `feat/client-ui-stitch-sync`

## Resultado ejecutivo

El ZIP de Stitch es útil como fuente de UI/UX, pero no debe copiarse directamente sobre `src/`.

- 161 entradas totales en el ZIP.
- 48 carpetas con `code.html`.
- 40 pantallas/variantes `ugo_cliente_web_*`.
- 4 pantallas mobile incluidas por separado.
- 2 artefactos `three.js`.
- 1 recurso de logo y 1 Protection Hub adicional.
- 35 de las 40 pantallas Web contienen al menos una referencia que requiere neutralización/revisión (`Tokio`, `Itaú`, `CREA/CFT`, `BACEN`, `SEFAZ`, `blockchain`, `escrow`, `fiduciario`, `notariado`, etc.).

Decisión: conservar el export original como referencia de diseño y portar de forma selectiva a React/TypeScript, manteniendo la lógica actual de UGO en `main`.

## Fuente canónica declarada por el handoff Stitch

El propio handoff del export define 27 vistas Web canónicas/QA. Se adopta esta lista como mapa de producto, pero **no se considera confiable la afirmación de que los claims ya fueron neutralizados**, porque el ZIP real todavía contiene esas referencias.

### Canónicas Web

1. Home · Radar
2. Buscar servicio
3. Solicitud · Descripción & Diagnóstico
4. Matching · Buscando
5. Profesional · Perfil & Contratar
6. Contratación · PIN de Conformidad
7. Tracking · En camino
8. Profesional · Llegó a Puerta
9. Chat en vivo · Prestador
10. Servicio · En curso & Cronómetro
11. Servicio · Ampliación Solicitada
12. Finalización · Calificar servicio
13. Finalización · Confirmación enviada
14. Servicio · Detalle de Servicio Finalizado
15. Actividad · Historial de Servicios
16. UGO Shield · Garantía & Mediación
17. UGO Shield · Abrir Disputa
18. UGO Shield · Disputa en Mediación
19. Pagos · Billetera UGO
20. Pagos · Modal Recargar Billetera
21. Pagos · Recarga Exitosa
22. Pagos · Contratar con Saldo
23. Perfil · Principal & Domicilios
24. Ayuda · Centro de Asistencia
25. Configuración
26. Mensajes · Centro de Notificaciones
27. Sandbox QA · Consola de Pruebas (solo QA; nunca navegación productiva)

## Consolidaciones indicadas por Stitch

- Home previo -> consolidar en `Home · Radar` optimizado (`ugo_cliente_web_home_ux_cleanup` es la mejor referencia visual del ZIP actual).
- Nueva solicitud preliminar -> consolidar en Solicitud/Diagnóstico canónica.
- Home post-servicio -> estado/variante, no pantalla base separada.
- Actividad post-servicio -> estado/variante del Historial.
- Modal preliminar de ampliación -> consolidar en Ampliación Solicitada.
- Servicio en ejecución preliminar -> consolidar en Servicio en curso canónico.
- Perfil básico/post-servicio -> consolidar en Perfil principal.
- Ayuda simplificada -> consolidar en Centro de Asistencia.
- Quick settings/profile widget -> componente del shell, no ruta independiente.
- Three.js -> no integrar como dependencia visual. Extraer únicamente la lógica/componente útil si corresponde.

## Clasificación del ZIP real

### A. Integrar como referencia canónica / candidata

- `ugo_cliente_web_home_ux_cleanup`
- `ugo_cliente_web_buscar_servicio`
- `ugo_cliente_web_matching_en_vivo`
- `ugo_cliente_web_servicio_en_camino`
- `ugo_cliente_web_roberto_en_puerta_lleg_al_domicilio_y_validaci_n_presencial`
- `ugo_cliente_web_chat_en_vivo_roberto_silva_en_camino`
- `ugo_cliente_web_servicio_en_curso`
- `ugo_cliente_web_ampliar_servicio`
- `ugo_cliente_web_calificar_servicio`
- `ugo_cliente_web_confirmaci_n_de_calificaci_n_enviada`
- `ugo_cliente_web_detalle_de_servicio_finalizado_y_calificaci_n`
- `ugo_cliente_web_actividad`
- `ugo_cliente_web_ugo_shield`
- `ugo_cliente_web_abrir_disputa`
- `ugo_cliente_web_disputa_abierta`
- `ugo_cliente_web_pagos`
- `ugo_cliente_web_modal_recargar_billetera`
- `ugo_cliente_web_recarga_exitosa_comprobante_fiduciario`
- `ugo_cliente_web_contratar_con_saldo_billetera`
- `ugo_cliente_web_perfil`
- `ugo_cliente_web_centro_de_soporte_ayuda`
- `ugo_cliente_web_configuraci_n`
- `ugo_cliente_web_mensajes`
- `ugo_cliente_web_entorno_de_prueba` (QA únicamente)

### B. Variantes útiles: fusionar, no crear rutas duplicadas

- `ugo_cliente_web_home` -> referencia anterior de Home.
- `ugo_cliente_web_home_actualizada_post_servicio` -> estado post-servicio de Home.
- `ugo_cliente_web_nueva_solicitud_1`
- `ugo_cliente_web_nueva_solicitud_2` -> usar como pasos/variantes del mismo wizard hasta resolver cuál corresponde al estado canónico.
- `ugo_cliente_web_profesional_seleccionado_1`
- `ugo_cliente_web_profesional_seleccionado_2` -> consolidar en una única experiencia de Perfil/Contratar.
- `ugo_cliente_web_servicio_en_ejecuci_n_cron_metro_y_reporte_de_avance_en_vivo` -> variante de Servicio en curso.
- `ugo_cliente_web_servicio_en_curso_ampliar_servicio` -> variante/estado de Servicio en curso.
- `ugo_cliente_web_modal_a_adir_tarea_complementaria_en_ejecuci_n` -> variante del flujo Agregar trabajo/Ampliación.
- `ugo_cliente_web_actividad_servicio_concluido_y_calificado` -> estado del Historial.
- `ugo_cliente_web_perfil_actualizado_post_servicio` -> estado del Perfil.
- `ugo_cliente_web_detalle_de_servicio` -> revisar/fusionar con detalle finalizado; contiene claims de mayor riesgo.
- `ugo_cliente_web_ayuda` -> consolidar en Centro de Asistencia.
- `ugo_cliente_web_billetera_ugo_gesti_n_de_saldo_y_comprobantes` -> revisar contra `ugo_cliente_web_pagos` antes de elegir implementación.

### C. Componente, asset o referencia; no ruta productiva

- `ugo_cliente_web_quick_settings_profile_widget` -> componente del shell.
- `logo_ugo_cliente` -> asset/branding.
- `ugo_cliente_on_demand_services_protection_hub` -> referencia visual adicional; revisar antes de reutilizar.

### D. No integrar directamente

- `three.js_1`
- `three.js_2`

Razón: artefactos experimentales/contenedores. Cualquier componente útil debe reescribirse como React/TypeScript normal, sin introducir Three.js si no existe una necesidad funcional.

### E. Mobile: conservar separado de Web

- `ugo_cliente_home_radar`
- `ugo_cliente_solicitud_descripci_n_hugo_ia`
- `ugo_cliente_servicio_en_curso_cron_metro`
- `ugo_cliente_servicio_ampliaci_n_solicitada`

Destino conceptual: `design/stitch/client/mobile/`, no mezclar con el handoff Web.

## Saneamiento obligatorio antes de portar UI a producción

Reemplazar o revisar cualquier mención a terceros o infraestructura no confirmada. La UI productiva no debe afirmar convenios reales inexistentes.

- Tokio Marine / pólizas específicas -> terminología neutral `UGO Shield`.
- Itaú/BACEN/escrow bancario específico -> estado de pago/custodia neutral de UGO, sujeto a la integración real de pagos.
- CREA/CFT/matrículas simuladas -> `Profesional verificado` solo si el backend realmente valida ese atributo; si no, usar wording aún más neutro.
- Blockchain/notariado/hash -> `Registro digital trazable` únicamente si la implementación real soporta trazabilidad.
- SEFAZ/NF-e -> no afirmar emisión fiscal automática sin integración real.
- Peritos/mediación/garantías monetarias -> tratarlos como roadmap/UX hasta que las reglas de negocio y operación estén implementadas.

## Reglas de integración con el UGO existente

Preservar desde `main`:

- Supabase y sesiones.
- Onboarding Cliente/Proveedor.
- Roles y `AdminGate`.
- Estados reales del servicio.
- Dispatch/matching actual.
- Pagos/endpoints actuales.
- Realtime y trazabilidad existentes.

El HTML de Stitch es referencia, no reemplazo directo de la lógica.

## Orden de integración recomendado

1. Design tokens Urban Kinetic + shell Web.
2. Home/Radar.
3. Buscar servicio + Solicitud/Diagnóstico.
4. Matching + Perfil/Contratar.
5. Tracking + Llegó + Chat.
6. Servicio en curso.
7. Agregar trabajo / Ampliar servicio.
8. Finalización + calificación + detalle.
9. Actividad/Historial.
10. Perfil/Ayuda/Configuración/Mensajes.
11. Pagos/Billetera solo contra la implementación real de pagos.
12. UGO Shield/disputas solo contra reglas de negocio implementadas.
13. QA responsive y Vercel antes de cualquier merge a `main`.

## Estado

**INVENTARIO DEL EXPORT: COMPLETO**

**EXPORT APTO PARA COPIA DIRECTA A `src/`: NO**

**EXPORT APTO COMO FUENTE DE UI/UX PARA INTEGRACIÓN SELECTIVA: SÍ**

Siguiente cambio de runtime permitido: comenzar por `Home/Radar` en `feat/client-ui-stitch-sync`, conservando la lógica de `main`.
