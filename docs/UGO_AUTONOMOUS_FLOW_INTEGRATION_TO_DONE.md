# UGO — Integración del Flujo de Empresa Autónoma hasta DONE

**Versión:** 1.0 · 28 septiembre 2026  
**Estado:** contrato de integración y cierre  
**Branch de verdad:** `main`  
**Entorno de validación:** UGO TEST  
**Gobernanza superior:** `UGO_MASTER_GOVERNANCE.md` y `UGO_AUTONOMOUS_CORPORATION_MASTER.md`

> Este documento convierte el flujo visual “UGO Empresa Autónoma · Agentes · IA · Decisiones · Ejecución · Control · APIs” en un plan verificable de integración. No autoriza producción. No reemplaza los masters existentes.

---

## 0. Regla DONE

Nada queda DONE por existir en código, UI, SQL, GitHub Actions o configuración.

```text
REQUISITO
→ IMPLEMENTACIÓN
→ WIRING
→ CREDENCIAL
→ CONSUMIDOR REAL
→ EJECUCIÓN
→ ESTADO/EVIDENCIA PERSISTIDA
→ VERIFICACIÓN DETERMINISTA
→ CI DEL MISMO SHA
→ RUNTIME UGO TEST
→ REGRESIÓN
→ AUDITORÍA D14
→ DONE
```

Madurez obligatoria:

```text
IMPLEMENTED → CI VALIDATED → RUNTIME VALIDATED → PUBLISHED
```

`PUBLISHED` requiere autorización separada. Empresa Autónoma puede alcanzar DONE técnico/runtime en TEST sin desplegar producción.

---

## 1. Arquitectura objetivo

```text
Cliente / Proveedor / Admin / Super Admin
                 │
                 ├── eventos de producto
                 ├── GPS / mapas
                 ├── pagos
                 ├── chat / push
                 └── integraciones externas
                 ▼
        EVENT / JOB INTAKE
                 │
                 ▼
      AUTONOMOUS JOB MANAGER
     idempotency + correlation_id
                 │
          DATA QUALITY GATE
                 │
                 ▼
       POLICY / AUTHORITY GATE
        GREEN / YELLOW / RED
                 │
        ┌────────┴─────────┐
        │                  │
 deterministic        AI required?
 action/rule               │
        │                  ▼
        │            MODEL ROUTER
        │         zero-budget-first
        │          ┌──────┼──────┐
        │          ▼      ▼      ▼
        │     OpenRouter Gemini provider-N
        │          └──────┼──────┘
        │                 ▼
        │          validated output
        └────────────┬────┘
                     ▼
              AUTHORIZATION
        GREEN auto / YELLOW dual
           / RED authorized human
                     │
                     ▼
               ACTION EXECUTOR
                     │
       Supabase / notifications /
       lifecycle / integrations
                     │
                     ▼
             RESULT VERIFIER
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
   DECISION LEDGER        EVIDENCE LEDGER
          │                     │
          └──────────┬──────────┘
                     ▼
            QA + REGRESSION D9
                     │
                     ▼
            INDEPENDENT AUDIT D14
                     │
                     ▼
                LAUNCH GATE
```

Todo el recorrido usa `correlation_id`; cuando existe un servicio real también usa el `serviceId` canónico.

---

## 2. Principios de referencia industrial

### 2.1 Uber — marketplace realtime, geoespacial y plataforma modular

UGO adopta como patrón, no como copia de infraestructura:

- marketplace que recibe y ejecuta cambios en tiempo real;
- matching consciente de geografía/ETA, no sólo distancia lineal;
- servicios/plataformas modulares con responsabilidades claras;
- aislamiento entre core crítico y capacidades opcionales;
- resiliencia/failover en componentes críticos;
- sincronización realtime de participantes de un servicio;
- observabilidad y evidencia de cada transición.

Aplicación UGO:

```text
request Cliente
→ snapshot ubicación
→ candidatos elegibles ≤20 km
→ filtros deterministas
→ ranking/matching
→ oferta
→ aceptación atómica
→ realtime Cliente/Proveedor/Admin
→ lifecycle físico
```

La IA puede ayudar a clasificar, priorizar, explicar o analizar. No reemplaza invariantes de matching, GPS, RLS, pagos ni lifecycle.

### 2.2 Airbnb — control plane, data plane, rollout seguro y observabilidad independiente

UGO adopta:

