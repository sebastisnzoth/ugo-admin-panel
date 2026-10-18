# UGO HIVE — Documento maestro de diseño y auditoría

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


## 13. Chat de Dirección — UGO Maestro (módulo propuesto)

**Estado: DISEÑO, NO IMPLEMENTADO.** Se incorpora como interfaz humana del sistema de misiones de UGO Hive dentro de Super Admin, sin crear otro scheduler, una segunda base de datos ni un canal de ejecución privilegiada desde el navegador.

### Objetivo y experiencia

El fundador podrá conversar en lenguaje natural con UGO Maestro, pedir una tarea u objetivo, solicitar investigación, discutir alternativas, modificar el alcance, aprobar una versión concreta del plan y seguir su ejecución desde el mismo chat. La interfaz tendrá **Conversación / Misiones / Resultados** y mostrará el estado persistido, no respuestas inventadas.

Flujo principal:

```text
Mensaje humano → autenticación y autorización Super Admin
→ contexto permitido y estado actual de UGO
→ modelo gratuito OpenRouter: borrador estructurado
→ validación de esquema, skills, alcance, presupuesto y política
→ vista previa del plan + riesgos + dependencias
→ revisión / corrección humana
→ aprobación versionada (alcance y límites exactos)
→ creación idempotente de misión y jobs por backend autorizado
→ Hive Scheduler → workers por capacidades, leases y permisos
→ Judge + Sentinel → evidencia y estado
→ actualizaciones y preguntas en el mismo chat
```

**Regla clave:** un mensaje del chat NO ejecuta herramientas ni cambia la base. La planificación produce una **propuesta**, no una autorización. Sólo una acción autenticada, explícita y validada por servidor crea/activa jobs autorizados. Cualquier cambio de alcance, entorno, permisos, riesgo, costo o versión del plan invalida la aprobación previa.

### Contrato de misión propuesto

```json
{
  "mission_id": "uuid",
  "conversation_id": "uuid",
  "requester_user_id": "uuid",
  "objective": "texto del objetivo",
  "plan_version": 1,
  "status": "DRAFT",
  "environment": "UGO_TEST",
  "max_openrouter_cost_usd": 0,
  "paid_models_allowed": false,
  "source_sha": "sha revisado",
  "tasks": [{
    "task_id": "identificador estable",
    "department_id": 8,
    "required_capabilities": ["engineering"],
    "skills": ["ugo-code-engineering"],
    "dependencies": [],
    "allowed_tools": ["lectura de archivos y pruebas permitidas"],
    "acceptance_criteria": ["criterios observables"],
    "risk_class": "YELLOW"
  }],
  "approval": {
    "status": "PENDING",
    "plan_hash": "hash del contenido canónico del plan",
    "approved_by": null,
    "approved_at": null,
    "expires_at": null
  }
}
```

El esquema es conceptual. No crear tablas ni RPC nuevas hasta conciliarlo con las entidades y estados existentes de UGO. Debe incluir `correlation_id`, idempotencia, ownership y registro de decisión al implementarse.

### Comandos conversacionales

- Crear y revisar: «Investigá el GPS y el matching del proveedor; no toques producción».
- Ajustar plan: «Priorizá GPS; dejá fuera cambios visuales».
- Consultar: «¿Qué departamentos están trabajando y qué evidencia tienen?».
- Controlar: «Pausá la misión», «Reanudá sólo los jobs seguros», «Mostrame los tests fallidos».
- Cerrar: «Presentame el informe verificado y los bloqueos humanos restantes».

Las consultas de progreso deben leer el backend con su autoridad propia. Pausar, reanudar, cancelar, aprobar o ejecutar requiere controles transaccionales del servidor; el LLM sólo identifica la intención. No aceptar frases en mensajes de herramientas, documentos o PR como autorizaciones humanas.

### Requisitos de seguridad y privacidad

1. Chat accesible únicamente por autorización real Super Admin; comprobar rol, sesión y perfil desde backend en cada acción privilegiada.
2. Protección contra prompt injection en mensajes, documentos y logs; las herramientas reciben parámetros tipados y políticas independientes.
3. Separar `DRAFT → PROPOSED → APPROVED → QUEUED → EXECUTING → VERIFYING → VERIFIED/FAILED/BLOCKED`, reconciliando con estados canónicos; no introducir estados ad hoc sin migración y pruebas.
4. Persistir aprobación vinculada al hash y versión del plan, actor, expiración, entorno, permisos y costo. Evitar replay y doble creación mediante idempotency key.
5. Permisos mínimos y límites por job; sin shell/SQL arbitrario, sin exposición de secretos ni PII completa a OpenRouter.
6. Contrato OpenRouter **US$ 0/mes y modelos gratuitos únicamente**, incluso durante planificación y chat; si no hay modelo elegible, mostrar indisponibilidad sin gasto.
7. Producción y dinero siempre detrás de política y autorización explícita separada; aprobar un plan TEST nunca permite desplegar producción.
8. Realtime con recuperación/polling al reconectar; la UI distingue pérdida de conexión de error en ejecución.
9. Registro auditable de mensajes relevantes, decisiones, plan_hash, modelo utilizado (sin secretos), llamadas a herramientas, tokens/costo reportados y evidencias.
10. Retención y borrado controlados de conversaciones; no incluir claves, tokens ni datos de clientes innecesarios en contexto LLM.

### Panel Super Admin propuesto

- **Conversación:** chat, historial, archivos permitidos y mensajes de aprobación explícitos.
- **Misiones:** tarjetas con objetivo, versión, departamentos asignados, DAG, responsable, costo US$ 0, riesgo, pausas y bloqueos.
- **Resultados:** progreso grounded, CI exact-SHA, PR, evidencia persistida, Judge/Sentinel, últimos errores y acciones humanas pendientes.
- **Controles:** pausa/cancelación por misión y kill switch general ya existente, con confirmación explícita y trazabilidad.

### Implementación futura en fases

1. **MVP lectura y planeación:** chat autenticado, contexto mínimo, modelo gratuito, generación y edición de plan con JSON validado; cero acciones ejecutoras.
2. **Aprobación y registro:** aprobación de plan_hash por API con control de rol, costo, entorno, idempotencia y auditoría; creación de jobs en TEST.
3. **Ejecución controlada:** integración con scheduler/workers existentes, dependencias, herramientas aisladas, reintentos limitados y políticas.
4. **Seguimiento:** Realtime/resync, informes de evidencia, decisiones, Judge/Sentinel y recuperación de conversaciones.
5. **Ensayos de seguridad y UX:** pruebas de inyección, cambios tras aprobación, duplicación de clicks, desconexión, cuota agotada, roles no autorizados y accesibilidad móvil.

### Prueba de aceptación inicial

Un Super Admin escribe una tarea inocua en UGO TEST, conversa y cambia el plan, aprueba una versión exacta, y el sistema crea **una sola misión autorizada**. Los workers realizan un efecto permitido observable; Judge y Sentinel comprueban la evidencia del mismo SHA; el chat enseña el resultado sin falsos VERIFIED. Pruebas negativas: usuario no autorizado, plan modificado tras aprobación, replay, modelo gratis no disponible, herramienta prohibida y cambio a producción. Ninguna de ellas genera costos OpenRouter ni modificaciones de producción.

**Decisión arquitectónica:** priorizar el Chat de Dirección antes de escalar a los 118 agentes; es la interfaz de control y autorización de la colmena, no un segundo agente con acceso irrestricto.


## 14. Revisión triple y evolución a UGO Hive 2.0 — 18/10/2026

**Naturaleza:** auditoría y plan propuesto. No se afirma que Hive 2.0 ya funcione. No habilita despliegues, gastos, modelos pagos o bypass de gates.

### Triple contraste efectuado

**1. Arquitectura, gobernanza y skills.** Se inspeccionaron las skills `ugo-agent-governance`, `ugo-job-execution`, `ugo-github-ops`, `ugo-agent-factory` y `ugo-evidence-judge`, así como el plan maestro previo. Ya hay scheduler, conceptos de lease, evidencia, Judge y Sentinel. La existencia de contratos no demuestra la ejecución real de todos los especialistas.

**2. Estado en Supabase UGO TEST.** Snapshot leído el 18/10: 13 departamentos, 118 agentes registrados (117 `IDLE`, 1 `DISABLED`), `autonomous_company_state.mode=OFF` (actualizado a las 19:35:57 UTC), gate `AUTONOMY_ON=READY` (evaluado a las 19:35:41 UTC) y `CUSTOMER_1=BLOCKED` (evaluado a las 19:37:44 UTC; bloqueos `QA_COVERAGE_INCOMPLETE` y `CUSTOMER_ACCEPTANCE_NOT_APPROVED`). Son observaciones fechadas, no estados garantizados para el futuro; jamás cambiar a ON a partir de un snapshot.

**3. Código real GitHub y proveedor de modelos.** Inspeccionados `scripts/autonomous-worker-cycle.mjs`, `scripts/connect-autonomous-agents-openrouter.mjs`, `scripts/openrouter-autonomy-probe.mjs`, `server/hugo/modelRouter.ts` y `docs/UGO_SCHEDULER_POLICY.json`. El worker actual ejecuta una RPC determinista y no acredita edición/revisión autónoma de código. El conector contempla `gemini` y `openrouter`, prioriza Gemini en su selector y puede asignar un modelo común a muchos agentes: **no cumple por sí solo la política Hive OpenRouter-only/free-only**. El probe considera modelos con pricing prompt/completion cero, pero el diseño definitivo debe verificar todos los campos de cobro relevantes y rechazar precios ambiguos, cuota agotada y rutas inesperadas. No confundir catalogado, conectado, ejecutado y verificado.

### Modelo de colonia: la reina distribuye, las obreras colaboran

La Reina / UGO Maestro recibe una instrucción humana y consulta estado actual, restricciones y evidencia. La convierte en **misión versionada**, con un grafo dirigido acíclico de subtareas (DAG), criterios de aceptación, riesgos, dependencias y capacidad necesaria. No asigna automáticamente trabajo a los 118 agentes: sólo a los especialistas requeridos; los demás permanecen disponibles.

```text
Super Admin / Chat de Dirección
  → Reina: misión, plan_version, DAG, permisos, costo y criterios
  → autorización humana al plan_hash exacto
  → Hive Scheduler: prioridad, capability match, dependencias, lease, lock
  → Message Bus persistente / memoria de misión en Supabase
     ↔ D2 Operaciones / D8 Tecnología / D9 QA / D14 Auditoría
     ↔ otros departamentos, sólo cuando se requieran
  → worker de herramientas permitido (GitHub/TEST/sandbox)
  → evidencia persistida + Judge independiente + Sentinel
  → resultados trazables en el mismo chat
```

Los **118 agentes son especialidades disponibles**, no 118 llamadas LLM ni 118 procesos. Propuesta de inicio: hasta **3 workers concurrentes** tras reconciliar `max_parallel_tasks=5` y las capacidades actuales `openrouter=1`, `ugo-test-worker=1` de `docs/UGO_SCHEDULER_POLICY.json`. No aumentar esas capacidades sin demostrar ausencia de conflicto y cuotas.

### Protocolo de comunicación entre agentes

No permitir chats libres ilimitados: usar mensajes estructurados, persistentes, encolados, auditables, autorizados por el scheduler y limitados por presupuesto de contexto.

```json
{
  "mission_id": "uuid",
  "job_id": "uuid",
  "message_id": "uuid",
  "correlation_id": "uuid",
  "sender_agent_id": "uuid",
  "recipient_agent_id": "uuid",
  "kind": "REQUEST_EVIDENCE",
  "payload_schema": "ugo.hive.message.v1",
  "payload": {"request": "referencias a logs GPS"},
  "evidence_refs": [],
  "reply_to": null,
  "deadline_at": "ISO8601",
  "max_hops": 4,
  "source_sha": "git-sha"
}
```

Tipos de mensajes propuestos: `REQUEST_EVIDENCE`, `FINDING`, `TASK_HANDOFF`, `BLOCKED`, `REVIEW_REQUEST`, `REVIEW_RESULT`, `ESCALATION`. Autorización entre departamentos por tipo, alcance y datos; rechazo de mensajes huérfanos, replays, loops y delegación de permisos. Idempotencia `mission/job/message`, TTL, límites de hops, tamaño, rate y respuestas. Para conflictos, preferir evidencia reproducible; escalar desacuerdos no resueltos a un juez independiente o a Super Admin. La “memoria colectiva” no debe convertir texto de PR, logs o agentes en instrucciones privilegiadas.

