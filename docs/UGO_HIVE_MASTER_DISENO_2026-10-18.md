# UGO HIVE 1.0 — Documento Maestro de Diseño y Auditoría

**Fecha:** 2026-10-18  
**Estado:** PROPUESTA / DISEÑO — NO IMPLEMENTADO  
**Alcance de Autorización:** SOLO DOCUMENTACIÓN. No autoriza cambios en GitHub, Supabase, Vercel, CI, producción ni activación de autonomía.  
**Fuente de Verdad para Implementación Futura:** Verificar nuevamente `main`, UGO TEST, migraciones vigentes, catálogos de agentes, jobs, ledger, Judge y Sentinel antes de escribir código.  
**Repositorio:** `sebastisnzoth/ugo-admin-panel`  
**Entorno de Pruebas:** UGO Arena / TEST (`tmossnqfwfwjrtzwcbmm`). Producción se mantiene estrictamente separada.

---

## 1. Propósito

Transformar la Empresa Autónoma existente en una **colmena de agentes especializados capaces de ejecutar jobs reales**, con asignación estructurada, colaboración interdepartamental, herramientas controladas y validación independiente. Para ello, se utilizará **OpenRouter** para el razonamiento lógico, restringido exclusivamente a modelos gratuitos.

**Principio Fundamental:**  
> OpenRouter razona; los *workers* ejecutan; Supabase coordina y persiste; *Judge* comprueba; *Sentinel* impone invariantes y controles; el Super Admin supervisa.

**Objetivo Estratégico:**  
No crear una segunda Empresa Autónoma ni mantener 118 conexiones persistentes e inactivas hacia un LLM. El objetivo es **reutilizar** de manera eficiente las tablas, contratos, jobs, skills, *gates* y observabilidad ya existentes en la plataforma.

---

## 2. Restricciones No Negociables

1. **Presupuesto OpenRouter US$ 0 mensuales:** Sólo se utilizarán modelos gratuitos con costo efectivamente cero por solicitud. No habrá un *fallback* a modelos de pago ni recargas automáticas.
2. **Validación Previa de Costos:** Se debe comprobar la disponibilidad, capacidad y precio del modelo antes de su uso, aplicando un *guard* local del costo admitido. Ante la mínima incertidumbre de precio, **no se enviará la solicitud**.
3. **Resiliencia ante Indisponibilidad:** En ausencia de modelos gratuitos, los *jobs* de IA esperarán con *backoff* y vencimiento. Las comprobaciones deterministas ya autorizadas podrán continuar sin interrupción.
4. **Límites de Concurrencia:** Se propone una configuración inicial de **tres workers concurrentes**, sujetos a los límites reales de los servicios. No se presupone un servicio permanente gratuito; la infraestructura y el ancho de banda podrían generar costos externos que deben ser monitoreados.
5. **Aislamiento de Producción:** **No tocar producción sin autorización humana explícita.** Quedan estrictamente prohibidos los *force push*, *resets* destructivos o revertir trabajo ajeno sin revisión.
6. **Ejecución Controlada de Herramientas:** No se otorgará escritura directa en Base de Datos, shell, GitHub, secretos o despliegues a un modelo LLM. Las acciones se efectuarán *únicamente* mediante ejecutores de herramientas con *allowlist*, *sandbox*, permisos de mínimo privilegio y un registro completamente auditable.
7. **Independencia en la Certificación:** Ningún agente puede certificar su propio trabajo. El estado `VERIFIED` requerirá un efecto real, evidencia persistente, revisión por un *Judge* independiente y validación de *Sentinel*.
8. **Activación de Autonomía (ON):** La activación del modo `ON` dependerá del *gate* real del sistema. No se forzará su activación alterando la interfaz o manipulando datos históricos.
9. **Operaciones Prohibidas para IA:** Queda prohibida la publicación, pagos, reembolsos, modificación de tarifas, consentimiento, cambios de seguridad irreversibles y uso de credenciales sin los respectivos permisos y autorizaciones humanas.
10. **Preservación de Reglas de Negocio UGO:** Se deben mantener intactas las reglas operativas de UGO: ciclo Cliente–Proveedor, localización real, validación con PIN/QR, comisiones y deudas según los contratos vigentes, sin simular de forma engañosa las pruebas humanas.

