# UGO HIVE 1.0 — Documento maestro de diseño y auditoría

**Fecha:** 2026-10-18
**Estado:** PROPUESTA / DISEÑO — NO IMPLEMENTADO
**Alcance:** sólo documentación; no autoriza modificar Supabase, Vercel, CI, producción ni activar autonomía.
**Repositorio:** `sebastisnzoth/ugo-admin-panel`
**Entorno de pruebas:** UGO Arena / TEST (`tmossnqfwfwjrtzwcbmm`).

## 1. Propósito y arquitectura

Convertir la Empresa Autónoma actual en una colmena de ejecución real: **OpenRouter razona; workers ejecutan; Supabase coordina; Judge verifica; Sentinel protege; Super Admin supervisa.** Reutilizar las tablas, los contratos, los jobs, skills y gates existentes. Evitar una segunda plataforma y 118 sesiones LLM permanentes.

```text
Founder / Super Admin
  → UGO Maestro (misiones, prioridad, gobierno)
  → Hive Scheduler (DAG, capacidades, leases, conflictos)
  → Supabase (inbox, jobs, estado, memoria, evidencia)
  → OpenRouter Model Router FREE ONLY
  → Tool Executor con sandbox y allowlist
  → 3 workers iniciales / agentes especializados
  → Judge independiente → Sentinel → gate → Super Admin
```

## 2. Límites no negociables

1. **OpenRouter: US$ 0 al mes y sólo modelos gratuitos**; prohibidos fallback pago y recarga automática.
2. Verificar precio y capacidad antes de cada solicitud. Si precio desconocido, rechazarla. No suponer que nombres terminados en `:free` garantizan disponibilidad.
3. Ante cuotas agotadas, ejecutar backoff acotado o pasar a `WAITING_MODEL`; permitir tareas deterministas autorizadas sin IA.
4. **Tres workers concurrentes** como propuesta inicial. Gratuidad de API no garantiza infraestructura 24/7 gratuita.
5. Sin cambios en producción sin autorización humana explícita. No force push, reset destructivo, ni pisar trabajo ajeno.
6. El LLM no recibe acceso directo a shell, SQL arbitrario, GitHub write, credenciales, dinero ni deploy. Sólo herramientas específicas, permisos mínimos, sandbox y auditoría.
7. Ningún agente se autocertifica; VERIFIED exige efecto real, evidencia persistida same-SHA, Judge y Sentinel.
8. No forzar ON ni manipular gate, interfaz o evidencias para fingir autonomía.
9. Acciones financieras, comerciales, irreversibles o de alto riesgo requieren autorización humana competente.
10. No simular las pruebas de dos dispositivos, GPS físico ni aceptación del primer cliente.

## 3. Contratos técnicos

**Job:** `job_id, task_id, mission_id, department_id, agent_id, required_capabilities, skill_version, input_schema_version, acceptance_criteria, environment, source_sha, priority, dependencies, resources, risk, cost_ceiling_usd=0, correlation_id, idempotency_key`.

**Lease:** dueño único, expiración, heartbeat, recuperación y locks por recursos compartidos.

**Output:** efecto esperado y observado, hashes/SHA, tests, logs redactados, evidencia, costo registrado.

**Routing:** `JOB TYPE → CAPABILITY → AUTHORITY → AVAILABILITY → LEASE/CONFLICT → COST/RISK → ASSIGN`.

**Estados:** separar agente catalogado/habilitado/ejecutado/verificado de estado de jobs. Reconciliar con máquina real antes de introducir `WAITING_DEPENDENCY`, `WAITING_MODEL`, `VERIFYING`, etc.

**Judge:** rederivar resultados de estado persistido; no confiar en un PASS autorreportado.

**Sentinel:** validar ambiente, autoridad, secretos, costo, invariantes y permisos.

## 4. Snapshot de auditoría UGO TEST — 18/10/2026

