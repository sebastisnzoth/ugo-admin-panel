# UGO — Roadmap Maestro

**Rama de verdad:** `main`  
**Principio:** los MD maestros son fuente de verdad; Skills definen cómo trabajar; herramientas conectadas ejecutan y validan.  
**Último checkpoint:** 15/09/2026.

## Objetivo de producto

**Objetivo final no negociable: PRODUCCIÓN COMERCIAL REAL.**

UGO no se considera terminado por tener una demo, un deploy `READY`, un build verde ni un backend funcional. El objetivo es operar comercialmente con clientes y proveedores reales, dinero real, comisión UGO trazable, seguridad, soporte operativo y capacidad de recuperación ante fallos.

Cerrar un ecosistema operativo Cliente + Proveedor + Admin/Super Admin con lifecycle único, pagos trazables, evidencia temporal correcta, ampliaciones dentro de plataforma, Realtime, UX consistente y release reproducible.

Pregunta permanente de producto:

> **¿Qué impide hoy que mañana un cliente real pague, un proveedor real trabaje, UGO cobre su comisión y todo quede seguro, trazable y recuperable?**

Toda prioridad P0/P1 debe responder a esa pregunta. TEST, demo e inversores son hitos intermedios; no son el objetivo final.

## Definición de producción comercial

UGO alcanza producción comercial cuando, sin intervención manual excepcional del equipo técnico:

- un Cliente real puede registrarse, pedir y pagar un servicio;
- un Proveedor real puede registrarse, ponerse disponible, recibir, aceptar, ejecutar y cobrar;
- UGO registra y concilia su comisión correctamente;
- Cliente, Proveedor y Admin comparten el mismo `serviceId`, estado y realidad financiera;
- cancelaciones, reembolsos, disputas, retiros y excepciones tienen reglas definidas y auditables;
- cámara, GPS, Storage, voz y Realtime funcionan en dispositivos reales;
- secretos, RLS, permisos, backups, logs, auditoría y límites operativos son adecuados para producción;
- CI/E2E protegen el release y existe rollback/recovery razonable;
- términos operativos, privacidad/LGPD, soporte y tratamiento de incidentes están definidos;
- no queda ningún P0 de seguridad, dinero, integridad o continuidad operativa abierto.

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

La corrida histórica no sustituye la nueva validación requerida después del endurecimiento de Storage/chat/tracking.

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

**Pendiente de seguridad para producción:** seguir clasificando y cerrando advisors de Supabase (políticas amplias, vistas `SECURITY DEFINER`, search path y leaked-password protection) sin romper funciones intencionalmente privilegiadas.

### 6. QA / Release — EN CURSO

- Build/TypeScript y tests contractuales forman el gate regular.
- El contrato de voz desactualizado fue corregido para el refresh forzado live.
- `UGO Core CI` volvió a verde después de esa corrección; cada nuevo SHA debe volver a verificarse antes de declararlo cerrado.
- Vercel volvió a producir despliegues `READY`; el viejo bloqueo por límite diario no gobierna ya el estado actual.
- El workflow `UGO Isolated RPC RLS` permanece como gate adicional con `signInWithPassword` y requiere credenciales humanas TEST en GitHub Secrets.
- El E2E de backend/RPC/RLS ya fue ejecutado con identidades TEST reales bajo contexto `authenticated`/JWT claim; no sustituye la prueba física ni el login HTTP automatizado.
- La rama `main` debe evolucionar hacia protección con checks obligatorios antes de promoción comercial.

## Próximo checkpoint

**P0 actual: PRODUCTION COMMERCIAL READINESS.**

No optimizar para “tener una demo”. Cerrar, en este orden, lo que impide operación comercial real:

1. cerrar la decisión financiera mínima: modelo de cobro, comisión UGO, saldo/retiros, cancelación, reembolso y conciliación;
2. ejecutar un E2E nuevo completo con un único `serviceId`, Storage real, evidencia Antes/Después y cierre hasta `completado`;
3. verificar Cliente/Proveedor/Admin sobre ese mismo `serviceId` y la misma realidad financiera;
4. probar en dos dispositivos reales: Realtime sin refresh, reconnect/background, cámara, GPS/tracking, voz/Hugo, push y UX móvil;
5. convertir autenticación E2E TEST en gate automatizado con credenciales aisladas fuera del repositorio;
6. cerrar seguridad de producción, protección de `main`, observabilidad, backups y procedimiento de rollback;
7. cerrar onboarding, soporte, disputas, privacidad/LGPD y operación comercial;
8. ejecutar un piloto controlado completo antes de apertura progresiva;
9. sólo con todos los gates verdes preparar y autorizar promoción a producción real.

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

También queda pendiente una decisión de producto explícita sobre el modelo financiero de producción antes de implementar saldo/retiro/reembolso definitivo.

## Criterio de salida de TEST hacia producción comercial

UGO TEST sólo puede promoverse cuando:

- CI del SHA candidato está verde y los checks de `main` son obligatorios;
- deploy candidato está `READY`;
- workflow aislado con login real está verde;
- Cliente + Proveedor completan el journey en dispositivos reales;
- Admin observa/opera el mismo servicio y la misma realidad financiera;
- cámara/GPS/Storage/voz/Push y Realtime funcionan en dispositivo;
- dinero real, comisión, cancelación, reembolso y retiro tienen reglas implementadas y auditables;
- secretos, RLS, permisos, backups, logs, monitoreo y rollback están preparados;
- soporte, disputas, privacidad/LGPD e incidentes tienen un flujo operativo definido;
- no queda un P0 de seguridad, dinero, integridad o continuidad operativa abierto.

Hasta entonces: **TEST avanzado y backend core fuerte; el objetivo sigue siendo PRODUCCIÓN COMERCIAL REAL.**
