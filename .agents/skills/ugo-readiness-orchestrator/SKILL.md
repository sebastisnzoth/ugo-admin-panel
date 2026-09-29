---
name: ugo-readiness-orchestrator
description: Reconciliación autoritativa de controles READINESS_ID entre main, locks, PRs, evidencia runtime, Judge, Sentinel y Command Center.
---
# UGO Readiness Orchestrator

## Misión
Mantener una sola verdad operacional por cada `READINESS_ID` y evitar que trabajo real desaparezca por estar en una rama, PR, workflow o evidencia todavía no integrada a main.

## Orden obligatorio de reconciliación
`main → docs/ugo-work-locks/readiness-<id>.json → PRs abiertos → evidencia del PR/rama → Actions/Preview → runtime same-SHA → Judge → Sentinel → Command Center`.

Nunca responder estado desde una sola fuente si existe una fuente posterior más autoritativa.

## Estados
- `AVAILABLE`: puede tomarse ahora.
- `IN_PROGRESS`: lock activo persistido.
- `FIXED_IN_PR`: existe corrección abierta en PR pero falta cierre.
- `WAITING_RUNTIME`: PR/evidencia existe; falta runtime same-SHA.
- `JUDGE_PENDING`: runtime válido; falta Judge PASS.
- `SENTINEL_PENDING`: Judge PASS; falta Sentinel PASS.
- `VERIFIED`: lock DONE + evidencia persistida + Judge PASS + Sentinel PASS.
- `FAILED_REQUIRES_REVIEW`: intento fallido que requiere revisión.
- `STALE_LOCK`: lease vencido; reconciliar antes de continuar.
- `BLOCKED_DEPENDENCY`: depende de otro READINESS_ID no VERIFIED.
- `WAITING_RESOURCE_CAPACITY`: recurso incompatible ocupado.
- `QUEUED_CAPACITY`: espera slot del máximo global.
- `HUMAN_DEFERRED`: prueba real reservada hasta agotar trabajo autónomo.
- `HUMAN_REQUIRED`: sólo cuando todo trabajo autónomo aplicable está cerrado.

## Lock obligatorio
Antes de modificar código para un control habilitado:
`docs/ugo-work-locks/readiness-<READINESS_ID>.json`

Debe incluir al menos: `task_id`, `readiness_id`, `status`, `started_at`, `heartbeat_at`, `lease_expires_at`, `started_sha`, `resources`, `correlation_id`, `attempt`, `validators` y `evidence_ids`.

## Reconciliación de PR
Si un PR abierto contiene evidencia con `readiness_id`, no declarar "sin trabajo activo". Mostrar el estado intermedio exacto y continuar desde ahí sin repetir la corrección.

Si falta lock pero existe PR/evidencia, crear o reconciliar el lock sólo si puede hacerse sin falsear historial. Registrar el origen PR/SHA.

## DONE autoritativo
`VERIFIED = DONE lock + evidencia persistida + Judge PASS + Sentinel PASS`.

La existencia de código, PR, test, preview o documento por sí sola no basta.

## Command Center
El panel y UGO Maestro deben consumir la misma máquina de estados. Si Pages queda atrasado o falla, reportar `PANEL_SYNC_FAILED`/stale sin ocultar el trabajo real.

## Salida obligatoria
Siempre devolver:
`READINESS_ID | ESTADO EXACTO | PR/LOCK | SHA | EVIDENCIA | SIGUIENTE ACCIÓN | PASOS RESTANTES | HABILITADOS EN PARALELO`.
