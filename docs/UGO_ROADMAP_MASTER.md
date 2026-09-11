# UGO — Roadmap Master

**Versión:** 2.0 · 11 de septiembre de 2026  
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
[ ] npm run build main verificado
[ ] npm run lint verificado
[ ] incorporar runner de tests automatizados
[ ] incorporar E2E ejecutable
[ ] serviceId único Cliente↔Proveedor
[ ] aceptación de oportunidad atómica
[ ] RLS servicios/ofertas/evidencias/pagos/ampliaciones
[ ] guards backend evidencia inicial/final
[ ] pagos electrónico/efectivo method-aware extremo a extremo
[ ] idempotencia efectivo/webhooks/retiros
[ ] autorización Admin/Super server-side
[ ] ledger/comisión para efectivo cuando aplique
[ ] retirar salida operacional Provider legacy
```

Hasta cerrar estos puntos, no convertir P0 en ✅ por mera existencia de código.

---

# 4. Cliente

| Área | Estado | P | Próximo cierre |
|---|---|---:|---|
| Auth/Recovery | 🟡 | P0 | smoke + regresión |
| Onboarding | 🟡 | P1 | validación |
| Home/Radar | 🟡 | P1 | consolidar + smoke |
| Categorías/Búsqueda | 🟡 | P1 | regresión |
| Solicitud | 🟡 | P0 | evidencia integrada |
| Evidencia previa | 🟡 | P0 | draft/request id + RLS + E2E |
| Matching | 🟡 | P1 | error/timeout/alternativas |
| Proveedor seleccionado | 🟡 | P1 | UX consolidada |
| Pago electrónico | 🟡 | P0 | reconciliación + E2E |
| Efectivo | 🟡 | P0 | idempotencia + ledger + E2E |
| Tracking/ETA | 🟡 | P1 | realtime/fallback |
| Servicio activo | 🟡 | P0 | narrativa única |
| Ampliar servicio | 🟡 | P0 | reconciliación method-aware |
| Aprobación/Disputa | 🟡 | P0 | E2E por método |
| Historial/Reputación | 🟡 | P1 | validación integrada |
| Notificaciones | 🟡 | P1 | contrato de eventos |

---

# 5. Proveedor

| Área | Estado | P | Próximo cierre |
|---|---|---:|---|
| Shell nuevo | 🟡 | P0 | smoke + retirar legacy |
| Auth/Onboarding/KYC | 🟡 | P0 | roles/RLS |
| Home | 🟡 | P1 | validar estado/datos |
| Demanda | 🟡 | P1 | fuente analítica independiente |
| Oportunidades | 🟡 | P0 | serviceId + E2E |
| Evidencia cliente | 🟡 | P0 | RLS/E2E |
| Aceptar/Rechazar | 🟡 | P0 | atomicidad/concurrencia |
| Trabajo activo | 🟡 | P0 | guards backend |
| Tracking | 🟡 | P1 | ETA/reconexión |
| Evidencia operacional | 🟡 | P0 | enforcement backend |
| Ampliar servicio | 🟡 | P0 | E2E |
| Efectivo recibido | 🟡 | P0 | idempotencia/ledger |
| Ganancias | 🟡 | P1 | timeline financiero claro |
| Hugo Asistente | 🟡 | P2 | contexto antes/durante/después |
| Provider legacy | ⬜ | P0 | retirar operación |

---

# 6. Admin / Super Admin

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

# 7. Testing inmediato

Orden recomendado:

```text
1 agregar framework de tests
2 tests dominio/RPC
3 tests RLS positivos/negativos
4 E2E solicitud→oportunidad→asignación
5 E2E electrónico
6 E2E efectivo
7 E2E evidencia/ampliación/cierre
8 responsive/accessibility smoke
9 CI/Vercel smoke
```

Scripts objetivo:

```text
npm run build
npm run lint
npm run test
npm run test:e2e
```

---

# 8. UI/UX

Prioridad después de integridad P0:

```text
[ ] Cliente converge a Kinetic Trust
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

# 9. Growth loop

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

# 10. Hugo

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

# 11. Scout

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

# 12. Academia

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

# 13. Monetización

Antes de escalar adquisición, demostrar:

```text
comisión electrónica conciliada
comisión efectivo trazable
retiros seguros
margen conocido
coste por servicio controlado
fuga off-platform medida
```

La escala sin unit economics observables no es éxito.

---

# 14. Roadmap por fases

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

# 15. Criterio MVP exitoso

Cliente puede:

```text
registrarse
→ pedir servicio con evidencia
→ recibir proveedor
→ elegir método/pagar
→ seguir llegada
→ ejecutar con trazabilidad
→ ampliar
→ aprobar/disputar
→ cerrar
→ calificar
```

Proveedor puede aceptar, completar y cobrar. Admin puede resolver excepciones. Permisos, dinero y evidencia están protegidos. E2E y release gates son demostrables.

---

# 16. Qué NO hacer ahora

- crear otra app paralela;
- reescribir todo el frontend;
- sumar features P3 mientras P0 está abierto;
- declarar release sin tests/smoke;
- duplicar estados en UI;
- tratar efectivo como protegido;
- mezclar Demanda con Oportunidades;
- mantener Provider legacy como segunda operación.

---

# 17. Regla final

**El próximo gran avance de UGO no es agregar más cosas: es convertir el circuito que ya existe en un sistema confiable, validado, medible y repetible.**