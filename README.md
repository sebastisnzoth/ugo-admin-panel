# UGO — Marketplace operativo de servicios

UGO conecta clientes con proveedores locales y administra el ciclo completo del servicio: solicitud, matching, oferta, aceptación, desplazamiento, GPS, llegada, evidencias, aprobación, pago, deuda/comisión UGO, cierre, reputación y supervisión administrativa.

## Aplicaciones

- **Cliente** — crea pedidos, sigue el servicio, recibe notificaciones, aporta evidencias, aprueba/cierra y califica.
- **Proveedor** — recibe oportunidades, acepta trabajos, publica ubicación, avanza el lifecycle, carga evidencias y consulta agenda/ganancias.
- **Admin** — opera servicios, usuarios, proveedores, pagos, disputas, Scout, reportes, configuración y observabilidad.
- **Super Admin / Command Center** — gobierno, readiness, evidencia, autonomía y controles globales.

Las superficies visuales de Hugo/orbe están actualmente deshabilitadas. El backend de IA permanece aislado y protegido como integración dormida/futura; su existencia no implica que la UI de voz esté activa.

## Stack

- React 19 + TypeScript + Vite
- Supabase Auth/Postgres/RLS/RPC/Realtime/Storage/Edge Functions
- Vercel para runtime web/API
- GitHub Actions para CI y gates
- Android WebView para Cliente/Proveedor
- Gemini/OpenRouter server-side para IA backend
- MapLibre/TomTom para mapas/búsqueda

## Flujo crítico

```text
Cliente solicita
  -> matching
  -> proveedor recibe oferta
  -> acepta
  -> en camino
  -> GPS válido
  -> geofence / llegada
  -> evidencia inicial
  -> trabajo
  -> evidencia final
  -> aprobación cliente
  -> pago
  -> efectivo/deuda UGO si aplica
  -> completado
  -> ratings mutuos
  -> Admin observa
  -> readiness/evidencia
```

## Arquitectura

```text
src/
  features/       flujos funcionales Cliente/Proveedor
  mvp/            superficies operativas y Admin
  shared/         UI/utilidades compartidas
  hooks/          hooks de datos/realtime
  lib/            clientes/browser helpers

api/              adaptadores HTTP/serverless
server/           auth, policies, seguridad y adapters server-only
supabase/         migrations, funciones y configuración DB
android-apk/      cliente Android/WebView
tests/            contratos e integración
.github/workflows/ CI/readiness/runtime gates
```

Reglas detalladas: ver `ARCHITECTURE.md`, `SECURITY.md` y `CONTRIBUTING.md`.

## Desarrollo local

El repositorio está protegido para operar contra **UGO TEST** durante la validación actual.

```bash
npm install
npm run dev
```

Validaciones:

```bash
npm run build
npm test
npm run test:p0
npm run test:integration
npm run lint
```

- `build`: guard de entorno TEST + TypeScript + Vite.
- `test`: suite Node `--test` de contratos/regresión.
- `test:p0`: controles críticos del primer cliente.
- `test:integration`: integración automatizada.
- `lint`: ESLint del repositorio.

## Variables de entorno

Partir de `.env.example`. No copiar secretos al código ni usar prefijo `VITE_` para credenciales privadas.

Grupos principales:

- Supabase TEST browser config
- backend token
- Mercado Pago / Pix / OpenPix
- Google Calendar proveedor
- Scout/TomTom/Gmail
- Gemini/OpenRouter
- service-role Supabase sólo server-side
- runtime Hugo/Edge opcional

Nunca exponer Bearer/JWT, refresh tokens, API keys, service-role keys o passwords al navegador, logs o LLM.

## Hugo backend

`api/hugo/chat.ts` es un adaptador HTTP delgado. Las responsabilidades server-side viven bajo `server/hugo/`:

- `auth.ts`
- `authority.ts`
- `cors.ts`
- `security.ts`
- `permissions.ts`
- `uiAction.ts`
- `promptBuilder.ts`
- `modelAdapter.ts`
- `modelRouter.ts`
- `ttsAdapter.ts`

Ver `docs/HUGO_BACKEND_SECURITY_ARCHITECTURE.md`.

## Entornos y producción

- Build/test deben permanecer fijados al proyecto UGO TEST mientras duren las validaciones.
- Vercel Git deployments están habilitados, pero la configuración verificada debe seguir apuntando a TEST.
- Producción no se modifica ni se declara lista sin autorización humana explícita y evidencia SAME-SHA.

## Evidencia y definición de DONE

`CONFIGURED != WIRED != EXECUTED != VERIFIED`.

Un cambio no está DONE sólo porque compile, exista un PR o un workflow haya comenzado. El cierre requiere aceptación verificable, evidencia del SHA exacto y ausencia de contradicciones entre código, CI, runtime y backend.

## Estado actual

UGO sigue en fase de integración y cierre de P0. Los principales frentes de producto deben verificarse con evidencia real: GPS proveedor, matching/alertas, lifecycle Cliente-Proveedor, notificaciones, pagos/deuda, evidencias, ratings y operación Admin.

No usar este README como prueba de readiness; la fuente de verdad es el estado actual del repositorio, CI y runtime.