---

## 3. Arquitectura Propuesta

```text
[ Founder / Super Admin ]
          |
[ UGO Maestro ] (Define misiones y prioridades)
          |
[ Hive Scheduler ] (Maneja dependencias, prioridad, leases, conflict locks)
          |
[ Supabase ] (Job inbox, estados, snapshots, memoria, capability registry)
          |
[ Model Router OpenRouter ] (SOLO GRATIS) --- [ Tool Executor ] (Acciones permitidas)
          |                                            |
[ Skills Versionadas ]                        [ Workers Aislados ] (Inicial: 3)
          |                                            |
[ Departamentos y Agentes ] ----------------- [ Ejecución y Evidencia Persistida ]
          |
[ Judge Independiente ] → [ Sentinel ] → [ Gate de Cierre ] → [ Super Admin ]
```

### Contratos Imprescindibles

* **Job:** `job_id`, `task_id`, `mission_id`, `department_id`, `agent_id`, `required_capabilities`, `skill_version`, `input_schema_version`, `acceptance_criteria`, `environment`, `source_sha`, `priority`, `dependencies`, `resources`, `risk`, `cost_ceiling_usd=0`, `correlation_id`, `idempotency_key`.
* **Lease (Arrendamiento):** Asegura un único dueño, expiración, *heartbeat*, recuperación de jobs interrumpidos y restricción de recursos.
* **Output (Salida):** Acción ejecutada, diferencia esperada/observada, hashes/SHA, test IDs, logs redactados, resultado final, costos declarados, `evidence_ids`.
* **Judge:** Reconstruye el resultado de forma determinista desde el backend y artefactos; **no confía** en los booleanos generados por el ejecutor.
* **Sentinel:** Confirma límites del entorno, autoridad, protección de datos, costos nulos, invariantes del sistema y ausencia absoluta de secretos expuestos.
* **Estados:** Separar claramente entre estado catalogado, habilitado, ejecutado y verificado; y aplicar estados de job: `QUEUED`, `CLAIMED`, `RUNNING`, `WAITING_DEPENDENCY`, `WAITING_MODEL`, `WAITING_APPROVAL`, `VERIFYING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, donde sea compatible con la máquina de estados real.

---

## 4. Inventario Auditado (Snapshot del 18/10/2026)

Consulta de solo lectura a UGO TEST: 
* **Departamentos:** 13
* **Agentes:** 118 (117 `IDLE`, 1 `DISABLED`)
* **Capacidades Habilitadas:** 119
* **Evidencias Registradas:** 3.628
* **Jobs Históricos:** 2.363 `SUCCEEDED`, 2.148 `CANCELLED`, 66 `QUEUED`, 69 `WAITING_APPROVAL`, 18 `BLOCKED`; (Ninguno `RUNNING` al momento de la consulta).

> **Aviso:** No interpretar los jobs `SUCCEEDED` como un resultado verificado, ni la cantidad de evidencias como cantidad de trabajos reales e independientes.

### Resumen por Departamento
| Dep | Área | Agentes | Agentes con `last_action_at` | Mejora Focal |
|-----|------|---------|-----------------------------|--------------|
| 1 | Dirección ejecutiva | 6 | 0 | Misiones, priorización y escalamiento |
| 2 | Operaciones | 11 | 0 | Scheduler, GPS/matching, recuperación |
| 3 | Experiencia del cliente | 8 | 0 | Atención, lifecycle, evidencia |
| 4 | Proveedores | 10 | 0 | Onboarding, GPS, asignación, calidad |
| 5 | Crecimiento y expansión | 7 | 0 | Captación, inteligencia comercial |
| 6 | Confianza y resolución | 8 | 0 | Reclamos, revisión de fraude, apelaciones |
| 7 | Finanzas | 9 | 0 | Conciliación segura, sin operaciones monetarias automáticas |
| 8 | Tecnología y seguridad | 12 | 0 | Tool executor, código y seguridad |
| 9 | QA y excelencia | 12 | 6 | Pruebas, Judge, regresión, cobertura |
| 10 | Legal y cumplimiento | 11 | 0 | Privacidad, KYC, políticas |
| 11 | Marketing y comunicación | 8 | 0 | Contenido y localización; publicación requiere permisos |
| 12 | Producto y diseño | 9 | 0 | UX, accesibilidad, frontends |
| 14 | Auditoría y gobernanza | 7 | 2 | Independencia y autoridad |

**Hallazgos Críticos:** 
Existen agentes especialistas que poseen permisos como `action_work_order` pero que a la vez están marcados como `advisory_only` y `generic_readonly_specialist`. Sus nombres no los convierten automáticamente en ejecutores con acceso a código, dinero o infraestructura. Muchos poseen un único job de prueba (fecha 30/09/2026).  
*Acción requerida:* Verificar explícitamente por agente la cadena: `agent_key` → `skills/SKILL.md` → `tools` → `permisos` → `capability registry` → `jobs` → `evidencia` → `judge`, antes de ampliar la autoridad. El Departamento 14 (D14) registra un agente `corporate-audit-agent` deshabilitado y seis activos: se debe investigar su sustitución sin reactivarlo.

---

## 5. Lista Completa de Agentes por Departamento (Claves Registradas)

* **D1 (6):** `corporate-strategy`, `exception-coordinator`, `executive-intelligence`, `executive-orchestrator`, `outcome-learning`, `priority-resource-orchestrator`.
* **D2 (11):** `arrival-geofence-agent`, `dispatch-agent`, `gps-validation-agent`, `incident-operations-agent`, `matching-agent`, `operational-recovery-agent`, `operations-agent`, `provider-radius-agent`, `realtime-operations-agent`, `service-lifecycle-agent`, `travel-monitoring-agent`.
* **D3 (8):** `billing-support-agent`, `client-experience-agent`, `client-feedback-agent`, `client-journey-agent`, `client-support-agent`, `complaint-agent`, `retention-agent`, `voice-of-client-agent`.
* **D4 (10):** `provider-activation-agent`, `provider-agent`, `provider-fairness-agent`, `provider-onboarding-agent`, `provider-quality-agent`, `provider-recruitment-agent`, `provider-retention-agent`, `provider-supply-agent`, `provider-support-agent`, `voice-of-provider-agent`.
* **D5 (7):** `acquisition-agent`, `expansion-agent`, `growth-expansion-agent`, `growth-experiment-agent`, `market-intelligence-agent`, `revenue-growth-agent`, `territory-intelligence-agent`.
* **D6 (8):** `abuse-detection-agent`, `appeals-agent`, `case-manager`, `critical-escalation-agent`, `dispute-resolution-agent`, `evidence-analysis-agent`, `fraud-detection-agent`, `trust-resolution-agent`.
* **D7 (9):** `cash-payment-agent`, `finance-agent`, `financial-controller`, `financial-risk-agent`, `payment-agent`, `provider-balance-agent`, `reconciliation-agent`, `refund-agent`, `treasury-control-agent`.
* **D8 (12):** `code-review-agent`, `database-reliability-agent`, `debugging-agent`, `devops-agent`, `model-router-agent`, `observability-agent`, `r-d-agent`, `realtime-reliability-agent`, `security-agent`, `software-engineering-agent`, `technology-radar-agent`, `technology-security-agent`.
* **D9 (12):** `admin-system-simulator`, `chaos-agent`, `client-simulator`, `deterministic-judge`, `meta-qa-agent`, `p0-journey-tester`, `provider-simulator`, `qa-director`, `qa-excellence-agent`, `quality-coverage-agent`, `regression-agent`, `release-gate-agent`.
* **D10 (11):** `compliance-agent`, `consumer-protection-agent`, `contract-agent`, `corporate-protection-agent`, `ip-gate-agent`, `ip-protection-agent`, `labor-risk-agent`, `legal-intelligence-agent`, `legal-policy-agent`, `policy-agent`, `privacy-agent`.
* **D11 (8):** `brand-agent`, `community-agent`, `creative-agent`, `localization-agent`, `marketing-brand-agent`, `marketing-campaign-agent`, `marketing-experiment-agent`, `pr-reputation-agent`.
* **D12 (9):** `accessibility-agent`, `design-system-agent`, `product-analytics-agent`, `product-design-agent`, `product-experiment-agent`, `product-manager-agent`, `product-strategy-agent`, `ui-ux-agent`, `ux-research-agent`.
* **D14 (7):** `ai-governance-auditor`, `corporate-audit-agent` (**DISABLED**), `cross-department-auditor`, `enterprise-risk-officer`, `executive-assurance-challenge`, `internal-auditor`, `internal-control-inspector`.

> **Nota:** No se ha verificado la correspondencia exacta de los 118 IDs con los archivos de *skills* existentes. Este inventario registra identidades, no acceso ni ejecución garantizada.

---

## 6. Política de OpenRouter — *FREE ONLY*

```yaml
ugo_hive:
  version: "design-1.0"
  environment: "UGO_TEST"
  initial_mode: "SHADOW"
  openrouter:
    monthly_budget_usd: 0
    free_models_only: true
    paid_fallback_enabled: false
    max_paid_cost_usd: 0
    verify_model_pricing_before_each_request: true
    reject_unknown_price: true
    require_capability_match: true
    redact_sensitive_data: true
    retry_on_free_quota: "bounded_backoff_or_wait"
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