### GitHub Worker: acción efectiva, no sólo conversación

Primero buscar las capacidades ya existentes en D8 (`devops-agent`, `software-engineering-agent`, `technology-security-agent`) y `ugo-github-ops`; no añadir otro agente nominal sin una carencia probada. La pieza nueva necesaria es el **ejecutor de herramientas sandboxed** con contratos y permisos.

`mission_id/job_id → rama aislada desde SHA fijado → inspección y diff acotado → tests locales → PR → CI same-SHA → Judge → Sentinel → resultado`.

- GitHub App/GITHUB_TOKEN de mínimo privilegio y vigencia limitada; secretos sólo servidor/runner.
- No ejecutar shell libre ni comandos provenientes sin validación de modelos. Lista de herramientas y acciones acotadas; filesystem efímero; sin credenciales de producción.
- Detectar PR abierto, leases vigentes y edición concurrente antes de crear rama o modificar archivos.
- No fusionar PR ni publicar producción sin gates, política explícita y autorización correspondiente.
- No declarar success por commit, PR abierto, snapshot, contrato textual o test ejecutado con SHA distinto.

### Model Router OpenRouter-only y presupuesto cero

Regla **HIVE_ONLY_OPENROUTER_FREE**: limitar toda llamada de la colmena (incluyendo Chat de Dirección, planeación y revisión) a OpenRouter con modelos de costo cero comprobado antes de usar. Las integraciones históricas de Hugo/Gemini no autorizan un fallback de Hive hacia Gemini u otro proveedor. Si ningún modelo gratuito apto está disponible, mantener misión en `WAITING_MODEL` o estado compatible con las máquinas actuales; no gastar ni inventar resultados.

- Cachear hechos con procedencia; usar pruebas deterministas antes de inferencia.
- Cuota por misión, worker y departamento, más rate limiter común; estimar demanda sin prometer 24/7 ni cuota infinita. Verificar límites externos el día de ejecución.
- Reintentos acotados, backoff, circuit breaker y dead-letter. Costo no modelado o precio desconocido = fail-closed.
- Redactar secretos y datos personales en prompts, contexto, logs y memoria.

### Orden de implementación y aceptación

**Fase A — Conectar el mando**: Chat de Dirección autenticado, contexto real permitido, planificación validada por esquema, revisión humana y aprobación de `plan_hash` exacto. No ejecutar un mensaje libre.

**Fase B — Primera colaboración**: misión inocua UGO TEST, 2 agentes intercambiando mensajes estructurados y evidencia; scheduler verifica dependencias y leases; no se duplican jobs.

**Fase C — GitHub Worker real**: worker de D8 modifica de forma reversible una rama aislada, ejecuta tests, abre PR y correlaciona run/SHA/resultado; D9 inspecciona y D14 verifica.

**Fase D — Colmena mínima**: hasta 3 workers en recursos no conflictivos, memoria compartida, recuperación tras caída, límites de API y observabilidad en Super Admin.

**Fase E — Expansión gradual**: habilitar capacidades del resto de departamentos una por una sólo después de pruebas representativas. No activar 118 ejecutores de golpe.

**Prueba E2E obligatoria:** Super Admin pide corregir un defecto menor de i18n en TEST → Reina crea plan versionado → humano aprueba → dos o tres agentes se comunican → worker cambia una rama → tests y PR → Judge/Sentinel con evidencia exact-SHA → chat muestra resultado real y costo OpenRouter cero. Pruebas negativas de fuga de permisos, replay, doble asignación, caída de worker, falta de modelo gratuito, cambios de plan tras aprobación y llamadas a producción.

### Brechas que deben seguir visibles

- Chat real conectado al planner, mensaje interagente persistido y worker GitHub ejecutor: **no verificados**.
- Rate limits/catálogo de modelos gratis: variables externas, validar contra API actual al implementar.
- `AUTONOMY_ON=READY` no equivale a Hive operativo; snapshot `OFF` no debe alterarse por esta documentación.
- `CUSTOMER_1=BLOCKED` no se resuelve por construir Hive; quedan QA y aprobación humana.
- No prometer colmena plenamente funcional hoy: el objetivo inicial es una misión real end-to-end en TEST, sujeta a pruebas y recursos disponibles.
- Preservar trabajo concurrente: PRs abiertos, fixtures compartidos, permisos y CI actual deben reconciliarse antes de escribir.

**Decisión:** reutilizar el catálogo de 118 agentes, construir tres capacidades nuevas (planificador de misiones, bus de mensajes interagente y ejecutor de herramientas GitHub aislado) y demostrar primero una misión completa. Esta sección no autoriza implementar, activar ON ni modificar producción.


## 15. Revisión integral v2.1: decisiones corregidas y plan ejecutable

**Estado: ESPECIFICACIÓN, NO IMPLEMENTACIÓN.** Revisión contra `main`, `docs/UGO_SCHEDULER_POLICY.json`, `scripts/autonomous-worker-cycle.mjs`, `scripts/connect-autonomous-agents-openrouter.mjs` y `docs/UGO_AI_AGENT_SYSTEM_MASTER.md`. Fecha: 18/10/2026. Los snapshots de secciones anteriores siguen siendo históricos.

### 15.1 Correcciones de diseño que evitan falsas promesas

1. **Reina no es superusuario.** UGO Maestro actúa como *planner/coordinator* sin token de escritura. Todas las autorizaciones se materializan en backend con identidad, entorno, acción, recursos y expiración.
2. **Colaboración no significa 118 chats LLM.** Agentes = identidades/capacidades; workers = procesos limitados; Message Bus = intercambios tipados. Evitar explosión combinatoria de mensajes, loops y agotamiento de cuota.
3. **La selección por departamento no es garantía de aptitud.** Requerir `capability_key`, versión de skill, permiso efectivo, herramientas y prueba reciente; si falta, devolver `UNWIRED` y no ejecutar.
4. **No modificar el worker legado para forzar Hive.** `autonomous-worker-cycle.mjs` está acoplado a `ON/SAFE_MODE` y una RPC determinista. Diseñar adaptador Hive separado para SHADOW/TEST y migración explícita posterior. No burlar OFF, ni crear job ejecutable si gate no permite.
5. **Incompatibilidad de proveedor.** La selección histórica `gemini/openrouter` no satisface la política de Hive. Implementar `HiveFreeOpenRouterAdapter` aislado del router Hugo; sin fallbacks alternativos y con `fail closed`.
6. **Aprobación y ejecución separadas.** El plan validado no autoriza nuevas subtareas con riesgos superiores ni acciones inesperadas. Replanificar crea otra versión y revoca la aprobación anterior. Para tareas sólo de lectura, aplicar igualmente permisos y auditoría.
7. **Paralelismo real subordinado a locks.** El scheduler actual permite 5 tareas globales, pero recursos `openrouter` y `ugo-test-worker` están limitados a 1. Proponer hasta 3 workers **no significa** 3 llamadas simultáneas a OpenRouter ni 3 escrituras en el mismo repo/fixture.
8. **GitHub no equivale a runner.** GitHub API gestiona repos/PR/Actions; ejecución de tests o cambios multiarchivo necesita runner aislado, tool allowlist, control de SHA y permisos. Preferir workflow determinista existente si sirve.
9. **No prometer 24/7 gratuito.** OpenRouter gratis tiene límites cambiantes, y runner/DB/Actions también; diferenciar costo OpenRouter de costo total de infraestructura.
10. **Un resultado no es VERIFIED por consenso textual.** Judge y Sentinel requieren evidencia externa exact-SHA; los agentes no votan para declarar éxito. Los eventos de auditoría deben ser inmutables o protegidos contra edición.
11. **Concurrencia de PRs:** ningún worker modifica archivos afectados por otro PR sin lock y análisis de conflictos. Mantener worktrees/ramas separadas y reconciliar `main` y PRs antes de actuar.
12. **UGO TEST no es producción:** datos, tokens, storage, RLS y credenciales separados, egress limitado. Todas las acciones de escritura inicialmente restringidas a TEST y ramas de desarrollo.

### 15.2 Arquitectura mínima sin duplicación

```text
Super Admin Chat (RLS + backend auth)
    ↓ create_draft / revise_plan / approve_plan
Mission API: versiones + plan_hash + aprobación + policy
    ↓ enqueue idempotente
Scheduler existente: DAG + capabilities + leases + resource locks
    ↔ Message Bus: outbox/inbox tipada + permisos + TTL + correlation
    ↓ claims por worker
Worker D8 (GitHub/runner)      Worker D2/D9 (consulta y tests)
    ↓ evidencia inmutable y artefactos same-SHA
Independent Judge → Sentinel → Mission materialized status
    ↑ actualización realtime / reconciliación HTTP
Super Admin Chat y Dashboard
```

**Integrar tablas existentes primero.** Nuevas entidades sólo si no hay representación suficiente; si se requieren, proponer migraciones versionadas y compatibilidad con consumidores actuales. Nunca crear dos ledgers ni dos schedulers.

### 15.3 Contratos de seguridad y mensajes

- Misión: `mission_id, requester_id, plan_version, plan_hash, objective, environment, source_sha, capability_requirements, DAG, acceptance_criteria, risk_budget, openrouter_budget_usd=0, created_at`.
- Aprobación: `approver_id, role_checked_server_side, scope_hash, approved_actions, approved_environment, allowed_resources, expiry, revoked_at`.
- Handoff: `message_id, mission_id, job_id, sender_id, recipient_id, kind, schema_version, payload_ref, evidence_refs, correlation_id, causation_id, ttl, max_hops, idempotency_key`.
- Claim: `job_id, lease_owner, lease_token, lease_expires_at, heartbeat_at, attempt, claimed_source_sha`. La escritura de resultados exige comprobar `lease_token` (fencing token) para impedir que un worker expirado cierre un job recuperado.
- Evidencia: `job_id, action_id, actor, source_sha, result_sha, artifact_ref, test_run_id, observed_effect, verification_version, judge_decision, sentinel_decision`.
- No delegación implícita: un mensaje recibido **nunca** transporta permisos del remitente. El receptor verifica su propia política y que la tarea pertenezca a la misión aprobada.
- Prohibidos mensajes entre agentes sin misión, spam circular, contenido no confiable interpretado como instrucciones de sistema y exfiltración a modelos de terceros.

### 15.4 Máquina de estados y consistencia

**Plan:** `DRAFT → PROPOSED → APPROVED | REJECTED | EXPIRED`. Un cambio produce `DRAFT(version+1)` y revoca el hash aprobado anterior.

**Job (vista conceptual, adaptar a enum vigente):** `WAITING_DEPENDENCIES → QUEUED → LEASED → RUNNING → VERIFYING → VERIFIED`; excepciones `WAITING_MODEL, WAITING_APPROVAL, BLOCKED, FAILED, CANCELLED`. No insertar estos strings en Supabase sin comprobar constraints/RPC.

**Transacciones:** guardar plan+aprobación de forma atómica; crear misión y jobs idempotentemente; outbox transaccional para notificaciones; reconciliar eventos tardíos; usar lease fencing y compensación segura ante fallos. Usar retención razonable y logs sin PII.

**Recuperación:** retries acotados conforme a `UGO_SCHEDULER_V2` (`max_attempts=3`, backoff 5/15/30 minutos por política actual); circuito abierto cuando el modelo gratis está saturado; dead-letter con intervención; jamás reintentar efectos no idempotentes a ciegas.

### 15.5 Política de gasto cero más estricta