- **Control plane:** Super Admin, políticas, autoridad, Kill Switch, Model Router, Launch Gate.
- **Data plane:** Supabase TEST como estado autoritativo, RPC/RLS, Realtime, ledgers.
- **Workers/agents:** consumidores explícitos de jobs/eventos.
- cambios configurables con validación antes de aplicación;
- shadow/canary antes de mutaciones de alto impacto;
- retries/rate limits/circuit breakers;
- observabilidad que no dependa únicamente del componente observado.

### 2.3 Regla UGO

No migrar UGO a miles de microservicios “porque Uber lo hace”. El patrón a copiar es **separación de responsabilidades, contratos, resiliencia, ownership y observabilidad**, usando primero la infraestructura actual y costo directo cero cuando sea viable.

---

## 3. Flujo exacto de integración

### F1 — Entrada

Fuentes:
- Cliente;
- Proveedor;
- Admin;
- Super Admin;
- eventos de servicio;
- pagos/deuda;
- ratings;
- chat/notificaciones;
- GPS/mapas;
- Calendar;
- integraciones autorizadas.

**Contrato**
- evento con ID único;
- actor autenticado;
- target;
- `serviceId` cuando aplique;
- timestamp;
- `correlation_id`;
- procedencia;
- no incluir secretos.

**DONE**
- [ ] todos los eventos P0 relevantes generan/actualizan estado autoritativo;
- [ ] duplicados son idempotentes;
- [ ] evento inválido no muta negocio;
- [ ] reload/reconnect no crea una segunda realidad.

### F2 — Job Manager

Responsabilidades:
- crear job;
- deduplicar;
- asignar departamento/agente;
- lease;
- retry controlado;
- recuperar jobs huérfanos;
- preservar correlación.

Estados canónicos mínimos:

```text
QUEUED
RUNNING
WAITING_APPROVAL
BLOCKED
SUCCEEDED
FAILED
CANCELLED
```

**DONE**
- [ ] concurrencia probada;
- [ ] lease/timeout probado;
- [ ] retry no duplica efectos;
- [ ] jobs huérfanos se recuperan;
- [ ] fallo queda visible en Operación en vivo.

### F3 — Data Quality Gate

Antes de decidir:
- freshness;
- provenance;
- completeness;
- consistency;
- reconciliación adicional para alto riesgo.

Salida:

```text
TRUSTED → continuar
DATA_UNTRUSTED → bloquear/escalar
```

**DONE**
- [ ] datos obsoletos no disparan acción;
- [ ] GPS inválido no se convierte en “llegó”;
- [ ] evidencia ausente no se inventa;
- [ ] fallo de fuente queda persistido.

### F4 — Authority Gate

```text
GREEN  → reversible + bajo riesgo + policy → auto
YELLOW → bounded/material → aprobación configurada / dual control
RED    → irreversible/high impact → humano autorizado
```

**DONE**
- [ ] GREEN no excede permisos;
- [ ] YELLOW exige aprobadores según política;
- [ ] segundo aprobador YELLOW no puede ser el mismo cuando aplica dual control;
- [ ] RED jamás entra en ejecución autónoma;
- [ ] Decision Ledger registra autorización/rechazo.

### F4.1 — UX del modo global de autonomía

El control de Super Admin debe traducir los valores internos sin cambiar su semántica de backend:

| Valor persistido | Etiqueta UI | Significado |
|---|---|---|
| `OFF` | OFF | observa; no ejecuta mutaciones autónomas |
| `SHADOW` | SHADOW | analiza/simula; no ejecuta mutaciones |
| `ON` | ON | ejecuta únicamente acciones autorizadas por policy/authority |
| `SAFE_MODE` | MODO SEGURO | contiene automatizaciones afectadas sin fingir apagado global |

Reglas de UX/gobernanza:
- mostrar siempre el **estado actual persistido**;
- el modo activo no vuelve a enviarse al RPC;
- un cambio requiere motivo auditable no vacío;
- el motivo es una justificación administrativa, no una contraseña;
- la UI no cambia optimistamente: después del RPC se resincroniza desde Supabase;
- si el RPC falla, mostrar el error y resincronizar; nunca fingir el nuevo modo;
- cambiar la etiqueta visual `SAFE_MODE` a “MODO SEGURO” no cambia el valor persistido ni contratos SQL;
- `ON` no elimina GREEN/YELLOW/RED, Data Quality Gate, Kill Switches, RLS/RPC, QA ni auditoría.

**DONE**
- [ ] estado actual inequívoco;
- [ ] cuatro modos entendibles en desktop/móvil;
- [ ] motivo auditable registrado por backend;
- [ ] fallo de RPC deja visible el estado autoritativo;
- [ ] contrato automático evita degradar estas garantías.

### F5 — Model Router

La IA sólo se invoca cuando aporta valor. Orden:

```text
clasificar tarea
→ consultar candidatos persistidos
→ filtrar elegibles
→ zero-budget-first
→ primary
→ validar respuesta
→ si falla: fallback
→ validar fallback
→ persistir modelo/latencia/error/costo
→ si todos fallan: EXTERNAL_PROVIDER_FAILURE
```

Proveedores iniciales:
- OpenRouter;
- Gemini;
- otros únicamente si están configurados y gobernados.

OpenAI u otro proveedor no se considera “conectado” sólo por aparecer en UI.

**DONE**
- [ ] secret → workflow/runtime env;
- [ ] consumidor server-side;
- [ ] probe autenticado;
- [ ] respuesta validada;
- [ ] primary probado;
- [ ] fallback **forzado y probado**;
- [ ] costo persistido;
- [ ] latencia persistida;
- [ ] modelo real persistido;
- [ ] cuota/capacidad agotada se registra como blocker externo;
- [ ] ninguna API key llega al browser/log/ledger;
- [ ] panel distingue CONNECTED / DEGRADED / NO QUOTA / DISCONNECTED.

### F6 — Ejecutor

El executor recibe únicamente acciones autorizadas.

Ejemplos:
- lifecycle;
- matching;
- notificaciones;
- conciliaciones permitidas;
- integraciones;
- acciones de recuperación.

**Reglas**
- RPC/RLS siguen siendo autoridad;
- IA no ejecuta SQL arbitrario;
- idempotency key por efecto;
- verificación posterior obligatoria;
- compensación, no borrado de historial.

**DONE**
- [ ] cada acción crítica tiene verificador;
- [ ] retry no duplica pago/notificación/asignación;
- [ ] error parcial no deja estado imposible;
- [ ] excepción normal no requiere editar DB manualmente.

### F7 — Ledgers

**Decision Ledger**
- quién/qué decidió;
- autoridad;
- policy;
- evidencia usada;
- aprobación;
- resultado.

**Evidence Ledger**
- referencia verificable;
- hash cuando corresponda;
- tipo;
- resultado;
- correlación.

**DONE**
- [ ] append-only;
- [ ] searchable por correlation_id;
- [ ] searchable por serviceId;
- [ ] sin secretos;
- [ ] no se puede borrar/re-escribir historia crítica.

### F8 — QA D9

```text
scenario
→ simuladores
→ chaos/fault
→ deterministic judge
→ diagnosis
→ remediation
→ rerun
→ permanent regression
```

**DONE**
- [ ] Client simulator;
- [ ] Provider simulator;
- [ ] Admin/System simulator;
- [ ] chaos;
- [ ] seeded defect/meta-QA;
- [ ] Regression Agent habilitado;
- [ ] latest permanent regression = PASS;
- [ ] Quality Coverage Map P0 completa.

### F9 — Auditoría D14

Los seis auditores D14 deben permanecer independientes.

**DONE**
- [ ] findings con owner/severity/deadline;
- [ ] departamento auditado no cierra su finding crítico;
- [ ] re-audit independiente;
- [ ] AI Governance audita Model Router;
- [ ] Cross-Department audita Customer #1;
- [ ] Control Inspector demuestra controles ejecutados, no sólo configurados.

### F10 — Launch Gate

El gate consume evidencia persistida.

Bloquea como mínimo por:
- QA coverage incompleta;
- QA failure;
- finding crítico;
- modelo requerido sin ruta/fallback;
- Customer #1 no aceptado;
- journey físico incompleto;
- intervención manual oculta.

**DONE**
- [ ] gate determinista;
- [ ] blockers exactos;
- [ ] no se puede “aprobar” modificando UI;
- [ ] READY sólo emerge de evidencia real.

---

## 4. Flujo físico Customer #1

```text
Cliente solicita
→ ubicación real
→ matching ≤20 km
→ Proveedor recibe
→ acepta
→ ESTOY YENDO
→ GPS reciente
→ llegada/geofence
→ YA LLEGUÉ
→ evidencia inicial real
→ comenzar
→ ejecución
→ evidencia final real
→ Cliente aprueba
→ pago
→ deuda/comisión UGO si efectivo
→ completado
→ rating Cliente→Proveedor
→ rating Proveedor→Cliente
→ expediente Admin
→ D14 audita serviceId
→ Launch Gate
```

**No sustituible por simulación:**
- GPS físico;
- bytes reales de cámara/evidencia;
- push/background cuando el gate lo exige;
- aceptación humana;
- dos roles/dispositivos para el journey final.

---

## 5. Realtime y panel Operación en vivo

