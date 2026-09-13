# UGO — Agent Handoff

**Estado:** operativo en UGO TEST  
**Rama:** `main`  
**Uso:** buzón compartido entre ChatGPT, Codex y otros agentes  
**Regla:** verificar contra `main` antes de confiar en este archivo.

## CURRENT P0

Cerrar la primera validación real Cliente ↔ Proveedor ↔ Admin sobre UGO TEST, sin tocar producción.

UGO TEST designado:

```text
Supabase: tmossnqfwfwjrtzwcbmm
Web: https://ugo-admin-panel.vercel.app
Cliente: /?app=client
Proveedor: /?app=provider
Admin: /?app=admin
```

Producción `trfsjuseqjxlhrxuvdsm` está fuera de alcance hasta promoción explícita.

## ESTADO ACTUAL

12/09/2026:

- `main` apunta Cliente, Proveedor y Admin al mismo UGO TEST.
- UGO TEST está ACTIVE_HEALTHY.
- DB auditada: 1 Cliente, 1 Proveedor, 1 Admin; 0 servicios/pagos/evidencias/disputas transaccionales activos.
- RPCs críticos del lifecycle existen en TEST: matching, aceptación, pago efectivo, avance, ampliación, cierre y disputa.
- Vercel desplegó correctamente `main` y el alias público sirve el build de TEST.
- UI muestra insignia visible `UGO TEST` para evitar confundir el entorno con producción.
- `.env.example` dejó de apuntar a producción.
- `docs/UGO_TEST_RUNBOOK.md` documenta la prueba desde dos celulares + Admin.
- CI principal de `2cf7ab3` fue verde antes de los ajustes finales de runbook/gates; volver a verificar el último `main`.

## IMPLEMENTED

Baseline P0 Cliente ↔ Proveedor:

- matching con recovery persistido;
- aceptación con reconciliación de asignación;
- pago con recovery/reconnect;
- geolocalización antes de `llegado` y guard backend 200 m;
- evidencia Antes/Después con recovery de Storage/DB;
- lifecycle Proveedor con reconciliación de transiciones;
- cierre Cliente con reconciliación persistida;
- disputas con recovery;
- Admin web conectado al mismo Supabase TEST.

Entorno TEST:

- target Supabase centralizado;
- producción rechazada por el gate aislado;
- URL y publishable key públicas fijas en CI, no tratadas como secretos;
- gate aislado ampliado a Cliente ↔ Proveedor ↔ Admin;
- seis GitHub Secrets humanos esperados: email/password de los tres roles.

## VALIDATED

Evidencia confirmada:

- UGO Core CI run `34727990818` sobre `2cf7ab3`: success.
- Vercel deployment de `2cf7ab3`: READY.
- Supabase TEST: esquema y RPCs críticos presentes.

Pendiente de declarar VALIDATED:

- último `main` posterior a los cambios de gate/runbook/badge;
- E2E RPC/RLS con login real de Cliente/Proveedor/Admin;
- prueba manual real en dos dispositivos + Admin;
- Storage/cámara/GPS en dispositivo real.

## BLOCKED

### B1 · Credenciales humanas TEST

La base ya contiene una identidad de cada rol, pero el conector disponible no permite leer ni resetear contraseñas de Supabase Auth. Tampoco permite administrar GitHub Secrets.

Para ejecutar el gate aislado se requieren exactamente:

```text
UGO_TEST_CLIENT_EMAIL
UGO_TEST_CLIENT_PASSWORD
UGO_TEST_PROVIDER_EMAIL
UGO_TEST_PROVIDER_PASSWORD
UGO_TEST_ADMIN_EMAIL
UGO_TEST_ADMIN_PASSWORD
```

No guardar esos valores en GitHub, código, commits ni documentos públicos.

### B2 · Seguridad auxiliar antes de producción

Supabase reportó RLS deshabilitado en 13 tablas auxiliares: `audit_log`, `documentos`, `documentos_proveedor`, `eventos_servicio`, `hugo_chat`, `hugo_sessions`, `mensajes`, `push_entregas`, `push_suscripciones`, `retiros`, `whatsapp_conversaciones`, `whatsapp_eventos`, `whatsapp_notificaciones`.

No habilitar RLS a ciegas: definir primero políticas coherentes; activar sin políticas puede romper funciones. Este gap no autoriza cambios en producción.

## NEXT

1. verificar CI y Vercel del último `main`;
2. en cuanto existan/estén conocidas las seis credenciales TEST, cargarlas como GitHub Secrets;
3. ejecutar `UGO Isolated RPC RLS` hasta verde;
4. realizar prueba manual Cliente/Proveedor/Admin según `docs/UGO_TEST_RUNBOOK.md`;
5. generar PDF privado de accesos y guía de prueba sin secretos de infraestructura;
6. auditar y diseñar políticas RLS de las 13 tablas auxiliares antes de promoción;
7. sólo después evaluar promoción a producción.

## HANDOFF CONTRACT

El agente que termina un bloque actualiza este archivo si cambió el estado operativo. No borrar bloqueos reales. El agente que entra verifica primero `main` y continúa desde CURRENT P0/NEXT sin pedir al usuario reconstruir contexto.