- `HIVE_MODEL_PROVIDER_ALLOWLIST=["openrouter"]`; `HIVE_MAX_BILLABLE_USD=0`; deny by default.
- Verificación de catálogo **en el momento de la llamada**: todos los componentes de precios facturables conocidos deben ser exactamente cero; precio faltante o incierto ⇒ rechazar; registrar modelo realmente retornado y reevaluar.
- No confiar sólo en sufijo `:free`, metadatos almacenados o selección automática si puede cambiar el modelo/costo. Para rutas enrutadas, exigir garantía verificable de cero costo o no usarlas.
- Reservar cuota local por misión, planificador y worker; limitar tokens y contexto, max calls, timeout y solicitudes concurrentes; respetar 429 / Retry-After y degradación.
- Distinguir *costo facturado* de *estimación local*; presupuesto de proveedor cero no sustituye alertas/cuotas nativas de la cuenta. La cuenta deberá impedir cargos por mecanismos externos al propio código cuando OpenRouter lo permita.
- Sin fallback a Gemini, modelos pagos u otros proveedores en Hive. Las integraciones históricas de otras partes de UGO quedan fuera del alcance del modo Hive.

### 15.6 UX del Chat de Dirección y operación humana

Chat con 4 vistas: **Conversar, Plan, Colmena, Resultados**; mostrar siempre entorno, modo global, autorización pendiente, SHA base, grado de confianza, modelo libre elegido y bloqueo si no hay cuota. Borrador de plan editable con diffs entre versiones; aprobar `plan_hash`, no sólo texto de chat; cancelación con confirmación, revocación y progreso visible. Accesibilidad móvil, PT-BR/es/en y recuperación de sesión. La UI debe distinguir `SIN MODELO`, `SIN PERMISO`, `SIN WORKER`, `SIN EVIDENCIA`, `BLOQUEO HUMANO` y `ERROR DE CI`.

### 15.7 Fases P0 y pruebas de aceptación

| Fase | Trabajo | Prueba objetiva | Estado |
|---|---|---|---|
| 0 | Reconciliar repo/PRs, schemas TEST, jobs, skills y locks con main SHA | Matriz `cataloged/wired/executed/verified` para capacidades seleccionadas | PENDING |
| 1 | Chat y planner read-only + plan versionado | Conversación produce DAG validado; modelo ausente no genera gasto | PENDING |
| 2 | Aprobación exacta + mensaje A→B y respuesta | Autorización server-side; 2 agentes intercambian evidencia sin loops ni fuga de permisos | PENDING |
| 3 | GitHub tool executor en TEST | Cambia rama aislada y abre PR con tests/exact SHA; ninguna escritura en main | PENDING |
| 4 | Judge, Sentinel, rollback y resumen del chat | Resultado rederivado desde efecto real; fallo visible como FAILED/UNVERIFIED | PENDING |
| 5 | Caos y límites: crash, double-click, cuota, replay, roles, conflictos | Sin duplicados, cargos ni elevación; recuperación observable | PENDING |
| 6 | Expansión gradual por capacidad | Cada agente incorporado tiene job real verificado y ownership claro | PENDING |

**Piloto:** una orden concreta para corregir un texto de i18n en rama aislada usando D8 + D9 + D14, con handoffs persistidos; hasta tres workers sólo si locks/cupos lo permiten; PR, CI exact SHA, Judge y Sentinel. Si el modelo gratuito no está disponible, terminar como `BLOCKED_EXTERNAL` con evidencia, no simular.

**Métricas de salida:** `mission_completion_verified_rate`, `duplicate_effects=0`, `unauthorized_actions=0`, `billed_openrouter_cost=0`, `human_gate_bypass=0`, `recovery_rate`, `time_to_verified`, `evidence_completeness`, `cost_per_verified_mission`. No declarar porcentaje de éxito sin muestra observada.

### 15.8 Qué NO hacer

No activar `Empresa Autónoma ON` para probar una interfaz; no crear 118 runners; no dar service-role al navegador; no introducir GitHub PAT en prompts; no añadir migraciones antes de reconciliar contratos; no desplegar Vercel; no modificar `main` salvo documentación autorizada; no autofusionar PR ni marcar VERIFIED con una respuesta de LLM.

### 15.9 Criterio final de decisión

**Go** sólo si hay demostración end-to-end real en UGO TEST de `orden humana → plan → aprobación → asignación → mensajes entre agentes → herramienta GitHub/runner → tests/PR → Judge/Sentinel → resultado visible`, con OpenRouter facturado US$ 0 y sin tocar producción.

**No-go** si cualquiera de esos es una simulación, sólo UI/código sin conectar, carece de evidencia, usa modelo de costo incierto o exige un bypass. Mantener explícitas las dependencias humanas y externas.

La meta “funcionar hoy” es aspiracional y no reemplaza la evidencia; no atribuir una fecha de entrega garantizada a funciones que todavía no se implementaron.



## 16. UGO Hive 2.2 — Mejoras al catálogo de capacidades (propuesta)

**Estado: ESPECIFICACIÓN DOCUMENTADA, NO APLICADA A SUPABASE NI AL RUNTIME.** Basado en auditoría de lectura de UGO Arena TEST y del código existente. Inventario: 118 agentes en 13 departamentos y 119 capacidades registradas, todas con `executor_kind=DETERMINISTIC` en la muestra agregada (7 GREEN, 83 YELLOW, 29 RED). Estas etiquetas son **niveles de autoridad**, no calificaciones de funcionamiento. `capability` identifica una especialidad nominal única por agente, pero no demuestra integración con herramientas. La evidencia previa no autoriza afirmar 118 agentes capaces de programar.

### 16.1 Principio de mejora

**No sumar agentes por sumar.** Reutilizar las 118 identidades existentes; añadir un catálogo versionado de **capacidades operativas**, contratos tipados, conexiones verificadas a ejecutores y capacidades transversales limitadas por política. Los workers son procesos ejecutores, no nuevas identidades de agente. La Reina distribuye un objetivo solamente entre especialistas necesarios.

### 16.2 Siete capacidades transversales

| Capability propuesta | Para qué sirve | Control obligatorio | Prueba mínima |
|---|---|---|---|
| `hive.task.receive.v1` | Tomar subtarea de misión aprobada | Permiso, lease, dependencias, idempotencia | Claim concurrente sin duplicados |
| `hive.message.exchange.v1` | Solicitar y responder hallazgos entre agentes | ACL remitente/receptor, TTL, tamaño, hops, esquema | Handoff A→B persistido y reproducible |
| `hive.memory.read.v1` | Consultar conocimiento verificado con procedencia | RLS, alcance, vigencia, redacción de PII | Recuperar evidencia autorizada, bloquear ajena |
| `hive.tool.invoke.v1` | Ejecutar una herramienta específica | Allowlist, sandbox, permisos y risk gate | Acción autorizada produce efecto y audit log |
| `hive.task.propose_delegate.v1` | Sugerir subtarea/dependencia | Aprobación del planner y scope inmutable | Rechazar delegación fuera de alcance |
| `hive.evidence.submit.v1` | Entregar resultado verificable | Source SHA, artifact, actor, correlation y hash | Judge independiente reproduce el efecto |
| `hive.blocker.escalate.v1` | Informar obstáculos y pedir intervención | Reason code, owner, deduplicación, cooldown | Bloqueo auditable sin retry infinito |

Capacidad transversal **no significa habilitación universal**: cada agente recibe únicamente subconjuntos que necesite. Mensajería, memoria y delegación no transportan privilegios del emisor al receptor.

### 16.3 Contrato mínimo de cada capacidad

```yaml
capability_key: hive.message.exchange.v1
version: 1
owner_department: 1
executor_kind: QUEUE_DISPATCH
bound_tools: []
allowed_agents: [explicit-agent-ids-or-policy-selector]
authority_class: YELLOW
allowed_environments: [UGO_TEST]
required_skill_versions: []
input_schema_ref: hive.message.v1
output_schema_ref: hive.receipt.v1
permissions: [read_mission,send_scoped_message]
rate_limit: {per_job: 12, max_hops: 4}
timeout_seconds: 30
idempotency_scope: mission_job_sender_receiver_kind
evidence_policy: persistent_receipt
verification_policy: independent
rollback_policy: cancel_unclaimed_messages
enabled: false
maturity: CATALOGED
```

Este es un **contrato conceptual**: no crear `executor_kind=QUEUE_DISPATCH`, campos, enums ni privilegios nuevos sin compatibilidad con las tablas/RPC actuales.

### 16.4 Matriz de capacidades especializadas por departamento

| Departamento | Capacidades a fortalecer | Herramientas permitidas inicialmente | Evidencia obligatoria |
|---|---|---|---|
| D1 Dirección | `hive.mission.plan`, `hive.mission.route`, `hive.mission.replan` | Lectura de estados, catálogo de capacidades, planner estructurado | DAG validado, `plan_hash`, versión y autorización |
| D2 Operaciones | `ops.gps.diagnose`, `ops.matching.trace`, `ops.alerts.audit` | Logs anonimizados, queries TEST de sólo lectura, traces | Casos reproducibles, correlation IDs |
| D3 Cliente | `client.journey.inspect`, `client.feedback.classify` | E2E TEST, UI inspect, logs acotados | Captura/traza + criterios de journey |
| D4 Proveedor | `provider.session.diagnose`, `provider.location.inspect`, `provider.offer.trace` | Pruebas auth TEST, GPS simulado identificado, Realtime logs | Sesiones/estados observados, regresiones |
| D5 Crecimiento | `growth.experiment.propose`, `growth.funnel.analyze` | Métricas agregadas, experimentos SHADOW | Fuente de datos y criterio de resultado |
| D6 Confianza | `trust.case.triage`, `trust.evidence.review` | Expedientes TEST desidentificados; nunca resoluciones automáticas sensibles | Decisión propuesta, provenance y human gate |
| D7 Finanzas | `finance.ledger.reconcile`, `finance.debt.audit` | Lectura ledger TEST, pruebas de conciliación | Delta contable + referencias; **sin pagos reales automáticos** |
| D8 Tecnología | `eng.repo.inspect`, `eng.patch.propose`, `eng.test.run`, `eng.pr.prepare` | GitHub API/runner aislado en ramas autorizadas | Diff, SHA, tests, PR, artifacts |
| D9 QA | `qa.test.execute`, `qa.regression.compare`, `qa.evidence.judge` | Runners TEST, browsers TEST, logs | Resultado por prueba, Judge independiente |
| D10 Legal | `legal.policy.diff`, `legal.risk.flag` | Documentos públicos y normas con fecha | Fuente, jurisdicción y revisión humana |
| D11 Marketing | `marketing.copy.draft`, `marketing.i18n.review` | Generación de borradores, diccionarios existentes | Versiones, fuentes y aprobación antes de publicar |
| D12 Producto | `product.ux.audit`, `product.accessibility.test` | UI TEST, auditoría visual y accesibilidad | Hallazgos vinculados a pantallas y tests |
| D14 Auditoría | `audit.permission.verify`, `audit.evidence.challenge`, `audit.gate.inspect` | Lectura de ledger, repos/CI, reglas versionadas | Contrapruebas independientes, Sentinel |

**D9/D14 no se autocertifican:** Judge y Sentinel deben verificar de forma independiente a ejecutores, incluso si se trata de otro agente de su mismo departamento. Acciones de alto riesgo (KYC, datos personales, finanzas, cambios legales, producción) requieren aprobaciones humanas y contratos específicos.

### 16.5 Madurez medible en vez de etiquetas decorativas

Por agente y capacidad, conservar cuatro dimensiones independientes: `CATALOGED` (definición), `WIRED` (herramientas, ACL y ruta conectadas), `EXECUTED` (trabajo real), `VERIFIED` (prueba independiente). Registrar último éxito/fallo, fecha, versión de skill, execution run, job, SHA y expiración de la certificación. No degradar/elevar automáticamente autoridad GREEN/YELLOW/RED por madurez.

Reporte de brechas: `UNWIRED`, `STALE`, `NEVER_EXECUTED`, `FAILED_VERIFICATION`, `CAPABILITY_DUPLICATE`, `PERMISSION_EXCESS`, `MODEL_UNAVAILABLE`. Evitar marcar `VERIFIED` por existencia de un script, UI, RPC, commit o job SUCCEEDED sin efecto comprobado.

### 16.6 Reglas de asignación de la Reina

