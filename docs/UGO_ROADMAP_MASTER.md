# UGO — Roadmap Master

**Versión:** 3.2 · 16 de septiembre de 2026  
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

Leyenda:

```text
✅ cerrado con evidencia requerida
🟡 implementado/parcial; falta etapa siguiente
🔴 regresión/fallo comprobado
⛔ bloqueo externo/decisión
⬜ pendiente
```

## 2. Snapshot actual

Checkpoint CI VALIDATED que supersede al checkpoint anterior:

```text
53d04bada63e69a3c19212cba206acd585edbd8a
test(provider): align offer recovery contracts
UGO Core CI run 35047491737 → SUCCESS
```

El bloque actual protege además:

- recuperación de matching/cancelación antes de registrar P0;
- radar de proveedores con recuperación ante gaps realtime;
- aislamiento de pedidos A+B+C por `serviceId`;
- Agenda de Proveedor como conjunto completo, separada de la misión accionable;
- `provider.service.advance`, `completeService` y `confirmCash` verifican persistencia antes de P0;
- aceptación de oferta ahora usa recuperación triestado por pedido exacto: persistido = éxito; fallo confirmado = P0; estado no verificable = P1;
- Development público/read-only y Centinela sanitizado siguen bajo contratos CI.

Los E2E autenticados dependientes de credenciales TEST no convierten este checkpoint en `RUNTIME VALIDATED` cuando esas credenciales no están disponibles.

## 3. Evidencia real de Supabase TEST

Snapshot read-only tomado después del checkpoint:

```text
proveedores verificados + online + disponibles: 3
servicios con mensajes persistidos de ambos roles: 1
servicios activos actuales: 0
clientes con 2+ pedidos activos actuales: 0
incidentes públicos Sentinel: 6
runtimeRevision de esos incidentes: NULL / históricos
```

Conclusiones permitidas:

- existe disponibilidad real de proveedores en TEST;
- existe evidencia DB de chat en ambos sentidos para al menos un servicio;
- NO existe evidencia actual A+B+C porque no hay pedidos activos;
- persistencia bidireccional de mensajes NO equivale a convergencia visual realtime en dos sesiones;
- los seis incidentes sin revisión son históricos y no representan el build actual.

## 4. Android TEST

Último artifact generado por un cambio funcional legítimo:

```text
workflow: UGO Android TEST APK
run: 35047317846
commit: c3a414566becb81e90dde5dbec477eb31b8e7ec7
conclusion: success
bundleRuntime: local-dist
environment: TEST
```

Incluye el fix funcional de recovery de aceptación, pero no los contratos/documentación posteriores. Android permanece **NOT READY para evidencia final del HEAD** hasta generar artifact del SHA final exacto.

## 5. P0 inmediato

```text
[✅] Core CI verde en checkpoint funcional 53d04ba…
[🟡] Development público/no-login → arquitectura validada; falta smoke del build final
[🟡] Centinela → recovery crítico protegido; falta smoke del build final
[🟡] Cliente exact order/detail/chat por serviceId → falta prueba dos sesiones
[🟡] chat Cliente ↔ Proveedor realtime → DB bidireccional existe; falta convergencia visual dos sesiones
[🟡] matching no-provider/timeout/retry/cancel → falta runtime E2E
[🟡] multi-pedido A+B+C → protegido por contratos; falta E2E autenticado/físico actual
[🟡] Proveedor estados simples + Agenda → protegido por contratos; falta lifecycle físico
[🟡] Android HEAD exacto → falta artifact del SHA final
[⬜] pagos electrónico/efectivo E2E completo
[⬜] Admin/Super Admin server-side/security final
[⛔] política definitiva saldo/retiro → decisión de producto pendiente
[⬜] seguridad/release producción
```

## 6. Cliente

| Área | Estado | Próximo cierre |
|---|---|---|
| Solicitud guiada | 🟡 | E2E real |
| Matching | 🟡 | sin proveedor + timeout + retry + cancel |
| Proveedores online/cards | 🟡 | comprobar UI con los 3 proveedores TEST online |
| Multi-pedido | 🟡 | A+B+C con IDs reales |
| Actividad/detalle | 🟡 | smoke exact serviceId |
| Cancelación | 🟡 | persistencia + contraparte + A/C intactos |
| Chat | 🟡 | bidireccional visual dos sesiones |
| Tracking/ETA | 🟡 | reconexión/GPS |
| Pago | 🟡 | E2E por método |
| Aprobación/disputa | 🟡 | E2E |

## 7. Proveedor

| Área | Estado | Próximo cierre |
|---|---|---|
| Oportunidades | 🟡 | E2E real |
| Aceptar/rechazar | 🟡 | recovery CI validado; falta runtime |
| En camino/Llegué/Empezar/Listo | 🟡 | lifecycle físico |
| Agenda/calendario | 🟡 | varios trabajos + serviceId exacto |
| Chat | 🟡 | proveedor→cliente visible realtime |
| Evidencia | 🟡 | cámara/Storage/guards reales |
| Pago/efectivo | 🟡 | cierre method-aware |
| Centinela operacional | 🟡 | incident smoke runtime |

## 8. Sentinel / recuperación

Regla obligatoria para mutaciones críticas:

```text
RPC error
→ leer estado persistido exacto
→ cambio persistido = éxito recuperado, sin P0
→ cambio confirmado como ausente = P0
→ estado no verificable = P1
```

Aplica a matching, cancelación, aceptación de oferta, lifecycle, finalización y cobro. Centinela nunca muta ni aprueba `development_checklist`.

## 9. Testing

Orden actual:

```text
1 artifact Android exacto del SHA final
2 smoke Development público + Centinela en TEST
3 E2E Cliente request→matching→asignación
4 chat bidireccional exact serviceId
5 A+B+C + cancelación selectiva
6 Proveedor Agenda + lifecycle
7 pagos/evidencia
8 dos Android físicos
9 responsive/accessibility
10 publicación sólo cuando corresponda
```

## 10. Gates que permanecen bloqueados

No promover sin evidencia:

```text
TWO-DEVICES
FULL-E2E
GO-LIVE
```

Persistencia DB o contratos verdes no sustituyen visualización realtime en ambas sesiones.

## 11. Release

La web publicada puede quedar detrás de `main`. No hacer deploy para sincronización documental ni para sustituir la prueba Android. Publicar sólo cuando exista un bloque funcional que necesite release y registrar revisión exacta + smoke.

## 12. Criterio del primer cliente

Cliente crea A+B+C independientes, matching encuentra o recupera correctamente, Proveedor recibe/acepta, ambos chatean por el mismo `serviceId`, cancelación de B no toca A/C, lifecycle/pago/cierre permanecen aislados y Admin puede observar/resolver sin mezclar pedidos.

## 13. Regla final

**El siguiente gran avance no es sumar features: es convertir el bloque CI VALIDATED en evidencia runtime real Cliente ↔ Proveedor, con Android, Centinela y readiness atribuidos al SHA exacto.**
