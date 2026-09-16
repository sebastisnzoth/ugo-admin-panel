# UGO — Roadmap Master

**Versión:** 2.9 · 16 de septiembre de 2026  
**Estado:** tablero maestro vivo de ejecución  
**Rama de verdad:** `main`

> **Un pedido. Un profesional. Sin vueltas.** Primero cerrar y demostrar el circuito real; después ampliar.

## 1. Madurez

```text
IMPLEMENTED
→ CI VALIDATED
→ RUNTIME VALIDATED
→ PUBLISHED
```

Leyenda del roadmap:

```text
✅ cerrado con evidencia requerida
🟡 implementado/parcial; falta etapa siguiente
🔴 regresión/fallo comprobado
⛔ bloqueo externo/decisión
⬜ pendiente
```

## 2. Snapshot 16/09/2026

HEAD inspeccionado antes de esta sincronización:

```text
19c6dcddd2410b063e0d4171cd2178b95da47ef3
fix(sentinel): classify core runtime actions server-side
```

Cambios ya IMPLEMENTED en ese HEAD:

- dashboard Desarrollo sin login;
- feeds públicos sanitizados/read-only;
- tablas readiness privadas protegidas;
- `runtimeRevision` en Centinela;
- separación build actual/histórico;
- cola segura para incidentes anónimos;
- matching/cancel/status Cliente instrumentados;
- operaciones críticas Proveedor instrumentadas;
- clasificación server-side de acciones Centinela;
- retirada del hosting obsoleto del readiness activo.

Core CI del mismo SHA `19c6dc…` terminó **FAILURE** en run `35040842854`, en el bloque de tests/contracts después de pasar TypeScript/build. Estado: **IMPLEMENTED, NO CI VALIDATED**. Corregir/obtener CI verde es P0 inmediato antes de promover esas capacidades.

## 3. P0 inmediato

```text
[🔴] recuperar Core CI verde sobre HEAD actual
[🟡] Development público/no-login → falta CI verde del SHA que lo consolide
[🟡] Centinela runtime → falta CI verde + smoke runtime de build actual
[🟡] Cliente exact order/detail/chat por serviceId → falta prueba dos sesiones
[🟡] chat Proveedor → Cliente realtime → falta prueba física/runtime
[🟡] matching no-provider/timeout/retry/cancel → falta runtime E2E
[🟡] multi-pedido A+B+C → falta E2E autenticado/physical
[🟡] Proveedor estados simples + Agenda → falta lifecycle físico
[⬜] pagos electrónico/efectivo E2E completo
[⬜] Admin/Super Admin server-side/security final
[⛔] política definitiva saldo/retiro → decisión de producto pendiente
[⬜] seguridad/release producción
```

## 4. Cliente

| Área | Estado | Próximo cierre |
|---|---|---|
| Solicitud guiada | 🟡 | E2E real |
| Matching | 🟡 | sin proveedor + timeout + retry + cancel |
| Proveedores online/cards | 🟡 | validar contra datos reales |
| Multi-pedido | 🟡 | A+B+C con IDs reales |
| Actividad/detalle | 🟡 | smoke exact serviceId |
| Cancelación | 🟡 | persistencia + contraparte + A/C intactos |
| Chat | 🟡 | bidireccional dos sesiones |
| Tracking/ETA | 🟡 | reconexión/GPS |
| Pago | 🟡 | E2E por método |
| Aprobación/disputa | 🟡 | E2E |

## 5. Proveedor

| Área | Estado | Próximo cierre |
|---|---|---|
| Oportunidades | 🟡 | E2E real |
| Aceptar/rechazar | 🟡 | CI actual + competencia |
| En camino/Llegué/Empezar/Listo | 🟡 | lifecycle físico |
| Agenda/calendario | 🟡 | varios trabajos + serviceId exacto |
| Chat | 🟡 | proveedor→cliente realtime |
| Evidencia | 🟡 | cámara/Storage/guards reales |
| Pago/efectivo | 🟡 | cierre method-aware |
| Centinela operacional | 🟡 | CI + incident smoke |

## 6. Desarrollo / Centinela

Arquitectura IMPLEMENTED:

```text
landing → Desarrollo
?app=development sin login
→ vistas públicas sanitizadas
→ progreso/checklist/áreas/incidentes
→ realtime signal seguro
```

Centinela IMPLEMENTED:

```text
runtime TEST
→ reporte sanitizado
→ build revision
→ server classification
→ persistencia privada
→ feed público seguro
```

Regla: ningún incidente cambia automáticamente el checklist.

## 7. Testing

Orden:

```text
1 Core CI verde sobre HEAD
2 contracts Development/Centinela
3 E2E Cliente request→matching→asignación
4 chat bidireccional exact serviceId
5 A+B+C + cancelación selectiva
6 Proveedor Agenda + lifecycle
7 pagos/evidencia
8 dos Android físicos
9 responsive/accessibility
10 publicación objetivo + smoke cuando corresponda
```

## 8. Android

El APK TEST debe empaquetar el `dist` del SHA local y usar backend API configurado, no una UI web remota. Cada nuevo artifact debe registrar revisión y pasar instalación/prueba física antes de considerarse RUNTIME VALIDATED.

## 9. Release

La web publicada puede quedar detrás de `main`. No gastar deploys para sincronización documental. Publicar sólo cuando exista un bloque funcional que necesite prueba/release web y registrar revisión exacta + smoke.

## 10. Criterio del primer cliente

Cliente crea uno o más pedidos independientes, matching encuentra o recupera correctamente, Proveedor recibe/acepta, ambos chatean por el mismo servicio, pago habilita ejecución, Proveedor resuelve y marca listo, Cliente aprueba/disputa, Admin puede observar/resolver y ninguna mutación afecta otro pedido.

## 11. Regla final

**El siguiente gran avance no es sumar features: es volver verde el HEAD, demostrar en runtime el circuito Cliente ↔ Proveedor ↔ Admin y mantener Centinela/readiness como evidencia honesta de lo que funciona.**
