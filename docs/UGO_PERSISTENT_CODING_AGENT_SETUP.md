# UGO — Agente de código persistente (preparado, desactivado por defecto)

Workflow: `.github/workflows/ugo-persistent-coding-agent.yml`.

## Qué hace
- GitHub Actions lo despierta cada 6 horas o manualmente, siempre que esté habilitado.
- Recupera la tarea persistente #543 y las instrucciones del repositorio.
- Ejecuta un único ciclo de reparación con Codex CLI en un runner aislado.
- Si hay modificaciones, crea **solamente una rama y un PR borrador**; nunca fusiona ni despliega.
- Cada ejecución comienza desde `main`, releyendo pendientes. No se proclama finalizada una tarea sin evidencia.

## Activación (requiere decisión de costos)
1. En GitHub, *Settings → Secrets and variables → Actions → Secrets*, configurar `UGO_CODING_AGENT_OPENAI_API_KEY` como secreto de repositorio (cuenta API con facturación/límite apropiado). **ChatGPT Plus y los límites de Codex Cloud no equivalen a créditos API.** Nunca poner la clave en un issue o en un archivo.
2. En *Variables*, configurar `UGO_CODING_AGENT_ENABLED=true` **solamente después de autorizar el posible gasto**. Dejar desactivado mientras tanto. Opcional: `UGO_CODING_AGENT_MODEL`.
3. En *Actions*, ejecutar una vez manualmente `UGO Persistent Coding Agent (gated)` y verificar logs, consumo de API, límites, PR borrador, CI y ausencia de acciones sobre producción.
4. Ajustar el presupuesto, frecuencia y permisos antes de dejar la ejecución programada.

## Advertencias
- No es un daemon infinito; es una ejecución periódica con límite de 45 minutos.
- El workflow no garantiza por sí solo la corrección, los tests E2E ni la entrega. Las pruebas reales siguen siendo obligatorias.
- No activar auto-merge ni despliegues desde estos PRs. Revisar permisos del token de Actions y reglas de protección del repositorio.
- Ninguna credencial adicional de Supabase, Vercel o de producción se inyecta en el agente.
- La rama de configuración debe superar su CI antes de integrarse; no modificar producción desde esta configuración.
