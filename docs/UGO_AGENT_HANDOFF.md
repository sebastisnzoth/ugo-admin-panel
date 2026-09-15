# UGO — Agent Handoff

**Estado:** UGO TEST operativo; todavía NO promovible a producción comercial  
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

## HEAD REAL ACTUAL · 15/09/2026

```text
main: 48b1fb400eb9275e2d74e9bc734b2915fccee65d
docs(testing): align release master with 3-role real-storage e2e
```

Padre funcional/CI:

```text
2d585734b8428e80831d0ea7f2184c7253def1bc
ci(e2e): align core test target and report credential readiness
```

El cliente Stitch fue revertido y el frontend volvió al estado pre-Stitch con:

```text
442d772e30a20a8b7725bcfbc329eb663ac2e789
revert(client-ui): restore pre-Stitch client experience
```

No reabrir la integración Stitch salvo decisión nueva explícita.

## CI AUTORITATIVO

Último CI completamente confirmado antes del commit documental actual:

```text
UGO Core CI #761
run: 34925210746
SHA: 2d585734b8428e80831d0ea7f2184c7253def1bc
status: completed
conclusion: success
```

Pasaron:

- `npm ci --include=dev`;
- `npm audit --audit-level=high`;
- preflight de credenciales E2E;
- TypeScript + build;
- core lifecycle/market/integration tests;
- lint crítico operacional;
- ClientApp lint;
- full repository lint.

El commit documental `48b1fb4...` disparó `UGO Core CI #762`. No usarlo como evidencia final hasta que termine.

## P0-1 · E2E AUTENTICADO REAL

Harness:

```text
tests/integration/client-provider-rpc-rls.test.mjs
```

Estado:

```text
IMPLEMENTED
NO VALIDATED todavía
```

El harness exige estas 8 variables:

```text
UGO_TEST_SUPABASE_URL
UGO_TEST_SUPABASE_ANON_KEY
UGO_TEST_CLIENT_EMAIL
UGO_TEST_CLIENT_PASSWORD
UGO_TEST_PROVIDER_EMAIL
UGO_TEST_PROVIDER_PASSWORD
UGO_TEST_ADMIN_EMAIL
UGO_TEST_ADMIN_PASSWORD
```

En `UGO Core CI`, URL + publishable key públicas de UGO TEST están fijadas en el workflow. Las 6 credenciales humanas Cliente/Proveedor/Admin provienen exclusivamente de GitHub Secrets.

No imprimir ni guardar passwords en repo/docs/logs.

El E2E futuro debe crear un servicio NUEVO y conservar el mismo `serviceId`:

```text
Cliente crea
→ matching
→ Proveedor recibe oferta
→ acepta
→ Cliente/Admin ven mismo servicio
→ chat Cliente↔Proveedor
→ Admin audita chat
→ pago
→ en_camino
→ llegado
→ upload REAL antes
→ en_progreso
→ ampliación
→ upload REAL después
→ confirmar pago
→ aprobación Cliente
→ completado
→ Cliente/Proveedor/Admin convergen
→ Admin ve pago + chat + 2 evidencias del mismo serviceId
```

Bucket:

```text
service-evidence
```

El harness ya:

- rechaza producción `trfsjuseqjxlhrxuvdsm`;
- exige TEST `tmossnqfwfwjrtzwcbmm`;
- usa una tercera identidad Admin/Super Admin real;
- envía chat real en `public.mensajes`;
- intenta una evidencia falsa y exige rechazo;
- sube dos PNG reales a Storage (`antes`, `despues`);
- verifica pago, ampliación, idempotencia y cierre;
- preserva el fixture E2E con `e2e_run_id` para auditoría.

No marcar `VALIDATED` hasta tener evidencia positiva de:

```text
serviceId nuevo
runId nuevo
2 objetos Storage reales
chat real
pago real TEST
estado final completado
lectura convergente Cliente/Proveedor/Admin
```

