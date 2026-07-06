# ETAPA 4: Dashboard Admin — OCR Visual + Métricas

**Fecha**: Julio 6, 2026
**Rama**: `backup/etapa-4-ocr-metricas`
**Sin migraciones DB**: cambios en AdminPanel.tsx y useAdminData.ts

## Cambios principales

### 1. Bug fix: OCR columns en usePendingDocuments()
- **Antes**: `.select('id,tipo,estado,created_at,url_storage,descripcion,notas,usuarios:usuario_id(...)')` — faltaban campos OCR
- **Después**: Agregadas columnas `ocr_resultado, ocr_valido, ocr_confianza, ocr_validado_at, notas_rechazo, intentos_resubmision, version, thumbnail_url, revisor_id`
- Resultado: `AdminPanel.tsx` línea 653 ya no muestra `—` para OCR status

### 2. updateEstado() mejorado
- Nuevo parámetro `notasRechazo?: string` diferenciado de `notas` genérico
- Al rechazar o pedir reenvío, persiste notas en columna `notas_rechazo` (distinct)
- Al pedir reenvío, incrementa `intentos_resubmision` (para historial)

### 3. Modal doc-preview: Rediseño OCR + historial
**Cambios visuales**:
- Layout dos columnas: documento izq (img/PDF) | OCR fields + confidence dcha
- Badge de confianza: verde ≥85%, amber 60-85%, rojo <60% con icono visual
- Retry history: si `intentos_resubmision > 0`, muestra chip "Reenvío #N" con `notas_rechazo` anterior
- Campos OCR: lista `campo: valor` desde `ocr_resultado` JSONB (no JSON crudo)
- Textarea de notas separadas para aprovación vs rechazo/reenvío

**Columnas renderizadas**:
- Proveedor (nombre + email)
- Documento (tipo DNI/CUIT/etc)
- Estado (pendiente/procesando/aprobado/rechazado)
- OCR confianza (% visual)
- Antigüedad (timeAgo)
- Acciones: Ver / Aprobar / Rechazar

### 4. renderDocumentos() mejorado
**Buckets de antigüedad**:
- 3 KPI cards: <24h | 24-72h | >72h (ayuda al admin priorizar docs viejos)
- Cálculo: `Math.floor((Date.now() - created_at) / 3600000)`

**Tabla de documentos**:
- Columna NUEVA: Thumbnail (si `thumbnail_url` existe, mostrar miniatura; else "sin foto")
- Confianza OCR: debajo del status OCR, muestra % en pequeño
- Click en thumbnail → abre modal (shortcut visual)

### 5. renderAnalytics() extendido
**KPIs por región**:
- Lee `pais` de usuarios en servicios completados
- Desglosar: Brasil (BRL, R$) | Argentina (ARS, ARS $)
- Cada región: ingresos totales + cantidad servicios completados

**Tiempo promedio de revisión**:
- Calcula: `avg(revisado_at - created_at)` para docs con estado `aprobado` o `rechazado`
- KPI card nueva: muestra en horas
- Usa array `reviewedDocs` internamente

**Cola de documentos**:
- KPI card: total documentos revisados (aprobado + rechazado)
- Separado de las buckets de antigüedad (que están en renderDocumentos)

## Archivos modificados

- `src/hooks/useAdminData.ts` (~20 líneas)
  - Línea 153: Expandido select en usePendingDocuments()
  - Línea 157-167: updateEstado() signature + payload OCR-aware
  
- `src/components/AdminPanel.tsx` (~400 líneas cambiadas/nuevas)
  - renderDocumentos(): Buckets de antigüedad + thumbnails + OCR % en tabla
  - Modal doc-preview: 2-column layout + confidence badge + retry history
  - renderAnalytics(): KPIs por región + avg review time + metrics computed

## Testing checklist

- [ ] `tsc -b && npm run build` sin errores ✅
- [ ] Admin abre panel → documentos muestran OCR % (no `—`)
- [ ] Click en thumbnail → modal abre, muestra documento + OCR fields lado a lado
- [ ] Confidence badge: ≥85%=verde, 60-85%=amber, <60%=rojo
- [ ] Retry history chip aparece si `intentos_resubmision > 0` con `notas_rechazo`
- [ ] Al rechazar/pedir reenvío, notas se guardan en `notas_rechazo` (SQL: verify `notas_rechazo` column updated)
- [ ] Buckets de antigüedad (<24h, 24-72h, >72h) suman docs correctamente
- [ ] Analytics: KPIs por región muestran R$ para Brasil y ARS $ para Argentina
- [ ] Tiempo promedio revisión calcula bien (sample: 3 docs con tiempos distintos)

## Rollback

No hay cambios en DB, solo UI/lógica:
```bash
git reset --hard <commit-anterior>
```

O simplemente revertir los 2 archivos:
```sql
-- No aplica (sin migraciones DB)
```

## Notas

- OCR visual assume `ocr_resultado` es JSONB válido; si viene como string, parsear en frontend
- `thumbnail_url` es opcional — si no existe, mostrar fallback "sin foto"
- Region matching: usa `pais` de usuarios (texto: 'BR'/'AR') para desglosar — no usa `region_cuenta` UUID (eso se lee en ocr_confianza y confundiría)
- Timeago helper reutilizado (`timeAgo` ya existe en AdminPanel.tsx)

---

# Regiones: seed UY/PY + tarifario_base BR/AR

**Fecha**: Julio 6, 2026 · **Solo datos, sin DDL ni deploy**

## Cambios
- `regiones`: filas UY (UYU/$U) y PY (PYG/₲) creadas con `activo=false` (no operativas hasta lanzamiento; payout Mercado Pago)
- `tarifario_base` BR: `{base:30, km:2.5, request_fee:5, comision:0.15}` (BRL)
- `tarifario_base` AR: `{base:9000, km:800, request_fee:1500, comision:0.15}` (ARS)
- Valores BR/AR son de arranque — ajustar desde admin según mercado
- Prompts `hugo_prompt_*` en `config_sistema` limpiados: sin hardcodeo de Brasil/R$/idioma, sin placeholders `{{}}`; backups en `hugo_prompt_*_old_20260706`

## Rollback
`UPDATE regiones SET tarifario_base='{}' WHERE codigo_pais IN ('BR','AR');` · `DELETE FROM regiones WHERE codigo_pais IN ('UY','PY');` · restaurar prompts desde las filas `_old_20260706`.

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
