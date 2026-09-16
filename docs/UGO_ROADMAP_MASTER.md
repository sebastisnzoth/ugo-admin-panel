# UGO — Roadmap Master

**Versión:** 3.0 · 16 de septiembre de 2026  
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

Checkpoint funcional CI validado:

```text
a633575034dbdaa10d8499b2cbf2a542c646d7b1
test(provider): keep arrival location contract service-scoped
UGO Core CI run 35042238358 → SUCCESS
```

Este checkpoint contiene el bloque funcional acumulado de Development público + Centinela y corrige el único contrato obsoleto que mantenía rojo el Core CI.

Capacidades `CI VALIDATED` en ese checkpoint:

- dashboard Desarrollo sin login;
- feeds públicos sanitizados/read-only;
- tablas readiness privadas protegidas;
- `runtimeRevision` en Centinela;
- separación build actual/histórico;
- cola segura para incidentes anónimos;
- matching/cancel/status Cliente instrumentados;
- operaciones críticas Proveedor instrumentadas;
- clasificación server-side de acciones Centinela;
- llegada de Proveedor conserva publicación GPS service-scoped;
- retirada del hosting obsoleto del readiness activo.

Esto **no** significa `RUNTIME VALIDATED`: ahora el P0 se mueve a demostrar los journeys en TEST y dispositivo.

## 3. P0 inmediato

```text
[✅] Core CI verde sobre checkpoint funcional a633575…
[🟡] Development público/no-login → CI VALIDATED; falta smoke runtime TEST
[🟡] Centinela runtime → CI VALIDATED; falta incident smoke del build actual
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
| Aceptar/rechazar | 🟡 | competencia/runtime |
| En camino/Llegué/Empezar/Listo | 🟡 | lifecycle físico |
| Agenda/calendario | 🟡 | varios trabajos + serviceId exacto |
| Chat | 🟡 | proveedor→cliente realtime |
| Evidencia | 🟡 | cámara/Storage/guards reales |
| Pago/efectivo | 🟡 | cierre method-aware |
| Centinela operacional | 🟡 | incident smoke runtime |

## 6. Desarrollo / Centinela

Arquitectura CI VALIDATED en `a633575…`:

```text
landing → Desarrollo
?app=development sin login
→ vistas públicas sanitizadas
→ progreso/checklist/áreas/incidentes
→ realtime signal seguro
```

Centinela CI VALIDATED en contratos:

```text
runtime TEST
→ reporte sanitizado
→ build revision
→ server classification
→ persistencia privada
→ feed público seguro
```

Regla: ningún incidente cambia automáticamente el checklist.

Siguiente gate: `RUNTIME VALIDATED` mediante smoke del dashboard y captura/reporte real de incidentes en UGO TEST.

## 7. Testing

Orden actualizado:

```text
1 smoke Development público + Centinela en TEST
2 E2E Cliente request→matching→asignación
3 chat bidireccional exact serviceId
4 A+B+C + cancelación selectiva
5 Proveedor Agenda + lifecycle
6 pagos/evidencia
7 dos Android físicos
8 responsive/accessibility
9 publicación objetivo + smoke cuando corresponda
```

## 8. Android

El APK TEST debe empaquetar el `dist` del SHA local y usar backend API configurado, no una UI web remota. Cada nuevo artifact debe registrar revisión y pasar instalación/prueba física antes de considerarse RUNTIME VALIDATED.

## 9. Release

La web publicada puede quedar detrás de `main`. No gastar deploys para sincronización documental. Publicar sólo cuando exista un bloque funcional que necesite prueba/release web y registrar revisión exacta + smoke.

## 10. Criterio del primer cliente

Cliente crea uno o más pedidos independientes, matching encuentra o recupera correctamente, Proveedor recibe/acepta, ambos chatean por el mismo servicio, pago habilita ejecución, Proveedor resuelve y marca listo, Cliente aprueba/disputa, Admin puede observar/resolver y ninguna mutación afecta otro pedido.

## 11. Regla final

**El siguiente gran avance no es sumar features: es convertir el bloque ya CI VALIDATED en evidencia runtime del circuito Cliente ↔ Proveedor ↔ Admin, con Centinela/readiness reflejando exactamente lo que ocurre.**
