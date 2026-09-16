# UGO — Roadmap Master

**Versión:** 3.3 · 16 de septiembre de 2026  
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

## 7. Orden de ejecución

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

## 8. Gates

```text
TWO-DEVICES = BLOCKED
FULL-E2E = BLOCKED
GO-LIVE = BLOCKED
```

Persistencia DB, contratos verdes y APK compilado no sustituyen evidencia física.

## 9. Regla final

**El siguiente avance real es convertir el checkpoint CI VALIDATED en evidencia runtime del mismo SHA, no sumar features.**

No tocar Supabase PROD. No crear ramas. No desplegar web sólo para trazabilidad de QA.
