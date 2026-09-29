---
name: ugo-runtime-validation
description: Validación runtime real en UGO TEST/Preview con backend autoritativo y evidencia persistida.
---
# UGO Runtime Validation
Cadena: `UI/API/worker → auth → backend/RPC → persistencia → contraparte/realtime → evidencia → judge`.

Reglas:
- UGO TEST para validación destructiva.
- Probar positivos y negativos cuando corresponda.
- Verificar consumidor real de credenciales/configuración.
- UI debe concordar con backend.
- Worker debe probar ejecución sin navegador cuando aplique.
- IA debe probar primary/fallback/telemetría cuando sea requisito.
- Lifecycle usa serviceId persistido.
- No fabricar GPS, pagos, ratings ni aceptación humana.
- SAME-SHA obligatorio cuando depende de código.

DONE: efecto runtime reproducible + estado persistido concordante + evidencia + verificación independiente.
