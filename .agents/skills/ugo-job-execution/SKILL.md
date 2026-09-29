---
name: ugo-job-execution
description: Ejecución canónica de jobs de Empresa Autónoma. Usar para tomar, bloquear, ejecutar, heartbeat, cerrar y liberar trabajos sin duplicación.
---
# UGO Job Execution

## Misión
Convertir un requisito pendiente en un job auditable y seguro dentro de Empresa Autónoma.

## Entrada mínima
`task_id | job_id | objective | department | assigned_agent | skills | dependencies | resources | acceptance_criteria | source_sha`.

## Ciclo obligatorio
`VALIDAR ESTADO → ADQUIRIR LEASE → EJECUTAR → HEARTBEAT → PROBAR → EVIDENCIA → VERIFYING → DONE/FAILED → LIBERAR`.

## Reglas
- Revalidar `main`, scheduler y locks antes de escribir.
- No tomar un job si existe lease activo equivalente o conflicto de recursos.
- Respetar `docs/UGO_SCHEDULER_POLICY.json`: prioridad, capacidad, lease, retries y backoff.
- Preservar `task_id` y `correlation_id` para la misma unidad de trabajo.
- Nunca usar un commit como sustituto de DONE.
- Si falla, persistir `FAILED` + causa + evidencia; no borrar historia.
- Producción queda fuera salvo autorización explícita.
- Un job ejecutado por un agente no se autocertifica.

## Salida
`status | source_sha | result_sha | tests | evidence_ids | blocker | next_action | Judge | Sentinel`.

## DONE
Sólo después de efecto real + evidencia persistida + criterio de aceptación + Judge PASS + Sentinel PASS.
