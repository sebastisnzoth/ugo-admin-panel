# UGO — Roadmap Master

**Versión:** 2.7 · 11 de septiembre de 2026  
**Estado:** tablero maestro vivo de ejecución  
**Rama de verdad:** `main`

> `IMPLEMENTED ≠ VALIDATED ≠ RELEASED`. UGO primero cierra el circuito principal y después amplía el ecosistema.

---

# 1. North Star

**Servicios confiables completados dentro de UGO.**

```text
Necesidad → solicitud → matching → asignación
→ método de pago → ejecución → evidencia
→ aprobación/disputa → cobro → reputación → repetición
```

Métricas: time-to-match, acceptance/completion rate, cancelación/disputa, repetición, GMV/take rate, liquidez proveedor, CSAT/NPS.

---

# 2. Estados

```text
✅ HECHO      integrado + validación aplicable satisfecha
🟡 PARCIAL   existe pero falta validación/cierre
⬜ PENDIENTE no implementado/cerrado
⛔ BLOQUEADO dependencia externa/decisión
```

Prioridad: P0 integridad/auth/permisos/dinero/core; P1 operación/UX; P2 inteligencia; P3 expansión/polish.

---

# 3. P0 — cerrar antes de expandir

```text
[x] build integrado en Core CI
[x] lint crítico/general integrado
[x] npm test disponible
[ ] tests RPC/RLS contra base aislada
[ ] npm run test:e2e
[ ] serviceId Cliente↔Proveedor validado E2E
[x] aceptación de oportunidad atómica
[ ] RLS sensible completamente validada
[x] guards evidencia inicial/final/temporal
[x] guard ampliación sin financiación
[x] checkout/reconciliación delta electrónico implementado
[ ] E2E/idempotencia/reembolso delta electrónico
[ ] pagos electrónico/efectivo E2E
[ ] idempotencia webhooks/efectivo/retiros completa
[ ] Admin/Super server-side completamente validado
[ ] ledger/comisión efectivo
[ ] Provider legacy fuera de operación y smoke cerrado
[ ] deploy production estable + smoke demostrable
```

---

# 4. Snapshot de conciencia · 11/09/2026

## Bloque A — solicitud → asignación → pago

Cerrado a nivel de implementación:

```text
solicitud guiada Hugo + evidencia
→ matching proveedores online/disponibles
→ oferta con tarifa real
→ aceptación atómica
→ tarifa/comisión/neto
→ elección de método
→ método bloqueado salvo fallo
→ viaje sólo con forma de pago válida
```

Producción fue verificada con 0 servicios asignados sin tarifa válida y 0 ofertas pendientes sin tarifa válida al cierre de ese bloque.

## Bloque B — viaje → llegada → inicio

```text
asignado + pago listo
→ en_camino → tracking
→ proximidad 200 m cuando aplica
→ llegado → Foto Antes
→ en_progreso
```

UI/backend alineados y guard temporal de evidencia aplicado en producción. Falta E2E GPS real.

## Bloque C — ampliación → cierre

Implementado:

```text
ampliación con costo electrónico
→ checkout de delta separado
→ webhook monto/moneda
→ RPC idempotente
→ incorpora delta/comisión/neto
→ aprobada + incluido
```

No muta pago base. Retry/reembolso están modelados. Estado: **IMPLEMENTED, falta VALIDATED E2E**.

## Bloque D — red automatizada mínima

`npm test` cubre 6 contratos core: llegada, evidencia, efectivo, delta electrónico y ownership de review. No reemplaza RPC/RLS/E2E.

## Bloque E — Panel de control · Integraciones

Auditoría realizada sobre `main`, Supabase producción y Vercel:

### Panel Admin

`Configuración → Sistema` ahora distingue:

```text
General
Reglas de negocio
Medios de pago
Credenciales de pago
Integraciones
Estado técnico
```

La nueva pestaña **Integraciones** consulta `api/admin/integrations-status.ts` con sesión Admin y muestra metadata segura del runtime, sin exponer secretos.

### Hallazgos

