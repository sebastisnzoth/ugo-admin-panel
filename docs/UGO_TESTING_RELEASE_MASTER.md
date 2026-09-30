# UGO — Testing & Release Master

**Versión:** 3.2 · 16 de septiembre de 2026  
**Estado:** contrato maestro de calidad y release  
**Rama única:** `main`

## 1. Madurez canónica

```text
IMPLEMENTED → CI VALIDATED → RUNTIME VALIDATED → PUBLISHED
```

Un paso no sustituye al siguiente.

## 2. Quality Gates

```text
L0 TypeScript/build/lint
L1 contratos/estados UX
L2 dominio/RPC/API
L3 RLS/roles/Storage
L4 Integration/Realtime/pagos/mapas
L5 E2E Cliente↔Proveedor↔Admin + A+B+C
L6 Android físico Cliente↔Proveedor
L7 publicación/smoke/rollback
```

## 3. Checkpoint CI actual

```text
SHA: c89a9bf7b8baacc949d0639371d87cbf9e78bc46
UGO Core CI run: 35052952138
conclusion: SUCCESS
```

Resultado: security gate, TypeScript/build, **319 tests/contratos**, lint crítico, ClientApp y lint global verdes. Los E2E autenticados se omiten cuando faltan las seis credenciales TEST y no cuentan como runtime validation.

## 4. Regla Sentinel para mutaciones críticas

```text
operación devuelve error
→ verificar estado persistido exacto
→ éxito persistido: éxito recuperado, SIN P0
→ fallo persistido confirmado: P0/P1 según contrato
→ persistencia no verificable: recovery telemetry, no readiness falso
```

Esta regla cubre matching, cancelación, aceptación/rechazo de oferta, disponibilidad, lifecycle, GPS, chat send, rating y pagos críticos.

## 5. Chat

El envío es idempotente por intento mediante `clientMessageId`. TEST aplica un índice único parcial por `servicio_id + emisor_id + clientMessageId`. Un error de INSERT sólo se convierte en P0 después de confirmar que el intento exacto no quedó persistido.

Aun así, `CHAT-REALTIME` permanece `implemented` hasta probar visualmente Cliente→Proveedor y Proveedor→Cliente en dos sesiones reales, con reload/reconnect, quick replies, bloqueo de contacto y aislamiento por `serviceId`.

## 6. Cliente / Actividad / Rating / Pago

- Actividad tiene una única navegación de estado: Activos ahora / Próximos / Finalizados + Todos/refresh.
- Rating reconcilia persistencia exacta antes de incidente.
- Pago mantiene P0 `PAYMENT-CLOSE` sólo para mutación confirmadamente fallida; errores de carga/Realtime son P1 de sincronización foreground+online.
- A+B+C continúa protegido por contratos, pero necesita evidencia runtime actual.

## 7. Proveedor / Matching / GPS

- online/offline reconcilia estado persistido y fallo confirmado clasifica `MATCH-ONLINE` server-side.
- rechazo de oferta reconcilia estado `rechazada` exacto.
- GPS reconcilia `ultima_ubicacion_at` antes de reportar fallo de persistencia.
- Agenda debe mostrar todos los trabajos futuros/asignados; misión activa sólo representa el `serviceId` accionable.

## 8. Android TEST

El APK para prueba física debe construirse desde el **SHA final exacto** posterior a esta sincronización documental, con:

```text
bundleRuntime = local-dist
environment = TEST
VITE_APP_REVISION = SHA exacto
```

Compilar ≠ probar. El artifact final debe instalarse y pasar dos sesiones/dispositivos.

## 9. Prueba física mínima

Cliente:

```text
login → A+B+C → Actividad → cancelación selectiva → matching/radar → chat → tracking → pago → rating
```

Proveedor:

```text
login → online → oferta → aceptar/rechazar → Agenda → en camino → llegada/GPS → chat → trabajo → cobro/cierre
```

Dos sesiones/dispositivos: Realtime, reconnect, background/foreground y aislamiento entre pedidos.

## 10. Gates bloqueados

```text
TWO-DEVICES = BLOCKED
FULL-E2E = BLOCKED
GO-LIVE = BLOCKED
```

No promover por contratos, persistencia aislada, CI o compilación.

## 11. Publicación

No disparar Vercel para documentación, para generar APK ni para sustituir QA Android. Publicar sólo cuando exista necesidad funcional de release y registrar revisión exacta + smoke + rollback/mitigación.

**UGO se valida por evidencia. Supabase PROD permanece fuera de alcance.**
