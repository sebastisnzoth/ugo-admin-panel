# UGO — Agent Handoff

**Estado:** UGO TEST operativo; NO promovible todavía a producción comercial  
**Rama de verdad:** `main`  
**Uso:** handoff compartido ChatGPT/Codex  
**Regla:** verificar `main`, CI, Vercel y Supabase TEST antes de continuar.

## ENTORNO

```text
Repo: https://github.com/sebastisnzoth/ugo-admin-panel
Supabase TEST: tmossnqfwfwjrtzwcbmm
Web TEST: https://ugo-admin-panel.vercel.app
Cliente: /?app=client
Proveedor: /?app=provider
Admin: /?app=admin
Supabase PROD: trfsjuseqjxlhrxuvdsm · FUERA DE ALCANCE
```

Principio:

> **Un pedido. Un profesional. Sin vueltas.**

Interpretación obligatoria: un profesional por PEDIDO; un mismo cliente puede tener múltiples pedidos simultáneos e independientes.

## BASE FUNCIONAL / CI AUTORITATIVA · 15/09/2026

```text
097ad6e89d08b5d0999f9d7e96ab6821e67239be
fix(hugo): type canonical voice runtime
```

### Core CI

```text
UGO Core CI #815
run: 34937373059
SHA: 097ad6e89d08b5d0999f9d7e96ab6821e67239be
status: completed
conclusion: success
```

Pasaron:

- `npm ci --include=dev`;
- `npm audit --audit-level=high`;
- guard de entorno TEST;
- TypeScript + Vite production build;
- 205 tests/contratos con 0 fallos funcionales en la corrida previa equivalente; el E2E autenticado se omite sin credenciales;
- lint crítico operacional incluyendo el Hugo canónico;
- ClientApp lint;
- full repository lint.

Las 6 credenciales humanas TEST siguen ausentes en GitHub Secrets, por lo que el E2E autenticado continúa bloqueado y no se inventa evidencia.

### Hugo canónico

`src/mvp/client/ClientVoiceHugoDock.tsx` es la superficie canónica. Los componentes/hooks de voz legacy fueron retirados.

Estado:

```text
multi-pedido: IMPLEMENTED
contratos: VALIDATED por CI
hardware/micrófono real: MEASURED pendiente
```

Hugo:

- puede crear un pedido nuevo aunque existan servicios activos;
- usa `request_draft_id` para idempotencia del mismo draft;
- resuelve status/cancelación por servicio concreto;
- exige `serviceId` para mutación;
- si hay ambigüedad abre Actividad/pide aclaración y no cancela arbitrariamente;
- no interpreta `23505` como “cliente ya tiene un activo”.

## P0 · MÚLTIPLES PEDIDOS POR CLIENTE

Estado:

```text
IMPLEMENTED
VALIDATED real A+B+C: BLOCKED — missing TEST credentials
```

Objetivo de validación real:

```text
A Electricista mañana 15:00
B Plomero hoy
C Limpieza viernes 10:00
```

Los tres deben coexistir con tres `serviceId` distintos. Cancelar B debe dejar A y C intactos.

Ya implementado:

- backend TEST sin guard global “un servicio activo por cliente”;
- `servicios_cliente_estado_created_idx` no único para consultas;
- idempotencia del mismo draft mediante `servicios_cliente_request_draft_uidx`;
- Cliente puede crear otro pedido sin cerrar anteriores;
- matching puede continuar en background;
- Actividad lista varios pedidos y abre detalle por `serviceId`;
- cancelación recibe `serviceId` explícito + ownership;
- chat, tracking, pago, revisión, ampliaciones y disputa trabajan por `serviceId`;
- Realtime de detalle se mantiene ligado al servicio seleccionado;
- Proveedor puede conservar varias asignaciones futuras compatibles en Agenda;
- cada trabajo de Agenda abre por `serviceId`.

### Auditoría Supabase TEST · 15/09/2026

Verificado directamente en `tmossnqfwfwjrtzwcbmm`:

```text
servicios_cliente_estado_created_idx = PRESENTE · NON-UNIQUE
servicios_cliente_request_draft_uidx = PRESENTE · UNIQUE sólo cliente_id + request_draft_id no vacío
servicios_cliente_single_active_uidx = AUSENTE
trg_guard_single_active_client_service = AUSENTE
trg_sync_service_schedule_canonical = PRESENTE
```

No reintroducir `.limit(1)`, `activeServiceId` o “latest service” para decidir mutaciones destructivas.

## E2E AUTENTICADO REAL

Harness:

```text
tests/integration/client-provider-rpc-rls.test.mjs
```

Estado:

```text
IMPLEMENTED
BLOCKED — missing GitHub TEST credentials
```

Presentes:

```text
UGO_TEST_SUPABASE_URL
UGO_TEST_SUPABASE_ANON_KEY
```

Ausentes:

```text
UGO_TEST_CLIENT_EMAIL
UGO_TEST_CLIENT_PASSWORD
UGO_TEST_PROVIDER_EMAIL
UGO_TEST_PROVIDER_PASSWORD
UGO_TEST_ADMIN_EMAIL
UGO_TEST_ADMIN_PASSWORD
```

