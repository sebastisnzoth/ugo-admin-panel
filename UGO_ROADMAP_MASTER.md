# UGO — Roadmap Maestro

**Rama de verdad:** `main`  
**Principio:** los MD maestros son fuente de verdad; Skills definen cómo trabajar; herramientas conectadas ejecutan y validan.  
**Último checkpoint:** 14/09/2026.

## Objetivo de producto

Cerrar un ecosistema operativo Cliente + Proveedor + Admin/Super Admin con lifecycle único, pagos trazables, evidencia temporal correcta, ampliaciones dentro de plataforma, Realtime, UX consistente y release reproducible.

Pregunta permanente de producto:

> **¿Qué impide hoy que esto tenga su primer cliente real?**

## Contrato transversal vigente

`borrador → buscando → ofrecido → asignado → en_camino → llegado → en_progreso → esperando_aprobacion → completado`

Excepciones: `cancelado`, `disputado`.

Invariantes:

- un único `serviceId` durante todo el journey;
- `asignado → en_camino` requiere pago electrónico protegido/verificable o efectivo explícitamente seleccionado;
- llegada es backend-authoritative cuando aplica ubicación exacta; radio operativo 200 m;
- evidencia `Antes` antes de iniciar y evidencia `Después` antes de cierre/revisión;
- ampliación conserva descripción + costo + tiempo + aprobación + trazabilidad financiera;
- efectivo es presencial y auditable: si el pago efectivo sigue pendiente, el servicio **no puede** entrar en `esperando_aprobacion`;
- Cliente, Proveedor y Admin convergen al mismo estado persistido;
- Realtime rehidrata persistencia, no crea una segunda verdad;
- Hugo no inventa disponibilidad, estado, precio, dinero ni permisos;
- producción Supabase `trfsjuseqjxlhrxuvdsm` no se usa para pruebas destructivas.

## Estado por bloques

### 1. Cliente · journey principal — AVANZADO

- Home / Radar / Mapa / Categorías / Búsqueda migrados al design system.
- Hugo es entrada conversacional principal y voz/texto comparten contexto.
- Categorías salen del catálogo live.
- Disponibilidad de profesionales y tarjetas comparten `providerRadarStore`.
- Voz fuerza refresh live con `refreshProviderRadar(sb,true)` antes de anunciar disponibilidad.
- Creación, matching, cancelación, seguimiento, pago, aprobación, historial y disputas conectados a backend.
- Matching no encierra al Cliente: existen salida en background, retry y cancelación persistida.
- Realtime crítico re-sincroniza estado persistido tras reconnect/online/visibility.

**Pendiente de dispositivo:** cámara, GPS, permisos de micrófono/voz, Firefox/móvil y UX táctil real.

### 2. Proveedor · mercado y perfil — AVANZADO

- Online/offline, oportunidades, demanda, agenda, trabajo activo, historial, perfil e ingresos conectados.
- Oportunidades se consumen por RPC redactado antes de asignación; no exponen la fila completa del servicio.
- Aceptación es server-authoritative e idempotente.
- Proveedor no puede mantener asignaciones activas incompatibles.
- Radar/demanda usan geografía backend real.
- Realtime de oportunidades/servicios/pagos rehidrata persistencia.
- Perfil y configuración multirubro fueron incorporados en `main`; validar su recorrido visual junto con la prueba física.

### 3. Proveedor · ejecución del servicio — BACKEND E2E CERRADO / DISPOSITIVO PENDIENTE

El 14/09/2026 se ejecutó una corrida real DB/RPC/RLS en UGO TEST con identidades TEST y un único servicio:

```text
serviceId: 68ef8d25-b382-4e98-986a-21c510cc78f1
servicio: #14
oferta: 068b6cc3-a19e-45f2-a3a1-73014e682e92
pago: 875d5b2f-d050-4aa5-96a2-d9da6e611ce2
ampliación: ae661e88-b1a1-4f14-b8d5-5d51f708d3c2
resultado: completado
```

Validado en esa corrida:

- solicitud Cliente y matching dirigido;
- privacidad pre-asignación;
- oportunidad redactada para Proveedor;
- aceptación + retry idempotente;
- gate de pago antes de `en_camino`;
- `en_camino → llegado`;
- rechazo de inicio sin evidencia `Antes`;
- inicio con evidencia `Antes`;
- ampliación sólo resoluble por Cliente;
- actualización consistente de tarifa/pago a BRL 130, comisión BRL 19,50 y ganancia BRL 110,50;
- rechazo de confirmación de efectivo sin evidencia `Después`;
- evidencia final;
- rechazo de revisión antes de recepción del efectivo;
- confirmación de efectivo idempotente;
- aprobación final exclusiva del Cliente;
- cierre `completado` visible de forma convergente por Cliente, Proveedor y Admin.