*Este YAML representa un diseño propuesto y no una configuración actualmente aplicada. Es vital resolver los problemas de disponibilidad sin recurrir a proveedores de pago y tener en cuenta que, aunque la cuota de OpenRouter sea cero, el alojamiento y el uso de bases de datos pueden generar costos externos.*

---

## 7. Modelo de Colmena (Hive Model)

*   **Reina / UGO Maestro:** Encargado de elegir la misión y el camino crítico. No ejecuta privilegios ajenos ni opera como un dictador absoluto sin revisión.
*   **Scheduler:** Realiza asignaciones estructuradas bajo el modelo: `JOB TYPE` → `CAPABILITY` → `ROLE/AUTHORITY` → `AVAILABILITY` → `LEASE` → `COST/RISK` → `AGENT`. Ordena dependencias mediante grafos dirigidos acíclicos (DAG), evita la concurrencia destructiva sobre los mismos recursos y previene el *starvation*.
*   **Trabajadores (Workers):** Operarán tres *workers* iniciales dedicados a: (1) investigación y planificación, (2) ejecución técnica autorizada y (3) verificación. Los agentes representan especialidades asignables a estos *workers*, no 118 procesos LLM activos simultáneamente.
*   **Memoria:** Un repositorio de hechos trazables con información sobre la fuente, fecha, SHA, confiabilidad, ámbito de acceso, caducidad y posibilidad de corrección. No se guardarán secretos en esta memoria, ni se tratará el contenido recuperado como instrucciones de autoridad incondicional.
*   **Skills:** Contratos fuertemente versionados que incluyen: `agent_id`, `department`, `mission`, `skills`, `tools_allowlist`, `authority`, `input_schema`, `output_schema`, `acceptance_criteria`, `timeouts`, `max_retries`, `evidence`, `rollback` y `owner`. Se crearán nuevas *skills* únicamente cuando haya una capacidad faltante demostrada; se priorizará siempre la reutilización.
*   **Tool Executor:** Valida rigurosamente cada acción contra una *allowlist*, *sandbox*, permisos, riesgos, idempotencia, *scopes* y auditoría. OpenRouter solo podrá proponer *tool calls* estructurados; ningún *string* generado por el modelo se convertirá directamente en un comando SQL, script de shell o escritura en GitHub.
*   **Model Router:** Despachará solicitudes a modelos gratuitos solo si las capacidades y costos declarados están previamente verificados. Privilegiará tareas deterministas en primer lugar, *caching* seguro en segundo lugar y llamadas LLM como último recurso. Deberá manejar de forma robusta *timeouts*, *rate-limits* (429), respuestas inválidas o falta total de disponibilidad.
*   **Judge / Sentinel:** Evitarán la autocertificación. Queda prohibido mezclar evidencias provenientes de diferentes SHAs. Serán responsables de la auditoría estricta de logs, resultados y permisos.

