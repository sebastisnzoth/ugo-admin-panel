---
name: ugo-recovery
description: Recuperación segura de stale locks, workflows cancelados, retries, rollback e incidentes de Empresa Autónoma.
---
# UGO Recovery
Protocolo: `DETECTAR → AISLAR → PRESERVAR EVIDENCIA → CAUSA RAÍZ → RECUPERAR/ROLLBACK → REPROBAR → SENTINEL → CERRAR`.

Reglas:
- No liberar stale lock a ciegas; reconciliar primero.
- No repetir estrategia equivalente sin evidencia nueva.
- Respetar max_attempts/backoff.
- Continuar trabajo independiente si el bloqueo no comparte recursos.
- Preferir recuperación/compensación a edición manual de DB.
- Si una excepción normal exige editar Supabase/GitHub a mano, registrar gap real.
- Producción fail-closed.

DONE: estado consistente, sin jobs huérfanos, recursos liberados, evidencia preservada, regresión cubierta y Sentinel PASS.
