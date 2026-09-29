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
  "resources": ["ugo-test-worker", "qa-fixture-provider"],
  "correlation_id": "<id>"
}
```

Reglas:
- Crear el lock antes de modificar recursos compartidos.
- No tomar una tarea si existe un lock activo con recursos incompatibles.
- Al terminar, cambiar `status` a `DONE` o `FAILED` y agregar evidencia; no borrar historia útil.
- Nunca incluir secretos, tokens ni datos personales.
- Los locks no sustituyen la evidencia de DONE.
