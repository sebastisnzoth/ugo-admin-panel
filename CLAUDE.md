# U.GO Quantum OS — Guía de Desarrollo (CLAUDE.md)

> Este archivo se lee al iniciar cualquier sesión de Claude Code en este
> repo. Está escrito para *este* proyecto puntual, no es una plantilla
> genérica — cada regla acá viene de algo que pasó o se verificó en este
> código.

## Contexto del proyecto

U.GO es un marketplace on-demand de servicios del hogar para LATAM
(electricistas, plomeros, limpieza, etc.), lanzado en Brasil con
expansión activa a Argentina. Hugo es el asistente de IA embebido que
intermedia cliente↔proveedor en los tres roles (cliente, proveedor,
admin). El admin soberano es el email definido en `AdminPanel.tsx`.

## Comportamiento y estrategia

- Actuá como ingeniero de software senior: priorizá corrección y
  mantenibilidad sobre velocidad aparente.
- **Antes de escribir código en cambios no triviales**: generá un plan
  breve y esperá confirmación si el cambio toca arquitectura, esquema de
  DB, o más de un módulo. Para fixes acotados y bien definidos, podés
  implementar directo.
- Evaluá siempre efectos secundarios sobre el resto del sistema antes de
  tocar algo — en este repo el error típico es tocar un lugar donde una
  lógica está duplicada (ver "Guardrails" abajo) y dejar los otros
  desincronizados.

## Reglas no negociables

1. **Rama backup antes de cualquier cambio**: `backup/[descripción]`
   desde `main` actual. Sin excepción, incluso para cambios chicos.
2. **Nunca rollback ni force-push** sin autorización explícita.
3. **Archivos completos**, no diffs parciales, en cada entrega.
4. **SHA fresco inmediatamente antes de cada PUT** a `/contents/{path}` —
   Vercel actualiza el SHA en cada deploy; un SHA viejo da 409.
5. **Documentar en `MIGRATIONS_LOG.md`** al cierre de cada etapa: qué
   cambió, cómo revertir.

## Verificación antes de dar algo por terminado

- **No hay suite de tests automatizada en este repo** (no existe
  `npm test` en `package.json`). No asumirla ni inventarla — la
  verificación real es:
  - `npm run build` (= `tsc -b && vite build`) debe terminar sin errores
    para todo lo que esté bajo `src/`.
  - `client.html` y `provider.html` son HTML de archivo único con
    `<script>` inline — **no pasan por `tsc` ni por el build de Vite**.
    Cada bloque `<script>` tocado se valida aparte con `node --check`
    (o `acorn`). Mismatches de `async`/`await` en estos archivos ya
    rompieron el boot completo más de una vez en este proyecto.
  - Confirmar el deploy real en Vercel antes de reportar como
    terminado: el commit debe mostrar `state: success` en
    `/repos/.../commits/{sha}/status`, no alcanza con que el push haya
    funcionado.
  - Para flujos de UI (wizard, chat de Hugo, etc.) no hay tests
    automatizados: el smoke test es manual, simulando el flujo real
    antes de mergear a `main`.

## Seguridad

- **Este repo es público.** Nunca commitear API keys, tokens ni
  particularmente la `service_role` key de Supabase en ningún archivo,
  ni siquiera en `.md` de documentación interna. Todo secreto vive en
  Vercel → Environment Variables.
- Las claves de terceros (Groq, Gemini, TomTom, WhatsApp) se guardan en
  `config_sistema` y se leen server-side vía el RPC `config_backend`
  (que valida un token de entorno) — nunca hardcodeadas en el repo ni
  legibles por REST con la anon key.
- No tocar las policies de RLS de `documentos` / `config_sistema` /
  `notificaciones` / `servicios` sin entender el impacto — fueron
  endurecidas deliberadamente tras una auditoría de seguridad.

## Guardrails específicos de este repo

- **`COMPONENT_LIBRARY.md`** describe un sistema de componentes
  (`@/components/UI/Button`, `DataTable`, `Modal`, `useForm`) que **no
  existe en el código real** — verificado: no hay carpeta `components/UI`
  ni `Button.tsx` en `main`. Es documentación aspiracional/planificada,
  desincronizada del código. Seguir los patrones reales de
  `AdminPanel.tsx` (clases `.pad/.st/.tw/.tr/.tc/.pill/.btn`, estilos
  inline), no ese doc.
- Si hay un skill `senior-frontend` instalado (vía
  `claude-code-templates`): es genérico, no calibrado a este repo — no
  usar sus scripts de scaffolding automático acá; como mucho, referencia
  pasiva de patterns.
