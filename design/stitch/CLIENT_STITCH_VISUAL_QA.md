# Client Stitch visual QA

QA visual documental de la App Cliente UGO contra los exports físicos de Google Stitch versionados en:

- `design/stitch/sources/stitch_ugo_services_mobile_app/`
- `design/stitch/sources/stitch_ugo_client_web_app/`
- `design/stitch/STITCH_TO_UGO_MATRIX.md`

Alcance: Cliente mobile-first. No incluye Provider, Admin, Super Admin, backend, Supabase, pagos, permisos ni routing.

## Criterios

- `OK`: la pantalla ya transmite la dirección visual Stitch con estructura equivalente.
- `AJUSTAR`: existe implementación, pero falta parity visual relevante.
- `FALTA`: no se observa una pantalla equivalente suficientemente clara en runtime Cliente.
- `NO APLICA`: el frame Stitch es asset, diagrama, documentación o contiene claims que no deben llevarse a producción.

Claims no verificados que deben bloquearse o neutralizarse antes de runtime: escrow, BACEN, custodia, CFT, SUSEP, AWS, forensic, biometric, póliza, satelital, seguro, fiduciario, certificación legal.

## Resumen ejecutivo

La App Cliente ya tiene una base funcional amplia y parte de la estética Stitch en home/radar: mapa full-screen, topbar flotante, bottom sheet, categorías, cards de profesionales, drawer de selección y navegación inferior. La brecha principal sigue siendo de consistencia visual en el recorrido completo: onboarding/auth, solicitud paso a paso, tracking, chat, ampliación, pago, cierre, historial y perfil no alcanzan aún el mismo nivel de densidad, jerarquía y polish que los frames Stitch.

## Matriz QA mobile-first

