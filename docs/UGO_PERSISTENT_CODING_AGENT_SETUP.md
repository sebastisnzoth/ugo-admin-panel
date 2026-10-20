# UGO — agente persistente con FreeLLMAPI y Groq (desactivado hasta validación)

Workflow: `.github/workflows/ugo-persistent-coding-agent.yml`, PR #546.

## Arquitectura y seguridad

GitHub Actions (runner efímero) → Aider (OpenAI-compatible Chat Completions) → `https://ugo-hive-freeapi.onrender.com/v1` → proveedor Groq configurado en FreeLLMAPI → modelo `openai/gpt-oss-120b`.

Una ejecución cada seis horas, con límite de 45 minutos, solo al habilitar explícitamente `UGO_CODING_AGENT_ENABLED=true`. Crea como máximo un PR borrador en una rama nueva; nunca fusiona ni despliega, y nunca requiere dejar la Mac encendida. No se agregan claves de Supabase/Vercel/producción.

## Bloqueos verificables antes de activar

1. **Proveedor de FreeLLMAPI**: `GROQ_API_KEY` presente como variable en Render no implica que FreeLLMAPI la haya importado. Revisar su panel de API Keys: debe existir un registro de plataforma `groq` válido. El código admite importación declarativa mediante `FREEAPI_CONFIG_JSON` con `keys:[{platform:"groq",key:"..."}]` pero jamás almacenar la clave en GitHub o texto plano. No inventar conexión ni resultado.
2. **Acceso al gateway**: crear un token para el proxy desde el mecanismo de autenticación de FreeLLMAPI y guardarlo en GitHub Actions secret `UGO_CODING_AGENT_FREEAPI_KEY`. No es necesariamente igual a la clave de Groq; verificar la autenticación de `/v1/chat/completions`. No usar secretos en URLs/logs.
3. **Prueba real**: ejecutar una llamada pequeña al gateway con `openai/gpt-oss-120b` y confirmar respuesta HTTP, contenido y límite gratuito. Aider requiere Chat Completions compatible y soporte de edición. Si el gateway rechaza la llamada, **no activar** el workflow.
4. **Instalación de Aider**: confirmar que la versión fijada `aider-chat==0.86.1` existe, se instala y funciona con el modelo/proxy en un runner de prueba; actualizar la versión con CI si falla.
5. **Activación**: solo tras pruebas pasar `UGO_CODING_AGENT_ENABLED=true` en las variables de Actions y lanzar manualmente; verificar logs, PR, CI y límites antes de aceptar la programación recurrente.

## Notas

El flujo anterior de Codex CLI usaba la API de OpenAI de pago y el protocolo Responses; se reemplazó por Aider para usar Chat Completions de FreeLLMAPI. El PR #546 **no está desplegado ni operativo** mientras esté en borrador y fuera de main. Los P0 del proveedor, GPS y matching permanecen pendientes hasta haber evidencias. Nunca interpretar presencia de código como prueba E2E.