- `config_sistema.hugo_prompt_cliente/proveedor/admin` ya son
  region-agnósticos (sin hardcodeo de país/moneda/idioma) — no
  reintroducir esa lógica ahí; el idioma/moneda regional se resuelve en
  `api/hugo/chat.ts`.
- `regiones.tarifario_base` y `regiones.activo` son decisiones de
  negocio — no tocarlas sin pedido explícito, incluso si el código
  "podría" activarlas.

## Comandos del proyecto

```bash
npm install        # instalar dependencias
npm run dev        # desarrollo local (vite)
npm run build      # tsc -b && vite build — validación real de TS/JSX
npm run lint       # eslint .
npm run preview    # preview del build de producción
```

No existe `npm test`.

---

## Database Schema: Client-Provider Memory (Hugo Blueprint)

### Purpose
Enable Hugo to maintain persistent, bidirectional context about all client-provider
relationships, service history, quality metrics, and communication patterns.

### Core Tables (Additions to existing schema)

```sql
-- 1. hugo_client_provider_relationships
-- Tracks all client-provider connections with quality metrics
CREATE TABLE hugo_client_provider_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES usuarios(id),
  proveedor_id UUID NOT NULL REFERENCES usuarios(id),
  total_servicios INT DEFAULT 0,
  rating_promedio DECIMAL(2,1) DEFAULT 0.0,
  resenas_count INT DEFAULT 0,
  ultima_interaccion TIMESTAMP,
  estado VARCHAR(20) DEFAULT 'activo', -- activo, pausado, finalizado
  notas_relacion TEXT, -- admin notes about this relationship
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(cliente_id, proveedor_id),
  INDEX idx_relationships_cliente (cliente_id),
  INDEX idx_relationships_proveedor (proveedor_id)
);

-- 2. hugo_service_memory
-- Complete history of each service for context retrieval
CREATE TABLE hugo_service_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id UUID NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES usuarios(id),
  proveedor_id UUID NOT NULL REFERENCES usuarios(id),
  relacion_id UUID REFERENCES hugo_client_provider_relationships(id),
  
  -- Service details snapshot
  categoria_nombre VARCHAR(100),
  descripcion TEXT,
  monto DECIMAL(10,2),
  
  -- Timeline
  solicitado_at TIMESTAMP,
  completado_at TIMESTAMP,
  calidad_rating INT, -- 1-5 stars
  velocidad_rating INT, -- 1-5 stars
  comunicacion_rating INT, -- 1-5 stars
  
  -- Review & feedback
  resena_cliente TEXT,
  resena_proveedor TEXT,
  
  -- Issues/disputes
  tiene_disputa BOOLEAN DEFAULT false,
  motivo_disputa TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_service_memory_cliente (cliente_id),
  INDEX idx_service_memory_proveedor (proveedor_id),
  INDEX idx_service_memory_relation (relacion_id)
);

-- 3. hugo_interaction_log
-- Tracks all interactions for context & personalization
CREATE TABLE hugo_interaction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  tipo VARCHAR(50), -- solicitud, confirmacion, mensaje, cancelacion, resena
  contexto JSONB, -- flexible data for different interaction types
  timestamp TIMESTAMP DEFAULT NOW(),
  INDEX idx_log_usuario (usuario_id, timestamp DESC)
);

-- 4. hugo_memory_insights
-- Aggregated insights for Hugo to use in decision-making
CREATE TABLE hugo_memory_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- For client insights
  cliente_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  preferred_categories TEXT[], -- array of category IDs client prefers
  preferred_price_range VARCHAR(20), -- 'economico', 'medio', 'premium'
  preferred_schedule VARCHAR(50), -- 'urgente', 'flex', 'programado'
  average_response_to_provider_seconds INT,
  
  -- For provider insights
  proveedor_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  specialization_categories TEXT[], -- array of category IDs provider specializes in
  average_completion_time_minutes INT,
  response_reliability DECIMAL(3,1), -- % of accepted jobs
  customer_satisfaction_score DECIMAL(2,1),
  
  -- Cross insights
  relacion_strength DECIMAL(2,1), -- 0.0-1.0 how strong is this relationship
  repeat_likelihood DECIMAL(2,1), -- probability client will hire provider again
  
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(cliente_id),
  UNIQUE(proveedor_id)
);

-- 5. hugo_feature_flags
-- Toggleable features in control panel (Modular Design requirement)
CREATE TABLE hugo_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  enabled BOOLEAN DEFAULT true,
  grupo VARCHAR(50), -- 'admin', 'client_app', 'provider_app', 'analytics'
  config JSONB, -- feature-specific configuration
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Schema Diagram
```
usuarios
  ├─→ hugo_client_provider_relationships ←─ usuarios (reverse)
  ├─→ hugo_service_memory ←─ servicios
  ├─→ hugo_interaction_log
  └─→ hugo_memory_insights (aggregated view)