Super Admin debe mostrar **estado persistido**, nunca animación ficticia.

Por agente/job:
- departamento;
- agente;
- tarea;
- estado;
- authority class;
- serviceId;
- correlation_id;
- última acción;
- Decision/Evidence timeline;
- error/blocker;
- aprobación requerida.

Conexión:
```text
Supabase authoritative state
→ Realtime subscription
→ Super Admin
→ reconnect
→ authoritative resync
```

**DONE**
- [ ] indicador En vivo/Reconectando/Degradado;
- [ ] resync tras reconexión;
- [ ] fallback periódico si Realtime cae;
- [ ] ninguna tarea aparece RUNNING si backend no lo afirma.

---

## 6. Resiliencia

Para cada dependencia externa:

```text
timeout
→ retry con backoff cuando sea seguro
→ circuit breaker
→ fallback
→ persist blocker
→ alert/observability
→ recovery probe
```

No aplicar retry ciego a operaciones no idempotentes.

Kill Switch:
- GLOBAL;
- DEPARTMENT;
- AGENT;
- CAPABILITY.

Recovery:
```text
contain
→ preserve state/evidence
→ diagnose
→ repair
→ deterministic verify
→ re-audit
→ recover
```

---

## 7. Observabilidad y SLO internos

Métricas mínimas:
- jobs queued/running/blocked/failed/succeeded;
- queue latency;
- execution latency;
- retries;
- orphan recovery;
- model success/fallback/failure;
- model latency/cost;
- Realtime connection health;
- matching latency;
- provider offer/accept latency;
- lifecycle transition failures;
- push delivery failures;
- RLS/RPC denied anomalies;
- open audit findings.

Toda alerta debe responder:
1. qué falló;
2. qué `serviceId/correlation_id` afecta;
3. si existe impacto al cliente;
4. qué control contuvo el problema;
5. cuál es la próxima acción verificable.

---

## 8. Seguridad

- secretos sólo server-side/GitHub secret store;
- least privilege;
- RLS + RPC;
- no SQL arbitrario generado por LLM;
- no self-grant;
- no self-change de authority;
- no production deploy autónomo;
- no movimiento sensible de dinero basado sólo en lenguaje natural;
- auditoría append-only;
- PII mínima en prompts/evidencia;
- prompt injection tratado como input no confiable.

---

## 9. Matriz de integración

| Bloque | Fuente de verdad | Ejecutor | Evidencia | Gate |
|---|---|---|---|---|
| Autonomy mode | autonomous_company_state | RPC gobernado | Decision Ledger | policy |
| Jobs | autonomous_jobs | worker | job/result | DQ + authority |
| Agentes | autonomous_agents | worker/router | last action | permissions |
| AI | model candidates/routes | server worker | metrics/evidence | Model Router |
| Aprobación | jobs + policy | Super Admin RPC | Decision Ledger | authority |
| Acción producto | servicios/pagos/etc. | RPC/backend | domain state | deterministic |
| QA | QA tables | D9 | QA runs | deterministic judge |
| Auditoría | findings/risk/control | D14 | findings/evidence | independent |
| Release | release gate | evaluator | blockers | Launch Gate |

---

## 10. Plan de cierre hasta DONE

### P0-A — Repo Health
- [ ] TypeScript PASS.
- [ ] build PASS.
- [ ] contratos PASS.
- [ ] lint PASS.
- [ ] ningún test debilitado para conseguir verde.

### P0-B — DB/RLS
- [ ] todas las migraciones de autonomía aplicadas en UGO TEST.
- [ ] RLS validada por rol.
- [ ] RPCs validados.
- [ ] Regression Agent D9 habilitado runtime.
- [ ] ledgers append-only probados.

### P0-C — Workers
- [ ] worker ejecuta sin browser.
- [ ] idempotencia.
- [ ] leases/concurrencia.
- [ ] recovery.
- [ ] orphan jobs.
- [ ] error persistence.

### P0-D — IA
- [ ] OpenRouter probe real.
- [ ] Gemini probe real.
- [ ] primary real.
- [ ] fallback forzado real.
- [ ] provider outage test.
- [ ] quota exhaustion test.
- [ ] telemetry persistida.
- [ ] panel de conexión inequívoco.

### P0-E — Governance
- [ ] OFF.
- [ ] SHADOW.
- [ ] ON.
- [ ] SAFE_MODE.
- [ ] GREEN.
- [ ] YELLOW dual control.
- [ ] RED human-only.
- [ ] cuatro niveles de Kill Switch.
- [ ] recovery + re-audit.