- **13 departamentos, 118 agentes**, 117 `IDLE`, uno `DISABLED`.
- **119 capacidades habilitadas**; no implican 119 ejecutores verificados.
- **3.628 registros de evidencia**; no equivalen a 3.628 resultados de negocio independientes.
- Jobs históricos: 2.363 `SUCCEEDED`, 2.148 `CANCELLED`, 66 `QUEUED`, 69 `WAITING_APPROVAL`, 18 `BLOCKED`; ninguno `RUNNING` al consultar.

| D | Departamento | Agentes | Con last_action_at | Prioridad de skills |
|---|---|---:|---:|---|
| 1 | Dirección ejecutiva | 6 | 0 | Estrategia y orquestación |
| 2 | Operaciones | 11 | 0 | GPS, matching, despacho, recovery |
| 3 | Clientes | 8 | 0 | Journey, soporte y retención |
| 4 | Proveedores | 10 | 0 | Onboarding, supply, calidad |
| 5 | Crecimiento | 7 | 0 | Captación y expansión |
| 6 | Confianza | 8 | 0 | Disputas y fraude |
| 7 | Finanzas | 9 | 0 | Conciliación, caja y deuda (sin movimiento automático) |
| 8 | Tecnología | 12 | 0 | Ingeniería, seguridad y tools |
| 9 | QA | 12 | 6 | E2E, Judge, cobertura y regresión |
| 10 | Legal | 11 | 0 | Políticas, privacidad y KYC |
| 11 | Marketing | 8 | 0 | Marca, contenido, localización |
| 12 | Producto | 9 | 0 | UX/UI, accesibilidad |
| 14 | Auditoría | 7 | 2 | Gobernanza y controles |

Muchos especialistas tienen `advisory_only` y `generic_readonly_specialist` junto con `action_work_order`: el nombre del agente no constituye permiso para ejecutar cambios. Numerosos especialistas sólo cuentan con pruebas históricas del 30/09. D14 registra `corporate-audit-agent` deshabilitado y seis agentes habilitados; investigar antes de reactivar o borrar.

## 5. Inventario de 118 agent_keys

- **D1 (6):** `corporate-strategy`, `exception-coordinator`, `executive-intelligence`, `executive-orchestrator`, `outcome-learning`, `priority-resource-orchestrator`.
- **D2 (11):** `arrival-geofence-agent`, `dispatch-agent`, `gps-validation-agent`, `incident-operations-agent`, `matching-agent`, `operational-recovery-agent`, `operations-agent`, `provider-radius-agent`, `realtime-operations-agent`, `service-lifecycle-agent`, `travel-monitoring-agent`.
- **D3 (8):** `billing-support-agent`, `client-experience-agent`, `client-feedback-agent`, `client-journey-agent`, `client-support-agent`, `complaint-agent`, `retention-agent`, `voice-of-client-agent`.
- **D4 (10):** `provider-activation-agent`, `provider-agent`, `provider-fairness-agent`, `provider-onboarding-agent`, `provider-quality-agent`, `provider-recruitment-agent`, `provider-retention-agent`, `provider-supply-agent`, `provider-support-agent`, `voice-of-provider-agent`.
- **D5 (7):** `acquisition-agent`, `expansion-agent`, `growth-expansion-agent`, `growth-experiment-agent`, `market-intelligence-agent`, `revenue-growth-agent`, `territory-intelligence-agent`.
- **D6 (8):** `abuse-detection-agent`, `appeals-agent`, `case-manager`, `critical-escalation-agent`, `dispute-resolution-agent`, `evidence-analysis-agent`, `fraud-detection-agent`, `trust-resolution-agent`.
- **D7 (9):** `cash-payment-agent`, `finance-agent`, `financial-controller`, `financial-risk-agent`, `payment-agent`, `provider-balance-agent`, `reconciliation-agent`, `refund-agent`, `treasury-control-agent`.
- **D8 (12):** `code-review-agent`, `database-reliability-agent`, `debugging-agent`, `devops-agent`, `model-router-agent`, `observability-agent`, `r-d-agent`, `realtime-reliability-agent`, `security-agent`, `software-engineering-agent`, `technology-radar-agent`, `technology-security-agent`.
- **D9 (12):** `admin-system-simulator`, `chaos-agent`, `client-simulator`, `deterministic-judge`, `meta-qa-agent`, `p0-journey-tester`, `provider-simulator`, `qa-director`, `qa-excellence-agent`, `quality-coverage-agent`, `regression-agent`, `release-gate-agent`.
- **D10 (11):** `compliance-agent`, `consumer-protection-agent`, `contract-agent`, `corporate-protection-agent`, `ip-gate-agent`, `ip-protection-agent`, `labor-risk-agent`, `legal-intelligence-agent`, `legal-policy-agent`, `policy-agent`, `privacy-agent`.
- **D11 (8):** `brand-agent`, `community-agent`, `creative-agent`, `localization-agent`, `marketing-brand-agent`, `marketing-campaign-agent`, `marketing-experiment-agent`, `pr-reputation-agent`.
- **D12 (9):** `accessibility-agent`, `design-system-agent`, `product-analytics-agent`, `product-design-agent`, `product-experiment-agent`, `product-manager-agent`, `product-strategy-agent`, `ui-ux-agent`, `ux-research-agent`.
- **D14 (7):** `ai-governance-auditor`, `corporate-audit-agent` (**DISABLED**), `cross-department-auditor`, `enterprise-risk-officer`, `executive-assurance-challenge`, `internal-auditor`, `internal-control-inspector`.

