# UGO Work Locks — Scheduler V2

Los locks son leases persistidos que coordinan trabajos de UGO entre sesiones y agentes.

## Archivo canónico

`docs/ugo-work-locks/<task-id>.json`

```json
{
  "task_id": "worker-autonomy",
  "title": "Prove the browser-independent scheduled TEST worker...",
  "status": "IN_PROGRESS",
  "started_at": "2026-09-29T17:00:00Z",
  "heartbeat_at": "2026-09-29T17:20:00Z",
  "lease_expires_at": "2026-09-29T18:05:00Z",
  "started_sha": "<main-sha>",
  "owner": "UGO",
  "resources": ["ugo-test-worker", "autonomy-state", "shared-provider-fixture"],
  "correlation_id": "<uuid>",
  "attempt": 1
}
```

## Estados

- `QUEUED`: reservado pero aún no ejecutando.
- `IN_PROGRESS`: ejecución activa.
- `WAITING_EVIDENCE`: ejecución terminada; falta consolidar evidencia.
- `DONE`: cerrada con evidencia.
- `FAILED`: falló; el scheduler aplica backoff y límite de intentos.
- `ABANDONED`: cancelada de forma explícita.

## Lease y heartbeat

- El lease dura por defecto lo definido en `docs/UGO_SCHEDULER_POLICY.json`.
- Mientras haya trabajo activo se actualizan `heartbeat_at` y `lease_expires_at`.
- Un lease vencido pasa a `STALE_LOCK` en el panel y **no se reutiliza automáticamente**.
- Antes de reintentar un lock stale, se debe reconciliar si el trabajo realmente terminó o quedó incompleto.

## Concurrencia

- El scheduler respeta `max_parallel_tasks`.
- Cada recurso tiene capacidad declarada.
- Varias tareas pueden correr en paralelo sólo si dependencias y capacidades lo permiten.
- Un lock activo consume capacidad hasta DONE/FAILED/ABANDONED o hasta reconciliación de un stale lock.

## Retries

- `FAILED` usa `retry_backoff_minutes`.
- Después de `max_attempts`, la tarea pasa a `FAILED_REQUIRES_REVIEW`.
- No se reinicia el contador manualmente para esquivar la política.

## Seguridad

- Nunca incluir secretos, tokens ni datos personales.
- Los locks coordinan ejecución; **no sustituyen evidencia de DONE**.
- Producción no se toca desde este scheduler.
