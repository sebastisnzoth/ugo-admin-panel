# UGO — integración controlada de Agent Skills

**Fecha:** 2026-10-23  
**Destino:** `sebastisnzoth/ugo-admin-panel`, skills locales de `main` (una vez verificados e integrados)  
**Origen:** [sebastisnzoth/agent-skills](https://github.com/sebastisnzoth/agent-skills) (fork de [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills))  
**Revisión de origen fijada:** `aeac41d4d005999432bb7312f7ff06383a91d59d`  
**Licencia:** MIT; aviso completo en `docs/third-party/agent-skills-LICENSE`.

## Decisión

UGO ya dispone de skills de dominio (`ugo-core`, `ugo-qa`, `ugo-recovery`, `ugo-client`, `ugo-provider`, etc.), protocolos de seguridad, seguimiento y verificación. **No se sustituyen ni se reorganizan.** Se importan solamente ocho skills generales del paquete externo, sin instalar dependencias, configurar secretos, crear agentes nuevos ni modificar código de producto o Supabase.

Las skills copiadas textualmente residen en `.agents/skills/<nombre>/SKILL.md`. Son instrucciones para agentes, no servicios ejecutables ni pruebas E2E. Se mantiene la referencia al commit upstream para actualización auditada y reproducible.

| Skill incorporada | Uso en UGO | Contrato de UGO que prevalece |
| --- | --- | --- |
| `context-engineering` | Reanudar con el P0, SHA y evidencias reales | `AGENTS.md`, Camino Maestro, handoff |
| `debugging-and-error-recovery` | Reproducir → localizar → corregir → prevenir recurrencia | `ugo-recovery`, `ugo-core` |
| `test-driven-development` | Reproducción negativa y regresión antes de corregir | `ugo-qa`, tests reales de `tests/contracts` |
| `code-review-and-quality` | Revisión de corrección, riesgos y diffs antes de integrar | gates de UGO, no marcar DONE por PR |
| `security-and-hardening` | Auth, Supabase RLS, permisos, sesiones, pagos | límites de producción, datos y dinero |
| `ci-cd-and-automation` | Fortalecer los checks y analizar CI fallido | workflows vigentes; no saltar ni desactivar checks |
| `shipping-and-launch` | Verificación SHA, monitoreo, rollback, publicación | UGO TEST → SAME-SHA → smoke y aceptación |
| `browser-testing-with-devtools` | Revisión del runtime web Cliente/Proveedor, logs y red | herramientas reales; no inventar pruebas |

## Priorización y funcionamiento

1. Consultar `AGENTS.md`, `docs/UGO_CAMINO_MAESTRO.md`, P0, HEAD y CI reales. No sustituir ese recorrido con otra planificación.
2. Activar las skills relevantes al paso, no las ocho de una vez; conservar skills `ugo-*` como autoridad del dominio.
3. Para **Cliente → Pedido → Proveedor**, comenzar por los errores reales de Auth/GPS/Realtime/matching y reproducir con cuentas aisladas en TEST.
4. Requerir test de regresión, checks afectados, validación misma revisión, revisión de seguridad y evidencia del recorrido. Las etapas de publicación siguen las puertas ya existentes.
5. No confundir el descubrimiento de una skill con invocarla: Codex puede usar el directorio local; Aider y los workflows que no descubran estas carpetas deben recibir el contenido aplicable explícitamente en su contexto. No se modifica su configuración operativa en esta integración.
6. Ante conflicto entre consejo genérico y UGO, prevalece el contrato de UGO. Si faltan herramientas, marcar validación pendiente, nunca éxito ficticio.

## Verificación de esta integración

- `node --test tests/contracts/agent-skills-integration.test.mjs` comprueba que las ocho skills están presentes, su frontmatter, procedencia, licencia y enrutamiento.
- El workflow existente `.github/workflows/core-ci.yml` ejecuta `tests/contracts/*.test.mjs`, por lo que el contrato de integración forma parte de Core CI **cuando ese workflow se ejecuta y lo alcanza**.
- No se modifican los tests ni el código de producto existentes; cambios documentales/skills no equivalen a verificar el P0 de matching ni a poner Empresa Autónoma ON.
- Validar la invocación con un agente Codex real es una prueba adicional: por ejemplo `@debugging-and-error-recovery` y `@ugo-qa` en una sesión vinculada al repositorio. **No declarar esa prueba pasada sin ejecutarla.**

## Actualizaciones

Actualizar sólo con diff auditable contra el commit de origen y revisión de posibles conflictos con UGO. Conservar licencia y no ejecutar comandos ni hooks externos no auditados. Evitar actualización automática a `main` desde paquetes o skills remotas. Registrar nueva revisión fuente al actualizar y repetir las pruebas. No agregar más skills por volumen: incorporar sólo las que cierren un problema concreto.

**Estado:** importar habilidades y validar su estructura no demuestra que el cliente y el proveedor estén funcionando. El bloqueo P0 de matching y cualquier otro incidente abierto se mantiene hasta pruebas funcionales de extremo a extremo y evidencias pertinentes.
