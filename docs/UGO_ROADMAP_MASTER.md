# UGO — Roadmap Master

**Versión:** 2.6 · 11 de septiembre de 2026  
**Estado:** tablero maestro vivo de ejecución  
**Rama de verdad:** `main`

> El Roadmap registra prioridad y madurez real. `IMPLEMENTED ≠ VALIDATED ≠ RELEASED`. UGO primero cierra el circuito principal y después amplía el ecosistema.

---

# 1. North Star

**Servicios confiables completados dentro de UGO.**

Circuito:

```text
Necesidad → solicitud → matching → asignación
→ método de pago → ejecución → evidencia
→ aprobación/disputa → cobro → reputación → repetición
```

Métricas:

```text
time-to-match
acceptance rate
completion rate
cancelación/disputa
repetición
GMV/take rate
liquidez proveedor
CSAT/NPS
```

---

# 2. Estados

```text
✅ HECHO      integrado + validación aplicable satisfecha
🟡 PARCIAL   existe pero falta validación/cierre
⬜ PENDIENTE no implementado/cerrado
⛔ BLOQUEADO dependencia externa/decisión
```

Prioridad:

```text
P0 integridad/auth/permisos/dinero/serviceId/core
P1 operación/conversión/UX crítica
P2 inteligencia/optimización/automatización
P3 expansión/polish
```

---

# 3. P0 — cerrar antes de expandir

```text
[x] npm run build integrado en Core CI
[x] npm run lint crítico/general integrado en Core CI
[x] runner de tests automatizados incorporado: npm test
[ ] tests ejecutables de RPC/RLS contra base aislada
[ ] incorporar E2E ejecutable: npm run test:e2e
[ ] serviceId único Cliente↔Proveedor completamente validado E2E
[x] aceptación de oportunidad atómica endurecida backend
[ ] RLS servicios/ofertas/evidencias/pagos/ampliaciones completamente validada
[x] guards backend evidencia inicial/final implementados
[x] guard temporal de tipo de evidencia implementado backend
[x] guard de ampliación sin financiamiento implementado backend
[x] checkout/reconciliación de delta electrónico implementado
[ ] validar E2E/idempotencia/reembolso del delta electrónico
[ ] pagos electrónico/efectivo method-aware extremo a extremo validado E2E
[ ] idempotencia efectivo/webhooks/retiros cerrada completa
[ ] autorización Admin/Super server-side cerrada completa
[ ] ledger/comisión para efectivo cuando aplique
[ ] retirar salida operacional Provider legacy
```

Hasta cerrar estos puntos, no convertir P0 en ✅ por mera existencia de código.

---

# 4. Snapshot de conciencia · 11/09/2026

## Bloque A — solicitud → asignación → método de pago

```text
Solicitud guiada por Hugo
→ evidencia previa obligatoria
→ matching sólo con proveedores online/disponibles
→ oferta con tarifa real
→ aceptación atómica
→ asignación con tarifa/comisión/neto consistentes
→ Cliente elige método de pago
→ método queda bloqueado salvo pago fallido
→ Pix/electrónico o efectivo explícito
→ Proveedor habilitado para avanzar sólo con forma de pago válida
```

Cierres relevantes:

- `20260911213500_payment_ready_offer_tariff.sql`: oferta/asignación operable exige tarifa real; no inventa precio.
- `20260911214500_payment_method_lock.sql`: no cambia arbitrariamente método después de elegirlo; pago fallido permite recuperación.
- `ClientPaymentChoice.tsx`: UI alineada con lock backend.
- aceptación serializada/atómica por servicio.
- cash first-class: selección cliente + confirmación proveedor sin fingir custodia electrónica.

Integridad verificada en producción:

```text
servicios asignados sin tarifa válida = 0
ofertas pendientes sin tarifa válida = 0
```

## Bloque B — en camino → llegada → inicio

```text
asignado + forma de pago válida
→ en_camino
→ tracking proveedor
→ proximidad de llegada cuando existe ubicación cliente
→ llegado
→ foto Antes obligatoria
→ en_progreso
```

Cierres:

