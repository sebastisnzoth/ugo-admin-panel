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
7fed2b5511e4a66e946cce04f610addf7b9bf7cf
ci(android): resolve sdkmanager from runner SDK
```

Los commits documentales posteriores pueden adelantar `main` con `[skip ci]`; no confundir ese HEAD documental con una nueva base funcional.

### Core CI

```text
UGO Core CI #807
run: 34935021482
SHA: 7fed2b5511e4a66e946cce04f610addf7b9bf7cf
status: completed
conclusion: success
```

Pasaron:

- `npm ci --include=dev`;
- `npm audit --audit-level=high` → 0 vulnerabilidades auditables en el gate;
- guard de entorno TEST;
- preflight de credenciales E2E;
- TypeScript + Vite production build;
- tests/contratos/integración local;
- lint crítico operacional;
- ClientApp lint;
- full repository lint.

El E2E autenticado remoto fue omitido de forma explícita porque las 6 credenciales humanas TEST siguen ausentes en GitHub Secrets.

### Android nativo

```text
Build UGO Android APKs #14
run: 34935021499
SHA: 7fed2b5511e4a66e946cce04f610addf7b9bf7cf
conclusion: success
artifact: UGO-Android-APKs
```

Artefactos debug generados:

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

El proyecto nativo canónico vive en `android-apk/`. La APK Capacitor `com.ugo.test` puede mantenerse como herramienta QA, pero no sustituye silenciosamente Cliente/Proveedor nativos.

## P0 · MÚLTIPLES PEDIDOS POR CLIENTE

Estado:

```text
IMPLEMENTED
VALIDATED real A+B+C: BLOCKED — missing TEST credentials
```

Regla:

```text
A Electricista mañana 15:00
B Plomero hoy
C Limpieza viernes 10:00
```

deben poder coexistir con tres `serviceId` distintos.

Ya implementado:

- eliminado el guard backend global “un servicio activo por cliente”;
- índice de consulta normal `servicios_cliente_estado_created_idx`;
- idempotencia por `request_draft_id` mediante índice único sólo para el mismo draft;
- `ClientGuidedRequest` no bloquea un pedido nuevo por existir otro activo;
- Actividad lista varios pedidos y abre detalle por `serviceId`;
- cancelación canónica recibe `serviceId` explícito + ownership;
- chat, tracking, pago, revisión y ampliaciones trabajan por `serviceId`;
- Hugo usa contexto multi-pedido, no bloquea creación de B/C y resuelve status/cancelación a un servicio concreto;
- si Hugo encuentra ambigüedad, debe pedir aclaración corta y no mutar nada;
- disputas no eligen “el último servicio” cuando existen varios candidatos;
- Proveedor puede conservar varias asignaciones futuras compatibles en Agenda;
- cada trabajo de Agenda abre por `serviceId`.

Auditoría TEST del 15/09/2026:

```text
servicios_cliente_estado_created_idx = NON-UNIQUE
servicios_cliente_request_draft_uidx = UNIQUE sólo sobre cliente_id + request_draft_id no vacío
trigger single-active = AUSENTE
trg_sync_service_schedule_canonical = PRESENTE
```

No reintroducir `.limit(1)`, `activeServiceId` o “latest service” para decidir mutaciones destructivas de Cliente.

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

Presentes en Core CI:

```text
UGO_TEST_SUPABASE_URL
UGO_TEST_SUPABASE_ANON_KEY
```

Ausentes en Core CI #807:

```text
UGO_TEST_CLIENT_EMAIL
UGO_TEST_CLIENT_PASSWORD
UGO_TEST_PROVIDER_EMAIL
UGO_TEST_PROVIDER_PASSWORD
UGO_TEST_ADMIN_EMAIL
UGO_TEST_ADMIN_PASSWORD
```

No guardar passwords en repo/docs/logs. No inventar service IDs ni marcar `VALIDATED` hasta una corrida auténtica.

La validación multi-pedido requerida debe probar, como mínimo:

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

## ANDROID / PRUEBA FÍSICA

Estado:

```text
APK Cliente: IMPLEMENTED
APK Proveedor: IMPLEMENTED
build Gradle CI: VALIDATED
instalación + hardware real: MEASURED pendiente
```

Android nativo ya contempla permisos/bridge para:

- INTERNET;
- cámara/file chooser;
- ubicación fina/aproximada;
- micrófono;
- SpeechRecognizer nativo para Hugo;
- WebView sobre el Web TEST.

Se corrigió la autorización de geolocalización para no concederla al WebView antes de que Android confirme el permiso.

No marcar `MEASURED` hasta probar en dos teléfonos físicos Cliente + Proveedor: GPS, cámara, Storage, Hugo voz, Realtime, background/foreground, chat, estados y A+B+C.

## VERCEL TEST

Deployment funcional verificado:

```text
deployment: dpl_HVdhqu99z16qmTNvoJYjUW1jrLyy
commit: b2b0f753103520d7e5cbe4704e6322f11c5544b5
state: READY
alias: https://ugo-admin-panel.vercel.app
```

Smoke verificado el 15/09/2026:

```text
/?app=client   HTTP 200
/?app=provider HTTP 200
/?app=admin    HTTP 200
```

No se observaron errores/fatal funcionales recientes en runtime; existe un warning deprecado de Node en `/api/whatsapp/send`, no P0 del journey actual.

## CORE YA CERRADO SALVO REGRESIÓN

```text
Realtime recovery: VALIDATED
GPS/tracking backend: VALIDATED
chat canónico: VALIDATED
Storage integrity guard: VALIDATED
RLS/RPC críticos: VALIDATED
SECURITY DEFINER guards críticos + negativos TEST: VALIDATED
Hugo contracts multi-pedido: IMPLEMENTED + CI verde
Android Gradle debug: VALIDATED
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
1. si aparecen las 6 credenciales humanas TEST en GitHub Secrets, ejecutar E2E autenticado A+B+C y capturar IDs reales
2. instalar UGO Cliente + UGO Proveedor en dos Android físicos y ejecutar docs/UGO_TWO_DEVICE_PHYSICAL_RUNBOOK.md
3. mantener prueba física como MEASURED pendiente hasta evidencia real
4. mantener finanzas BLOCKED hasta decisión explícita
5. corregir cualquier bug reproducible hallado en la pasada física y volver a Core CI + Android build
6. no tocar Supabase PROD
```

**Supabase PRODUCCIÓN `trfsjuseqjxlhrxuvdsm` NO FUE TOCADO.**
