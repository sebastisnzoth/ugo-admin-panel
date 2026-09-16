# UGO — Roadmap Master

**Versión:** 3.1 · 16 de septiembre de 2026  
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

HEAD CI VALIDATED:

```text
51561b8aa632d74b755e8072a00d59e415097fae
test(client): align cancellation recovery contract
UGO Core CI run 35046419173 → SUCCESS
```

El bloque actual protege además:

- recuperación de matching/cancelación antes de registrar P0;
- radar de proveedores con recuperación ante gaps realtime;
- aislamiento de pedidos A+B+C por `serviceId`;
- Agenda de Proveedor como conjunto completo, separada de la misión accionable;
- `provider.service.advance`, `completeService` y `confirmCash` verifican persistencia antes de P0;
- Development público/read-only y Centinela sanitizado siguen bajo contratos CI.

Los E2E autenticados dependientes de credenciales TEST no convierten este checkpoint en `RUNTIME VALIDATED` cuando esas credenciales no están disponibles.

## 3. Android TEST

Último artifact de runtime verificado:

```text
workflow: UGO Android TEST APK
run: 35044762155
commit: 8c0123bd9d221ec6d09a4cd2f4a83f6a2ed9d800
conclusion: success
artifact: ugo-android-test-apk
artifact id: 10425674680
bundleRuntime: local-dist
environment: TEST
APK SHA-256: 329f74e50217f13d92322dba103513c86170a0bca5bfc30fc93fe389674e3df4
```

`8c0123b…` es el último cambio de runtime Cliente incluido en APK. Después entraron clasificación server-side y tests/contratos. Como el artifact no corresponde al HEAD exacto `51561b8…`, Android permanece **NOT READY para evidencia final del HEAD**, aunque el artifact sea válido para smoke del runtime `8c0123b…`.

No alterar código sólo para disparar un build. Generar nuevo artifact cuando el workflow pueda ejecutarse para el SHA objetivo o cuando exista un cambio runtime legítimo.

## 4. P0 inmediato

```text
[✅] Core CI verde en HEAD 51561b8…
[🟡] Development público/no-login → CI VALIDATED; falta smoke runtime TEST
[🟡] Centinela → CI VALIDATED; falta incident smoke del build actual
[🟡] Cliente exact order/detail/chat por serviceId → falta prueba dos sesiones
[🟡] chat Cliente ↔ Proveedor realtime → falta convergencia visual dos sesiones
[🟡] matching no-provider/timeout/retry/cancel → falta runtime E2E
[🟡] multi-pedido A+B+C → protegido por contratos; falta E2E autenticado/físico
[🟡] Proveedor estados simples + Agenda → protegido por contratos; falta lifecycle físico
[🟡] Android HEAD exacto → falta artifact del SHA actual
[⬜] pagos electrónico/efectivo E2E completo
[⬜] Admin/Super Admin server-side/security final
[⛔] política definitiva saldo/retiro → decisión de producto pendiente
[⬜] seguridad/release producción
```

## 5. Cliente

| Área | Estado | Próximo cierre |
|---|---|---|
| Solicitud guiada | 🟡 | E2E real |
| Matching | 🟡 | sin proveedor + timeout + retry + cancel |
| Proveedores online/cards | 🟡 | validar contra datos TEST reales |
| Multi-pedido | 🟡 | A+B+C con IDs reales |
| Actividad/detalle | 🟡 | smoke exact serviceId |
| Cancelación | 🟡 | persistencia + contraparte + A/C intactos |
| Chat | 🟡 | bidireccional dos sesiones |
| Tracking/ETA | 🟡 | reconexión/GPS |
| Pago | 🟡 | E2E por método |
| Aprobación/disputa | 🟡 | E2E |

## 6. Proveedor

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

## 7. Sentinel / recuperación

Regla obligatoria para mutaciones críticas:

```text
RPC error
→ leer estado persistido exacto
→ cambio persistido = éxito recuperado, sin P0
→ cambio confirmado como ausente = P0
→ estado no verificable = P1
```

No reportar P0 por transporte perdido si Supabase ya aplicó la mutación.

Centinela nunca muta ni aprueba `development_checklist`.

## 8. Testing

Orden actual:

```text
1 artifact Android exacto del SHA objetivo
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

## 9. Gates que permanecen bloqueados

No promover sin evidencia:

```text
TWO-DEVICES
FULL-E2E
GO-LIVE
```

Persistencia DB o contratos verdes no sustituyen visualización realtime en ambas sesiones.

## 10. Release

La web publicada puede quedar detrás de `main`. No hacer deploy para sincronización documental ni para sustituir la prueba Android. Publicar sólo cuando exista un bloque funcional que necesite release y registrar revisión exacta + smoke.

## 11. Criterio del primer cliente

Cliente crea A+B+C independientes, matching encuentra o recupera correctamente, Proveedor recibe/acepta, ambos chatean por el mismo `serviceId`, cancelación de B no toca A/C, lifecycle/pago/cierre permanecen aislados y Admin puede observar/resolver sin mezclar pedidos.

## 12. Regla final

**El siguiente gran avance no es sumar features: es convertir el bloque CI VALIDATED en evidencia runtime real Cliente ↔ Proveedor, con Android, Centinela y readiness atribuidos al SHA exacto.**