No guardar passwords en repo/docs/logs. No inventar IDs ni marcar `VALIDATED` hasta una corrida auténtica.

La validación requerida debe demostrar:

```text
crear A
crear B sin finalizar A
crear C sin finalizar A/B
A.id != B.id != C.id
cancelar B
A intacto
C intacto
chat/tracking/pago/estado correctos por serviceId
Proveedor opera el servicio correcto
Cliente/Proveedor/Admin convergen
```

## ANDROID

Ruta nativa canónica:

```text
android-apk/
```

### APK nativas

Último build nativo confirmado sin cambios posteriores en `android-apk/`:

```text
Build UGO Android APKs #14
run: 34935021499
SHA: 7fed2b5511e4a66e946cce04f610addf7b9bf7cf
conclusion: success
artifact: UGO-Android-APKs
```

Artefactos debug:

```text
UGO Cliente
package: com.ugo.client
versionName: 1.0.0
versionCode: 1
SHA-256: 47a8396c543ddf27aa8225c34dc1553c435cf69d4fde1933584e002cb49144f9

UGO Proveedor
package: com.ugo.provider
versionName: 1.0.0
versionCode: 1
SHA-256: c0ca825d54f55131fa259b280f808d4ba2c6a52ce52d607b3766656bdd88a07a
```

El wrapper nativo no cambió después de ese SHA; carga el Web TEST, por lo que consume el frontend actual del alias.

Android nativo contempla:

- INTERNET;
- cámara/file chooser;
- ubicación fina/aproximada;
- micrófono;
- SpeechRecognizer nativo para Hugo;
- WebView sobre Web TEST;
- navegación/back;
- geolocalización concedida sólo después del permiso Android.

### APK QA unificada

```text
UGO Android TEST APK #5
run: 34937373061
SHA: 097ad6e89d08b5d0999f9d7e96ab6821e67239be
conclusion: success
```

La APK Capacitor `com.ugo.test` es herramienta QA y no sustituye silenciosamente Cliente/Proveedor nativos.

### Prueba física

```text
APK Cliente: IMPLEMENTED
APK Proveedor: IMPLEMENTED
Gradle CI: VALIDATED
instalación + hardware real: MEASURED pendiente
```

No marcar `MEASURED` hasta probar dos teléfonos físicos Cliente + Proveedor con GPS, cámara, Storage, Hugo voz, Realtime, background/foreground, chat, estados y A+B+C.

## VERCEL TEST

Deployment actual del HEAD funcional:

```text
deployment: dpl_4ypv3qnvsWPGNMuGy4QxeTRaNL3F
commit: 097ad6e89d08b5d0999f9d7e96ab6821e67239be
state: READY
alias: https://ugo-admin-panel.vercel.app
aliasError: null
```

Smoke verificado el 15/09/2026:

```text
/?app=client   HTTP 200
/?app=provider HTTP 200
/?app=admin    HTTP 200
```

## CORE CERRADO SALVO REGRESIÓN

```text
multi-pedido estructural: IMPLEMENTED
Hugo multi-pedido contracts: VALIDATED por CI
Realtime recovery: VALIDATED
GPS/tracking backend: VALIDATED
chat canónico: VALIDATED
Storage integrity guard: VALIDATED
RLS/RPC críticos: VALIDATED
SECURITY DEFINER guards críticos + negativos TEST: VALIDATED
Android native debug build: VALIDATED
Android QA current-head build: VALIDATED
Vercel current HEAD: RELEASED a TEST
```

## FINANZAS

Estado:

```text
BLOCKED — PRODUCT DECISION REQUIRED
```

No crear todavía:

```text
saldo_proveedor()
solicitar_retiro(p_monto)
```

Invariante vigente: ningún dinero de servicio incompleto/cancelado debe transformarse accidentalmente en saldo retirable.

## SEGURIDAD / PRODUCCIÓN PENDIENTE

```text
MFA Admin
leaked password protection
api/* privilegiadas
Bearer/Auth/ownership/rol
rate limit
secrets
auditoría
backups
observabilidad
rollback
protección de main
```

No promover comercialmente mientras estos puntos y finanzas sigan abiertos.

## NEXT

```text
1. si aparecen las 6 credenciales humanas TEST en GitHub Secrets, ejecutar E2E autenticado A+B+C y registrar IDs reales
2. instalar UGO Cliente + UGO Proveedor en dos Android físicos y ejecutar docs/UGO_TWO_DEVICE_PHYSICAL_RUNBOOK.md
3. corregir cualquier bug reproducible hallado en la pasada física y volver a Core CI + Android build
4. mantener finanzas BLOCKED hasta decisión explícita
5. no tocar Supabase PROD
```

No queda un P0 técnico automatizable conocido fuera de estos bloqueos/evidencia física.

**Supabase PRODUCCIÓN `trfsjuseqjxlhrxuvdsm` NO FUE TOCADO.**