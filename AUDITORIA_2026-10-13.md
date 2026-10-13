# Auditoría UGO Admin Panel — 2026-10-13

**Commit auditado:** `08a4e06` (Merge PR #449, 2026-10-12) en `arena/5eb4517b-ugo-admin-panel`  
**Fecha:** 2026-10-13 UTC  
**Ejecutor:** Arena Agent Mode  
**Alcance:** código completo (`src/` + `api/` + `server/` + `supabase/` + `scripts/` + tests/contratos), build, tipos, tests, lint, dependencias, seguridad de endpoints, RLS/SQL y deuda técnica. Comparativa contra `AUDITORIA_2026-10-09.md`.

---

## 1) Resumen ejecutivo

| Dimensión | Veredicto | Nota |
|---|---|---|
| **Compilación / Tipos** | ✅ **PASS** | `tsc -b` 0 errores. `vite build` OK (1,32 s). Guard de entorno UGO TEST OK. |
| **Tests** | ✅ **PASS** | **1.355 pass / 0 fail / 8 skip** (1.363 casos, incluye 7 nuevos tests de comportamiento de redacción añadidos en esta auditoría). Los 8 skip son credenciales aisladas que fallan cerrado (`fail closed`) sin tocar producción. |
| **Lint** | ⚠️ **WARN** | 0 errores / **944 warnings** (mejora vs 1.113 del 2026-10-09). 822 son `no-explicit-any`. |
| **Dependencias** | ✅ **PASS** | `npm audit`: **0 vulnerabilidades** (antes 1 high `source-map-js` GHSA-68fv-2mgg-jv7q — **corregido**). |
| **Seguridad** | ⚠️ **1 P1 + 3 P2/P3** | **P1 (corregido durante esta auditoría): la redacción de secretos hacia el LLM (`sanitizeForModel`) estaba rota** por regex sobre-escapadas — JWT/secretos viajaban sin redactar a Gemini. Quedan abiertos: webhook MP sin firma (P2), rate-limit en memoria (P2) y CORS `*` en `api/proxy.js` (P3). RLS y `SECURITY DEFINER` muy bien endurecidos. |
| **Bundle** | ✅ **MEJORA** | `NotificationCenter 1.07 MB` → `notification-center 224 kB` + lazy. `vendor-maplibre 1,05 MB` es chunk **dinámico** (solo se carga al abrir mapa). El aviso de Vite queda por el chunk lazy de maplibre. |
| **Arquitectura / deuda** | ⚠️ **DEUDA** | Contratos de tests por grep/regex (dieron falso negativo en seguridad, ver P1), `api/test.ts` es en realidad el handler de producción, repo de git con **177 MiB** por assets de diseño. |

**Conclusión breve:** el proyecto está **desplegable y más sano que en la auditoría anterior** (0 vulnerabilidades npm, bundle saneado, diálogos nativos eliminados, 412/412 funciones `SECURITY DEFINER` con `search_path`, todas las tablas con RLS). El riesgo dominante es **P1: `sanitizeForModel` no redacta nada** (JWT/secretos viajan al LLM), que además expone la debilidad metodológica de los contratos grep. Debe corregirse antes de cualquier producción; el resto son P2/P3 operativos.

---

## 2) Metodología

Ejecución reproducible en Node v22.22.3 / npm 10.9.8:

- `npm ci` → OK (188 paquetes)
- `npx tsc -b` → 0 errores
- `npm run build` (`verify:test-env` + `tsc -b` + `vite build`) → OK
- `npm test` (`node --test`, `tests/**/*.test.mjs`) → 1.363 casos (1.356 previos + 7 añadidos durante la auditoría)
- `npx eslint .` → desglose por regla vía `--format json`
- `npm audit` → 0 vulnerabilidades
- Escaneo de secretos commiteados (sk-, AIza, ghp_, github_pat_, xox*, sb_secret_, JWT) → **limpio** (solo un patrón de test)
- Inspección de los 12 handlers de `api/` (auth, ownership, CORS, webhooks), `server/hugo/*` (auth, cors, rateLimit, security, modelAdapter), muestreo de 374 migraciones (RLS, policies, `SECURITY DEFINER`), `vercel.json`, `netlify.toml`, `.gitignore`, `DemoSebastianPaymentBridge`, `apiRuntime`, y grep de XSS (`innerHTML`/`dangerouslySetInnerHTML`/`eval` → **0 usos**).

---

## 3) Estado técnico comprobable

### 3.1 Build y tipos
- `tsc -b`: **0 errores**.
- `vite build` (rolldown/vite 8): salida `dist/` completa:
  ```
  index-DLkM1F04.js            64 kB (21 kB gzip)
  AdminShell-Du8UJFYq.js      378 kB (96 kB gzip)
  ClientRoot-BXH6fwam.js      143 kB (38 kB gzip)
  notification-center-3sQvUkGk.js  224 kB (59 kB gzip)   ← antes NotificationCenter 1.074 MB
  vendor-maplibre-ChemW-1e.js 1,058 kB (284 kB gzip)     ← chunk dinámico (loadMaplibre)
  ```
- `src/lib/maplibreLoader.ts` carga maplibre con `import('maplibre-gl')` perezoso: el chunk pesado **no entra en el bundle inicial**. Aviso de Vite residual y aceptable.

### 3.2 Tests
- **1.363 casos: 1.355 pass / 0 fail / 8 skip** (23,8 s). Tras la corrección del P1 se añadieron 7 tests de comportamiento en `tests/contracts/hugo-redaction-behavior.test.mjs` (redacción real de Bearer/JWT/secretos/key-value/blobs + preservación de texto normal + guard anti-sobre-escape del fuente).
- Skips legítimos: requieren `UGO_TEST_SUPABASE_URL` + credenciales aisladas cliente/proveedor/admin/superadmin. El harness **falla cerrado** (`missing isolated credentials instead of touching production`) — patrón correcto. Ojo: sin esas credenciales, el eje **cross-role RLS/RPC no se verifica en CI** (tests 1350–1356).
- Cobertura contractual amplia (391+ contratos, `tests/contracts/*.mjs`), pero el patrón dominante es `fs.readFileSync` + regex sobre los fuentes (grep-audit). **Ver P1: este patrón produjo un falso negativo de seguridad.**

### 3.3 Lint (944 warnings, 0 errores)
| Regla | Cantidad |
|---|---|
| `@typescript-eslint/no-explicit-any` | 822 |
| `react-hooks/set-state-in-effect` | 100 |
| `react-hooks/exhaustive-deps` | 10 |
| `react-hooks/refs` / `no-empty` | 4 + 4 |
| misc (`immutability`, `preserve-manual-memoization`, `react-refresh`) | 4 |

Tendencia positiva (−169 warnings vs 2026-10-09). Plan de higiene: atacar primero `set-state-in-effect` (posibles re-renders/loops) y `exhaustive-deps` (bugs de closures), dejar `any` para campañas por módulo.

### 3.4 Dependencias
- `npm audit`: **0 vulnerabilidades**. ✅
- Stack: `react@19.2.x`, `vite@8.0.x`, `typescript~6.0.2`, `supabase-js@2.108.1`, `maplibre-gl@6.9.0`, `@tomtom-org/maps-sdk@0.34.0`. Sin cambios problemáticos.

### 3.5 Entorno
- `scripts/assert-test-environment.mjs` corre en build y test. `src/lib/supabaseProject.ts` fija `UGO_ENVIRONMENT='test'`, ref `tmossnqfwfwjrtzwcbmm` y la publishable key (uso browser-safe, documentado).
- `vercel.json` pinnea `SUPABASE_URL` al proyecto TEST; secretos server-side viven solo en variables de entorno (`.env.example` separa `VITE_*` de secretos; `.env` en `.gitignore`).
- Escaneo de secretos: **ninguno commiteado**. La publishable key hardcodeada (`api/operations.ts`, `api/scout/places.js`, `vercel.json`) es por diseño una key pública.

---

## 4) Hallazgos de seguridad

### 🔴 P1 — `sanitizeForModel` no redacta secretos: regex sobre-escapadas (fuga de JWT/keys al LLM) — **✅ CORREGIDO durante esta auditoría**
**Archivo:** `server/hugo/security.ts` (todas las `.replace(...)` de `sanitizeForModel`). **Estado: corregido** (escape simple aplicado, `tsc` OK, suite completa en verde con 7 tests de regresión nuevos).

Las regex están escritas con el escape duplicado dentro del literal —p. ej. el patrón JWT es `/\\beyJ…\\b/g` con **2 barras** donde debe ir `\b` con **1 barra**—. El resultado es que intentan encontrar la secuencia literal `\b` (barra + «b»), nunca un word boundary. Igual en `Bearer\\s+`, `\\.`, `[^;\\s]+`, etc.

**Verificación definitiva** (se extrajo y ejecutó la función real del fichero):

```
INPUT : Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abcdefghij1234567890 key=sk-abc123def456ghi789
OUTPUT: Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abcdefghij1234567890 key=sk-abc123def456ghi789
JWT redacted? NO — LEAKS
sk- secret redacted? NO — LEAKS
Con las mismas regex en escape simple (correcto): Bearer [REDACTED] key=[REDACTED_SECRET]
Barrido de bytes del patrón JWT en el fichero: 2 backslashes antes de 'b' (se requiere 1).
```

**Impacto:** `sanitizeForModel` se aplica en `server/hugo/modelAdapter.ts` (system, history y message de **toda** llamada al modelo), `contextPolicy.ts` (contexto por rol) y `ttsAdapter.ts`. Cualquier Bearer token, JWT (Supabase access token), API key o blob que llegue vía `context`/`history`/`message` viaja **sin redactar** al proveedor del modelo (Gemini) y a sus logs. En una app con sesión real, el `context` de pantalla puede contener cabeceras o datos de red.

**Por qué los tests pasaron (importante):** los contratos de seguridad (`tests/contracts/hugo-security-boundaries.test.mjs`, `hugo-master-security-regression.test.mjs`) solo verifican que el fuente **contenga** los literales `'Bearer [REDACTED]'`, `'[REDACTED_JWT]'`, etc. — es decir, confirman que la función existe el texto de reemplazo, no que redacte. Es un falso negativo estructural del estilo grep-contract.

**Fix recomendado:** *(aplicado durante esta auditoría)*
1. ✅ Cada regex reemplazada por la versión con escape simple (`\b`, `\s`, `\/`, `\.`).
2. ✅ Test de comportamiento añadido en `tests/contracts/hugo-redaction-behavior.test.mjs` (extrae y ejecuta la función real del fuente contra tokens de ejemplo).
3. ✅ Guard anti-regresión: el mismo test falla si el fuente vuelve a escribir `\\b`/`\\s` (2+ backslashes) en las reglas de redacción.

**Barrido repo-wide del mismo patrón (realizado en esta auditoría):** `server/hugo/security.ts` es el **único** código de producción afectado. Se verificaron y están correctos: `src/features/client/hugo/hugoOrderVoice.ts` (clock/timing con `\s`,`\d`,`\b` de escape simple — funciona: `clock('a las 14:30')` → `{h:14,m:30}`), los `new RegExp('…\\s…')` de contratos (constructor con string: el doble escape es ahí correcto), y `tests/contracts/autonomous-safe-execution.test.mjs` (matchea 3/3 `private.is_superadmin()` en el SQL).

### 🟠 P2 — Webhook Mercado Pago sin verificación de firma
**Archivo:** `api/pagos/webhook.ts`.

No se valida el header `x-signature` (HMAC con `manifest key` de MP) ni `x-request-id`. Cualquiera puede hacer POST/GET al webhook. **Mitigación existente y buena:** el handler no confía en el body — re-consulta `api.mercadopago.com/v1/payments/{id}` con el token real antes de mutar estado, y valida monto/moneda contra la fila local. Riesgo residual:
- Re-sincronización forzada de pagos arbitrarios con IDs reales (ruido de estado/`updated_at`, spam de logs).
- **Enumeración** de `servicioId`/`ampliacionId` por diferencias de respuesta (`ignored`, `mismatch`, `not found`).
- Acepta `GET` como método de webhook.

**Fix recomendado:** validar `x-signature` (documentado por MP: `ts` + `v1` HMAC-SHA256 sobre `id:{data.id};request-id:{x-request-id};ts:{ts};`), rechazar con 401 en fallo, responder 200 uniforme (sin `mismatch`/`ignored` diferenciados), y aceptar solo POST.

### 🟠 P2 — Rate-limit de Hugo en memoria (ineficaz en serverless)
**Archivo:** `server/hugo/rateLimit.ts`.

Buckets `Map` en memoria: en Vercel cada instancia/isla tiene su propio mapa y se descarta en frío. Un atacante distribuido (o simplemente rotación de lambdas) lo esvacia. Cumple como best-effort honesto (45 chat/min/usuario, 20 tts/min, 120/min por IP vía `x-forwarded-for`) pero **no es una garantía**. `x-forwarded-for` se toma del header; en Vercel la plataforma lo fija, pero no hay verificación.

**Fix recomendado:** rate-limit externo (KV/Upstash/Redis) o, al menos, documentar explícitamente el límite y añadir presupuesto de coste por usuario (Gemini) con alerta.

### 🟡 P3 — `api/proxy.js` con `Access-Control-Allow-Origin: *`
Endpoint `admin_create_user` (crea usuarios con service role). La autenticación admin es correcta (getUser + rol + rollback en error, y solo superadmin crea admins), pero el CORS `*` permite que **cualquier origen** lea la respuesta si un token admin llega a su JS (extensión, XSS en otro sitio del ecosistema). Además es una superficie privilegiada servida tras un rewrite `/api/admin/create-user` → `/api/proxy?admin_create_user=1`.

**Fix recomendado:** allowlist de orígenes (como ya hace `server/hugo/cors.ts` para Hugo).

### 🟡 P3 — `api/whatsapp/send.js` (detalles)
- Secreto del webhook en **query string** (`?hook=SECRET`) — queda en logs de acceso, proxies y analytics. Preferir header `x-hub-signature-256` (estándar Meta) o al menos un header propio.
- `ensureWhatsappUser` fallback: `auth.admin.listUsers({page:1, perPage:1000})` y búsqueda lineal de teléfono — escala mal, y procesa/retiene lista de usuarios completa.
- Cualquier mensaje entrante crea cuentas Auth (`phone_confirm: true`) sin rate-limit ni capping: abuso de recursos posible (mitigable con cuotas por número).

### 🟡 P3 — `api/test.ts` es el handler de producción
`/api/test` (380 líneas) concentra: OAuth de Mercado Pago (callback `/api/test`), Calendar OAuth/sync, Gemini chat/voz/transcripción, routing OSRM, dispute AI. El nombre invita a pensarlo como entorno de prueba; sin embargo es **producción** (el redirect URI de MP OAuth apunta ahí). Riesgo de mantenimiento y de exposición accidental. Sí tiene `authenticate`/`requireAdmin`/`authenticatedProvider` por flujo y role-gating de voz. **Recomendación:** renombrar a `/api/hugo` o `/api/platform` (mantener los rewrites de `vercel.json`) y partirlo por dominio.

### ✅ Controles verificados correctos
- **XSS:** 0 usos de `innerHTML`, `dangerouslySetInnerHTML`, `document.write`, `eval` en `src/`.
- **RLS:** 72 tablas creadas en migraciones; todas con `ENABLE ROW LEVEL SECURITY` (solo el esquema `privado` `private.*` fuera del análisis — sin grants a `anon`/`authenticated`).
- **`SECURITY DEFINER`:** **412 funciones, 412 con `set search_path`** (`'public','private','pg_temp'`) — endurecimiento completo contra search_path injection.
- **Pagos:** `api/pagos/crear.ts` y `ajuste-ampliacion.ts` validan `getUser`, ownership (`cliente_id === user.id`), estados de servicio y montos/moneda; el webhook valida monto/moneda contra fila local antes de marcar `retenido`.
- **Hugo (`api/hugo/chat.ts` + `server/hugo`):** allowlist de orígenes, IP+user rate-limit, `authorizeHugo` con `getUser` + perfil + `decideHugoAuthority`, `sanitizeHugoContextForRole`, acciones UI de admin allowlisteadas (`refresh|navigate|open_service|map_filter`), client/provider sin `uiActions`. **Salvo la redacción rota (P1).**
- **DemoSebastianPaymentBridge:** ahora con guardas P0 (`UGO_ENVIRONMENT==='test'` + `?demo` en URL) y el RPC `crear_pago_demo_sebastian` rechaza server-side fuera del par demo (`NO_ES_DEMO_SEBASTIAN`). La intercepción global de `window.fetch` sigue siendo frágil por diseño, pero está acotada.
- **Secretos:** ninguno commiteado; `.env*` ignorados; `netlify.toml` omite `VITE_*`/`UGO_PIX_KEY` del scanner de secretos de forma explícita.

---

## 5) Mejoras verificadas vs `AUDITORIA_2026-10-09.md`

| Ítem (audit anterior) | Estado hoy |
|---|---|
| `npm audit` 1 high (`source-map-js`) | ✅ **0 vulnerabilidades** |
| `DemoSebastianPaymentBridge` interceptaba fetch global sin guardas | ✅ Guardas P0 + validación server-side en RPC |
| Diálogos `window.prompt/confirm` masivos | ✅ Reemplazados por `src/mvp/dialogs.tsx` (UGO Dialog System) |
| Bundle `NotificationCenter 1.07 MB` | ✅ `notification-center 224 kB` + code-splitting; maplibre lazy |
| Lint ~1.113 warnings | ✅ 944 (−169) |
| Tests 2 fallidos por regex doble-escapada | ✅ Arreglados (suite en verde) — el mismo patrón de bug **sobrevivía** en `server/hugo/security.ts` (P1 de esta auditoría, ya corregido) |
| Realtime sin `channelError` consistente | ⚠️ No re-auditado en profundidad en esta pasada (mantener en backlog) |

---

## 6) Deuda técnica y higiene

1. **Repo git de 177 MiB** — dominado por `design/`: `stitch_ugo_client_web_app.zip` 26 MB, `ugo (p1).penpot` 20 MB, `stitch_task_action_manager.zip` 18 MB, `stitch_ugo_provider_onboarding_app.zip` 13 MB + PNGs de 1,5 MB. Recomendación: Git LFS, un bucket externo, o publicar releases con adjuntos; mantener solo referencias en el repo. Esto abarata clones/CI.
2. **Contratos grep-audit** (391 tests que leen fuentes con regex): eficaces para gobernanza estructural, pero **ciegos al comportamiento** (evidenciado por P1). Estrategia: para módulos críticos (seguridad, dinero), exigir tests unitarios de comportamiento además del contrato textual.
3. **`api/test.ts`** — ver P3 (naming/arquitectura).
4. **`any` (822)** y `set-state-in-effect` (100) — plan de higiene por módulo; priorizar hooks con estado en efecto.
5. **8 tests skip** — sin credenciales aisladas el cross-role RLS no se ejercita en este runner. Vale la pena provisionar el secret set en CI (GitHub Actions con environments) para que `test:integration` corra de verdad.
6. Documentación abundante y de calidad (AGENTS.md, SECURITY.md, ARCHITECTURE.md, AUDITORIA_*, plan docs de UX) — pero convive con `BUGS_RC1.md`, `MEJORAS_*`, `FIX_PROMPTS.md` sin estado de resolución enlazado. Un índice con estado (abierto/cerrado → issue) evitaría perder el hilo.

---

## 7) Prioridades recomendadas

| # | Acción | Severidad | Esfuerzo |
|---|---|---|---|
| 1 | ~~Corregir regex de `server/hugo/security.ts` + tests de comportamiento de redacción~~ | **P1** | ✅ Hecho en esta auditoría |
| 2 | Verificar firma `x-signature` del webhook MP + respuesta uniforme + solo POST | P2 | Bajo |
| 3 | Rate-limit externo (o documentar límite real) para Hugo y WhatsApp inbound | P2 | Medio |
| 4 | CORS allowlist en `api/proxy.js` | P3 | Bajo |
| 5 | Webhook WhatsApp por header (no query) + quitar `listUsers` scan | P3 | Bajo |
| 6 | Renombrar/partir `api/test.ts` | P3 | Medio |
| 7 | Mover assets de `design/` a LFS/externo (repo 177 MiB) | P4 | Bajo |
| 8 | Campaña anti-`any` / `set-state-in-effect` | P4 | Continuo |

---

## 8) Veredicto

**Apto para operar en UGO TEST** (build verde, 1.355 tests en verde, 0 vulnerabilidades npm, RLS/definer endurecidos). El **P1 quedó corregido durante esta auditoría** (escape simple + 7 tests de regresión conductual); el barrido repo-wide confirma que **solo afectaba a `server/hugo/security.ts`**. Antes de `CUSTOMER_1`/producción queda cerrar el P2 (webhook MP sin firma `x-signature`) y los P3 operativos. La trayectoria desde la auditoría anterior es claramente positiva: los cuatro riesgos que entonces se marcaron como principales (fetch global demo, diálogos nativos, bundle, dependencia vulnerable) están resueltos o muy acotados.
