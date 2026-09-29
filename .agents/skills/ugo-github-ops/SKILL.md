---
name: ugo-github-ops
description: Operación segura de GitHub para Empresa Autónoma: Actions, Pages, workflow_dispatch, runs, artifacts y CI same-SHA.
---
# UGO GitHub Ops
Usar GitHub como canal determinista sin exponer secretos.

Reglas:
- GITHUB_DIRECT sólo para workflows allowlisted.
- Nunca PAT/token en GitHub Pages.
- Registrar actor, workflow, run_id, SHA, task_id, job_id, timestamps y resultado.
- queued/in_progress no equivale a success.
- No mezclar greens de SHAs distintos.
- Pages publica snapshots verificables; stale debe mostrarse como stale.
- Reintentos respetan locks/backoff.
- Producción permanece protegida.

DONE: run correcto + evidencia persistida + mismo SHA + Judge PASS + Sentinel PASS.