- Supabase es el core persistente real.
- La bóveda `private.payment_credentials` tenía **0 filas** al control.
- `AdminPaymentCredentials` podía guardar credenciales privadas, pero los adapters de pago productivos siguen leyendo variables de entorno. Por lo tanto “guardada en panel” no equivale a “usada en runtime”.
- `admin_payment_credentials_status()` tenía una dependencia no portable (`jsonb_object_length`) detectada durante la auditoría. Fue corregida y aplicada en producción con `20260911230000_admin_payment_credentials_status_fix.sql`.
- Mercado Pago BR runtime: `MERCADO_PAGO_ACCESS_TOKEN`.
- Pix direto: `UGO_PIX_KEY`.
- OpenPix: sandbox + feature flag; no libera fondos reales.
- Mercado Pago AR: declarado pero bloqueado por router en la fase actual.
- Hugo Voice: `OPENAI_API_KEY` server-side.
- WhatsApp Cloud API: token + phone ID server-side; bandeja Admin real.
- Mapas actuales: MapLibre + OSM; routing Haversine por defecto / OSRM opcional.
- Vercel production más reciente observado estaba `ERROR` en commit `61872b20`; causa: tipos `@vercel/node` no resolubles para funciones TS.
- `main` ya contiene el fix local `api/vercel-node.d.ts` (`2bef4d97`). Falta demostrar deployment posterior `READY` + smoke.
- Había un production deployment anterior `READY` en commit `555daf48`, rollback candidate.

### CI del bloque

Run `#260`, head `efec5f26`:

```text
audit     ✅ 0 vulnerabilidades
build     ✅
npm test  ✅ 6/6
lint      ❌ versiones anteriores de AdminPaymentCredentials/AdminSystemSettings
```

Esos errores de lint fueron corregidos posteriormente en `main`. Falta un CI nuevo sobre el HEAD actual; no marcar verde por extrapolación.

### Riesgo visible

```text
credencial guardada
≠ runtime configurado
≠ feature habilitada
≠ proveedor externo saludable
≠ E2E validado
```

Próximo cierre: validar CI actual, deployment Vercel READY, smoke Admin/endpoint y después unificar resolución server-side de credenciales si el panel será fuente operativa de configuración.

---

# 5. Cliente

| Área | Estado | P | Próximo cierre |
|---|---|---:|---|
| Auth/Recovery | 🟡 | P0 | smoke + regresión |
| Onboarding | 🟡 | P1 | validación |
| Home/Radar | 🟡 | P1 | smoke |
| Categorías/Búsqueda | 🟡 | P1 | regresión |
| Solicitud guiada Hugo | 🟡 | P0 | E2E |
| Evidencia previa | 🟡 | P0 | E2E request→service |
| Matching | 🟡 | P1 | timeout/recovery |
| Pago electrónico | 🟡 | P0 | E2E |
| Efectivo | 🟡 | P0 | ledger + E2E |
| Lock método pago | ✅ | P0 | regresiones |
| Tracking/ETA | 🟡 | P1 | reconexión/fallback |
| Llegada | 🟡 | P1 | E2E GPS |
| Servicio activo | 🟡 | P0 | narrativa única |
| Ampliar servicio | 🟡 | P0 | E2E delta/reembolso/retry |
| Aprobación/Disputa | 🟡 | P0 | E2E por método |
| Historial/Reputación | 🟡 | P1 | validación integrada |

---

# 6. Proveedor

| Área | Estado | P | Próximo cierre |
|---|---|---:|---|
| Shell nuevo | 🟡 | P0 | smoke + legacy fuera |
| Auth/Onboarding/KYC | 🟡 | P0 | roles/RLS |
| Home | 🟡 | P1 | datos/estado |
| Demanda | 🟡 | P1 | fuente analítica |
| Oportunidades | 🟡 | P0 | E2E |
| Aceptar/Rechazar | ✅ | P0 | E2E competitivo |
| Tarifa al asignar | ✅ | P0 | monitoreo |
| Trabajo activo | 🟡 | P0 | E2E lifecycle |
| Tracking | 🟡 | P1 | ETA/reconexión |
| Radio 200 m | ✅ | P1 | E2E GPS |
| Evidencia por estado | ✅ | P0 | E2E positivo/negativo |
| Ampliar servicio | 🟡 | P0 | convergencia E2E |
| Efectivo recibido | 🟡 | P0 | ledger + E2E |
| Hugo Asistente | 🟡 | P2 | contexto completo |