| Pantalla | Fuentes Stitch principales | Equivalente UGO | Clasificación | Observación visual |
| --- | --- | --- | --- | --- |
| 1. Splash / onboarding | `ugo_logo`, `logo_ugo_cliente`, `kinetic_on_demand_service`, `kinetic_trust` | `ClientOnboardingGate`, marca compartida | AJUSTAR | Existe acceso/onboarding, pero falta una entrada mobile-first con logo/lockup, gradiente suave, hero cinético y jerarquía premium Stitch. |
| 2. Login | `ugo_cliente_recuperar_contrase_a`, frames auth de mobile app | `ClientOnboardingGate`, `RecoveryGate` | AJUSTAR | Funcionalmente cubierto; visualmente necesita card centrada, microcopy, campos y CTA con la misma escala de Stitch. |
| 3. Registro | `ugo_cliente_perfil_del_cliente`, onboarding mobile | `ClientOnboardingGate` | AJUSTAR | El registro existe como gate, pero falta progresión por pasos y estados de perfil con cards limpias y affordances mobile. |
| 4. Home | `ugo_cliente_web_home`, `ugo_cliente_web_home_ux_cleanup`, `ugo_cliente_web_home_actualizada_post_servicio`, `ugo_cliente_home_radar` | `ClientQuantumExperience`, `UgoWeb`, CSS client | OK | Home/radar es la zona más cercana a Stitch: mapa, panel inferior, búsqueda, categorías y proveedores destacados ya están alineados en intención visual. |
| 5. Radar / mapa | `ugo_cliente_home_radar`, `ugo_cliente_web_matching_en_vivo` | `ClientQuantumExperience`, `ClientActiveMap` | OK | Mapa full-screen, marcadores y ruta existen. Ajuste menor pendiente: densidad de overlays, chips de estado y microanimación radar. |
| 6. Categorías | `ugo_cliente_buscar_servicio`, `ugo_cliente_web_buscar_servicio`, `ugo_cliente_solicitud_descripci_n` | `ClientQuantumExperience`, `ClientQuickOrder` | AJUSTAR | Hay fila de categorías y selección; falta normalizar iconografía, spacing horizontal y estados selected/empty contra los frames mobile. |
| 7. Búsqueda | `ugo_cliente_buscar_servicio`, `ugo_cliente_web_nueva_solicitud_1`, `ugo_cliente_web_nueva_solicitud_2` | `ClientQuantumExperience`, `ClientQuickOrder` | AJUSTAR | Search existe y abre drawer; necesita versión de pantalla/bottom sheet más guiada, con sugerencias, chips y pasos como Stitch. |
| 8. Selección proveedor | `ugo_cliente_profesional_encontrado`, `ugo_cliente_propuestas_recibidas`, `ugo_cliente_web_profesional_seleccionado_1` | `ClientQuantumExperience` provider list | AJUSTAR | Lista/drawer existe; falta mayor dramatización de matching en vivo, ranking visual, ETA prominente y cards más ricas. |
| 9. Perfil proveedor | `ugo_cliente_perfil_del_proveedor_carlos_m_ndez`, `ugo_cliente_web_profesional_seleccionado_2` | `ClientQuantumExperience` provider profile drawer | AJUSTAR | Perfil existe con avatar, tarifa, rating y facts. Debe neutralizar claims tipo “seguro” y mejorar bio, badges operativos, portfolio/evidencia y CTA sticky. |
| 10. Solicitud | `ugo_cliente_solicitud_descripci_n`, `ugo_cliente_solicitud_ubicaci_n`, `ugo_cliente_solicitud_cu_ndo`, `ugo_cliente_solicitud_resumen` | `ClientQuickOrder`, `ClientApp`, flujo Cliente | AJUSTAR | Flujo cubierto parcialmente; falta wizard mobile por pasos con header, progreso, inputs amplios y resumen visual final. |
| 11. Tracking | `ugo_cliente_profesional_en_camino`, `ugo_cliente_profesional_demorado_en_camino`, `ugo_cliente_web_servicio_en_camino`, `ugo_cliente_web_roberto_en_puerta_lleg_al_domicilio_y_validaci_n_presencial` | `ClientActiveMap`, `ClientApp` | AJUSTAR | Existe tracking/mapa, pero los estados en camino/llegó/demorado deberían tener bottom sheet dedicado, timeline y acciones contextuales. |
| 12. Chat | `ugo_cliente_chat_carlos_m_ndez`, `ugo_cliente_web_chat_en_vivo_roberto_silva_en_camino`, `ugo_cliente_web_mensajes` | `VoiceHugoDock`, módulos de mensajes existentes | AJUSTAR | Chat/Hugo existe, pero falta layout de conversación cliente-proveedor con burbujas, header de proveedor y acciones rápidas como Stitch. |
| 13. Agregar trabajo / ampliar servicio | `ugo_cliente_ampliar_servicio`, `ugo_cliente_ampliar_servicio_service_extension`, `ugo_cliente_web_modal_a_adir_tarea_complementaria_en_ejecuci_n`, `ugo_cliente_web_ampliar_servicio` | `ClientApp`, `ClientCompletionReview`, extensiones | AJUSTAR | Está contemplado parcialmente; falta modal/bottom sheet específico con resumen de tarea, precio/tiempo y confirmación visual sin claims. |
| 14. Pago | `ugo_cliente_web_pagos`, `ugo_cliente_web_modal_recargar_billetera`, `ugo_cliente_web_contratar_con_saldo_billetera` | `ClientPixPaymentPanel`, `PixReconciliationPanel` | AJUSTAR | UI de pago fue estilizada, pero debe evitar lenguaje fiduciario/custodia/escrow y separar claramente estado operativo de integración real. |
| 15. Finalización | `ugo_cliente_acta_de_cierre_de_re_visita_y_liberaci_n_de_fondos`, `ugo_cliente_comprobante_factura_y_acta_t_cnica`, `ugo_cliente_web_confirmaci_n_de_calificaci_n_enviada` | `ClientCompletionReview`, `ClientEvidenceGallery` | AJUSTAR | Flujo existe; falta pantalla de cierre más ceremonial con evidencias, checklist y decisión final neutralizada. |
| 16. Calificación | `ugo_cliente_calificaci_n_y_propina`, `ugo_cliente_web_calificar_servicio`, `ugo_cliente_web_detalle_de_servicio_finalizado_y_calificaci_n` | `ClientCompletionReview` rating | OK | Calificación está funcional y visualmente cerca; falta pulir espaciado, estados de estrellas y confirmación posterior. |
| 17. Historial | `ugo_cliente_actividad_historial_y_garant_as`, `ugo_cliente_actividad_certificado_guardado_e_historial_shield`, `ugo_cliente_web_actividad` | `ServiceHistoryPanel`, `ClientEvidenceGallery` | AJUSTAR | Historial existe y tiene estilos; debe eliminar/evitar claims de certificados/garantías no verificadas y mejorar cards por estado. |
| 18. Perfil | `ugo_cliente_perfil_del_cliente`, `ugo_cliente_web_perfil`, `ugo_cliente_web_configuraci_n`, `ugo_cliente_web_quick_settings_profile_widget` | `ClientGlobalMenu`, `ClientOnboardingGate` | AJUSTAR | Perfil/configuración está parcial; falta pantalla de perfil mobile completa con datos personales, direcciones, preferencias y menú visual tipo Stitch. |

