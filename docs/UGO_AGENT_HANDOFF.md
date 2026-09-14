# UGO — Agent Handoff

**Estado:** operativo en UGO TEST  
**Rama:** `main`  
**Uso:** buzón compartido entre ChatGPT, Codex y otros agentes  
**Regla:** verificar contra `main` antes de confiar en este archivo.

## CURRENT P0

Cerrar la validación de dispositivo/navegador de Cliente ↔ Proveedor ↔ Admin sobre UGO TEST y ejecutar el workflow aislado con login HTTP real cuando estén disponibles las credenciales humanas TEST.

UGO TEST designado:

```text
Supabase: tmossnqfwfwjrtzwcbmm
Web: https://ugo-admin-panel.vercel.app
Cliente: /?app=client
Proveedor: /?app=provider
Admin: /?app=admin
```

Producción `trfsjuseqjxlhrxuvdsm` permanece fuera de alcance hasta promoción explícita.

## ESTADO ACTUAL

14/09/2026:

- Cliente, Proveedor y Admin apuntan al mismo UGO TEST.
- Vercel volvió a desplegar `main` con builds `READY`; el bloqueo histórico por cuota diaria ya no es vigente.
- El test contractual de voz fue corregido para exigir `refreshProviderRadar(sb,true)`; ya no contradice el comportamiento live de Hugo.
- La migración `20260913005000_auxiliary_tables_rls_hardening.sql` fue aplicada en UGO TEST y se verificó RLS activo en las 13 tablas auxiliares cubiertas.
- Se ejecutó una corrida real de backend/RPC/RLS con identidades TEST Cliente, Proveedor y Admin usando contexto `authenticated` + claim de usuario real de TEST, sin tocar producción.
- Esa corrida utilizó un único `serviceId`: `68ef8d25-b382-4e98-986a-21c510cc78f1` (servicio #14).
- El E2E detectó un drift real: un pago presencial en efectivo podía pasar de `en_progreso` a `esperando_aprobacion` después de la evidencia final pero antes de confirmar la recepción del efectivo.
- El drift se corrigió con `20260914202500_restore_cash_review_ordering_guard.sql`, aplicado en UGO TEST, y quedó protegido por `tests/contracts/cash-review-ordering-restore.test.mjs`.
- El mismo servicio se revalidó hasta `completado`; Cliente, Proveedor y Admin observan el mismo cierre persistido.

## IMPLEMENTED

Baseline P0 Cliente ↔ Proveedor ↔ Admin:

- matching dirigido con privacidad pre-asignación;
- aceptación atómica e idempotente;
- pago con gate antes de `en_camino`;
- evidencia `Antes` antes de `en_progreso`;
- ampliación aprobable sólo por Cliente y reconciliación de importes;
- evidencia `Después` antes del cierre;
- efectivo presencial debe quedar `liberado` antes de habilitar revisión;
- aprobación final exclusiva del Cliente;
- Admin puede observar el mismo servicio y pago bajo RLS;
- hardening RLS auxiliar aplicado en UGO TEST;
- regresión de voz live y regresión de orden de cierre efectivo cubiertas en CI.

## VALIDATED

Evidencia confirmada sobre UGO TEST:

- RLS activo en `audit_log`, `documentos`, `documentos_proveedor`, `eventos_servicio`, `hugo_chat`, `hugo_sessions`, `mensajes`, `push_entregas`, `push_suscripciones`, `retiros`, `whatsapp_conversaciones`, `whatsapp_eventos` y `whatsapp_notificaciones`.
- Servicio E2E `68ef8d25-b382-4e98-986a-21c510cc78f1`:
  - Cliente creó solicitud `buscando`;
  - matching dirigido generó oferta `068b6cc3-a19e-45f2-a3a1-73014e682e92`;
  - Proveedor con oferta pendiente no pudo leer la fila completa de `servicios`;
  - `obtener_ofertas_proveedor` devolvió la oportunidad redactada;
  - aceptación dejó el mismo servicio en `asignado` y retry devolvió el mismo `serviceId`;
  - salida sin pago fue rechazada;
  - Cliente seleccionó efectivo, pago `875d5b2f-d050-4aa5-96a2-d9da6e611ce2`;
  - Proveedor avanzó a `en_camino` y `llegado`;
  - inicio sin evidencia inicial fue rechazado;
  - con evidencia `Antes` avanzó a `en_progreso`;
  - ampliación `ae661e88-b1a1-4f14-b8d5-5d51f708d3c2` de BRL 10 fue aprobada sólo por Cliente;
  - servicio/pago convergieron a BRL 130, comisión BRL 19,50 y ganancia BRL 110,50;
  - confirmación de efectivo sin evidencia final fue rechazada;
  - después de evidencia `Después`, intento de pedir aprobación antes de cobrar detectó el drift y, tras el fix, quedó correctamente rechazado con `Confirmá la recepción del efectivo...`;
  - `confirmar_pago_efectivo` liberó el mismo pago y movió el servicio a `esperando_aprobacion`;
  - retry de confirmación conservó el mismo pago;
  - Proveedor no pudo aprobar el servicio;
  - Cliente aprobó y el servicio terminó `completado`;
  - retry de aprobación fue rechazado;
  - Cliente y Proveedor leen el mismo cierre;
  - Admin TEST (`cccccccc-cccc-4ccc-8ccc-ccccccccccc3`) fue reconocido por `private.is_admin(...)` y leyó el mismo servicio/pago completado.
- UGO Core CI volvió a verde después de corregir el contrato de voz; validar también el run del último SHA antes de declarar un nuevo commit como cerrado.
- Vercel tiene despliegues `READY` recientes de `main`; validar siempre el SHA final del bloque, no asumir por alias.

## PENDIENTE / BLOCKED

### B1 · Login HTTP real del workflow aislado

El harness `UGO Isolated RPC RLS` requiere contraseñas de las identidades TEST. Las herramientas actuales permiten validar DB/RPC/RLS con identidades reales y claims autenticados, pero no leer ni resetear de forma segura las contraseñas de Supabase Auth ni cargar GitHub Secrets.

Se requieren fuera del repositorio:

```text
UGO_TEST_CLIENT_EMAIL
UGO_TEST_CLIENT_PASSWORD
UGO_TEST_PROVIDER_EMAIL
UGO_TEST_PROVIDER_PASSWORD
UGO_TEST_ADMIN_EMAIL
UGO_TEST_ADMIN_PASSWORD
```

No guardar contraseñas en GitHub, código, commits ni documentos públicos.

### B2 · Validación física de dispositivo

Pendiente una pasada manual desde dispositivos/sesiones reales para cámara, GPS, permisos de micrófono/voz, Storage, Realtime/reconexión y UX táctil. Esto no invalida el E2E backend ya cerrado, pero es obligatorio antes de promover a producción.

## NEXT

1. confirmar CI verde y Vercel `READY` sobre el último SHA de `main`;
2. ejecutar prueba manual Cliente/Proveedor/Admin desde dos dispositivos + Admin según `docs/UGO_TEST_RUNBOOK.md`;
3. verificar cámara/GPS/Storage/Realtime y voz en Firefox/móvil;
4. cuando existan las seis credenciales TEST en GitHub Secrets, ejecutar `UGO Isolated RPC RLS` con login real hasta verde;
5. sólo entonces evaluar promoción controlada a producción.

## HANDOFF CONTRACT

El agente que termina un bloque actualiza este archivo si cambió el estado operativo. No borrar bloqueos reales. El agente que entra verifica primero `main` y continúa desde CURRENT P0/NEXT sin pedir al usuario reconstruir contexto.
