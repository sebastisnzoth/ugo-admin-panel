# UGO TEST — Runbook de validación real

Estado: **entorno de prueba, no producción**.

## Objetivo

Validar UGO de punta a punta antes de promover cualquier cambio a producción.

La pregunta operativa permanente es:

> ¿Qué impide hoy que esto tenga su primer cliente real?

## Entorno único de prueba

- Supabase TEST: `tmossnqfwfwjrtzwcbmm`
- Producción: `trfsjuseqjxlhrxuvdsm` — **prohibida para pruebas**
- Web TEST: `https://ugo-admin-panel.vercel.app`

Aunque Vercel denomine al alias principal como `production`, el build de `main` apunta explícitamente a **UGO TEST**. Eso no autoriza ningún cambio sobre Supabase de producción.

## Accesos web

- Cliente: `https://ugo-admin-panel.vercel.app/?app=client`
- Proveedor: `https://ugo-admin-panel.vercel.app/?app=provider`
- Admin: `https://ugo-admin-panel.vercel.app/?app=admin`

Usar dos dispositivos/sesiones separadas para Cliente y Proveedor. Admin puede abrirse en computadora o en una tercera sesión del navegador.

## Baseline backend validada · 14/09/2026

Antes de la prueba física se ejecutó un E2E real de DB/RPC/RLS sobre UGO TEST con identidades Cliente, Proveedor y Admin y un único servicio:

```text
serviceId: 68ef8d25-b382-4e98-986a-21c510cc78f1
servicio: #14
pago efectivo: 875d5b2f-d050-4aa5-96a2-d9da6e611ce2
resultado final: completado
```

La corrida verificó matching dirigido, privacidad pre-asignación, aceptación e idempotencia, gate de pago, evidencia Antes/Después, ampliación, importes, confirmación de efectivo, aprobación exclusiva del Cliente y lectura convergente por Cliente/Proveedor/Admin.

Durante esa corrida se encontró que `en_progreso → esperando_aprobacion` podía ocurrir antes de confirmar la recepción del efectivo. Se restauró el guard server-authoritative mediante `20260914202500_restore_cash_review_ordering_guard.sql`; el escenario fue repetido y ahora se rechaza hasta que el pago efectivo quede `liberado`.

## Prueba manual obligatoria

1. Ingresar como Cliente Test.
2. Crear una solicitud real de prueba.
3. Confirmar que Proveedor Test recibe la oportunidad.
4. Aceptar como Proveedor.
5. Confirmar que Cliente ve la asignación persistida.
6. Elegir forma de pago de prueba habilitada.
7. Proveedor: `asignado → en_camino`.
8. Proveedor: confirmar llegada con geolocalización válida.
9. Proveedor: cargar evidencia `Antes`.
10. Proveedor: iniciar trabajo (`en_progreso`).
11. Probar ampliación si corresponde al escenario.
12. Proveedor: cargar evidencia `Después`.
13. Si es efectivo, confirmar recepción. Antes de ese paso UGO debe impedir `esperando_aprobacion`.
14. Confirmada la recepción, el servicio puede quedar `esperando_aprobacion`.
15. Cliente: revisar evidencia final.
16. Cliente: aprobar o abrir disputa según el escenario.
17. Verificar cierre persistido y estado financiero.
18. Admin: verificar el mismo `serviceId`, usuarios, pago, disputa y estados resultantes.

## Gate automático

El workflow `UGO Isolated RPC RLS` usa exclusivamente UGO TEST. La URL y publishable key son públicas y quedan fijas en el workflow. Sólo las seis credenciales humanas de las tres identidades de prueba quedan como GitHub Secrets:

- `UGO_TEST_CLIENT_EMAIL`
- `UGO_TEST_CLIENT_PASSWORD`
- `UGO_TEST_PROVIDER_EMAIL`
- `UGO_TEST_PROVIDER_PASSWORD`
- `UGO_TEST_ADMIN_EMAIL`
- `UGO_TEST_ADMIN_PASSWORD`

Nunca guardar contraseñas en este repositorio.

El E2E backend del 14/09 validó RLS/RPC con las identidades TEST reales mediante rol `authenticated` y claim de usuario. El workflow con `signInWithPassword` sigue siendo un gate adicional y debe ejecutarse cuando las credenciales humanas estén cargadas como Secrets.

## Credenciales humanas

Las credenciales de Cliente Test, Proveedor Test y Admin Test se entregan fuera del repositorio. El PDF de acceso puede contener las credenciales de las cuentas de prueba para uso humano, pero nunca debe contener `service_role`, secret keys, tokens de GitHub/Vercel, database password ni claves privadas de infraestructura.

## Seguridad aplicada en UGO TEST

La migración `20260913005000_auxiliary_tables_rls_hardening.sql` fue aplicada en UGO TEST el 14/09/2026. Se verificó `relrowsecurity=true` en las 13 superficies cubiertas:

`audit_log`, `documentos`, `documentos_proveedor`, `eventos_servicio`, `hugo_chat`, `hugo_sessions`, `mensajes`, `push_entregas`, `push_suscripciones`, `retiros`, `whatsapp_conversaciones`, `whatsapp_eventos` y `whatsapp_notificaciones`.

Producción no fue modificada.

## Criterio de salida de TEST

UGO TEST sólo está listo para promoción cuando:

- CI principal está verde sobre el SHA que se pretende promover.
- RPC/RLS aislado con login real pasa con cuentas de Cliente/Proveedor/Admin.
- Cliente + Proveedor completan el flujo desde dispositivos reales.
- Admin puede observar/operar el flujo esperado.
- Realtime y reconexión mantienen estado persistido.
- Storage/evidencias, cámara, GPS y permisos de voz funcionan en dispositivo real.
- no quedan P0 de seguridad o dinero sin resolver.
- la prueba manual queda aceptada.

Hasta entonces: **no promover a producción**.