---

## 8. Misiones Corporativas

La estructura base será: `mission` → `subjobs` → `dependencies` → `evidence` → `acceptance` → `final gate`.

**Misión Inicial Propuesta:**  
**UGO listo para el primer cliente real.**  
Debe incluir pruebas exhaustivas de *login*, flujos de Cliente/Proveedor, GPS, *matching*, alertas, servicio completo, envío de fotos, pagos simulados en TEST, liquidación de comisiones, historial y cierre. *Bajo ninguna circunstancia se debe simular la aceptación humana ni autorizar el paso a producción por el mero hecho de superar tests automáticos.*

---

## 9. Mejoras Adicionales para un Sistema Sostenible

1.  **Dead-Letter Queue y Reanudación:** Los *jobs* que fallen tras alcanzar su máximo de reintentos quedarán en un estado inspeccionable, evitando bloquear el sistema completo.
2.  **Circuit Breaker por Modelo/Proveedor:** Para prevenir tormentas de reintentos (*retry storms*), agotamiento rápido de cuotas y bloqueos por respuestas repetidas inválidas.
3.  **Trazabilidad Extrema de Decisiones:** Mantener un hilo conductor claro: `mission_id` → `job_id` → `agent_id` → `model` → `tool call` → `diff` → `evidencia` → `judge` → `sentinel`, incluyendo redacción obligatoria de secretos.
4.  **Auditoría de Skills y Deriva (Drift):** Control estricto sobre versiones de *skills*, permisos, hashes, agentes huérfanos, duplicados o sin uso; generar alertas críticas si una *skill* cambia sin pasar por revalidación.
5.  **Pruebas Adversariales Continuas:** Evaluar vulnerabilidades como *prompt injection* en documentos, escalamiento no autorizado entre departamentos, *replay* de *jobs*, acceso indebido a datos privados, pérdida de *heartbeat* y reintentos simultáneos conflictivos.
6.  **Aprobaciones Humanas Acotadas:** Proveer una bandeja de decisiones pendientes con contexto enriquecido, riesgo estimado, efectos, costo y opciones de *rollback*. Caducidad automática de aprobaciones antiguas.
7.  **Métricas de Valor Real:** Medir la tasa de jobs `VERIFIED`, tiempo medio de resolución, conteo de reintentos, fallos agrupados por causa, cuota gratuita consumida, ahorro efectivo de trabajo humano y proximidad al lanzamiento del primer cliente.
8.  **Privacidad y Retención de Datos:** Minimización de datos enviados a OpenRouter (cero exposición de PII, tokens y material sensible de clientes) y revisión de las políticas de retención de cada proveedor de modelos antes de su uso.
9.  **Recuperación ante Desastres (Disaster Recovery):** Implementar mecanismos de *snapshot* y restauración de estados de *jobs* y evidencias, rutinas de recuperación tras caídas, y procedimientos seguros de *kill-switch*, asegurando no duplicar transacciones.
10. **Protección ante Falsas Validaciones:** Las simples pruebas de conectividad de los departamentos o *jobs* sintéticos nunca podrán ser utilizados como prueba válida de la correcta ejecución de un caso real.

