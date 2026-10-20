# UGO — Agente de código persistente (preparado, desactivado por defecto)

Workflow: `.github/workflows/ugo-persistent-coding-agent.yml`.

## Qué hace
- GitHub Actions lo despierta cada 6 horas o manualmente, siempre que esté habilitado.
- Recupera la tarea persistente #543 y las instrucciones del repositorio.
- Ejecuta un único ciclo de reparación con Codex CLI en un runner aislado usando **FreeLLMAPI en Render** como proveedor de `/v1/responses` (modelo predeterminado `openai/gpt-oss-120b`). No utiliza la API de OpenAI.
- Si hay modificaciones, crea **solamente una rama y un PR borrador**; nunca fusiona ni despliega.
- Cada ejecución comienza desde `main`, releyendo pendientes. No se proclama finalizada una tarea sin evidencia.

## Activación (requiere decisión de costos)
1. Confirmar en Render que FreeLLMAPI responde a `/api/ping`, que Groq está disponible en el dashboard del gateway y que su modelo funciona en `/v1/responses`. La variable de entorno `GROQ_API_KEY` por sí sola **no demuestra** que FreeLLMAPI haya registrado el proveedor.
2. Crear una **clave de cliente del gateway FreeLLMAPI** con alcance limitado y guardarla en GitHub → Settings → Secrets and variables → Actions → Secrets con nombre `UGO_CODING_AGENT_FREEAPI_KEY`. **No es la clave de Groq.** No pegar secretos en archivos, issues o chats.
3. En Actions → Variables, mantener `UGO_CODING_AGENT_ENABLED=false` hasta verificar una invocación autenticada; opcionalmente configurar `UGO_CODING_AGENT_MODEL=openai/gpt-oss-120b`.
4. Integrar el workflow a `main` solamente después de validar YAML/CI. Habilitar el agente únicamente cuando se compruebe el gateway, el modelo, límites de uso y el aislamiento. Ejecutar manualmente una vez y revisar el resultado antes de dejar el cron activo.
5. El agente **no** tiene acceso a credenciales de Supabase ni a producción. No usar `GROQ_API_KEY` como token para autenticar el gateway; nunca hay fallback a OpenAI.

## Advertencias
- No es un daemon infinito; es una ejecución periódica con límite de 45 minutos.
- El workflow no garantiza por sí solo la corrección, los tests E2E ni la entrega. Las pruebas reales siguen siendo obligatorias.
- No activar auto-merge ni despliegues desde estos PRs. Revisar permisos del token de Actions y reglas de protección del repositorio.
- Ninguna credencial adicional de Supabase, Vercel o de producción se inyecta en el agente.
- La rama de configuración debe superar su CI antes de integrarse; no modificar producción desde esta configuración.