Históricos que NO sustituyen el nuevo E2E:

```text
#14 68ef8d25-b382-4e98-986a-21c510cc78f1 · completado histórico
#28 3558ce63-5216-4a58-beed-30febf0581ba · cancelado
```

## P0-2 · FINANZAS

Estado:

```text
BLOCKED — PRODUCT DECISION REQUIRED
```

No crear todavía:

```text
saldo_proveedor()
solicitar_retiro(p_monto)
```

Falta definir explícitamente:

1. qué estados de pago alimentan `saldo_disponible`;
2. cuándo `ganancia_proveedor` se vuelve disponible;
3. cómo un retiro pendiente/procesando reserva saldo;
4. cómo evitar doble retiro;
5. qué ocurre con efectivo pendiente al cancelar;
6. semántica de cancelado/fallido/reembolsado/anulado;
7. retiro manual interno vs Mercado Pago Split;
8. conciliación definitiva.

Invariante ya definido:

> ningún dinero de servicio incompleto/cancelado debe convertirse accidentalmente en saldo retirable.

Caso real de referencia en TEST:

```text
servicio #28
estado servicio = cancelado
método = efectivo
pago = pendiente
```

Se permiten tests de invariantes ya definidos y detección de inconsistencias. No inventar fórmula financiera.

## P0-3 · PRUEBA FÍSICA DOS CELULARES

Estado:

```text
PREPARABLE
MEASURED pendiente
```

Cliente debe probar:

```text
login · pedir servicio · Hugo voz/texto · categorías reales · proveedores reales
matching · tarjeta proveedor · cancelación · seguimiento · chat · pago · revisión · historial
```

Proveedor debe probar:

```text
login · online/offline · oportunidad · aceptar/rechazar · trabajo activo · mapa
en_camino · llegada · GPS · cámara · evidencia Antes · iniciar trabajo · chat
ampliación · evidencia Después · cierre · ingreso visible
```

En dos dispositivos:

```text
Realtime sin refresh
reconnect
background/foreground
GPS caminando
cámara
Storage
push
Hugo micrófono
barge-in
STOP
fallback texto
teclado
safe areas
overlays
botones táctiles
```

No marcar `MEASURED` sin prueba física real.

## CORE YA VALIDADO · NO REABRIR SIN REGRESIÓN

```text
Realtime recovery
GPS/tracking backend
chat canónico
Storage integrity guard
RLS/RPC críticos
SECURITY DEFINER guards críticos + negativos TEST
```

Pendiente producción de seguridad:

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

## HUGO

```text
contracts: VALIDATED
micrófono/latencia/barge-in/STOP físico: MEASURED pendiente
```

Hugo debe usar datos reales y nunca inventar proveedor, rating, precio, disponibilidad, pago o estado. Voz/texto comparten contexto y el fallback texto debe seguir operativo.

## VERCEL TEST

El estado pre-Stitch restaurado por `442d772e...` obtuvo deploy Vercel `READY`. Los commits posteriores `2d585734...` y `48b1fb4...` son CI/documentación y no cambian el frontend/backend funcional.

Alias:

```text
https://ugo-admin-panel.vercel.app
```

Supabase PRODUCCIÓN no fue tocado.

## NEXT

```text
1. terminar/verificar Core CI del HEAD documental
2. ejecutar E2E autenticado sólo si las 6 credenciales humanas TEST existen en GitHub Secrets
3. si faltan, mantener BLOCKED y no inventarlas
4. capturar serviceId/runId + 2 Storage reales sólo cuando la corrida auténtica ocurra
5. preparar pasada física de dos celulares sin marcar MEASURED
6. mantener finanzas BLOCKED hasta decisión explícita
7. después avanzar UX operativa; no hacer refactor arquitectónico grande antes
```

Detenerse sólo por producción, gasto real, credenciales inexistentes, decisión financiera irreversible no definida o riesgo de pérdida de datos.