---

## 10. Plan de Implementación (ESTADO: NO AUTORIZADO TODAVÍA)

- [ ] **Fase 0: Inventario Exacto:** Extraer estado del `main` SHA, tablas y últimas migraciones. Mapeo de 118 agentes y permisos frente a `SKILL.md`. Inspección de OpenRouter, Scheduler, Worker y Gates. **Entregable:** Reporte de discrepancias sin realizar escrituras.
- [ ] **Fase 1: Vertical Slice en TEST:** Seleccionar un *job* inocuo e introducir el enrutador configurado como *FREE ONLY* y un *worker* con herramientas de solo lectura. Validar el respeto absoluto a presupuestos, cuotas y modo `SHADOW`. Demostrar persistencia de evidencias y *rollback*.
- [ ] **Fase 2: Ejecución Técnica Limitada:** Activar herramientas en entorno *sandbox* con cambios únicamente en ramas de prueba (jamás en producción). Realizar flujos completos con PR, tests, revisión por *Judge/Sentinel* en el mismo SHA y validación de permisos por especialidad.
- [ ] **Fase 3: Expansión de la Colmena:** Integración del Scheduler completo con dependencias. Escalamiento a tres *workers* iniciales. Habilitar memoria, retries, *dead-letter queues*, *circuit breakers* y controles granulares por departamento.
- [ ] **Fase 4: Operaciones y Misiones:** Habilitación de prioridades corporativas y panel de control operativo. Recolección de métricas, aprobaciones humanas y auditoría de gastos. **Condición de ON:** Solo activar cuando el *gate* de control esté `READY` y exista una autorización humana competente y explícita.