- radio de llegada UI/backend alineado en **200 m**;
- `ProviderActiveJob` explica validación de llegada;
- `ProviderEvidencePanel` ofrece sólo evidencia compatible con estado;
- `20260911215500_service_evidence_state_guard.sql` impide pre-cargar una foto `Después` antes de iniciar;
- backend: `Antes` sólo en `llegado`, `Durante`/`Después` en `en_progreso`, `Después` en `esperando_aprobacion` sólo para recuperación histórica;
- producción sin servicios actuales `llegado`/`esperando_aprobacion` faltantes de evidencia requerida para su estado al momento del control.

La migración está aplicada en Supabase producción.

## Bloque C — ampliación → cierre → aprobación

Estado implementado:

- `ClientCompletionReview` queda limitado al cliente autenticado y a evidencia final del proveedor asignado;
- `20260911222000_service_expansion_payment_guard.sql` mantiene el bloqueo preventivo ante alcance extra no financiado;
- `20260911224500_expansion_electronic_checkout.sql` está aplicada en Supabase producción;
- la ampliación electrónica usa checkout separado: no muta el pago base protegido;
- `api/pagos/ajuste-ampliacion.ts` valida cliente, servicio, pago base y crea/reutiliza checkout con referencia/idempotencia propia;
- `api/pagos/webhook.ts` reconoce `ampliacion_id`/`exp:<id>`, valida monto y moneda y llama `confirmar_pago_ampliacion`;
- `confirmar_pago_ampliacion` incorpora delta/comisión/neto una sola vez y recién entonces deja `aprobada + incluido`;
- pago adicional fallido mantiene la ampliación pendiente para retry;
- reembolso posterior marca `pendiente_ajuste` y el guard impide cerrar normalmente hasta conciliación;
- `ServiceExpansionPanel` cambió de “bloqueo sin salida” a `Pagar y aprobar / Continuar pago`.

Estado de madurez: **IMPLEMENTED, no todavía VALIDATED E2E**.

Riesgo P0 visible:

```text
checkout delta
→ webhook real Mercado Pago
→ retry / webhook duplicado / reembolso
→ RPC idempotente bajo ejecución real
→ Cliente y Proveedor convergen por Realtime
```

## Bloque D — red automatizada de contratos

Implementado:

```text
npm test
→ Node test runner nativo
→ tests/contracts/core-lifecycle.test.mjs
```

Cobertura actual:

```text
radio llegada UI/backend = 200 m
evidencia operacional ligada al lifecycle
guards Antes/Después para iniciar/finalizar
efectivo presencial no se confunde con custodia electrónica
checkout electrónico separado para ampliaciones
idempotency/external_reference del delta
webhook llama confirmar_pago_ampliacion
RPC valida monto y sólo entonces incorpora delta
review del cliente respeta ownership y proveedor asignado
```

`UGO Core CI` incluye `npm test` entre build y lint crítico. Esto no reemplaza pruebas RPC/RLS ni E2E.

Próximo recorrido principal:

```text
en_progreso
→ ampliación opcional financiada si tiene costo
→ evidencia Después
→ efectivo recibido o electrónico protegido
→ esperando_aprobacion
→ aprobación/disputa
→ completado
→ reputación/historial
```

---

# 5. Cliente

| Área | Estado | P | Próximo cierre |
|---|---|---:|---|
| Auth/Recovery | 🟡 | P0 | smoke + regresión |
| Onboarding | 🟡 | P1 | validación |
| Home/Radar | 🟡 | P1 | consolidar + smoke |
| Categorías/Búsqueda | 🟡 | P1 | regresión |
| Solicitud guiada por Hugo | 🟡 | P0 | consolidar ruta canónica + E2E |
| Evidencia previa | 🟡 | P0 | E2E request→service |
| Matching | 🟡 | P1 | timeout/alternativas/recovery |
| Proveedor seleccionado | 🟡 | P1 | integrar selección directa al flujo canónico |
| Pago electrónico | 🟡 | P0 | reconciliación + E2E |
| Efectivo | 🟡 | P0 | ledger + E2E |
| Lock de método de pago | ✅ | P0 | monitorear regresiones |
| Tracking/ETA | 🟡 | P1 | E2E/reconexión/fallback |
| Llegada proveedor | 🟡 | P1 | validar E2E radio/ubicación |
| Servicio activo | 🟡 | P0 | narrativa única |
| Ampliar servicio | 🟡 | P0 | checkout delta implementado; falta E2E real/reembolso/retry |
| Aprobación/Disputa | 🟡 | P0 | ownership endurecido; falta E2E por método |
| Historial/Reputación | 🟡 | P1 | validación integrada |
| Notificaciones | 🟡 | P1 | contrato de eventos |

