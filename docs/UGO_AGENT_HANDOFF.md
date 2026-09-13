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
- DB auditada: 1 Cliente, 1 Proveedor, 1 Admin; sin transacciones residuales relevantes.
- RPCs críticos del lifecycle existen en TEST: matching, aceptación, pago efectivo, avance, ampliación, cierre y disputa.
- `.env.example` apunta a UGO TEST y producción queda excluida del flujo de prueba.
- `docs/UGO_TEST_RUNBOOK.md` documenta la prueba desde dos celulares + Admin.
- UI incorpora marca visible `UGO TEST` en el último `main`.
- Vercel sirve un build anterior de TEST, pero el último redeploy quedó bloqueado por límite gratuito diario (>100 deployments). Hay reintento programado después del reset del límite; no gastar ni cambiar plan.

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
- seis GitHub Secrets humanos esperados: email/password de los tres roles;
- migración `20260913005000_auxiliary_tables_rls_hardening.sql` versionada para 13 tablas auxiliares sin RLS;
- contract test `auxiliary-rls-hardening.test.mjs` protege ownership, finanzas, push, mensajería y superficies WhatsApp.

## VALIDATED

Evidencia confirmada:

- UGO Core CI run `34727990818` sobre `2cf7ab3`: success.
- UGO Core CI run `34728566874` sobre `8ed3ac3`: success.
- UGO Core CI run `34728738562` sobre `7842da4`: success; incluye build, lifecycle/contracts y hardening RLS estático.
- Vercel deployment de `2cf7ab3`: READY y apuntando a UGO TEST.
- Supabase TEST: esquema y RPCs críticos presentes.
- Auditoría de funciones `SECURITY DEFINER`: los RPCs críticos revisados contienen checks explícitos de auth/ownership/rol; no revocar EXECUTE a ciegas.

Pendiente de declarar VALIDATED:

- aplicar la nueva migración RLS auxiliar sobre UGO TEST;
- E2E RPC/RLS con login real de Cliente/Proveedor/Admin;
- prueba manual real en dos dispositivos + Admin;
- Storage/cámara/GPS en dispositivo real;
- deploy del último `main` cuando se libere el límite gratuito de Vercel.

## BLOCKED

### B1 · Credenciales humanas TEST

La base contiene una identidad de cada rol, pero las herramientas disponibles no permiten leer/resetear contraseñas de Supabase Auth ni administrar GitHub Secrets.

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

### B2 · Aplicación de RLS auxiliar

La migración ya está diseñada, versionada y validada por CI, pero la ejecución DDL directa fue bloqueada por los controles de la herramienta. No intentar bypass. Aplicarla primero en UGO TEST por un canal autorizado; producción sigue prohibida.

Tablas cubiertas:

`audit_log`, `documentos`, `documentos_proveedor`, `eventos_servicio`, `hugo_chat`, `hugo_sessions`, `mensajes`, `push_entregas`, `push_suscripciones`, `retiros`, `whatsapp_conversaciones`, `whatsapp_eventos`, `whatsapp_notificaciones`.

### B3 · Vercel free-tier deploy cap

Último `main` no pudo desplegar porque Vercel devolvió `api-deployments-free-per-day` (>100). El build ya está verde en GitHub Actions. Reintentar después del reset, sin upgrade pago.

## NEXT

1. aplicar `20260913005000_auxiliary_tables_rls_hardening.sql` en UGO TEST por canal autorizado;
2. disponer/cargar las seis credenciales humanas TEST como GitHub Secrets;
3. ejecutar `UGO Isolated RPC RLS` hasta verde;
4. realizar prueba manual Cliente/Proveedor/Admin según `docs/UGO_TEST_RUNBOOK.md`;
5. verificar Storage/cámara/GPS y Realtime desde dispositivos reales;
6. reintentar deploy del último `main` al resetear el límite de Vercel;
7. sólo después evaluar promoción a producción.

## HANDOFF CONTRACT

El agente que termina un bloque actualiza este archivo si cambió el estado operativo. No borrar bloqueos reales. El agente que entra verifica primero `main` y continúa desde CURRENT P0/NEXT sin pedir al usuario reconstruir contexto.
