# UGO PROD/TEST — diferencias nominales verificadas (2026-10-19)

Auditoría SQL de solo lectura; se comparan nombres de tablas y vistas públicas, **no definiciones ni datos**. Este documento no autoriza una migración.

## Objetos presentes en PROD, ausentes de TEST
- `public.mensajes_servicio`
- `public.metricas_dia`
- `public.proveedor_categorias`
- `public.vista_admin_dashboard`
- `public.vista_alertas_sistema`
- `public.vista_kpis_conversion`
- `public.vista_mapa_usuarios`

**RIESGO:** clonar TEST o considerar TEST copia fiel de PROD podría perder/omitir objetos operativos de PROD. Preservar todos.

## Objetos presentes en TEST, ausentes de PROD
- `public.acuerdos_previos_disputa`
- `public.autonomous_action_artifacts`
- `public.autonomous_agent_consultations`
- `public.autonomous_agents`
- `public.autonomous_audit_findings`
- `public.autonomous_capability_registry`
- `public.autonomous_challenges`
- `public.autonomous_company_state`
- `public.autonomous_control_coverage`
- `public.autonomous_decision_ledger`
- `public.autonomous_departments`
- `public.autonomous_enterprise_risks`
- `public.autonomous_evidence_ledger`
- `public.autonomous_experience_patterns`
- `public.autonomous_experience_signals`
- `public.autonomous_ip_evidence_links`
- `public.autonomous_jobs`
- `public.autonomous_kill_switches`
- `public.autonomous_meta_qa_calibrations`
- `public.autonomous_model_candidates`
- `public.autonomous_model_metrics`
- `public.autonomous_model_routes`
- `public.autonomous_qa_actor_actions`
- `public.autonomous_qa_assertion_evidence`
- `public.autonomous_qa_remediations`
- `public.autonomous_qa_runs`
- `public.autonomous_qa_scenarios`
- `public.autonomous_qa_simulators`
- `public.autonomous_quality_coverage`
- `public.autonomous_recovery_audits`
- `public.autonomous_release_gate`
- `public.autonomous_runtime_revisions`
- `public.autonomous_service_event_bindings`
- `public.config_validacion_pais`
- `public.deudas_ugo_proveedor`
- `public.development_checklist`
- `public.development_checklist_events`
- `public.development_checklist_events_public`
- `public.development_checklist_public`
- `public.development_dashboard_signal`
- `public.development_incidents`
- `public.development_incidents_public`
- `public.disputa_ai_analisis`
- `public.hive_backup_cleanup`
- `public.hive_backup_versions`
- `public.hive_model_reservations`
- `public.hive_provider_circuits`
- `public.ip_audit_findings`
- `public.ip_evidence_ledger`
- `public.ip_gate_decisions`
- `public.ip_innovations`
- `public.preferencias_pago_cliente`
- `public.prospectos_scouts`
- `public.proveedor_calendar_conexiones`
- `public.proveedor_calendar_eventos`
- `public.proveedor_referencias_laborales`
- `public.proveedor_zonas_activas`
- `public.reglas_motivos_disputa`
- `public.scout_campaign_members`
- `public.scout_campaign_metrics`
- `public.scout_campaigns`
- `public.scout_contact_events`
- `public.scout_demanda_categorias`
- `public.scout_duplicate_groups`
- `public.scout_email_envios`
- `public.scout_gmail_conexiones`
- `public.servicio_estado_eventos`
- `public.tarifas`
- `public.ugo_empresas_demands`
- `public.ugo_empresas_readiness`
- `public.ugo_empresas_slots`

## Resultado
- Compartidos por nombre: 35.
- Exclusivos de PROD: 7.
- Exclusivos de TEST: 71.
- No se verificó equivalencia de columnas, constraints, funciones ni políticas para objetos compartidos.
- No se verificó backup PostgreSQL completo restaurable; **NO APLICAR** migraciones en PROD.
- Próximo trabajo: diff detallado de las 35 definiciones compartidas, más restauración aislada de un dump autorizado.