1. Convertir objetivo en criterios medibles y subtareas DAG; revisar dependencias y trabajos ya abiertos.
2. Para cada tarea, buscar agentes por **capacidad efectiva**, permiso para entorno/recurso, skills versionadas, disponibilidad y conflicto de locks.
3. Preferir cantidad mínima suficiente de especialistas (p.ej. D8+D9+D14), no fanout indiscriminado a 118 agentes.
4. Comunicación entre agentes mediante Message Bus acotado; el receptor verifica su propia autoridad. El planeador puede proponer nueva subtarea, pero no aumentar el alcance aprobado.
5. Asignación sólo si worker conectado y recursos no bloqueados; de lo contrario, estado visible y motivo.
6. En caso de disputa, pedir evidencia reproducible y evaluación independiente, no votación textual.
7. No contabilizar llamadas de razonamiento como trabajos completados. Reutilizar pasos deterministas y memoria antes de consumir cuota gratuita.

### 16.7 Priorización para el piloto

**P0** — D1 (`plan/route`), D8 (`inspect/patch/test/pr`), D9 (`test/judge`), D14 (`audit`) + capacidades transversales `receive`, `message`, `tool`, `evidence`, `blocker` con permisos explícitos.

**P1** — D2 y D4 para GPS, matching, alertas y logout del proveedor, utilizando fixtures TEST y sin confundir simulación de GPS con validación física.

**P2** — D3, D5, D6, D7, D10, D11 y D12 en orden de necesidad de la misión, con mayores controles para dinero, disputas y legislación.

### 16.8 Validación adversarial y criterios de aceptación

- Sólo un worker adquiere cada lease; worker vencido no puede enviar resultado válido (fencing token).
- Agentes A y B intercambian dos mensajes estructurados, con `mission_id` y `correlation_id` consistentes, sin loops.
- Un agente sin permiso no lee mensajes de otro dominio ni ejecuta tool calls privilegiadas.
- El D8 Worker prepara una corrección inocua en rama aislada; D9 ejecuta pruebas exact-SHA y D14 audita.
- Judge y Sentinel verifican el resultado real; fallback prohibido a modelos pagos u otros proveedores.
- Desconexiones, cuota 429, retries y mensajes duplicados no provocan doble efecto ni gasto.
- La política de OpenRouter permanece **US$ 0/mes, modelos gratuitos exclusivamente**.
- Ningún caso autoriza cambios en producción, aprobaciones KYC, transferencias financieras o fusión automática sin un gate aplicable.

**Decisión de arquitectura:** mejorar capacidades, contratos y conectividad del catálogo existente **antes de crear nuevos agentes**. La migración y las pruebas reales requieren una etapa de implementación separada y autorizada.


## 17. UGO Hive 2.3 — Inteligencia colectiva y operación eficiente

**Estado:** DISEÑO DOCUMENTADO, NO IMPLEMENTADO. Las ocho mejoras complementan Hive 2.2, sin sustituir los contratos de seguridad, las skills ni el scheduler existente. Continúa vigente OpenRouter **US$ 0/mes y exclusivamente modelos gratuitos**. No autoriza cambios de producción.

### 17.1 Ocho mejoras de inteligencia colectiva

| Prioridad | Mejora | Mecanismo | Prueba exigida |
|---|---|---|---|
| P0 | Reina con planificación adaptable | Replanifica DAG por nuevas evidencias; nueva versión y aprobación si cambia alcance, permisos o riesgo | Un cambio invalida la aprobación anterior; no se ejecutan subtareas añadidas sin autorización |
| P0 | Pizarra colectiva por misión | Blackboard persistente de hallazgos, hipótesis, artefactos, bloqueos y decisiones con versiones y procedencia | Agente B continúa el trabajo de A tras caída de worker sin repetir investigación ni perder evidencia |
| P1 | Reputación técnica basada en resultados | Métricas por agente/capacidad de jobs VERIFIED, fallos, regresiones, tiempo y muestra suficiente | Routing usa calidad únicamente entre agentes elegibles y autorizados; no eleva permisos |
| P0 | Supervisor de conflictos | Detecta ediciones concurrentes, PRs solapados, recursos exclusivos, inconsistencias y conclusiones opuestas | Dos workers no escriben el mismo recurso; contradicciones se resuelven con evidencia o escalan |
| P0 | Presupuesto de razonamiento | Preferir reglas deterministas, caché válida y evidencia antes de invocar modelo; cuotas por misión/worker | Ninguna llamada facturable y ningún bucle consume cuota ilimitada |
| P1 | Simulador de misiones | Dry-run de DAG, actores, herramientas, dependencias, locks, alcance, autorizaciones y riesgo | Simulación no crea efectos ni declara pruebas reales VERIFIED |
| P0 | Detector de trabajo repetido | Deduplicación por objetivo normalizado, recursos, source SHA, correlation y jobs/PR activos | No abrir otro job o PR si uno equivalente sigue activo; preservar excepciones justificadas |
| P0 | Memoria con caducidad y confianza | Cada hecho guarda autor, origen, SHA, timestamp, alcance, expiry, corroboración y clasificación | Información stale de CI/modelos/gates no se presenta como estado actual |

### 17.2 Blackboard: pizarra colectiva por misión

La pizarra **no es un chat sin límites ni otra fuente de verdad**. Es una vista indexada sobre eventos/evidencias del mission ledger y Message Bus, reutilizando entidades actuales cuando alcancen. Un registro propuesto:

```json
{
  "mission_id": "uuid",
  "entry_id": "uuid",
  "kind": "FINDING",
  "author_agent_id": "uuid",
  "job_id": "uuid",
  "summary": "Hipótesis sobre pérdida de sesión al publicar GPS",
  "evidence_refs": ["evidence-id"],
  "source_sha": "git-sha",
  "created_at": "ISO8601",
  "valid_until": "ISO8601",
  "confidence_basis": "TEST_REPRODUCTION",
  "access_scope": "ugo-test-provider-auth",
  "supersedes_entry_id": null,
  "verification_state": "UNVERIFIED"
}
```

Tipos propuestos: `FINDING`, `QUESTION`, `HANDOFF`, `BLOCKER`, `DECISION`, `EVIDENCE`, `CONTRADICTION`, `RESOLUTION`. Ningún hallazgo autorreportado pasa automáticamente a verdad verificada. La vista muestra hallazgos confirmados, hipótesis, controversias y evidencia por separado. Limitar cantidad/tamaño, redactar PII, aplicar scopes y RLS, y prevenir instrucciones maliciosas inyectadas por documentos, logs o agentes.

### 17.3 Replanificación y conflictos

- La Reina puede **proponer** cambios al DAG basándose en evidencia nueva; versionar y explicar el diff.
- Si cambia entorno, recurso, autorización, costo, tipo de herramienta o riesgo, solicitar nueva aprobación de `plan_hash` exacto; nunca heredar autorización de forma implícita.
- Establecer invariantes: un solo lease por recurso exclusivo, fencing tokens para workers expirados, idempotencia por efecto, bloqueo de PR solapado y ledger histórico conservado.
- Para desacuerdos técnicos, ejecutar una contraprueba independiente antes de decidir; escalar si no hay evidencia suficiente. No votar por el número de agentes ni por el texto más persuasivo.

### 17.4 Reputación responsable y métricas empresariales

La reputación es un **indicador técnico de resultados observados**, no una puntuación humana general. Usar ventanas temporales, confianza estadística, tamaño de muestra y penalización explícita de resultados stale. No optimizar por volumen de mensajes, commits, tokens, PRs o autoevaluaciones.

**KPIs propuestos:** `verified_mission_rate`, `time_to_verified`, `useful_handoffs`, `duplicate_effects`, `recovered_jobs`, `conflict_preventions`, `human_approvals_required`, `stale_fact_rejections`, `openrouter_billed_usd`, `policy_denials`, `evidence_completeness`. Denominadores y períodos visibles; no inventar datos.

### 17.5 Estrategia de razonamiento gratuito

```text
Nueva tarea → ¿resultado verificable cacheado y vigente?
  ├─ sí: reutilizar con SHA y límites de contexto
  └─ no: ¿regla/prueba determinista suficiente?
          ├─ sí: ejecutar herramienta permitida
          └─ no: validar catálogo y costo cero OpenRouter
                  ├─ elegible y cuota disponible: consultar con límite
                  └─ no: WAITING_MODEL/BLOCKED_EXTERNAL, sin gasto
```

Control compartido de peticiones/tokens por misión, agente y ventana de tiempo. Rechazar costos inciertos, fallbacks pagos o hacia otros proveedores, incluso desde el chat de planificación. Separar gasto de OpenRouter de cualquier costo eventual de infraestructura.

### 17.6 Interfaz Command Center

Cuatro áreas conectadas: **Conversar, Planificar, Colmena, Resultados**. La sección Colmena incluirá una **pizarra de misión** con hallazgos, preguntas, contribuciones, contradicciones, jobs asignados y artefactos. Mostrar fuente/fecha/estado de verificación y marcar visiblemente datos obsoletos. Añadir visualización *dry-run* del DAG y conflictos antes de aprobar, y controles de pausa/reanudación sujetos a servidor y permisos.

### 17.7 Fases de implementación (subordinadas al primer MVP)

1. **P0 mínimo:** Reina → plan aprobado → bus/pizarra → D8 GitHub Worker → D9 pruebas → D14 auditoría; única misión TEST con evidencia completa.
2. **P0 robustez:** replanificación segura, deduplicación, locks y control central de llamadas gratuitas, memoria con caducidad y recuperación.
3. **P1 optimización:** simulador de misiones, reputación técnica con suficiente evidencia y selección informada de especialistas.
4. **Expansión:** incorporar demás departamentos conforme a capacidad real verificada, sin activar 118 ejecutores simultáneos.

**Criterio de aceptación de Hive 2.3:** una misión real de UGO TEST sobrevive caída de un worker, evita PR duplicado, comparte evidencia entre al menos dos especialistas, no reutiliza un hecho stale, respeta aprobación de alcance y termina en prueba exact-SHA con Judge/Sentinel. OpenRouter facturado debe permanecer en cero; de otro modo fallo/no-go. Producción intacta.

### 17.8 Decisión arquitectónica

Mantener el diseño en **tres bloques**: (1) *Cerebro*: Chat/Reina/memoria/presupuesto; (2) *Sistema nervioso*: scheduler/bus/pizarra/locks; (3) *Brazos*: GitHub Worker/ejecutores TEST/QA/Judge/Sentinel. No crear una segunda plataforma, tablas duplicadas ni agentes ornamentales. Cerrar nuevas funcionalidades hasta validar el flujo vertical primero.



## 18. UGO Hive 3.0 — RUNBOOK DE IMPLEMENTACIÓN AUTÓNOMA PARA CHATGPT

**Fecha de especificación:** 18/10/2026. **Estado:** APROBADO COMO PLAN DOCUMENTAL, NO COMO PERMISO DE EJECUCIÓN. Este runbook prevalece como orden recomendado de implementación sobre las fases exploratorias anteriores, pero conserva todas las prohibiciones anteriores. El objetivo es que ChatGPT u otro ejecutor autorizado pueda reconstruir el estado y continuar de manera autónoma de una sesión a otra **sin fingir trabajo en segundo plano**. La persistencia vive en GitHub/Supabase; un chat sin tarea programada o worker externo no continúa ejecutándose por sí mismo.

### 18.1 Evidencia externa e implicaciones prácticas

Referencias consultadas en octubre de 2026:

- OpenAI Agents SDK / orchestration: manager-as-tools frente a handoffs, con orquestación combinable en código y LLM. https://openai.github.io/openai-agents-js/guides/multi-agent/
- OpenAI Agents SDK / handoffs: validación de autorización del handoff antes de efectos; los mensajes del modelo no confieren autoridad. https://openai.github.io/openai-agents-js/guides/handoffs/
- OpenAI Agents SDK / tracing: trazas por ejecución, tool calls, delegación y guardrails. https://openai.github.io/openai-agents-python/tracing/
- Temporal / idempotency: una actividad reintentada puede tener efecto previo aunque el worker haya caído antes de notificar éxito; **requerir idempotencia y fencing**. https://github.com/temporalio/documentation/blob/main/docs/develop/python/best-practices/error-handling.mdx
- OpenRouter / precios y límites: nivel Free disponible, límites variables por cuenta (página de precios observada: 50 solicitudes/día sin compra de créditos, 20/minuto para modelos free); confirmar límites efectivos, disponibilidad y metadatos de precios en cada ejecución. https://openrouter.ai/pricing y https://openrouter.ai/docs/api-reference/limits

