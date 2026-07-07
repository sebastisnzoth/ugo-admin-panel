# Hugo Blueprint — Phase 1: Memory Infrastructure

**Fecha**: Julio 7, 2026
**Rama**: `claude/hugo-2-strategy-plan-i2hoo1`
**Migraciones Supabase**: `20260707_hugo_memory_infrastructure`, `20260707_hugo_crud_rpcs`, `20260707_hugo_migrate_historical_data`

## Descripción
Implementación completa de la capa de memoria persistente para Hugo, transformándolo de chatbot sin estado a co-pilot context-aware. Habilita relaciones bidireccionales cliente↔proveedor con histórico de servicios, calidad de ratings, y seguimiento de disputas.

## Cambios en DB

### Nuevas Tablas (5)

1. **hugo_client_provider_relationships**
   - Columnas: cliente_id, proveedor_id, total_servicios, rating_promedio, resenas_count, ultima_interaccion, estado (activo/pausado/finalizado), notas_relacion
   - Índices: (cliente_id), (proveedor_id), (estado)
   - Constraint UNIQUE(cliente_id, proveedor_id)
   - RLS: clientes/proveedores ven propias relaciones; admins full access

2. **hugo_service_memory**
   - Snapshot completo de cada servicio: categoria, descripcion, monto (tarifa), ratings (calidad/velocidad/comunicacion)
   - Campos: resena_cliente, tiene_disputa, motivo_disputa, timestamps
   - Índices: (cliente_id, completado_at DESC), (proveedor_id, completado_at DESC), (servicio_id)
   - FK: servicio_id → servicios, cliente_id/proveedor_id → usuarios, relacion_id → hugo_client_provider_relationships

3. **hugo_interaction_log**
   - Registro de todas las interacciones: tipo (solicitud/confirmacion/mensaje/cancelacion/resena)
   - Contexto flexible vía JSONB
   - Índices: (usuario_id, created_at DESC), (tipo)
   - Permite rastrear preferencias y patrones

4. **hugo_memory_insights**
   - Agregación de insights para decisiones automáticas
   - Cliente: preferred_categories[], preferred_price_range, average_response_to_provider_seconds
   - Proveedor: specialization_categories[], average_completion_time_minutes, response_reliability, customer_satisfaction_score
   - Cross-insights: relacion_strength, repeat_likelihood
   - Índices: (cliente_id UNIQUE), (proveedor_id UNIQUE)

5. **hugo_feature_flags**
   - Toggles para features sin deploy: hugo_v2_enabled, hugo_memory_enabled, relationship_reports, voice_commands_enabled, analytics_engine
   - Campos: feature_key (UNIQUE), descripcion, enabled, grupo (admin/client_app/provider_app/analytics), config (JSONB)
   - Inicializados: hugo_v2_enabled=true, resto=false
   - RLS: readable by all, managed by admins

### RLS Policies (5 tablas × 2-4 policies)
- Clients/Providers: ven solo propias relaciones/interacciones
- Admins: full access a todas las tablas
- Feature flags: public readable, admin managed
- Login required para escribir en interaction_log

### RPC Functions (6)

1. **hugo_get_user_context(p_usuario_id, p_usuario_rol)**
   - Retorna: usuario_id, nombre, email, total_servicios, rating_promedio, historial_servicios (JSONB array), preferencias, relaciones_activas
   - Agregación de servicios completados + ratings promedio
   - Usado en: client.html/provider.html al boot y en chat context loading

2. **hugo_get_relationship_summary(p_cliente_id, p_proveedor_id)**
   - Retorna: relacion_id, total_services, avg_rating, quality_trend, repeat_likelihood, dispatch_issues
   - Quality trend: excellent/good/fair/poor según avg_rating
   - Usado en: admin dashboard para ver detalles de relación

3. **hugo_find_providers(p_cliente_id, p_categoria_id)**
   - Retorna: TOP 10 providers ordenados por compatibility_score
   - Filtra: tipo='proveedor', activo=true, subcategoria_id match
   - Usado en: búsqueda inteligente en client.html

4. **hugo_log_interaction(p_usuario_id, p_tipo, p_contexto)**
   - INSERT en hugo_interaction_log
   - Retorna: logged=true, interaction_id
   - Fire-and-forget desde client/provider.html

5. **hugo_toggle_feature(p_feature_key, p_enabled, p_config)**
   - UPDATE hugo_feature_flags con rollout inmediato
   - SECURITY DEFINER: acceso controlado por admin-only RLS
   - Retorna: feature_key, enabled, config
   - Usado en: AdminPanel feature toggle UI (futuro)

6. **hugo_update_relationship(p_cliente_id, p_proveedor_id, p_servicio_id, p_calidad, p_velocidad, p_comunicacion)**
   - INSERT or UPDATE hugo_client_provider_relationships
   - Recalcula: rating_promedio, total_servicios, resenas_count, ultima_interaccion
   - Llamado automáticamente después de resena

### Migración de Datos Históricos

Populate desde servicios + resenas + disputas:

- **hugo_service_memory**: 
  - Servicios con estado 'completado'/'cancelado' + resena asociada
  - Mapeo: tarifa→monto, rating_cliente→velocidad, rating_proveedor→comunicacion, resena.puntuacion→calidad
  - Disputas vinculadas: tiene_disputa=true, motivo=disputes.motivo

- **hugo_client_provider_relationships**:
  - Agrupación por (cliente_id, proveedor_id) de hugo_service_memory
  - Conteos: total_servicios=COUNT, resenas_count=COUNT(with comentario)
  - Rating: AVG((calidad+velocidad+comunicacion)/3)
  - Estado: 'activo' si ultima_interaccion < 90 días, else 'pausado'

- **hugo_memory_insights**:
  - Cliente: preferred_categories=ARRAY_AGG(categoria_nombre), price_range según AVG(monto)
  - Proveedor: specialization_categories, avg_completion_time, customer_satisfaction
  - Repeat likelihood: % de relaciones con total_servicios > 1

## Rollback

```sql
DROP TABLE IF EXISTS hugo_feature_flags CASCADE;
DROP TABLE IF EXISTS hugo_memory_insights CASCADE;
DROP TABLE IF EXISTS hugo_interaction_log CASCADE;
DROP TABLE IF EXISTS hugo_service_memory CASCADE;
DROP TABLE IF EXISTS hugo_client_provider_relationships CASCADE;
DROP FUNCTION IF EXISTS hugo_toggle_feature;
DROP FUNCTION IF EXISTS hugo_update_relationship;
DROP FUNCTION IF EXISTS hugo_log_interaction;
DROP FUNCTION IF EXISTS hugo_find_providers;
DROP FUNCTION IF EXISTS hugo_get_relationship_summary;
DROP FUNCTION IF EXISTS hugo_get_user_context;
```

## Next: Phase 2 (Query Layer)
- HTTP endpoints: POST /api/hugo/context, GET /api/hugo/relationship/:cliente/:proveedor, POST /api/hugo/feature-flags
- Caching layer (Redis o in-memory con TTL)
- Integration tests para <500ms load time

---

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