El inventario de agent_keys no confirma correspondencia exacta con archivos de SKILL.md, versiones o tools autorizadas. Reconciliar en fase cero.

## 6. Política de OpenRouter: exclusivamente gratuito

```yaml
ugo_hive:
  version: "design-1.0"
  environment: UGO_TEST
  initial_mode: SHADOW
  openrouter:
    monthly_budget_usd: 0
    free_models_only: true
    paid_fallback_enabled: false
    max_paid_cost_usd: 0
    verify_model_pricing_before_each_request: true
    reject_unknown_price: true
    require_capability_match: true
    redact_sensitive_data: true
    retry_on_free_quota: bounded_backoff_or_wait
  workers:
    initial_concurrency: 3
    job_lease_required: true
    isolation_required: true
  completion:
    independent_judge: true
    sentinel_required: true
    same_sha_evidence: true
  production:
    modification_allowed: false
    explicit_human_authorization_required: true
```

Esto es diseño, **no configuración aplicada**. Costos externos a OpenRouter y disponibilidad 24/7 no están garantizados.

## 7. Diseño de la colmena

**Maestro/Reina:** define la misión, dependencias y camino crítico, no toma permisos de ejecutores.

**Scheduler:** un solo job por lease, clasificación por capacidades, DAG, límites de concurrencia, protección contra starvation, idempotencia.

**Workers:** comenzar con investigador, ejecutor técnico sandbox y validador. Los 118 agentes representan especialidades, no 118 procesos simultáneos.

**Memoria compartida:** hechos con origen, SHA, fecha, permisos, versión, confiabilidad, caducidad y corrección. No instrucciones ocultas ni secretos.

**Skill por agente:** `agent_id, department, mission, skills, tools_allowlist, authority, inputs, outputs, acceptance_criteria, timeout, max_retries, evidence, rollback, owner`. Reutilizar antes de crear.

**Tool executor:** sólo herramientas con allowlist, sandbox y auditoría; las tool calls propuestas por OpenRouter son datos no confiables hasta autorizarse.

**Model Router:** primero procedimientos deterministas, después caché seguro y por último LLM gratuito. Manejar rate limits, timeouts y cuota agotada, sin fallback pago.

**Judge + Sentinel:** evaluación independiente same-SHA, comprobando pruebas, permisos y efecto persistido.

## 8. Misiones empresariales

Cada misión es `mission → jobs → dependencies → evidence → acceptance → gate`.

Primera misión: **UGO preparado para primer cliente real**: acceso Cliente/Proveedor, GPS, matching, alertas, aceptación, fotos, ejecución, pagos TEST, comisiones, historial y cierre. Nunca confundir automatización con pruebas físicas humanas o autorización de producción.