**Decisión:** usar arquitectura híbrida **supervisor central + handoffs estructurados + scheduler determinista**. La Reina posee el plan y la respuesta al fundador; los especialistas pueden colaborar sin convertirse en superusuarios, y las herramientas se ejecutan mediante políticas de código, no por instrucciones libres. No adoptar un framework externo sólo por moda: evaluar primero si las primitivas actuales de UGO satisfacen el contrato.

### 18.2 Contrato de operación para ChatGPT autónomo

Cuando el usuario **autorice expresamente la implementación** de Hive, el ejecutor debe seguir este procedimiento en cada sesión:

1. Leer este documento y `AGENTS.md`, `docs/UGO_SCHEDULER_POLICY.json`, locks, skills, migraciones, esquemas y PRs relevantes.
2. Obtener **SHA actual de main**, PRs abiertos, estado de CI y configuración de UGO Arena TEST. No confiar en el SHA documentado aquí para hacer cambios futuros.
3. Leer el último checkpoint de implementación y el ledger de evidencia; comprobar que corresponde a main/branch actual. Si falta, iniciar Fase 0.
4. Seleccionar **una unidad verificable desbloqueada**, priorizando camino crítico, sin duplicar PRs ni tocar recursos bloqueados.
5. Crear rama aislada autorizada; implementar **sólo esa unidad** y sus tests contractuales. No hacer refactor masivo ni mezclar modificaciones ajenas.
6. Ejecutar pruebas locales/CI y, cuando sea aplicable, runtime TEST con efectos observables; verificar SHA y artifact. Si falla: causa raíz → corrección acotada → reprobar, hasta límites de política.
7. Pasar resultados a Judge independiente y Sentinel; registrar `DONE/FAILED/BLOCKED` con evidencia. Un commit o un PR no significan DONE.
8. Actualizar checkpoint y próximos pasos de forma persistente y atómica; abrir/actualizar PR con reporte claro.
9. Continuar con la siguiente unidad **sólo si** existe presupuesto, ventana de ejecución, permisos y pruebas; de lo contrario guardar estado y finalizar sin prometer ejecución futura.
10. No fusionar ni desplegar a producción sin autorización aplicable, CI same-SHA, políticas del repositorio y verificaciones completas.

**Condición esencial:** este documento por sí solo no activa agentes ni constituye autorización para escrituras funcionales, cambio de permisos, gasto o despliegue.

### 18.3 Formato obligatorio del checkpoint de continuidad

Ruta propuesta: `docs/ugo-hive/IMPLEMENTATION_STATUS.md` (crear **cuando se autorice la implementación**, no ahora), con información:

```yaml
hive_plan_version: "3.0"
repo: "sebastisnzoth/ugo-admin-panel"
main_sha_at_checkpoint: "<SHA>"
implementation_branch: "<branch-or-none>"
phase: "H0"
task_id: "H0-01"
status: "PENDING" # DONE | PENDING | FAILED | BLOCKED_EXTERNAL | BLOCKED_HUMAN
last_run_id: null
source_sha: null
result_sha: null
pr_number: null
evidence_refs: []
judge: "NOT_RUN"
sentinel: "NOT_RUN"
risks: []
blockers: []
next_task_ids: ["H0-02"]
updated_at: "<UTC>"
```

Actualizar junto con evidencia; evitar sobrescrituras concurrentes por CAS/versionado, idempotencia y locks. No poner secrets ni PII. Los checkpoints son **índices de progreso**: contrastarlos contra GitHub, Supabase y CI antes de declararlos válidos.

### 18.4 Secuencia de ejecución: fases y dependencias

**H0 — Inventario y contratos existentes (read-only; desbloquea todas las fases)**

- `H0-01`: reconstruir HEAD, PRs y locks; identificar owner de cada cambio para evitar colisiones.
- `H0-02`: inventariar tablas/RPC de jobs, agent registry, capabilities, leases, ledger, approval, Realtime y scheduler, sólo en TEST.
- `H0-03`: para D1/D8/D9/D14 y capacidades involucradas crear matriz `CATALOGED/WIRED/EXECUTED/VERIFIED`; no inferir ejecución desde registros.
- `H0-04`: reconciliar estados permitidos, RLS, IDs, `ON/OFF/SAFE_MODE`, llaves externas y esquema de evidencia.
- `H0-05`: baseline de test/lint/build y workflows reproducibles exact-SHA; registrar fallas preexistentes.
- **Gate H0:** reporte exact-SHA y diseño de mínima migración; cero colisiones no resueltas.

**H1 — Modelo de misiones y planner read-only (depende de H0)**

- `H1-01`: contrato tipado de `Mission, PlanVersion, TaskDAG, Approval, CapabilityRequirement` y validación JSON Schema/Zod reutilizando dependencias existentes.
- `H1-02`: parser de intención con contexto limitado, listas allowlist y redacción PII; planificador determinista fallback para tareas predefinidas.
- `H1-03`: `HiveFreeOpenRouterAdapter` exclusivamente OpenRouter, modelos con precio cero comprobado, cuota/día/minuto central, timeout, reintento acotado y bloqueo en incertidumbre.
- `H1-04`: pruebas de DAG sin ciclos, requisitos de aceptación, dependencia, riesgos, permisos y límites de alcance.
- `H1-05`: endpoint de generación/revisión de borrador sin tool write ni ejecución.
- **Gate H1:** una instrucción válida produce plan versionado y validado; cuota agotada bloquea sin cobro; prompts hostiles no elevan permisos.

**H2 — Chat de Dirección y aprobación segura (depende de H1)**

- `H2-01`: vista React responsiva de Conversar/Planificar/Colmena/Resultados, con PT-BR/es/en y accesibilidad.
- `H2-02`: Auth/RLS: comprobar Super Admin en backend en cada acción; nunca depender de un rol editable por el cliente.
- `H2-03`: guardar conversaciones, borradores y diffs de plan en backend, sólo datos autorizados.
- `H2-04`: aprobar `plan_hash` exacto, expiración, alcance, risk cap y ambiente. Replanificación invalida autorización anterior.
- `H2-05`: vista de dry-run de DAG, dependencias, locks, recursos, permisos y simulación **marcada explícitamente como simulación**.
- **Gate H2:** usuario no autorizado no ve/ejecuta misión; doble clic no duplica; aprobación versión N no autoriza versión N+1.

**H3 — Colaboración: inbox, outbox y pizarra (depende de H1 y H0; integración UI con H2)**

- `H3-01`: mapear Message Bus/Blackboard sobre ledger existente; migración aditiva TEST sólo si la brecha está demostrada.
- `H3-02`: validar tipo de mensaje, sender/recipient, `mission_id/job_id/correlation/causation`, TTL y ACL.
- `H3-03`: deduplicar mensajes y limitar hops, cantidad, tamaño, retry y datos sensibles.
- `H3-04`: pizarra materializada como vista de eventos con procedencia, vigencia, evidencia y estado `HYPOTHESIS/VERIFIED/STALE`.
- `H3-05`: implementar A→B→A, handoff y recuperación tras reinicio, sin transferir privilegios.
- **Gate H3:** dos agentes intercambian hallazgos persistidos en TEST y sobreviven reinicio; no loops, duplicados ni exfiltración.

**H4 — Ejecutor GitHub en sandbox (depende de H0 y H2; consume H3 para colaboración)**

- `H4-01`: reutilizar D8/skills `ugo-github-ops` existentes; no registrar nuevo agente por defecto.
- `H4-02`: contrato de `ToolInvocation` con acciones allowlist (`read_file`, `inspect_pr`, `create_test_branch`, `apply_scoped_patch`, `run_allowed_tests`, `open_pr`) y entradas tipadas.
- `H4-03`: credenciales mínimas, aislamiento filesystem/runner y egress; negar acceso a service-role PROD, shell arbitrario y secrets en prompts/logs.
- `H4-04`: locks por recurso/archivo/branch, fencing token y drift check de SHA. Abrir PR, nunca merge por defecto.
- `H4-05`: runner emite artifacts exact-SHA y datos de trazabilidad job/run/branch/PR.
- **Gate H4:** tarea inocua en TEST prepara patch con tests y PR; sin escritura en main ni producción.

**H5 — Scheduler, workers y reina colaborativa (depende de H3+H4)**

- `H5-01`: vincular misión a jobs canónicos con idempotencia y DAG; no montar segundo scheduler.
- `H5-02`: asignar agentes por `required_capability → authority → skill/tool → availability → lease/lock → quota`.
- `H5-03`: 1 worker de extremo a extremo, luego escalar a 3 workers únicamente para recursos no conflictivos; mantener `openrouter=1` y `ugo-test-worker=1` hasta pruebas y cambio explícito de política.
- `H5-04`: Reina integra resultados/hallazgos, propone subtareas y replanifica; cambios materiales requieren nueva aprobación.
- `H5-05`: distinguir mensajes entre agentes (sin costo de modelo) de turnos de razonamiento (cuota compartida).
- **Gate H5:** al menos 2 especialistas colaboran en una misión, un worker ejecuta efecto real autorizado, no se duplica ningún recurso ni se consume modelo pago.

**H6 — Judge, Sentinel, recuperación y observabilidad (depende de H5)**

- `H6-01`: conectar ledger de evidencias con run_id/PR/SHA y criterios de aceptación. Un LLM no emite el dictamen final.
- `H6-02`: Judge independiente reproduce evidencia en TEST; Sentinel evalúa invariantes, permisos, gasto y entorno.
- `H6-03`: crash/restart, expiración de lease, fencing, reintentos, backoff, dead-letter y reparación idempotente.
- `H6-04`: detección de PR duplicado, conflicto de patches, replays, doble aprobación, prompt injection, cuota 429 y pérdida de Realtime.
- `H6-05`: tablero de métricas: misiones VERIFIED, handoffs útiles, errores recuperados, duplicados, tiempos, costo facturado, bloqueos humanos; reconciliación si el panel pierde conexión.
- **Gate H6:** Judge PASS + Sentinel PASS a misma evidencia/SHA; caos y pruebas negativas pasan; reportes no inventan métricas.

**H7 — Piloto completo y expansión (depende H0–H6)**

- `H7-01`: solicitar por Chat de Dirección corrección pequeña de i18n en UGO TEST sin tocar datos sensibles.
- `H7-02`: Reina prepara plan, usuario autoriza hash; D8 investiga/repara, D9 prueba y D14 audita mediante mensajes persistidos.
- `H7-03`: crear rama+PR y mostrar pruebas exact-SHA, Judge/Sentinel y estado real en chat.
- `H7-04`: pasar de una misión a tres misiones de diferentes especialidades sólo si las cuotas y locks lo permiten.
- `H7-05`: auditar y habilitar progresivamente capacidades de los demás departamentos, con pruebas específicas y métricas de madurez.
- **Gate H7:** un ciclo íntegro verificable y reversible. `CUSTOMER_1` y activación de empresa siguen sujetos a sus gates propios; no declarar lanzamiento por lograr piloto Hive.

### 18.5 Pruebas automáticas obligatorias por bloque

| Categoría | Prueba mínima | Resultado ante fallo |
|---|---|---|
| Validación | Zod/JSON Schema rechaza plan inválido, DAG cíclico y capability inexistente | INVALID_PLAN |
| Autorización | client/provider/admin no crean ni aprueban misión Super Admin | DENIED |
| Costos | respuesta de catálogo sin precio o modelo de pago, 429 y router ambiguo | WAITING_MODEL / BLOCKED_EXTERNAL |
| Mensajería | replay, TTL, duplicado, sender inválido, exceso de hops | REJECTED_MESSAGE |
| Concurrencia | dos workers compiten por el mismo job/recurso | un solo lease válido |
| Crash | worker cae tras side effect antes de ack | retry sin segundo efecto |
| GitHub | PR concurrente/HEAD drift/archivos solapados | pausa + reconciliación |
| Seguridad | prompt injection, fuga de secretos, modificación PROD | DENIED + evidencia redactada |
| Independencia | autor ejecutor intenta firmar Judge y Sentinel | REJECTED |
| Exact-SHA | CI de SHA diferente o artifacts ausentes | UNVERIFIED |
| UX | sin conexión Realtime, sesión vencida, mobile y PT-BR | estado coherente + recuperación |

