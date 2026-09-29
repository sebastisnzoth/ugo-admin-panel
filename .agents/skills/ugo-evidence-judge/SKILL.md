---
name: ugo-evidence-judge
description: Evidencia, Decision/Evidence Ledger y verificación independiente de DONE para Empresa Autónoma.
---
# UGO Evidence + Judge
Jerarquía: runtime/DB/API > evidencia persistida ligada a SHA/correlation/service/job > CI same-SHA > logs > UI > docs.

Contrato: `executor → evidence → independent judge → Sentinel → gate`.

Reglas:
- El ejecutor no autocertifica.
- Evidence Ledger no guarda secretos.
- Decision Ledger registra decisión, autoridad, datos, acción y resultado.
- Judge rederiva desde estado persistido cuando sea posible.
- Booleans del caller no son evidencia autoritativa.
- Evidencia de otro SHA no satisface same-SHA.
- Si falta evidencia: UNVERIFIED/PENDING.

PASS: criterio satisfecho + correlación consistente + evidencia suficiente + Sentinel PASS.