### 4. Admin / Super Admin — AVANZADO

- Operaciones, usuarios, finanzas, validación, configuración y disputas existen.
- Admin TEST fue reconocido por `private.is_admin(...)` y pudo leer el mismo `serviceId` y pago del E2E final.
- Queda validar en UI física las acciones operativas y journeys de excepción.

### 5. Backend / Supabase TEST — P0 CORE VALIDADO

UGO TEST: `tmossnqfwfwjrtzwcbmm`.

- Auth, PostgreSQL, RPCs, RLS, Realtime y pagos forman la autoridad del lifecycle.
- `20260913005000_auxiliary_tables_rls_hardening.sql` fue aplicada el 14/09/2026.
- Se verificó RLS activo en las 13 tablas auxiliares cubiertas: `audit_log`, `documentos`, `documentos_proveedor`, `eventos_servicio`, `hugo_chat`, `hugo_sessions`, `mensajes`, `push_entregas`, `push_suscripciones`, `retiros`, `whatsapp_conversaciones`, `whatsapp_eventos`, `whatsapp_notificaciones`.
- El E2E real detectó drift del orden de cierre en efectivo: con evidencia final se podía intentar `en_progreso → esperando_aprobacion` antes de cobrar.
- Se restauró el invariante con `20260914202500_restore_cash_review_ordering_guard.sql`, aplicado en UGO TEST.
- `tests/contracts/cash-review-ordering-restore.test.mjs` evita que ese guard vuelva a desaparecer del repo.
- Producción no fue modificada.

**Pendiente de seguridad no P0 inmediato:** seguir clasificando advisors de Supabase (políticas amplias, vistas `SECURITY DEFINER`, search path y leaked-password protection) sin romper funciones intencionalmente privilegiadas.

### 6. QA / Release — EN CURSO

- Build/TypeScript y tests contractuales forman el gate regular.
- El contrato de voz desactualizado fue corregido para el refresh forzado live.
- `UGO Core CI` volvió a verde después de esa corrección; cada nuevo SHA debe volver a verificarse antes de declararlo cerrado.
- Vercel volvió a producir despliegues `READY`; el viejo bloqueo por límite diario no gobierna ya el estado actual.
- El workflow `UGO Isolated RPC RLS` permanece como gate adicional con `signInWithPassword` y requiere credenciales humanas TEST en GitHub Secrets.
- El E2E de backend/RPC/RLS ya fue ejecutado con identidades TEST reales bajo contexto `authenticated`/JWT claim; no sustituye la prueba física ni el login HTTP automatizado.

## Próximo checkpoint

**P0 actual: validación física Cliente ↔ Proveedor ↔ Admin sobre UGO TEST.**

Orden:

1. confirmar CI verde y Vercel `READY` sobre el SHA final de `main`;
2. Cliente crea un pedido desde dispositivo real;
3. Proveedor recibe y acepta desde otra sesión/dispositivo;
4. completar pago, GPS/llegada, evidencia Antes, trabajo, evidencia Después y cierre;
5. si es efectivo, comprobar visualmente que no pueda pedirse aprobación antes de confirmar recepción;
6. Cliente aprueba;
7. Admin observa el mismo `serviceId` y estado financiero;
8. forzar reconnect/background para verificar Realtime;
9. probar cámara, Storage y voz/micrófono reales;
10. cargar las seis credenciales TEST como GitHub Secrets y ejecutar `UGO Isolated RPC RLS` con login HTTP real;
11. sólo después evaluar promoción controlada a producción.

## Bloqueo externo restante

Para el workflow de login real faltan, fuera del repositorio:

```text
UGO_TEST_CLIENT_EMAIL
UGO_TEST_CLIENT_PASSWORD
UGO_TEST_PROVIDER_EMAIL
UGO_TEST_PROVIDER_PASSWORD
UGO_TEST_ADMIN_EMAIL
UGO_TEST_ADMIN_PASSWORD
```

Nunca guardar esas contraseñas en código, commits o documentación pública.

## Criterio de salida de TEST

UGO TEST sólo puede promoverse cuando:

- CI del SHA candidato está verde;
- deploy candidato está `READY`;
- workflow aislado con login real está verde;
- Cliente + Proveedor completan el journey en dispositivos reales;
- Admin observa/opera el mismo servicio;
- cámara/GPS/Storage/voz y Realtime funcionan en dispositivo;
- no queda un P0 de seguridad, dinero o integridad abierto.

Hasta entonces: **TEST avanzado y backend core cerrado; producción todavía no.**