### 18.6 Presupuesto operativo para OpenRouter (US$ 0)

- **Restricción absoluta**: ninguna llamada Hive pagada. Si un modelo o router no puede demostrar costo cero, no usarlo.
- La cuenta gratuita de OpenRouter tiene límites externos. La documentación de precios revisada en octubre de 2026 muestra 50 solicitudes gratuitas diarias para el nivel sin compra de créditos, y 20 por minuto; confirmar con `/api/v1/key` o mecanismo vigente sin exponer token. Los límites no constituyen un SLA.
- Propuesta de cuota conservadora inicial: **hasta 20 solicitudes de modelo por día para todas las misiones Hive**, con reserva para Chat/Reina y validación; esta es cuota **interna configurable**, no afirmación sobre la cuenta externa. No permitir préstamo o bypass por agente.
- Usar una llamada de planner por misión cuando sea viable; comunicación interagente vía base de datos; resumir contexto sin perder evidencia; usar código/pruebas deterministas para validación, Judge y Sentinel.
- Si falta cuota, persistir estado `WAITING_MODEL`/compatible, mostrarlo al usuario y continuar sólo trabajos deterministas autorizados. No pasar a un modelo pagado ni a otro proveedor.
- Distinguir factura de API de costos externos: GitHub Actions, Supabase y runner pueden tener cuotas/costos diferentes; revisar antes de ejecutar.

### 18.7 Riesgos residuales y mitigaciones concretas

1. **Prompt injection entre agentes** → mensajes de agentes/documentos son datos; permisos y tool calls revalidados en servidor.
2. **Cascada de subtareas** → máximo número de nodos por misión, límite de profundidad/hops, cuota diaria y revisión de expansión material.
3. **Memoria obsoleta** → timestamp, provenance, SHA y `valid_until`; hechos stale no gobiernan decisiones.
4. **Efectos duplicados** → idempotency keys, outbox y fencing token, reconciliación tras crash.
5. **Secuestro de la Reina** → planner sin permisos de mutación, autoridad independiente del LLM.
6. **Aprobación accidental** → vista previa, plan_hash, expiración y consentimiento explícito, doble comprobación en API.
7. **GitHub incongruente** → inspeccionar PRs/locks existentes, base SHA, artifacts y CI same-SHA.
8. **Modelo gratuito no disponible** → degradación segura, cola sin gasto y reintentos limitados.
9. **Dependencia de una sola sesión ChatGPT** → checkpoints en sistemas persistentes y workers autorizados; nunca presumir ejecución fuera de la sesión.
10. **Autoaprendizaje inseguro** → propuesta de skill y pruebas; no permitir que el agente se otorgue permisos ni cambie políticas por sí mismo.

### 18.8 Esquema de ejecución y salida para cada entrega autónoma

Registrar en checkpoint, PR y resumen:
`MAIN_SHA | PHASE/TASK_ID | OWNERSHIP/LOCK | CHANGES | TESTS | RUN_ID | SOURCE_SHA/RESULT_SHA | EVIDENCE_REFS | JUDGE | SENTINEL | COST | STATUS | NEXT_UNBLOCKED_TASK | HUMAN_REQUIRED`.

Estados de reporte (no necesariamente estados SQL): `DONE`, `PENDING`, `FAILED`, `UNVERIFIED`, `BLOCKED_EXTERNAL`, `BLOCKED_HUMAN`.

**Regla de decisión automática:** si una unidad no puede probarse, no llamarla DONE; si hay riesgo de afectar producción, gasto o trabajo de otro actor, detener la acción y conservar checkpoint; si existe otra unidad autónoma segura desbloqueada, continuar con ella. No fabricar tiempos de entrega.

### 18.9 Definition of Done para la primera colmena operativa

- Super Admin instruye desde el chat autenticado.
- Planner devuelve DAG válido, hash y criterios observables.
- Se aprueba versión exacta y se rechazan cambios posteriores no autorizados.
- Dos especialistas se comunican usando registros persistidos, permisos y correlación.
- GitHub Worker ejecuta patch permitido en rama aislada, tests y PR.
- D9 verifica pruebas y D14/independent Judge + Sentinel comprueban evidencia real exact-SHA.
- El chat muestra trazas, bloqueos, costos y estado sin afirmaciones falsas.
- Retries/crash/duplicados/modelo sin cuota no producen efectos repetidos ni cobros.
- Costo OpenRouter facturado = US$ 0; producción intacta; no se forzó Autonomy ON.

**Solo entonces:** `HIVE_MVP_VERIFIED`. La integración completa de los 118 agentes exige validación posterior de cada capacidad; el piloto no equivale a empresa autónoma ni a `CUSTOMER_1` aprobado.

### 18.10 Orden operativo para ChatGPT (resumen copiable)

> Actuá como ejecutor de UGO Hive siguiendo la sección 18 del documento maestro en `main`. Antes de actuar, reconciliá SHA, PRs, locks, skills, DB TEST, gates y checkpoint. Elegí la primera tarea H0–H7 aún no verificada y desbloqueada. Si estás autorizado, implementá en rama aislada con cambios mínimos, probá y reproba, guardá evidencia exact-SHA y solicitá evaluación Judge/Sentinel independiente. Actualizá checkpoint y PR, y continuá sólo con otras tareas seguras autorizadas. Nunca uses modelos pagos, fuerces ON, toques producción sin autorización, simules pruebas humanas ni marques VERIFIED por código o documentación. Al terminar la sesión dejá reporte real y próxima tarea. Si no estás autorizado a implementar, limitate a auditoría y planificación sin escrituras funcionales.

### 18.11 Cierre de diseño

No introducir otra plataforma central de orquestación salvo demostración de que el scheduler existente no puede satisfacer el contrato. **Primero un flujo vertical completo y real, después robustez y escalado.** La eficacia de la colonia se mide por resultados empresariales verificados, no por el número de hormigas, mensajes, tokens o PRs.

**Documento de diseño únicamente. No implementar ni activar autonomía hasta nueva autorización.**


---

## 19. Actualización 18/10/2026 — FreeLLMAPI, Render y ejecución autónoma por checklist

**Estado:** DISEÑO Y PLAN DE IMPLEMENTACIÓN; NO DESPLEGADO NI VERIFICADO. **Destino de este cambio:** rama del PR #515, nunca `main` directamente. Esta sección prevalece sobre menciones anteriores a OpenRouter como proveedor único, sin derogar las restricciones de gasto cero, privacidad, gates y producción. Referencia de avance de implementación: [PR #515](https://github.com/sebastisnzoth/ugo-admin-panel/pull/515).

### 19.1 Decisión arquitectónica y límites de la decisión

