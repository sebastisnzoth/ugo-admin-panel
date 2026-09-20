# UGO — Roadmap Master

**Versión:** 3.4 · 16 de septiembre de 2026  
**Estado:** tablero maestro vivo de ejecución  
**Rama de verdad:** `main`

> **Un pedido. Un profesional. Sin vueltas.**

## 1. Madurez

```text
IMPLEMENTED → CI VALIDATED → RUNTIME VALIDATED → PUBLISHED
```

## 2. Checkpoint actual

```text
c89a9bf7b8baacc949d0639371d87cbf9e78bc46
UGO Core CI run 35052952138 → SUCCESS
319 tests/contratos + build + lints → verde
```

## 3. Bloque endurecido

- Actividad Cliente carga su CSS real y ya no duplica filtros de estado.
- Rating reconcilia INSERT ambiguo antes de Sentinel.
- GPS Proveedor reconcilia timestamp persistido antes de fallo.
- disponibilidad online/offline reconcilia backend y clasifica fallo confirmado como `MATCH-ONLINE`.
- rechazo de oferta reconcilia la oferta exacta.
- chat usa `clientMessageId`, recovery exacto e índice idempotente server-side en TEST.
- chat no trata contact guard esperado ni offline/hidden como P0.
- pagos separan mutación crítica de errores de sincronización/realtime.
- Centinela mantiene aislamiento por revisión y nunca aprueba checklist.

## 4. P0 inmediato

```text
[✅] Core CI exacto verde en c89a9bf…
[🟡] Development público/read-only → falta smoke del candidato final
[🟡] CHAT-REALTIME → hardening completo; falta dos sesiones reales
[🟡] multi-pedido A+B+C → contratos verdes; falta runtime real
[🟡] matching/radar/cancelación → recovery protegido; falta E2E
[🟡] Proveedor Agenda/lifecycle → contratos verdes; falta físico
[🟡] GPS → persistencia protegida; falta permiso/GPS real
[🟡] Rating → recovery protegido; falta post-servicio real
[🟡] Android HEAD exacto → generar artifact del SHA final
[⛔] TWO-DEVICES / FULL-E2E / GO-LIVE → evidencia externa pendiente
```

## 5. Cliente

| Área | Estado | Próximo cierre |
|---|---|---|
| Solicitud guiada | 🟡 | E2E real |
| Matching | 🟡 | proveedor / cero proveedor / timeout / retry / cancel |
| Online/cards | 🟡 | smoke UI real |
| Multi-pedido | 🟡 | A+B+C con IDs reales |
| Actividad/detalle | 🟡 | validación visual móvil |
| Chat | 🟡 | dos sesiones bidireccionales |
| Tracking/GPS | 🟡 | dispositivo real |
| Pago | 🟡 | E2E por método |
| Rating | 🟡 | post-servicio real |

## 6. Proveedor

| Área | Estado | Próximo cierre |
|---|---|---|
| Disponibilidad | 🟡 | UI/runtime real |
| Oportunidades | 🟡 | E2E |
| Aceptar/rechazar | 🟡 | runtime real |
| Agenda | 🟡 | varios trabajos + serviceId exacto |
| En camino/Llegué/Empezar/Listo | 🟡 | lifecycle físico |
| Chat | 🟡 | proveedor→cliente visible realtime |
| Evidencia | 🟡 | cámara/Storage real |
| Cobro/cierre | 🟡 | method-aware E2E |

## 7. Orden de ejecución UGO A

```text
1 generar Android TEST del SHA final exacto
2 validar metadata/revisión embebida
3 smoke Development + Sentinel del mismo build
4 E2E Cliente request→matching→asignación
5 chat bidireccional exact serviceId
6 A+B+C + cancelación selectiva
7 Proveedor Agenda + lifecycle + GPS
8 pagos/evidencia/rating
9 dos Android físicos
10 publicar sólo cuando corresponda
```

## 8. Track paralelo UGO B — AI Studio

Contrato: `docs/UGO_DUAL_IMPLEMENTATION_MASTER.md`.

UGO B (`sebastisnzoth/UGO-PRODUCCION`) avanza en paralelo sin detener este orden. Comparte el contrato Supabase TEST, no crea otro backend y no toca PROD para habilitar la competencia.

Orden inicial de UGO B:

```text
B1 shell responsive móvil
B2 entrypoint de producto sin demo obligatoria
B3 configuración Supabase TEST por env
B4 capa backend/sesión/roles
B5 request persistido + serviceId
B6 online/matching/aceptación
B7 chat bidireccional realtime
B8 lifecycle + Actividad
B9 cancelación + multi-pedido
B10 cierre + rating
```

Ciclo de aprendizaje:

```text
A demuestra mejora compatible → evaluar/portar a B
B demuestra mejora compatible → evaluar/portar a A
fallo de contrato común        → corregir una vez en backend/maestros
```

Milestone comparable: ambos ejecutan con datos TEST reales `login → pedido → matching → aceptación → chat → lifecycle → completar → rating`, más cancelación selectiva, multi-pedido, reload/reconnect y móvil sin superposición crítica.

## 9. Gates

```text
TWO-DEVICES = BLOCKED
FULL-E2E = BLOCKED
GO-LIVE = BLOCKED
```

Persistencia DB, contratos verdes y APK compilado no sustituyen evidencia física.

UGO B tampoco puede usar mocks o navegación local como sustituto de runtime real para declararse comparable.

## 10. Regla económica transversal

Objetivo: **costo directo $0** mientras los recursos gratuitos verificados lo permitan.

No habilitar gasto o infraestructura paga para acelerar A o B sin autorización explícita. Antes de sumar un servicio externo, verificar pricing/free tier actual y alternativa gratuita. La competencia no justifica duplicar infraestructura.

## 11. Regla final

**El siguiente avance real de UGO A sigue siendo convertir el checkpoint CI VALIDATED en evidencia runtime del mismo SHA, no sumar features. UGO B puede avanzar en paralelo para demostrar una experiencia mejor sobre el mismo contrato TEST; ninguna implementación puede fingir persistencia, frenar a la otra ni crear una segunda realidad UGO.**

No tocar Supabase PROD. No crear ramas. No desplegar web sólo para trazabilidad de QA.


---

## 12. Checkpoint 20/09/2026 · trazabilidad Admin + rating bilateral

Implementado en `main`:

- ficha completa de servicio Admin/Super Admin con cronología, request evidence, evidencia operativa, pagos y calificaciones;
- historial legacy `eventos_servicio` fusionado con `servicio_estado_eventos`;
- ficha completa por usuario con alta, acceso, servicios, documentos y reputación;
- `resenas` permite dos direcciones por servicio mediante `autor_tipo`;
- Cliente mantiene visible la calificación post-servicio sin depender de una pantalla secundaria;
- Proveedor puede calificar al Cliente y el prompt se difiere mientras exista misión activa;
- RLS de ambas direcciones validada con actor Cliente y actor Proveedor sobre servicio completado;
- lectura de historial legacy habilitada a `authenticated` bajo RLS de participante/Admin.

Estado de madurez del bloque:

```text
Backend migration             APPLIED en UGO TEST
RLS bilateral                 VALIDATED con transacciones rollback
UI/código                     IMPLEMENTED en main
Vercel/build                  validar SHA final del bloque
E2E dos dispositivos          pendiente
rating post-servicio real     pendiente
cámara/evidencia física       pendiente
```

Este bloque no elimina los gates TWO-DEVICES / FULL-E2E / GO-LIVE.