### Aceptación Mínima para un Piloto

*   [ ] Modelo gratuito y costo cero verificado; es imposible que el sistema escale a un uso de pago de forma accidental.
*   [ ] Un *worker* logra ejecutar un *job* real permitido en TEST y su resultado persiste correctamente.
*   [ ] Se ha demostrado el correcto funcionamiento de permisos, *leases*, idempotencia, detección de *timeouts* y recuperación de fallos.
*   [ ] El *Judge* y el *Sentinel*, operando de manera independiente, aceptan la evidencia atada al mismo SHA.
*   [ ] Los fallos por falta de cuota o indisponibilidad del modelo no provocan ningún gasto económico.
*   [ ] Se garantiza que no hay alteraciones en producción, cero exposición de secretos y los controles humanos permanecen inmutables.
*   [ ] El *Super Admin* puede visualizar transparentemente el *job*, su *skill* asociada, las herramientas empleadas, la última evidencia generada y su costo (cero).

---

## 11. Riesgos y Decisiones Abiertas

*   **Limitaciones de OpenRouter (FREE):** Los límites reales, la permisología de los datos y el rendimiento del modelo deben verificarse rigurosamente durante la implementación piloto.
*   **Disponibilidad 24/7 Gratuita:** No se puede garantizar un ejecutor persistente 24/7 a costo cero. Debe evaluarse en función de la capacidad y los límites de *hosting*.
*   **Mapeo de Capacidades vs Skills Reales:** El hecho de que haya 119 capacidades habilitadas no significa que existan 119 *skills* implementadas ni 119 acciones reales operativas.
*   **Validez del Modo `AUTONOMY_ON`:** Se debe verificar si el estado de `AUTONOMY_ON` continúa en `READY` al momento de la ejecución. La disponibilidad documentada históricamente no implica un modo `ON` actual.
*   **Integridad de Código:** Confirmar obligatoriamente los SHAs actuales y garantizar que la CI funcione en la misma revisión antes de proceder con cualquier *Pull Request*.
*   **Bloqueo de Modificaciones:** **Ninguna fase de esta propuesta concede autorización para editar, desplegar, activar o realizar gastos en el sistema actual.**

---

## 12. Fuentes Auditadas y Trazabilidad

*   **GitHub:** `sebastisnzoth/ugo-admin-panel`, `docs/UGO_AI_AGENT_SYSTEM_MASTER.md`, `docs/READINESS_AUTO_DEPARTMENTS_VERIFIED.md`, `docs/UGO_CAMINO_MAESTRO.md`, `scripts/autonomous-departments-readiness-runtime.mjs`, `.agents/skills/ugo-job-execution/SKILL.md`, migraciones de *Autonomy Gate*.
*   **Base de Datos (UGO Arena/TEST - 18/10/2026):** Consultas `SELECT` directas a: `autonomous_departments`, `autonomous_agents`, `autonomous_capability_registry`, `autonomous_jobs`, `autonomous_evidence_ledger`.
*   **Skills UGO Maestro:** *Agent governance*, *agent factory*, *architecture*, *evidence judge*, *readiness orchestrator*.

---
**ESTADO FINAL:** Documento independiente revisado y actualizado; **ninguna escritura remota**, ningún PR, ningún cambio en servicios ni producción. *Requiere autorización nueva y explícita para implementarse.*




## 14. Revisión Triple y Evolución a UGO Hive 2.0 — 18/10/2026

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

**Documento de diseño únicamente. No implementar ni activar autonomía hasta nueva autorización.**