- **Hugo / UGO Maestro:** conversación, definición y supervisión de misiones; no es un ejecutor privilegiado.
- **Hive (la colmena):** scheduler, agentes catalogados, mensajes tipados, leases, herramientas autorizadas, Judge, Sentinel y evidencias en Supabase TEST; **no crear una segunda colmena**.
- **`ugo-hive-model-router` (PR #515):** punto de autorización backend de inferencia; se transforma en adaptador agnóstico de proveedor con política `deny-by-default`, pero **permanece con inferencia deshabilitada hasta satisfacer gates**.
- **FreeLLMAPI:** agregador de proveedores gratuitos **preferido**, alojado como servicio privado separado; selección de modelo/endpoint y recuperación ante fallos sólo entre rutas permitidas y verificadas.
- **OpenRouter:** respaldo opcional, exclusivamente modelos realmente gratuitos, sin fallback pago ni recargas; la clave existente en Supabase jamás llega a navegador, logs, prompts o terceros que no la requieran.
- **Render Free:** candidato de hospedaje de FreeLLMAPI, *no despliegue confirmado*. Exige verificar disponibilidad sin tarjeta, configuración persistente y términos/cuotas vigentes. La suspensión por inactividad es aceptable, con cold start y timeout de cliente controlados. No se recomienda mantenerlo despierto con pings artificiales como dependencia de operación.
- **Persistencia:** SQLite local en Render Free no se considera durable. Evaluar primero si FreeLLMAPI admite oficialmente un backend durable externo. Si no, proponer adaptador externo seguro con transacciones, restauración, cifrado, rotación y pruebas de recuperación; **no asumir que un backup SQLite ocasional alcanza**. Las credenciales deben mantenerse en un secret store backend, preferentemente por servicio, y sin exportación en claro.
- **Trabajos reales, no ficticios:** análisis y correcciones reales del repositorio UGO en ramas TEST/sandbox, con tests sobre contratos reales y evidencias same-SHA; **no exportar datos personales reales o secretos a endpoints gratuitos** sin base legítima, minimización, permiso y evaluación de términos/retención.
- **Costo cero:** no tarjeta, no plan pago, no consumo facturable autorizado. Si algún proveedor, recurso o licencia no permite verificar el cumplimiento, su ruta queda **BLOCKED_EXTERNAL**; nunca sustituir con servicio pago de manera automática.
- **Enjambre efectivo:** mantener el catálogo de 118 identidades y comenzar con uno y luego hasta tres workers autorizados, no 118 sesiones LLM continuas. Router devuelve respuesta/modelo y metadatos; no decide permisos de herramientas ni modifica jobs directamente.

```text
Super Admin / Hugo ─► Mission API (TEST, auth, plan_hash, policy)
                         │
                  Hive Scheduler existente
                         │
                  Model Gateway TEST (PR #515)
                      ┌──┴──────────────────────┐
                      │                         │
               FreeLLMAPI privado          OpenRouter FREE
                 Render Free                respaldo opcional
                      │
           Proveedores gratis permitidos
                      │
              Respuesta no confiable
                      ▼
    Worker sandbox/allowlist → evidencia → Judge → Sentinel → gate humano
                      │
             Supabase TEST (estado/auditoría)
```

**Nota de versión:** reemplazar conceptualmente en secciones 1, 6, 13 y 15 las frases `OpenRouter como único proveedor`, `HIVE_MODEL_PROVIDER_ALLOWLIST=["openrouter"]` y `sin fallback a otros proveedores` por la política **`provider_order=[freellmapi,openrouter]` con únicamente endpoints aprobados y costo facturable cero**. Las demás protecciones anteriores permanecen intactas. No editar configuraciones de runtime sólo por cambiar esta documentación.

### 19.2 Fotografía verificada y bloqueos actuales

- PR #515: `OPEN / DRAFT / NO MERGED`; rama `codex/hive-openrouter-test-router-20261018`; incluye función Supabase `ugo-hive-model-router` y pruebas contractuales; reconoce `HIVE_INFERENCE_NOT_ENABLED`. **No ejecuta todavía inferencia, Reina, workers ni pruebas integradas.**
- El limitador local `Map` del PR #515 **no es cuota durable, global ni atómica**. El código de pruebas es estático; no acredita autenticación real, llamada a modelos ni costo facturado cero.
- Render: auditoría previa de solo lectura informó un workspace accesible, cero PostgreSQL y cero Key Value; la respuesta de listado de servicios web no permitió concluir que no existieran. **No se ha creado servidor ni comprobado persistencia.**
- No atribuir éxito a la existencia del documento, al estado de una API key, a CI superficial o a un modelo etiquetado `free`. Revalidar estado exacto de GitHub, cuentas, plan gratuito, términos y claves durante ejecución.

### 19.3 Política de agentes autónomos y mínima interrupción humana

**Autorizado sin consultar nuevamente, dentro del alcance de esta actualización documental y de lectura:** inspeccionar repos, contratos, código, PR, documentación y recursos en modo solo lectura; ejecutar comprobaciones locales no destructivas; redactar plan, matriz de riesgos, pruebas y evidencias; informar hallazgos; continuar al siguiente paso técnicamente seguro.

**Requiere permisos específicos nuevos y por acción:** crear/cambiar servicios Render, secretos o recursos externos; alterar bases de datos/esquemas/políticas Supabase; desplegar Edge Functions; invocar modelos con datos reales sujetos a revisión de privacidad; habilitar inferencia y gastos; escribir código fuera de una rama ya autorizada; fusionar PR; cambiar producción; activar Empresa Autónoma ON o hacer pagos. Una autorización a documentar **no es autorización a desplegar**.

**Escalada mínima:** interrumpir al fundador únicamente por bloqueo real de conexión/permiso, decisión de costo/privacidad, acción irreversible, cambio de alcance o aprobación humana exigida por gate. Agrupar solicitudes relacionadas en una única aprobación acotada indicando acción, recurso, riesgo, rollback y alcance; no pedir permiso para lectura o verificación ya autorizada. Si falta permiso, registrar `WAITING_APPROVAL` y continuar tareas independientes seguras; no simular autorizaciones ni implementar bypass.

**Autonomía operativa:** la ejecución continua **requiere** scheduler/runner real, persistente o reactivable, presupuesto de cómputo y permisos concedidos. Un documento o una conversación de ChatGPT no constituyen ejecución en background. Scheduler puede trabajar por eventos o cron con límites y detención segura; si no hay infraestructura, informar `NOT_DEPLOYED`.

### 19.4 Plan de implementación secuencial, con checklist y salidas verificables

Cada ítem comienza `[ ] PENDING`; cambiarlo a `[x] VERIFIED` **sólo** con enlace a commit exact-SHA, resultado de prueba y evidencia reproducible, no por autodeclaración del agente. Registrar `owner_agent, task_id, status, started_at, finished_at, environment, source_sha, evidence_refs, blocker_code, next_action`.

**Fase 0 — Inventario, compatibilidad y no regresión (sin escrituras funcionales)**
- [ ] F0.1 Releer `main`, PR #515, migraciones, contratos y gates; conservar todos los cambios ajenos y registrar SHAs.
- [ ] F0.2 Localizar dependencias reales de `ugo-hive-model-router`, permisos Super Admin, Reina, scheduler, workers y capacidades.
- [ ] F0.3 Auditoría de licencias/términos de FreeLLMAPI y de cada proveedor; clasificar `TEST_ALLOWED / COMMERCIAL_ALLOWED / UNVERIFIED / DENIED`.
- [ ] F0.4 Inventariar datos que saldrían a terceros y definir minimización, cifrado, retención, consentimiento/base legal cuando corresponda; bloquear rutas no aprobadas.
- **Gate G0:** matriz de integración, riesgos y contratos exact-SHA completa; ninguna escritura de producción.

**Fase 1 — Alojamiento gratuito y persistencia segura (propuesta → aprobación → ensayo)**
- [ ] F1.1 Auditar solo lectura disponibilidad de Render Free, región, runtime, horas, suspensión, salida de red, límites y costos/tarjeta con evidencia vigente.
- [ ] F1.2 Revisar requisitos reales de instalación FreeLLMAPI (Docker/Node, SQLite, runtime, puertos, variables, cifrado, almacenamiento); NO suponer compatibilidad sin build.
- [ ] F1.3 Seleccionar almacén durable gratuito existente si permite aislamiento, cifrado, integridad, copia y recuperación; validar que una pérdida del filesystem de Render no pierda credenciales ni configuración.
- [ ] F1.4 Diseñar creación de secretos (Render/Supabase) sin mostrarlos y autenticación entre servicios, egress allowlist y rotación.
- [ ] F1.5 Preparar despliegue reproducible, rollback y tests de arranque; **solicitar aprobación explícita antes de crear cualquier servicio**.
- [ ] F1.6 Tras aprobación, ejecutar prueba real de restart/redeploy, concurrencia y restauración; medir cold start y verificar autenticación.
- **Gate G1:** evidencia de persistencia ante reinicio, costos y no tarjeta confirmados, claves protegidas; si falla, `BLOCKED_EXTERNAL`, no continuar con conexiones reales.

**Fase 2 — Modelo de costos y gateway (sobre PR #515)**
- [ ] F2.1 Refactorizar el gateway en la rama autorizada, preservando auth y alcance TEST; `providers=[freellmapi,openrouter]` definidos por servidor y allowlist de endpoints.
- [ ] F2.2 Introducir cuotas globales persistentes y transaccionales por usuario, misión, proveedor y día; reserva atómica, límites de tokens, tamaño, concurrency, expiry, cancelación y rechazo 429; prohibido usar `Map` como control global.
- [ ] F2.3 Catalogar proveedor/modelo con capacidad, precio en todas las dimensiones facturables, términos, estado y TTL; ante precio desconocido, pago posible, o catálogos inconsistentes, rechazar.
- [ ] F2.4 Fallos 429/timeout: backoff acotado, `Retry-After`, circuit breaker, idempotencia y `WAITING_MODEL`; fallback solamente a proveedores gratuitos aprobados, nunca pago.
- [ ] F2.5 Mantener `HIVE_INFERENCE_NOT_ENABLED` hasta que G1 y G2 se satisfagan; no enviar API keys al frontend ni logs.
- [ ] F2.6 Agregar pruebas unitarias/de integración sobre autenticación, deny-by-default, concurrencia, restart, límites, phishing/prompt injection, variantes de precio, egress y cero cargos.
- **Gate G2:** tests de cuotas y política reproducibles; evidencias de cuenta/facturación con costo cero y autorización de uso para TEST; sin esto no habilitar ninguna llamada real.

**Fase 3 — Prueba de IA real en TEST**
- [ ] F3.1 Con aprobación de prueba y G1–G2, realizar una llamada mínima auténtica a modelo gratuito a través de FreeLLMAPI desde backend, con contenido no sensible derivado del repositorio real y tokens acotados.
- [ ] F3.2 Comprobar modelo realmente servido, estado/capacidad, latencia, errores y costo facturado (distinguir costo estimado).
- [ ] F3.3 Simular **fallos técnicos de infraestructura** en entorno de ensayo (no datos de negocio ficticios): proveedor caído, cuota agotada y respuesta inválida; confirmar paso a OpenRouter FREE o bloqueo sin gasto.
- [ ] F3.4 Registrar trazabilidad `mission → request → provider → model → output → judge` sin registrar credenciales ni PII.
- **Gate G3:** solicitud real y respuesta válida, costo cero verificado, sin fuga de credenciales; no confundir conectividad con trabajo empresarial verificado.

**Fase 4 — Conectar Hugo/Reina y un worker real**
- [ ] F4.1 Crear borrador tipado desde Super Admin con `plan_hash`, scope, entorno y reglas del documento; no ejecutar herramientas por mensaje de chat.
- [ ] F4.2 Autorización explícita y versionada de misión TEST; scheduler existente realiza claims y protege idempotencia/leases/fencing.
- [ ] F4.3 Ejecutar misión REAL de repo UGO en rama aislada: diagnóstico y arreglo de alcance acotado; tests y PR, sin modificar `main`.
- [ ] F4.4 Judge y Sentinel independientes comprueban efecto exact-SHA y seguridad; si falta evidencia, `UNVERIFIED`, no `VERIFIED`.
- [ ] F4.5 Renderizar resultados, bloqueo, cuota y consumo en Super Admin. Pausa/reanudación/cancelación deben consultar estado persistido.
- **Gate G4:** flujo real `orden → plan → aprobación → worker → diff/tests → evidencia → Judge/Sentinel → panel`, sin cambios a producción.

**Fase 5 — Enjambre gradual**
- [ ] F5.1 Habilitar hasta tres workers reales sólo tras pruebas de concurrencia, dependencia, locks, backpressure y presupuesto.
- [ ] F5.2 Enviar handoffs A→B persistidos con TTL, ACL, máximo de saltos y no delegación de permisos; probar no duplicación.
- [ ] F5.3 Reintentos acotados, DLQ, recuperaciones, observabilidad y killswitch; ensayos de caída, replay y revocación.
- [ ] F5.4 Medir `verified_missions/attempts`, tiempo de ciclo, consumo por proveedor, fallos, calidad y tareas que requieren intervención.
- **Gate G5:** recuperación y seguridad probadas, sin jobs duplicados, cargos o permisos ampliados; escala basada en resultados, no en número de agentes.

**Fase 6 — Cierre y decisión de producción (no implícita)**
- [ ] F6.1 Comparar criterios contra resultados reales y entregar resumen con todos los links de evidencia y bloqueos.
- [ ] F6.2 Validar licencias y usos comerciales por proveedor **antes** de cualquier operación empresarial comercial.
- [ ] F6.3 Presentar propuesta de habilitación limitada para producción y rollback; **requerir aprobación humana nueva y gate READY real**.
- [ ] F6.4 No fusionar PR #515 automáticamente ni modificar `main` por el solo hecho de pasar G0–G5.
- **Gate G6:** cierre verificable; si falta un requisito, sistema desactivado o solo SHADOW, con lista precisa de pendientes.

### 19.5 Política máquina-legible propuesta (NO aplicada)

```yaml
hive_llm:
  environment: UGO_TEST
  mode: SHADOW
  inference_enabled: false
  provider_order: [freellmapi, openrouter]
  provider_allowlist_enabled: true
  allow_paid_models: false
  allow_unknown_pricing: false
  max_billable_usd: 0
  auto_topup: false
  require_terms_and_privacy_review: true
  fail_closed: true
  daily_quota_store: durable_atomic_backend_required
  max_workers: 3
  default_model_unavailable_action: WAITING_MODEL
  production_writes_enabled: false
  auto_merge_enabled: false
  autonomy_on_enabled: false
  human_approval_required_for: [new_services, secrets, deployments, database_migrations, production, payments, scope_change]
```

### 19.6 Matriz final de aceptación y evidencia requerida

| Control | Evidencia requerida | Estado inicial |
|---|---|---|
| PR #515 identificado | PR/commit/head/base verificables | IDENTIFIED, NOT IMPLEMENTED END-TO-END |
| Hospedaje Render Free | Service URL privado, plan/consumo, sin tarjeta | PENDING |
| Persistencia/recuperación | restart/redeploy con checksum y secrets preservados | PENDING |
| Proveedor FreeLLMAPI real | /models y completions autenticadas, modelo real | PENDING |
| OpenRouter fallback gratuito | error primario + conmutación real + facturación cero | PENDING |
| Cuota durable atómica | stress concurrente y reinicio sin saltar límite | PENDING |
| Seguridad | superadmin/roles, RLS, egress, redacción, logs | PENDING |
| Autonomía | scheduler + worker + job real same-SHA | PENDING |
| Calidad | Judge y Sentinel independientes + CI | PENDING |
| Operación sin Mac | reactivación automática desde entorno alojado | PENDING |
| Costo cero | recursos y consumos facturados verificados | PENDING |
| Producción intacta | comparación de estado antes/después | PENDING |

### 19.7 Orden operativa para futuras sesiones de ChatGPT/UGO Maestro

Retomar desde la **primera casilla pendiente cuya ejecución esté autorizada**, verificar el estado actual en las fuentes reales, realizar acciones independientes sin interrupciones, documentar evidencias y avanzar mientras existan pasos seguros y permisos suficientes. **Nunca** asumir que una sesión anterior terminó o que el documento es prueba de despliegue. Si se necesita una aprobación, describir una sola vez la acción y el riesgo concretos; no insistir ante denegación, y continuar la parte de solo lectura. No detenerse en un diagnóstico si aún quedan verificaciones o documentación realizables. Las herramientas deben estar realmente conectadas y el contexto de tarea habilitar la acción. No declarar ejecución automática futura si no existe tarea programada o worker activo.



## 20. Plan maestro unificado — PR #515 + FreeLLMAPI + Render (18/10/2026)

**Estado: DOCUMENTACIÓN CONSOLIDADA; NO DESPLEGADO, NO OPERATIVO.** Esta sección complementa la sección 19 y **prevalece** como secuencia de ejecución sobre las instrucciones históricas OpenRouter-only de las secciones 1–18. Conserva autenticación, cuotas atómicas, presupuesto facturable cero, autorización explícita de despliegues, evidencia real y prohibición de cambios en producción. No implica fusión del PR ni activación de Empresa Autónoma.

### 20.1 Un solo producto, dos repositorios y un único plan

| Componente y referencia | Responsabilidad | Estado verificado mediante inspección documental | Trabajo pendiente |
|---|---|---|---|
| [UGO PR #515](https://github.com/sebastisnzoth/ugo-admin-panel/pull/515), Edge Function `ugo-hive-model-router` | Límite de seguridad y cuotas, autorización Super Admin, decisión de proveedor y conexión con Reina/Hive | Scaffold TEST fail-closed, `HIVE_INFERENCE_NOT_ENABLED` | Cuota durable, política multi-proveedor, integración real y QA |
| [FreeLLMAPI PR #1](https://github.com/sebastisnzoth/freellmapi/pull/1), [runbook de Render](https://github.com/sebastisnzoth/freellmapi/blob/docs/ugo-render-free-deployment-plan-20261018/docs/UGO_RENDER_FREE_IMPLEMENTACION.md) | Servidor enrutador hacia proveedores gratuitos, estado local y backup cifrado | Plan documental, sin servicio desplegado | Receptor durable, restore y pruebas reales |
| Render workspace autorizado | Compute Free que se reactiva sin mantener Mac encendida | Cuenta conectada y lectura de workspace; **conectar GitHub no es desplegar** | Confirmar visibilidad del repo, plan, costos y parámetros |
| Supabase TEST | Jobs, permisos, sesiones, auditoría, memoria y eventual receptor privado del backup | Entorno de diseño existente; infraestructura de respaldo no configurada | Evaluar Storage/RLS/cuotas y migraciones mínimas autorizadas |
| OpenRouter FREE | Fallback opcional | Scaffolding para consultar clave, sin inferencia habilitada | Evitar límites nativos, no eludir cuota con identidades ni usar modelos pagos |

**Separación no negociable:** el *router de seguridad de UGO* toma las decisiones de autorización/costo y controla las cuotas globales; *FreeLLMAPI* selecciona únicamente endpoints permitidos de su catálogo. No transferir al gateway público la autoridad de crear jobs, aprobar misiones o decidir si se pueden pagar solicitudes. Las APIs gratuitas de otros proveedores son cuotas separadas legítimas, no una forma de eliminar el límite de OpenRouter.

### 20.2 Bloqueo crítico y mejora descubierta

El repositorio FreeLLMAPI ya documenta el soporte `FREEAPI_DB_BACKUP_URL`, `FREEAPI_DB_BACKUP_TOKEN`, `FREEAPI_DB_BACKUP_KEY`, `FREEAPI_DB_BACKUP_INTERVAL_MS`, `ENCRYPTION_KEY` y `FREEAPI_CONFIG_JSON`: por tanto **no construir inmediatamente un backend SQL nuevo ni un sincronizador SQLite artesanal**. Inspeccionar su implementación real de backup/restore y definir un receptor HTTPS privado con un almacén durable gratuito y comprobado. Render Free no aporta disco persistente; un reinicio sin respaldo seguro puede perder claves/configuración. Los backups periódicos no prometen RPO cero. Las cuotas globales Hive no deben almacenarse en SQLite efímero o susceptible a rollback.

### 20.3 Orden obligatorio para ejecutar, de manera autónoma y sin interrupciones triviales

**HU0 — Reconciliación y capacidad (sólo lectura).** Owner D8 tecnología + D14 auditoría.
- [ ] HU0.1 Releer SHAs de `main` y ramas de PR #515 y FreeLLMAPI #1, revisar conflictos/locks y adjuntar rutas exactas.
- [ ] HU0.2 Inspeccionar implementación (no sólo README) de HTTP backup/restore, boot, configuración y contratos de seguridad.
- [ ] HU0.3 Verificar Render conectado a GitHub, acceso al fork, requisitos de Docker/Node, cuotas del workspace, cero tarjeta y límites de egress.
- [ ] HU0.4 Auditar TOS/privacidad de proveedores y clasificación de datos (reales pero no sensibles) enviados a modelos.
- **GATE HU0:** informe con fuentes, SHA, riesgos, tareas sin resolver, y NO modificaciones en las cuentas.

**HU1 — Persistencia durable y aislamiento (diseño; despliegue bajo autorización).** Owner D8 + D14.
- [ ] HU1.1 Evaluar Storage privado de Supabase TEST si ya existe y su cuota permite uso sin tarjeta. Si no, documentar alternativa gratuita verificable o bloqueo.
- [ ] HU1.2 Definir receptor autenticado HTTPS para backup cifrado y restore, con token exclusivo, retención, versionado, hash, atomicidad y control de replay; confirmar semántica HTTP del cliente real.
- [ ] HU1.3 Especificar separación de `ENCRYPTION_KEY`, `FREEAPI_DB_BACKUP_KEY` y token; nunca guardar secretos en GitHub ni navegador, ni dar `service_role` al contenedor Render.
- [ ] HU1.4 Probar backup/restauración real en sandbox autorizado: pérdida de disco, snapshot corrupto, cambios en ventana entre backups, caducidad, revocación, concurrentes y claves equivocadas.
- **GATE HU1:** persistencia autenticada probada, RPO/RTO medidos, costo cero. Sin esto el deploy con credenciales reales está bloqueado.

**HU2 — Render Free (primero propuesta, después aprobación).** Owner D8 DevOps + D14.
- [ ] HU2.1 Preparar manifest de despliegue Docker/web service `Free`, `PORT`, healthcheck, secretos y cero addons/disco pago; fijar commit reproducible, evitar auto-deploy no validado.
- [ ] HU2.2 Confirmar explícitamente plan, facturación y límites antes de crear servicios; presentar una única petición de aprobación para recursos y acciones nuevas.
- [ ] HU2.3 Tras aprobación, crear entorno TEST y comprobar startup y endpoint autenticado. Repetir prueba de cold start, suspensión/reinicio y restore. Guardar run IDs y evidencia, no credenciales.
- **GATE HU2:** servicio real accesible sólo por mecanismos autorizados, funciona con Mac apagada, 0 costos verificados; no basta un HTTP 200 en healthcheck.

**HU3 — Gateway UGO PR #515 y política multi-proveedor (requiere permiso para cambios funcionales TEST).** Owner D8 + seguridad.
- [ ] HU3.1 Preservar auth Super Admin y separación TEST; no habilitar inferencia por editar una flag sin gates.
- [ ] HU3.2 Sustituir cuota local `Map` por presupuesto atómico transaccional en backend; limitar por misión/actor/proveedor/día, transiciones idempotentes y concurrencia.
- [ ] HU3.3 Añadir adapter `FreeLLMAPI` y fallback OpenRouter **FREE ONLY** con URLs permitidas, precios verificables, límites de tokens/calls, reintentos/circuit-breaker y deny-by-default.
- [ ] HU3.4 Desactivar en el gateway rutas `auto` no auditables, proveedores pagos, modelos de precio desconocido, top-ups y fuga de metadatos o tokens.
- [ ] HU3.5 Automatizar tests de no-superadmin, 429, reboot, precio ambiguo, proveedor caído, request size, secuencias simultáneas y riesgo de cobro.
- **GATE HU3:** pruebas completas exact-SHA, Judge y Sentinel independientes; inferencia continúa OFF si falta evidencia de costo/verificación.

**HU4 — Primera llamada y misión reales en TEST.** Owner D1 Reina + D8 ejecución + D9 QA + D14 auditoría.
- [ ] HU4.1 Con permiso para invocación real, enviar texto real público y no sensible del repositorio UGO por gateway y FreeLLMAPI; cotejar modelo, proveedor, tokens y **costo facturado**, sin inventar valores.
- [ ] HU4.2 Probar fallback a OpenRouter FREE o rechazo limpio ante cuotas/fallo de FreeLLMAPI, sin bypass de la política.
- [ ] HU4.3 Planner propone misión/versionado; el humano aprueba alcance `plan_hash`; worker autorizado genera cambio reversible a rama separada, tests y PR real.
- [ ] HU4.4 D9/D14 Judge/Sentinel reproducen efectos exact-SHA; persistir evidencia y mostrar estado real en panel, sin marcar VERIFIED por PR abierto o respuesta LLM.
- **GATE HU4:** flujo end-to-end real en UGO TEST, 0 cobros y sin tocar producción. 

**HU5 — Operación gradual y cierre.** Owner D1 + D8 + D9 + D14.
- [ ] HU5.1 Probar recuperación de caída Render y receptor, reintento de trabajo sin efecto duplicado, mensajes entre agentes con permisos y cuotas.
- [ ] HU5.2 Escalar de un worker a máximo tres sólo si los locks y cuotas reales permiten, con jobs y evidencias propios, no 118 LLM concurrentes.
- [ ] HU5.3 Monitorizar estados, backups, salud, presupuesto, fallos, RPO/RTO y bloqueo del proveedor en Super Admin.
- [ ] HU5.4 Reconciliar documentación y checkpoints entre ambos repositorios y entregar reporte de tareas y bloqueo humano; producción y merge exigen autorización y gates independientes.
- **GATE HU5:** continuidad segura probada y evidencia completa; no confundir piloto Hive con Empresa Autónoma ON o CUSTOMER_1 READY.

### 20.4 Disciplina de ejecución, checkpoints y preguntas al fundador

Para cada HUx.y: comprobar permiso y dependencias → registrar `TASK_ID / REPO / BRANCH / SOURCE_SHA / RUN_ID / CHANGES / TESTS / EVIDENCE / COST / JUDGE / SENTINEL / STATUS / NEXT` → seguir la próxima tarea segura. `PENDING` es el estado inicial de todos los ítems nuevos. La apertura de PR documental **no equivale** a realización técnica. Ningún agente puede marcarse VERIFIED a sí mismo.

**Interrupción humana únicamente por** creación de servicio/bucket, cambios de secretos/credenciales, despliegue, cambios de Supabase, prueba con servicios externos si no autorizada, costos, fusión, producción, seguridad o ampliación de permisos. Agrupar las autorizaciones necesarias por lote; continuar con lectura, documentación y tests seguros cuando haya otro bloqueo. Los agentes sólo trabajan continuamente cuando existe un ejecutor/scheduler real; este documento no crea un proceso en segundo plano.

**Links canónicos:** [documento detallado de implementación Render](https://github.com/sebastisnzoth/freellmapi/blob/docs/ugo-render-free-deployment-plan-20261018/docs/UGO_RENDER_FREE_IMPLEMENTACION.md), [PR #1 FreeLLMAPI](https://github.com/sebastisnzoth/freellmapi/pull/1), [PR #515 UGO Hive](https://github.com/sebastisnzoth/ugo-admin-panel/pull/515). **Estado actual:** NO DEPLOY, NO REAL INFERENCE, NO CUSTOMER QA, NO HIVE MVP VERIFIED.

## 21. Checkpoint de implementación autorizada — 18/10/2026

La orden de implementación actual autoriza ramas aisladas y ensayos locales, sin desplegar, fusionar ni cambiar secretos/datos remotos. El progreso y los comandos reproducibles están en [IMPLEMENTATION_STATUS.md](ugo-hive/IMPLEMENTATION_STATUS.md). Se preservan los trabajos de PR515 y FreeLLMAPI1.

Se prepararon receptor cifrado privado GET/PUT con CAS/retención/limpieza durable, cuotas PostgreSQL separadas del SQLite y manifest Render Free con inferencia bloqueada. Se comprobó interoperabilidad por HTTPS loopback y recuperación de SQLite después de reinicios; esto NO prueba Storage remoto ni Render. FreeLLMAPI se mantiene ineligible para inferencia porque su modelo puede resolver a varios proveedores: falta un contrato ejecutable de pinning. OpenRouter tampoco fue invocado.

No se actualizaron los PR: sus ramas activan previews automáticos Vercel/Netlify y la orden exige autorización antes de desplegar. Los commits son locales y se entregan como bundles/patches con evidencia para revisión. Estado global IN_PROGRESS/BLOCKED_HUMAN, sin ninguna declaración HIVE_MVP_VERIFIED, producción ni Empresa Autónoma ON.

### Canal web actualizado — 18/10/2026 18:53 BRT

Por instrucción del usuario, GitHub Pages es el único destino web; Vercel fue pausado por él y Netlify se descarta. Se omiten previews Netlify de estos PR con su marcador de título. Esto autoriza actualizar ramas de desarrollo y verificar CI, sin merge/publicación main ni habilitar servicios remotos/inferencia. Pages no aloja el backend FreeAPI/SQLite/Edge Functions; esos gates permanecen separados. Ver el checkpoint de implementación para el estado vigente.
