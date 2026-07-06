# Hugo 2.0 — Entrega 2: Región + prompts dinámicos

**Fecha**: Julio 6, 2026
**Sin migraciones nuevas**: reutiliza `regiones`, `usuarios.region_cuenta` (Etapa 1) y `hugo_prompts_v2` (ya creada y poblada con 16 prompts BR/AR).

## Bug de raíz corregido
`usuarios.region_cuenta` es **UUID** (FK a regiones), pero provider.html comparaba `region_cuenta === 'BR'` → siempre falso → todos los proveedores veían el flujo AR (DNI/CUIT/CBU), incluso los de Brasil. Además ningún código escribía `region_cuenta` (0 de 1010 usuarios la tenían).

## Cambios
- **client.html / provider.html**: `resolveRegion()` al boot — resuelve `region_cuenta` → código (`BR`/`AR`) vía tabla `regiones`; si falta, infiere desde `usuarios.pais` (texto libre) y **auto-repara** persistiendo el UUID. El chat manda `region` a `/api/hugo/chat`.
- **provider.html**: las 4 comparaciones rotas usan ahora `REGION_CODE`; el paso 2 del wizard tiene selector de país (🇧🇷/🇦🇷) que guarda `region_cuenta`.
- **api/hugo/chat.ts**: con `hugo_v2_enabled='true'` y `region` presente, suma al system prompt la instrucción regional (idioma pt-BR/es-AR + moneda desde `regiones`) y el estilo de `hugo_prompts_v2` (role, region, context_type, mayor version activa). Si `__INICIO__` matchea una plantilla sin placeholders, responde directo sin llamar a la IA.

## Rollback
El mismo kill-switch: `hugo_v2_enabled='false'` desactiva la parte de prompts/región del API. El fix del wizard del proveedor no depende del flag (es corrección de bug, no feature).

---

# Hugo 2.0 — Entrega 1: Memoria persistente

**Fecha**: Julio 6, 2026
**Migración Supabase**: `hugo_v2_memory_prep` (solo aditiva)

## Cambios en DB
- Índices: `idx_hugo_sessions_usuario (usuario_id, activa)` y `idx_hugo_chat_session_created (session_id, created_at DESC)`
- Flag `config_sistema.hugo_v2_enabled = 'true'` — **kill-switch**: ponerlo en `'false'` desactiva toda la lógica nueva sin deploy
- Sin columnas nuevas: se reutilizan `hugo_sessions` (metadatos JSONB) y `hugo_chat`, que ya existían sin uso

## Cambios en frontend (client.html / provider.html)
- `loadHugoContext()` al boot: recupera/crea la sesión activa por (usuario, rol) y carga los últimos 10 mensajes → `HUGO_MEMORY`
- `hugoSave()`: persiste mensajes del usuario y respuestas IA de Hugo en `hugo_chat` (fire-and-forget). La narración templada del wizard NO se guarda; al completar el wizard se guarda un resumen compacto del pedido
- `hugoMeta()` (client): guarda `preferred_category` + `last_request_at` en `hugo_sessions.metadatos`; el saludo del chat lo usa ("La última vez pediste X")
- `hugoCall` envía `[...HUGO_MEMORY, ...chatHistory].slice(-8)` → Hugo recuerda entre sesiones sin cambios en `api/hugo/chat.ts`
- El saludo `__INICIO__` del proveedor no se persiste (evita llenar la memoria con saludos)

## Rollback
`UPDATE config_sistema SET valor='false' WHERE clave='hugo_v2_enabled';` — en segundos, sin deploy.

---

# Etapa 1: Regiones y Estados de Verificación

**Fecha**: Julio 5, 2026  
**Rama backup**: `backup/etapa-1-regiones-estados`  
**Commit**: Migraciones Supabase aplicadas

## Cambios en DB

### Tabla: regiones (NUEVA)
- `id UUID` (PK)
- `codigo_pais VARCHAR(2)` UNIQUE (BR, AR, etc.)
- `nombre_pais VARCHAR(100)`
- `moneda VARCHAR(3)` (BRL, ARS, UYU, etc.)
- `simbolo_moneda VARCHAR(5)` (R$, $, etc.)
- `metodos_pago_cliente JSONB` (["credito", "pix", "mercado_pago"])
- `metodo_payout_proveedor VARCHAR(50)` (pix, mercado_pago, cbu, etc.)
- `tarifario_base JSONB` ({base, km, request_fee, comision})
- `activo BOOLEAN` (default TRUE)

### Tabla: usuarios (MODIFICADA)
- `region_cuenta UUID` FK → regiones.id
- `estado_verificacion VARCHAR(50)` (registrado, perfil_completo, docs_pendientes, en_revision, verificado, rechazado)
- `onboarding_paso INTEGER` (0-6, guarda el progreso del wizard)
- `motivo_rechazo TEXT` (nullable, para docs rechazados)

### Datos iniciales
- Brasil: BRL, PIX, Mercado Pago
- Argentina: ARS, Mercado Pago

## Próxima Etapa
Etapa 2: Wizard de inscripción en provider.html (6 pasos con validación)

## RLS
- Tabla `regiones`: SELECT abierto (todos pueden ver disponibilidad de países)
- Índices creados en `region_cuenta` y `estado_verificacion` para performance