---

# 6. Proveedor

| Área | Estado | P | Próximo cierre |
|---|---|---:|---|
| Shell nuevo | 🟡 | P0 | smoke + retirar legacy |
| Auth/Onboarding/KYC | 🟡 | P0 | roles/RLS |
| Home | 🟡 | P1 | validar estado/datos |
| Demanda | 🟡 | P1 | fuente analítica independiente |
| Oportunidades | 🟡 | P0 | E2E |
| Evidencia cliente | 🟡 | P0 | RLS/E2E |
| Aceptar/Rechazar | ✅ | P0 | atomicidad backend cerrada; falta E2E competitivo |
| Tarifa al asignar | ✅ | P0 | backend + datos producción consistentes |
| Trabajo activo | 🟡 | P0 | E2E lifecycle completo |
| Tracking | 🟡 | P1 | ETA/reconexión |
| Radio de llegada 200 m | ✅ | P1 | contrato UI/backend alineado; falta E2E GPS |
| Evidencia operacional por estado | ✅ | P0 | guard backend + UI alineada; falta E2E negativo/positivo |
| Ampliar servicio | 🟡 | P0 | delta checkout implementado; falta convergencia E2E |
| Efectivo recibido | 🟡 | P0 | ledger + E2E |
| Ganancias | 🟡 | P1 | timeline financiero claro |
| Hugo Asistente | 🟡 | P2 | contexto antes/durante/después |
| Provider legacy | ⬜ | P0 | retirar operación |

---

# 7. Admin / Super Admin

| Área | Estado | P | Próximo cierre |
|---|---|---:|---|
| AdminGate/Auth | 🟡 | P0 | server-side/RLS |
| Operaciones | 🟡 | P1 | excepciones accionables |
| Personas/KYC | 🟡 | P1 | permisos/auditoría |
| Finanzas/Retiros | 🟡 | P0 | idempotencia/conciliación |
| Disputas | 🟡 | P0 | resolución method-aware |
| Roles/feature flags | 🟡 | P0 | enforcement real |
| Auditoría crítica | 🟡 | P0 | trail consistente |
| Reportes | 🟡 | P2 | métricas North Star |
| Scout | 🟡 | P2 | recomendaciones accionables |
| Super Admin | 🟡 | P1 | separación operación/config |

---

# 8. Testing inmediato

Orden recomendado actualizado:

```text
1 ✅ test runner base + contract tests
2 tests RPC/dominio contra entorno aislado
3 tests RLS positivos/negativos
4 E2E solicitud→oportunidad→asignación
5 E2E electrónico base
6 E2E ampliación electrónica: checkout→webhook→RPC→Realtime
7 E2E efectivo
8 E2E llegada/evidencia Antes/inicio
9 E2E evidencia Después/cierre
10 responsive/accessibility smoke
11 CI/Vercel smoke
```

Casos P0/P1 inmediatos:

```text
>200 m con ubicación cliente → llegada rechazada
<=200 m → llegada permitida
llegado sin Antes → inicio rechazado
Antes fuera de llegado → insert rechazado
Después antes de en_progreso → insert rechazado
llegado + Antes → inicio permitido
cliente A no puede aprobar servicio de cliente B
foto Después de otro usuario no habilita aprobación
sin pago confirmado → aprobación deshabilitada/rechazada
pago electrónico activo + ampliación con costo → checkout delta separado
checkout adicional approved monto correcto → una sola incorporación
checkout adicional monto/moneda incorrectos → no incorporar
webhook adicional duplicado → sin doble incremento
ajuste reembolsado → revisión bloqueada
ampliación histórica pendiente_ajuste → revisión bloqueada
efectivo pendiente + ampliación → total consistente en servicio y pago
```

