# UGO — Readiness `auto-departments` VERIFIED

## Estado final

- **READINESS_ID:** `auto-departments`
- **Control:** Departamentos conectados
- **Área:** UGO Empresa Autónoma
- **Estado autoritativo:** **VERIFIED**
- **Lock:** `docs/ugo-work-locks/readiness-auto-departments.json`
- **Evidencia principal:** `docs/evidence/readiness-auto-departments-20260929.json`
- **MAIN SHA de cierre:** `24ec61d201be36bca5a15f099adc8f5aa272fa48`
- **SHA runtime validado:** `86a642fa25856df6e35beec75a8c6596feeb9003`
- **Producción tocada:** **NO**
- **Entorno runtime:** UGO Arena / TEST

## Qué quedó verificado

Se verificaron los 13 departamentos corporativos canónicos de UGO:

- D1 Executive AI Direction
- D2 Operations
- D3 Client Experience
- D4 Providers
- D5 Growth & Expansion
- D6 Trust & Resolution
- D7 Finance
- D8 Technology & Security
- D9 Quality, QA & Excellence
- D10 Legal, Compliance & Policy
- D11 Marketing, Brand & Communication
- D12 Product, Design, UI/UX & Experience
- D14 Corporate Audit, Governance & Control

Para cada departamento existe evidencia persistida de:

1. registro del departamento;
2. agente responsable habilitado;
3. job de readiness persistido;
4. input de evidencia;
5. output persistido;
6. `correlation_id`;
7. evidencia en `autonomous_evidence_ledger`;
8. job final `SUCCEEDED`;
9. madurez persistida `CONNECTED`.

## Mejora visible en Super Admin

La vista **Departamentos** de UGO Empresa Autónoma ahora muestra:

- agente responsable;
- `agent_key`;
- madurez;
- estado de prueba runtime;
- SHA runtime asociado.

La UI no marca madurez por inferencia. Lee `health.auto_departments_readiness` persistido en backend.

## Defectos detectados y corregidos

### 1. Permisos insuficientes en UGO TEST

El primer runtime falló con:

```
42501 permission denied for table autonomous_departments
```

Se corrigió con privilegios mínimos del `service_role`, exclusivamente para el runtime server-side:

- `SELECT, UPDATE` sobre `autonomous_departments`
- `SELECT, INSERT` sobre `autonomous_jobs`
- `SELECT, INSERT` sobre `autonomous_evidence_ledger`

Migración persistida:

`supabase/migrations/20260929205500_autonomous_departments_readiness_service_grants.sql`

No se otorgaron permisos nuevos a `anon` ni `authenticated`.

### 2. Protección de autoridad

El segundo runtime detectó correctamente:

```
AUTONOMOUS_AGENT_AUTHORITY_DOWNGRADE
```

El proof estaba intentando registrar todos los jobs con autoridad `GREEN`, incluso cuando el agente responsable tenía autoridad `YELLOW` o `RED`.

La corrección preserva el `authority_class` real del agente. No se relajó ni eliminó el guard de integridad.

## Pruebas

Workflow dedicado:

`UGO Readiness Auto Departments TEST`

Resultado:

- environment guard UGO TEST: **PASS**
- regresión permanente: **4/4 PASS**
- runtime 13 departamentos: **PASS**
- Judge: **PASS**
- Sentinel: **PASS**
- artifact de evidencia: **creado correctamente**

GitHub Actions:

- Run: `36630030506`
- Job: `109616633354`
- Artifact: `11061827187`
- Digest: `sha256:9d6c2f78f80fb2566d15b4ba5acd83107ce4bbfd9d9650fa2b510a194aff6bc6`

## Criterio autoritativo de cierre

Según `scripts/ugo-readiness-engine.mjs`, un control queda VERIFIED cuando:

- lock `status = DONE`;
- existe evidencia persistida;
- Judge = `PASS`;
- Sentinel = `PASS`.

`auto-departments` cumple los cuatro requisitos.

## Estado del lock

`docs/ugo-work-locks/readiness-auto-departments.json`

Contiene:

- `status: DONE`
- `current_step: DONE`
- `validators_result.Judge: PASS`
- `validators_result.Sentinel: PASS`
- referencias de workflow/job/artifact;
- evidencia por los 13 departamentos;
- `production_touched: false`.

## Resultado

**`auto-departments` queda cerrado y no requiere acción humana ni prueba física.**

Las pruebas humanas/físicas continúan diferidas para el final del camino UGO y no forman parte de este control.