hugo_feature_flags (independent - controls UI/API feature toggles)
```

### Access Patterns (Hugo Queries)
1. **"Who am I talking to?"** → `SELECT * FROM usuarios WHERE id = ?`
2. **"What history do I have with this provider?"**
   ```sql
   SELECT * FROM hugo_service_memory 
   WHERE cliente_id = ? AND proveedor_id = ?
   ORDER BY completado_at DESC
   ```
3. **"What does this client prefer?"** 
   ```sql
   SELECT * FROM hugo_memory_insights WHERE cliente_id = ?
   ```
4. **"Is this feature enabled?"**
   ```sql
   SELECT config FROM hugo_feature_flags WHERE feature_key = ? AND enabled = true
   ```
5. **Generate bidirectional report**
   ```sql
   SELECT r.*, 
          (SELECT COUNT(*) FROM hugo_service_memory WHERE relacion_id = r.id) as total_services,
          (SELECT AVG(calidad_rating) FROM hugo_service_memory WHERE relacion_id = r.id) as avg_quality
   FROM hugo_client_provider_relationships r
   WHERE cliente_id = ? OR proveedor_id = ?
   ```

## Stack y arquitectura

- **Admin panel**: React 18 + Vite + TypeScript + Tailwind, componente
  grande en `src/components/AdminPanel.tsx` + hooks en `src/hooks/`.
- **Apps cliente/proveedor**: `public/client.html` / `public/provider.html`,
  HTML de archivo único con `<script>` inline — fuera del build de Vite.
- **Backend**: Supabase (proyecto `byajcqrgetloavrgyqak`, São Paulo /
  sa-east-1), RLS activo en todas las tablas.
- **IA (Hugo)**: Groq (`llama-3.3-70b-versatile`, primario) + Gemini
  Flash (fallback), prompts base en `config_sistema`, lógica regional en
  `api/hugo/chat.ts`.
- **Deploy**: Vercel, auto-deploy desde `main`.
- **Regiones activas**: Brasil (BRL) y Argentina (ARS). Uruguay y
  Paraguay existen en la tabla `regiones` pero con `activo=false` hasta
  decisión de negocio.
- **Diseño**: dark quantum — Inter + JetBrains Mono, gradientes. Nunca
  glassmorphism.

## 🤖 HUGO BLUEPRINT: Identity & Behavioral Protocol

Hugo is the **central co-pilot and best friend** to both Clients and Providers.
He bridges the gap seamlessly across all three roles: Cliente, Proveedor, Admin.

### Hugo's Core Identity
- **Role**: Senior Product Strategist + AI Co-pilot
- **Responsibility**: Maintain persistent cross-entity memory and facilitate
  relationships between clients and providers
- **Authority Model**: 
  - ALWAYS respond to direct user commands
  - NEVER override user decisions under any circumstance
  - ALWAYS consult user first and obtain explicit approval before architectural choices

### Hugo's Memory System (Cross-Entity Context)
At any given time, Hugo MUST perfectly know:
1. **Who you're talking to** — identify user context (Client ID, Provider ID, Admin)
2. **Service history** — exact services a Provider gave to a Client
3. **Contractual data** — exact services a Client contracted from a Provider
4. **Relationship insights** — quality metrics, ratings, communication history
5. **Bidirectional visibility** — both clients and providers see each other's relevant data

**Implementation**: See "Database Schema for Client-Provider Memory" below.

### Control Panel Architectural Requirements (Hugo-Ready)
1. **Toggleable Modular Design**: Every feature must be activatable/deactivatable via On/Off flags
2. **Voice-Ready Management**: API endpoints and state management structured for voice control
3. **Reporting Engine**: Clean data structures for instant performance/relationship reports
4. **Real-time Sync**: Hugo memory updates reflect immediately in control panel

## Estilo de comunicación con Sergio

- Español rioplatense.
- Prefiere implementación directa sin pedir confirmación en cada paso,
  salvo cuando el cambio es de arquitectura o potencialmente destructivo.
- Espera archivos completos, no fragmentos parciales.
- Monitorea el uso de tokens — respuestas concisas y al punto.
- **NEW RULE**: Architectural plans require explicit approval before coding.
