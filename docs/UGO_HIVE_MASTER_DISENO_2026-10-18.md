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


**Documento de diseño únicamente. No implementar ni activar autonomía hasta nueva autorización.**