Scripts:

```text
npm run build
npm run lint
npm run test       # ya existe
npm run test:e2e   # pendiente
```

---

# 9. UI/UX

Prioridad después de integridad P0:

```text
[ ] Cliente converge a solicitud canónica guiada por Hugo
[ ] Proveedor converge sin legacy
[ ] Admin/Super Admin converge
[ ] eliminar overlays competitivos
[ ] estados loading/empty/error/offline consistentes
[ ] mobile 360–430
[ ] desktop real
[ ] accesibilidad AA crítica
```

No rediseñar flujos ya correctos sólo por estética.

---

# 10. Growth loop

Una vez cerrado el core:

```text
mejor matching
→ más servicios completados
→ más reputación/datos
→ mejor confianza
→ más repetición
→ más proveedores atractivos
→ menor time-to-match
```

Priorizar crecimiento que refuerce este loop.

---

# 11. Hugo

P1/P2 sólo después de core estable.

Cliente:

```text
mejor solicitud
preparación
soporte contextual
```

Proveedor:

```text
checklist
seguridad
diagnóstico
ampliación
evidencia
cierre
aprendizaje
```

Medir reducción de errores y mejora de completion rate.

---

# 12. Scout

P2:

```text
demanda real
cobertura
conversiones
gaps de proveedor
cancelación/disputa
calidad
liquidez
alertas accionables
```

Scout debe cerrar el loop:

`Dato → interpretación → recomendación → acción → resultado`.

---

# 13. Academia

P3 por defecto, salvo que resuelva un P0/P1 de calidad.

```text
gap
→ formación
→ evaluación
→ certificación/progreso
→ mejores resultados
→ nueva medición
```

---

# 14. Monetización

Antes de escalar adquisición, demostrar:

```text
comisión electrónica conciliada
comisión efectivo trazable
ampliaciones con costo financiadas/reconciliadas
retiros seguros
margen conocido
coste por servicio controlado
fuga off-platform medida
```

La escala sin unit economics observables no es éxito.

---

# 15. Roadmap por fases

## Fase A — Core confiable

P0 de integridad, pagos, permisos, serviceId, evidencia y E2E.

## Fase B — Operación excelente

Tracking, notificaciones, UX consolidada, Admin operacional, recuperación.

## Fase C — Retención y eficiencia

Reputación, repetición, Hugo útil, optimización matching, métricas.

## Fase D — Inteligencia y expansión

Scout avanzado, Academia, nuevas categorías/ciudades, automatización y growth.

No saltar de fase dejando P0 crítico abierto.

---

# 16. Criterio MVP exitoso

Cliente puede:

```text
registrarse
→ pedir servicio con evidencia
→ recibir proveedor
→ elegir método/pagar
→ seguir llegada
→ ejecutar con trazabilidad
→ ampliar sin crear deuda financiera oculta
→ aprobar/disputar
→ cerrar
→ calificar
```

Proveedor puede aceptar, completar y cobrar. Admin puede resolver excepciones. Permisos, dinero y evidencia están protegidos. E2E y release gates son demostrables.

---

# 17. Qué NO hacer ahora

- crear otra app paralela;
- reescribir todo el frontend;
- sumar features P3 mientras P0 está abierto;
- declarar release sin tests/smoke;
- duplicar estados en UI;
- tratar efectivo como protegido;
- aprobar alcance extra con costo no financiado;
- confundir contract tests con E2E;
- mezclar Demanda con Oportunidades;
- mantener Provider legacy como segunda operación.

---

# 18. Regla de conciencia continua

Después de cada bloque relevante de implementación:

```text
actualizar código
→ validar lo que corresponda
→ actualizar maestros afectados
→ actualizar este Roadmap
→ dejar visible el próximo riesgo
```

El Roadmap debe permitir entender la realidad de UGO sin depender de memoria de conversación ni de reconstruir commits históricos.

---

# 19. Regla final

**El próximo gran avance de UGO no es agregar más cosas: es convertir el circuito que ya existe en un sistema confiable, validado, medible, repetible y documentado al mismo ritmo que evoluciona.**