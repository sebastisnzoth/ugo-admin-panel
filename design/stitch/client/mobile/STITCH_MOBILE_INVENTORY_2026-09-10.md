# UGO Cliente Mobile — Auditoría del export Stitch

Fecha: 2026-09-10

## Resultado ejecutivo

- Archivos reales del ZIP: **97**.
- Vistas HTML (`code.html`): **45**.
- Capturas PNG: **48**.
- Documentos Markdown: **4**.
- Archivos de texto/código con términos sensibles detectados: **35**.
- El export se conserva como **fuente de diseño**, no como código de producción.
- `main` no debe modificarse durante esta fase.

## Inventario de vistas HTML

1. `ugo_cliente_acta_de_cierre_de_re_visita_y_liberaci_n_de_fondos` — **CANÓNICA / REVISAR**
2. `ugo_cliente_actividad_certificado_guardado_e_historial_shield` — **CANÓNICA / REVISAR**
3. `ugo_cliente_actividad_historial_y_garant_as` — **CANÓNICA / REVISAR**
4. `ugo_cliente_ampliar_servicio` — **CANÓNICA / REVISAR**
5. `ugo_cliente_ampliar_servicio_service_extension` — **CANÓNICA / REVISAR**
6. `ugo_cliente_buscar_servicio` — **CANÓNICA / REVISAR**
7. `ugo_cliente_calificaci_n_y_propina` — **CANÓNICA / REVISAR**
8. `ugo_cliente_cancelar_servicio_y_pol_tica_de_retenci_n` — **CANÓNICA / REVISAR**
9. `ugo_cliente_certificado_pdf_oficial_p_g_2_anexo_forense` — **CANÓNICA / REVISAR**
10. `ugo_cliente_certificado_pdf_oficial_peritaje_y_sellos_notariales` — **CANÓNICA / REVISAR**
11. `ugo_cliente_chat_carlos_m_ndez` — **CANÓNICA / REVISAR**
12. `ugo_cliente_comprobante_factura_y_acta_t_cnica` — **CANÓNICA / REVISAR**
13. `ugo_cliente_confirmaci_n_y_ticket_de_reclamo` — **CANÓNICA / REVISAR**
14. `ugo_cliente_crear_cuenta_registro` — **CANÓNICA / REVISAR**
15. `ugo_cliente_error_de_pago_y_m_todos_alternativos` — **EDGE CASE**
16. `ugo_cliente_exportar_certificado_descarga_y_compartir_por_email` — **CANÓNICA / REVISAR**
17. `ugo_cliente_factura_fiscal_y_desglose_de_impuestos` — **CANÓNICA / REVISAR**
18. `ugo_cliente_finalizaci_n_y_firma` — **CANÓNICA / REVISAR**
19. `ugo_cliente_garant_as_y_mediaci_n_ugo_shield` — **CANÓNICA / REVISAR**
20. `ugo_cliente_gps_desactivado_y_ubicaci_n_manual` — **EDGE CASE**
21. `ugo_cliente_home_radar` — **CANÓNICA / REVISAR**
22. `ugo_cliente_iniciar_sesi_n` — **CANÓNICA / REVISAR**
23. `ugo_cliente_matching` — **CANÓNICA / REVISAR**
24. `ugo_cliente_modal_activar_shield_e_incidencia` — **CANÓNICA / REVISAR**
25. `ugo_cliente_modal_de_xito_custodia_liberada_y_certificado_pdf` — **CANÓNICA / REVISAR**
26. `ugo_cliente_notificaciones_y_alertas` — **CANÓNICA / REVISAR**
27. `ugo_cliente_p_liza_shield_y_cobertura_de_garant_a` — **CANÓNICA / REVISAR**
28. `ugo_cliente_perfil_del_cliente` — **CANÓNICA / REVISAR**
29. `ugo_cliente_perfil_del_proveedor_carlos_m_ndez` — **CANÓNICA / REVISAR**
30. `ugo_cliente_profesional_demorado_en_camino` — **EDGE CASE**
31. `ugo_cliente_profesional_en_camino` — **CANÓNICA / REVISAR**
32. `ugo_cliente_profesional_encontrado` — **CANÓNICA / REVISAR**
33. `ugo_cliente_propuestas_recibidas` — **CANÓNICA / REVISAR**
34. `ugo_cliente_proveedor_cancel_reasignaci_n_prioritaria` — **EDGE CASE**
35. `ugo_cliente_re_visita_shield_tracking_en_camino` — **CANÓNICA / REVISAR**
36. `ugo_cliente_reclamo_carga_de_evidencias` — **CANÓNICA / REVISAR**
37. `ugo_cliente_recuperar_contrase_a` — **CANÓNICA / REVISAR**
38. `ugo_cliente_servicio_en_curso` — **CANÓNICA / REVISAR**
39. `ugo_cliente_sin_conexi_n_modo_offline` — **EDGE CASE**
40. `ugo_cliente_sin_profesionales_disponibles` — **EDGE CASE**
41. `ugo_cliente_solicitud_cu_ndo` — **CANÓNICA / REVISAR**
42. `ugo_cliente_solicitud_descripci_n` — **CANÓNICA / REVISAR**
43. `ugo_cliente_solicitud_resumen` — **CANÓNICA / REVISAR**
44. `ugo_cliente_solicitud_ubicaci_n` — **CANÓNICA / REVISAR**
45. `ugo_logo` — **ASSET / NO PANTALLA**

## Edge cases confirmados en el ZIP

- `ugo_cliente_error_de_pago_y_m_todos_alternativos`
- `ugo_cliente_gps_desactivado_y_ubicaci_n_manual`
- `ugo_cliente_profesional_demorado_en_camino`
- `ugo_cliente_proveedor_cancel_reasignaci_n_prioritaria`
- `ugo_cliente_sin_conexi_n_modo_offline`
- `ugo_cliente_sin_profesionales_disponibles`

## Saneamiento obligatorio

El export todavía contiene referencias a términos externos/no confirmados como `CREA`, `CFT`, `escrow`, `fiduciario/fiduciaria`, `SUSEP`, `SEFAZ`, `BACEN`, `blockchain`, `notarial` y `póliza` en 35 archivos de texto/código. Deben neutralizarse antes de portar esas vistas a producción.

## Decisiones de integración

1. Mantener **Web** y **Mobile** como fuentes separadas.
2. No copiar `code.html` directamente a `src/`.
3. Preservar la lógica existente de Supabase, Auth, Realtime, matching, pagos y state machine.
4. Usar el export Mobile para composición visual, estados, navegación, tokens y componentes.
5. Neutralizar claims externos antes de portar una pantalla.
6. `ugo_logo` se trata como asset, no como pantalla.
7. `Ampliar servicio` y `Ampliar servicio / Service Extension` se revisan como variantes del mismo flujo antes de decidir si se fusionan.

## Orden recomendado de portado

Home/Radar → Buscar servicio → Solicitud → Matching → Propuestas/Proveedor → En camino/Chat → Servicio en curso → Ampliar servicio → Cierre/Calificación → Actividad/Shield → Edge cases.

## Gate

**STITCH MOBILE SOURCE ACCEPTED: YES**

**PRODUCTION READY AS-EXPORTED: NO**

Motivo: el paquete es suficientemente completo como fuente de diseño, pero conserva términos/claims que requieren saneamiento y debe adaptarse a la arquitectura real de UGO.