---

# 7. Admin / Super Admin

| Área | Estado | P | Próximo cierre |
|---|---|---:|---|
| AdminGate/Auth | 🟡 | P0 | server-side/RLS E2E |
| Operaciones | 🟡 | P1 | excepciones accionables |
| Personas/KYC | 🟡 | P1 | permisos/auditoría |
| Finanzas/Retiros | 🟡 | P0 | idempotencia/conciliación |
| Disputas | 🟡 | P0 | resolución method-aware |
| Roles/feature flags | 🟡 | P0 | enforcement real |
| Credenciales privadas | 🟡 | P1 | bóveda existe; falta runtime resolver unificado |
| Integraciones runtime | 🟡 | P0 | endpoint seguro listo; falta CI/deploy/smoke |
| Estado técnico | 🟡 | P1 | no confundir navegador con backend |
| Auditoría crítica | 🟡 | P0 | trail consistente |
| Reportes/Scout | 🟡 | P2 | métricas/recomendaciones |
| Super Admin | 🟡 | P1 | separación operación/config |

---

# 8. Testing inmediato

Orden:

```text
1 validar CI sobre HEAD actual
2 Vercel production READY + smoke
3 test positivo/negativo /api/admin/integrations-status
4 tests RPC/RLS aislados
5 E2E solicitud→asignación
6 E2E pago electrónico base
7 E2E delta ampliación
8 E2E efectivo
9 E2E llegada/evidencia/cierre
10 responsive/accessibility
```

Casos Admin/integraciones inmediatos:

```text
anon → integrations-status 401
sesión inválida → 401
cliente/proveedor → 403
admin activo → metadata sin secretos
bóveda vacía → UI no inventa credencial
credencial almacenada ≠ runtime activo
Mercado Pago AR → no mostrar operativo
Vercel deployment fallido → no declarar release
```

---

# 9. UI/UX

Después de integridad P0:

```text
[ ] Cliente converge completamente al journey Hugo
[ ] Proveedor sin salida legacy
[ ] Admin/Super Admin converge
[ ] loading/empty/error/offline consistentes
[ ] mobile 360–430
[ ] desktop real
[ ] accesibilidad AA crítica
```

---

# 10. Growth / Hugo / Scout / Academia

No desplazar P0 abiertos. Cuando el core sea demostrable:

```text
mejor matching → completion → reputación/datos → confianza
→ repetición → más proveedores → menor time-to-match
```

Hugo debe reducir errores y fricción; Scout cerrar `Dato → interpretación → recomendación → acción → resultado`; Academia queda P3 salvo impacto directo en calidad P0/P1.

---

# 11. Monetización

Antes de escalar:

```text
comisión electrónica conciliada
comisión efectivo trazable
ampliaciones financiadas
retiros seguros
margen conocido
coste por servicio medido
fuga off-platform medida
```

---

# 12. Fases

- **A Core confiable:** integridad, pagos, permisos, serviceId, evidencia, integraciones, E2E.
- **B Operación excelente:** tracking, notificaciones, Admin, recuperación.
- **C Retención/eficiencia:** reputación, repetición, Hugo, matching, métricas.
- **D Inteligencia/expansión:** Scout avanzado, Academia, ciudades/categorías.

No saltar fase dejando P0 crítico abierto.

---

# 13. Criterio MVP exitoso

Cliente pide/paga/sigue/amplía/aprueba; Proveedor acepta/ejecuta/evidencia/cobra; Admin resuelve excepciones y observa integraciones reales. Permisos, dinero, evidencia y secretos están protegidos. CI, deploy y smoke son demostrables.

---

# 14. Regla de conciencia continua

```text
código/migración
→ validación
→ maestros afectados
→ Roadmap
→ próximo riesgo visible
```

---

# 15. Regla final

**El próximo gran avance de UGO es convertir el circuito ya existente —incluidas sus integraciones— en un sistema confiable, validado, medible, repetible y observable.**