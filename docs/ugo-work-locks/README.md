# UGO Work Locks — Professional Scheduler V2

Los locks son **leases persistidos** del modelo de Empresa Autónoma. Coordinan trabajos entre sesiones, agentes y workflows.

Flujo operativo:

`UGO Maestro → scheduler → job asignado → agente especializado → evidencia/QA → Judge → Sentinel → DONE`

## Lock canónico

`docs/ugo-work-locks/<task-id>.json`

```json
{
  "task_id": "worker-autonomy",
  "job_id": "UGO-WORKER-AUTONOMY",
  "title": "Prove the browser-independent scheduled TEST worker...",
  "status": "IN_PROGRESS",
  "started_at": "2026-09-29T17:00:00Z",
  "heartbeat_at": "2026-09-29T17:20:00Z",
  "lease_expires_at": "2026-09-29T18:05:00Z",
  "started_sha": "<main-sha>",
  "owner": "UGO",
  "department": "Plataforma Autónoma",
  "assigned_agent": "Autonomy Worker",
  "skills": ["scheduled-worker", "job-execution", "decision-ledger"],
  "validators": ["Judge", "Sentinel"],
  "resources": ["ugo-test-worker", "autonomy-state", "shared-provider-fixture"],
  "correlation_id": "<uuid>",
  "current_step": "EXECUTE",
  "attempt": 1,
  "evidence_ids": []
}
```

## Estados

- `QUEUED`: reservado, esperando ejecución.
- `IN_PROGRESS`: ejecución activa.
- `WAITING_EVIDENCE`: ejecución terminada, falta consolidar/verificar evidencia.
- `DONE`: cerrada con evidencia independiente.
- `FAILED`: falló; aplica backoff y límite de intentos.
- `ABANDONED`: cancelada explícitamente.

## Lease + heartbeat

- Duración por defecto: `default_lease_minutes` de `docs/UGO_SCHEDULER_POLICY.json`.
- El agente actualiza `heartbeat_at` y extiende `lease_expires_at` mientras trabaja.
- Un lease vencido pasa a `STALE_LOCK`.
- Un stale lock **no libera automáticamente el trabajo para duplicarlo**: primero se reconcilia si terminó, falló o quedó incompleto.

## Priorización

El motor ordena candidatos por:

1. prioridad declarada;
2. impacto en camino crítico;
3. orden estable del Master.

No se salta una dependencia sólo para ganar velocidad.

## Concurrencia

- Respeta `max_parallel_tasks`.
- Respeta capacidad por recurso.
- Tareas independientes pueden correr en paralelo.
- Tareas que comparten un recurso saturado esperan.
- Un trabajo activo consume capacidad hasta cierre/reconciliación.

## Retries

- `FAILED` entra en `RETRY_BACKOFF`.
- Backoff según `retry_backoff_minutes`.
- Después de `max_attempts` pasa a `FAILED_REQUIRES_REVIEW`.
- No se reinicia `attempt` para evadir la política.

## Gates humanos

Las tareas marcadas `human_gate` pasan a `HUMAN_REQUIRED` cuando sus dependencias están satisfechas. UGO puede preparar y acompañar, pero no fabricar la aceptación humana.

## Validación independiente

El agente ejecutor no autocertifica DONE:
- **Judge** verifica evidencia y criterio de aceptación.
- **Sentinel** verifica seguridad, invariantes y estado seguro.

## Seguridad

- Nunca incluir secretos, tokens ni datos personales.
- Los locks coordinan ejecución; no sustituyen evidencia.
- Producción queda fuera de este scheduler.