## Hallazgos por dimensión visual

| Dimensión | Estado | Nota |
| --- | --- | --- |
| Layout mobile-first | AJUSTAR | Home es fuerte; el resto alterna cards genéricas y modales con estilos heterogéneos. |
| Spacing | AJUSTAR | Falta ritmo uniforme de 12/16/20 px en formularios, historial y chat. |
| Tipografía | AJUSTAR | Se usa familia UGO, pero faltan escalas Stitch: títulos compactos, labels uppercase y captions consistentes. |
| Colores | OK | Base verde/ink/surface está alineada; controlar claims visuales asociados a shield/seguro. |
| Cards | AJUSTAR | Varias cards ya existen, pero necesitan jerarquía, sombras y estados más consistentes. |
| Botones | AJUSTAR | CTAs principales están cerca; faltan sticky CTAs y secundarios con estilo consistente por pantalla. |
| Bottom sheet | OK | Home/provider drawer y pagos usan patrón correcto; extenderlo a solicitud, tracking, chat y ampliación. |
| Navegación inferior | OK | Patrón presente en home cliente. Falta cobertura consistente fuera de home. |
| Mapas | OK | Mapa, marcadores y ruta existen. Falta polish de overlays y estados ETA/demora. |
| Badges | AJUSTAR | Usar badges operativos, no claims no verificados. Evitar “seguro”, “certificado”, “fiduciario”. |
| Loading/empty/error/offline | AJUSTAR | Existen estados básicos; falta diseño Stitch más expresivo y accionable. |
| Sensación general | AJUSTAR | Home se percibe Stitch; el journey completo todavía se siente como MVP funcional con parches visuales. |

## TOP 10 ajustes necesarios

1. Crear una pantalla splash/onboarding Cliente con logo UGO, hero visual y CTA mobile-first, sin claims no verificados.
2. Revestir login/registro con el mismo sistema de cards, inputs, botones y progreso visual de Stitch.
3. Convertir la solicitud en wizard de 4 pasos: servicio, descripción, ubicación/cuándo, resumen.
4. Fortalecer el matching con pantalla/bottom sheet de búsqueda en vivo, ranking, ETA y cards más densas.
5. Rehacer perfil de proveedor como bottom sheet premium con CTA sticky, badges operativos y eliminación de “seguro”.
6. Unificar tracking con mapa + timeline + estados: asignado, en camino, llegó, en curso, demorado.
7. Diseñar chat cliente-proveedor con header, burbujas, quick actions y estado del servicio visible.
8. Implementar modal/bottom sheet de ampliación con resumen visual y confirmación neutralizada.
9. Pulir pago visual sin lenguaje de custodia, fiduciario, escrow, póliza o certificación legal.
10. Completar perfil/historial Cliente con cards de actividad, filtros, empty/error states y microcopy consistente.

## Conclusión

Cliente está parcialmente alineado con Stitch. Home/radar, navegación inferior, mapa y calificación están cerca del objetivo visual. Las pantallas transaccionales y de cuenta requieren una fase específica de parity visual para que todo el recorrido se sienta como un único producto Stitch/UGO y no como una suma de módulos MVP.
