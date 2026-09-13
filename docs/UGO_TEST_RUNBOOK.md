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

Aunque Vercel denomine al alias principal como `production`, el build actual de `main` apunta explícitamente a **UGO TEST**. Eso no autoriza ningún cambio sobre Supabase de producción.

## Accesos web

- Cliente: `https://ugo-admin-panel.vercel.app/?app=client`
- Proveedor: `https://ugo-admin-panel.vercel.app/?app=provider`
- Admin: `https://ugo-admin-panel.vercel.app/?app=admin`

Usar dos dispositivos/sesiones separadas para Cliente y Proveedor. Admin puede abrirse en computadora o en una tercera sesión del navegador.

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
13. Si es efectivo, confirmar recepción según el contrato del producto.
14. Proveedor: pedir aprobación (`esperando_aprobacion`).
15. Cliente: revisar evidencia final.
16. Cliente: aprobar o abrir disputa según el escenario.
17. Verificar cierre persistido y estado financiero.
18. Admin: verificar servicio, usuarios, pago, disputa y estados resultantes.

## Gate automático

El workflow `UGO Isolated RPC RLS` usa exclusivamente UGO TEST. La URL y publishable key son públicas y quedan fijas en el workflow. Sólo las identidades de prueba requieren secretos de GitHub:

- `UGO_TEST_CLIENT_EMAIL`
- `UGO_TEST_CLIENT_PASSWORD`
- `UGO_TEST_PROVIDER_EMAIL`
- `UGO_TEST_PROVIDER_PASSWORD`

Nunca guardar contraseñas en este repositorio.

## Credenciales humanas

Las credenciales de Cliente Test, Proveedor Test y Admin Test se entregan fuera del repositorio. El PDF de acceso puede contener las credenciales de las cuentas de prueba para uso humano, pero nunca debe contener `service_role`, secret keys, tokens de GitHub/Vercel, database password ni claves privadas de infraestructura.

## Seguridad pendiente detectada en UGO TEST

La auditoría del proyecto detectó tablas auxiliares con RLS deshabilitado: `audit_log`, `documentos`, `documentos_proveedor`, `eventos_servicio`, `hugo_chat`, `hugo_sessions`, `mensajes`, `push_entregas`, `push_suscripciones`, `retiros`, `whatsapp_conversaciones`, `whatsapp_eventos` y `whatsapp_notificaciones`.

No se debe habilitar RLS a ciegas: primero deben existir políticas coherentes con Cliente/Proveedor/Admin, porque activar RLS sin políticas puede bloquear flujos. Este punto es un gate de seguridad antes de promover el entorno a producción.

## Criterio de salida de TEST

UGO TEST sólo está listo para promoción cuando:

- CI principal está verde.
- RPC/RLS aislado pasa con cuentas reales de prueba.
- Cliente + Proveedor completan el flujo desde dispositivos reales.
- Admin puede observar/operar el flujo esperado.
- Realtime y reconexión mantienen estado persistido.
- Storage/evidencias funcionan en dispositivo real.
- no quedan P0 de seguridad o dinero sin resolver.
- la prueba manual queda aceptada.

Hasta entonces: **no promover a producción**.