### P0-F — QA
- [ ] simuladores.
- [ ] chaos.
- [ ] seeded defect.
- [ ] meta-QA.
- [ ] permanent regressions.
- [ ] coverage P0 completa.

### P0-G — Customer #1
- [ ] Cliente real TEST.
- [ ] Proveedor real TEST.
- [ ] matching ≤20 km.
- [ ] aceptación.
- [ ] GPS físico.
- [ ] llegada.
- [ ] evidencia inicial.
- [ ] trabajo.
- [ ] evidencia final.
- [ ] aprobación.
- [ ] pago.
- [ ] deuda UGO si efectivo.
- [ ] completion.
- [ ] rating bilateral.
- [ ] Admin 360.
- [ ] auditoría serviceId.

### P0-H — D14
- [ ] seis auditores activos.
- [ ] cross-department audit.
- [ ] AI governance audit.
- [ ] control audit.
- [ ] risk audit.
- [ ] findings corregidos.
- [ ] independent re-audit.
- [ ] cero critical findings abiertos.

### P0-I — Same-SHA final
Sobre un único SHA:
- [ ] Core CI GREEN.
- [ ] Isolated RPC/RLS GREEN.
- [ ] Autonomous Worker TEST GREEN.
- [ ] Android TEST GREEN.
- [ ] runtime UGO TEST evidence.
- [ ] regression evidence.
- [ ] Launch Gate recalculado.

### P0-J — DONE
```text
Launch Gate READY
AND no critical findings
AND Customer #1 accepted
AND P0 coverage complete
AND model failure has deterministic/fallback behavior
AND normal recovery needs no raw DB edit
AND same-SHA CI + runtime evidence exists
= EMPRESA AUTÓNOMA DONE
```

---

## 11. Criterio de no-DONE

Cualquiera de estos mantiene el bloque abierto:
- workflow rojo;
- migración sólo en repo;
- secret sin consumidor;
- API configurada sin probe;
- fallback no ejercitado;
- UI con datos inventados;
- QA sin meta-QA;
- runtime con edición manual de DB;
- GPS/cámara sólo simulados para aceptación final;
- finding crítico abierto;
- Launch Gate BLOCKED;
- evidencia de SHA diferente;
- producción necesaria pero no autorizada.

---

## 12. Orden de ejecución autónoma

```text
1 fetch/verify main
2 inspect same-SHA CI
3 repair internal failures
4 apply/verify UGO TEST migrations
5 validate RLS/RPC
6 validate workers
7 validate Model Router + forced fallback
8 validate governance modes/authority/kill switches
9 run QA + meta-QA + regression
10 run Customer #1 physical acceptance
11 D14 independent audit
12 remediate
13 independent re-audit
14 recalculate Launch Gate
15 run all final workflows on exact same SHA
16 update implementation evidence
17 DONE only if every gate proves it
```

No reset. No force push. No revert de trabajo ajeno. No PROD. No deploy sólo para obtener evidencia.

---

## 13. Referencias de arquitectura pública

Referencias usadas como patrones, no como afirmación de equivalencia entre UGO y esas plataformas:

- Uber Engineering — real-time marketplace, hyper-local geospatial, platform-first, resiliency: https://www.uber.com/blog/engineering/
- Uber — Real-Time Push Platform: https://www.uber.com/blog/real-time-push-platform/
- Uber — Marketplace Matching: https://www.uber.com/marketplace/matching/
- Uber — New Rider App Architecture / core vs optional reliability: https://www.uber.com/blog/new-rider-app-architecture/
- Uber — Domain-Oriented Microservice Architecture: https://www.uber.com/blog/microservice-architecture/
- Airbnb Engineering — Monitoring reliably at scale: https://airbnb.tech/infrastructure/monitoring-reliably-at-scale/
- Airbnb Engineering — Safeguarding Dynamic Configuration Changes at Scale: https://airbnb.tech/infrastructure/safeguarding-dynamic-configuration-changes-at-scale/
- Airbnb Engineering — Load Testing with Impulse: https://airbnb.tech/infrastructure/load-testing-with-impulse-at-airbnb/

---

## 14. Regla final

**UGO no intenta “ser Uber” copiando su escala. Adopta las propiedades que importan para Customer #1: marketplace realtime, separación de responsabilidades, estado autoritativo, matching geoespacial determinista, resiliencia, observabilidad, ejecución idempotente, control humano proporcional al riesgo y validación real.**

La Empresa Autónoma sólo está DONE cuando puede operar, fallar, contenerse, recuperarse, demostrar qué hizo y ser auditada de punta a punta en UGO TEST sin inventar estado ni requerir edición manual oculta.
