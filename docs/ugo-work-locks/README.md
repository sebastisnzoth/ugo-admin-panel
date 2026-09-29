# UGO Work Locks

Esta carpeta contiene locks persistidos de trabajo del UGO Implementation Command Center.

Cada tarea activa debe crear un archivo JSON:

`docs/ugo-work-locks/<task-id>.json`

Formato:

```json
{
  "task_id": "phase-b-worker-autonomy",
  "title": "Prove scheduled TEST worker...",
  "status": "IN_PROGRESS",
  "started_at": "ISO-8601",
  "started_sha": "<main-sha>",
  "owner": "UGO",
  "department": "Plataforma Autónoma",
  "assigned_agent": "Autonomy Worker",
  "skills": ["scheduled-worker", "job-execution", "decision-ledger"],
  "validators": ["Judge", "Sentinel"],
  "resources": ["ugo-test-worker", "qa-fixture-provider"],
  "correlation_id": "<id>",
  "current_step": "EXECUTE",
  "evidence_ids": []
}
```

Reglas:
- Crear el lock antes de modificar recursos compartidos.
- No tomar una tarea si existe un lock activo con recursos incompatibles.
- Al terminar, cambiar `status` a `DONE` o `FAILED` y agregar evidencia; no borrar historia útil.
- Nunca incluir secretos, tokens ni datos personales.
- Los locks no sustituyen la evidencia de DONE.


## Modelo organizacional obligatorio

Todo trabajo pertenece a **Empresa Autónoma**. UGO Maestro actúa como orquestador: prioriza, asigna un job a un especialista, controla dependencias/locks y nunca autocertifica el resultado.

Flujo:

`UGO Maestro → job asignado → agente especializado → evidencia/QA → Judge → Sentinel → DONE`

Reglas adicionales:
- Un job debe tener `job_id`, `department`, `assigned_agent`, `skills` y `validators`.
- El agente ejecutor no puede declarar por sí solo el DONE final.
- Judge verifica criterios de aceptación y evidencia; Sentinel valida invariantes, seguridad y estado seguro.
- El lock es también el registro operativo visible del trabajo en curso.
- Si un job cambia de agente, preservar el mismo `task_id`/`correlation_id` siempre que sea la misma unidad de trabajo.
- No crear departamentos o agentes paralelos fuera de Empresa Autónoma para resolver el mismo trabajo.