## 9. Mejoras transversales

1. Cola de fallos definitiva (dead-letter) y reanudación sin pérdida.
2. Circuit breaker y backoff por modelo para evitar agotar cuota.
3. Trazabilidad completa `mission → job → agente → modelo → tools → diff → evidencias → Judge → Sentinel`.
4. Auditoría continua de skills, versiones, permisos y agentes duplicados/huérfanos.
5. Pruebas adversariales de prompt injection, replay, permisos y recuperación de worker.
6. Bandeja de aprobaciones humanas acotadas, con expiración y rollback.
7. Métricas: tasa VERIFIED, tiempo de resolución, reintentos, cuota, errores y valor empresarial.
8. Privacidad: minimizar datos enviados a OpenRouter, redacción de PII y secretos, revisar retención.
9. Recuperación ante caída: restauración de jobs, locks y evidencias; evitar duplicar transacciones.
10. Prohibir que pruebas sintéticas de conectividad acrediten trabajo real.
11. Memoria de soluciones verificadas y propuestas de actualización de skills con revisión.
12. Panel Super Admin con salud por worker, jobs, errores, costos y kill switches granulares.

## 10. Fases futuras (aún no autorizadas)

**Fase 0, auditoría:** inventario actual exact-SHA de 118 agentes, permisos, skills, herramientas, capabilities, rutas, gates y estado TEST. Sin escrituras.

**Fase 1, prueba vertical:** OpenRouter FREE ONLY, un worker de lectura en SHADOW, job inocuo en UGO TEST, evidencia auditable.

**Fase 2, ejecución segura:** tool executor con sandbox y permisos delimitados, correcciones en rama aislada, tests, Judge/Sentinel. Nunca producción.

**Fase 3, colmena:** hasta 3 workers, scheduler DAG, memoria, retries, circuit breaker, dead-letter y permisos por departamento.

**Fase 4, empresa:** misiones, métricas, Super Admin y aprobación humana. Activar ON solamente si el gate actual está READY y existe autorización.

### Criterios de aceptación de piloto

- Uso de modelo gratuito y costo cero efectivamente verificado.
- Worker ejecuta job autorizado real en TEST, con estado y evidencia.
- Lease, idempotencia, timeout, recovery y protección de permisos probados.
- Judge/Sentinel independientes same-SHA.
- Fallos de cuotas/modelos no provocan cobro.
- Producción intacta, secretos ocultos, pruebas humanas no simuladas.
- Super Admin muestra job, skill, herramienta, evidencia y costo.

## 11. Decisiones abiertas

- Confirmar modelos gratuitos y sus límites en fecha de ejecución.
- No asumir worker persistente gratuito 24/7.
- Revisar que el gate AUTONOMY_ON esté READY actualmente; una evidencia histórica no demuestra estado presente.
- Verificar correspondencia entre 119 capacidades y ejecución real.
- Revalidar SHA y CI vigente antes de cada PR.
- Este documento **no autoriza editar código ni desplegar nada**.

## 12. Fuentes y trazabilidad

- GitHub: `docs/UGO_AI_AGENT_SYSTEM_MASTER.md`, `docs/READINESS_AUTO_DEPARTMENTS_VERIFIED.md`, `docs/UGO_CAMINO_MAESTRO.md`, `scripts/autonomous-departments-readiness-runtime.mjs`, `.agents/skills/ugo-job-execution/SKILL.md`, migraciones de Autonomy Gate.
- Supabase UGO Arena TEST: consultas SELECT en `autonomous_departments`, `autonomous_agents`, `autonomous_capability_registry`, `autonomous_jobs`, `autonomous_evidence_ledger`, 18/10/2026.
- Skills de gobierno UGO Maestro: Agent Governance, Agent Factory, CTO Architecture, Evidence Judge y Readiness Orchestrator.

**Documento de diseño únicamente. No implementar ni activar autonomía hasta nueva autorización.**
