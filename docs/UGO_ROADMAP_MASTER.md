# UGO — Roadmap Master

**Versión:** 2.8 · 13 de septiembre de 2026  
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

# 4. Snapshot de conciencia

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

UI/backend alineados y guard temporal de evidencia aplicado. Falta E2E GPS real.

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

`npm test` cubre contratos core de llegada, evidencia, efectivo, delta electrónico, ownership de review y lifecycle Cliente↔Proveedor. No reemplaza RPC/RLS/E2E.

## Bloque E — Panel de control · Integraciones

Auditoría realizada sobre `main`, Supabase producción y Vercel.

### Panel Admin

`Configuración → Sistema` distingue:

```text
General
Reglas de negocio
Medios de pago
Credenciales de pago
Integraciones
Estado técnico
```

La pestaña **Integraciones** consulta `api/admin/integrations-status.ts` con sesión Admin y muestra metadata segura del runtime, sin exponer secretos.

### Hallazgos

- Supabase es el core persistente real.
- La bóveda `private.payment_credentials` tenía **0 filas** al control registrado.
- `AdminPaymentCredentials` puede guardar credenciales privadas, pero los adapters productivos siguen leyendo variables de entorno; “guardada en panel” no equivale a “usada en runtime”.
- `admin_payment_credentials_status()` tuvo una dependencia no portable corregida con `20260911230000_admin_payment_credentials_status_fix.sql`.
- Mercado Pago BR runtime: `MERCADO_PAGO_ACCESS_TOKEN`.
- Pix direto: `UGO_PIX_KEY`.
- OpenPix: sandbox + feature flag; no libera fondos reales.
- Mercado Pago AR: declarado pero bloqueado por router en la fase actual.
- Hugo Voice: `OPENAI_API_KEY` server-side.
- WhatsApp Cloud API: token + phone ID server-side; bandeja Admin real.
- Mapas actuales: MapLibre + OSM; routing Haversine por defecto / OSRM opcional.
- Falta demostrar deployment de producción estable + smoke sobre HEAD vigente.

### Riesgo visible

```text
credencial guardada
≠ runtime configurado
≠ feature habilitada
≠ proveedor externo saludable
≠ E2E validado
```

## Bloque F — Proveedor · flujo simple P0 · 13/09/2026

Implementado en `main` el contrato definido en `docs/UGO_PROVIDER_SIMPLE_FLOW_PROMPT.md`:

```text
VER EL PROBLEMA
→ ACEPTAR
→ ESTOY YENDO
→ llegada automática por ubicación cuando aplica
   ↳ YA LLEGUÉ como fallback
→ EMPEZAR TRABAJO
→ LISTO
```

La simplificación es de **interfaz**, no de integridad. UGO conserva por detrás:

- mismo `serviceId` y máquina de estados canónica;
- aceptación atómica;
- forma de pago válida antes de salir;
- RPC/backend como autoridad de transiciones;
- evidencia `Antes` antes de iniciar;
- evidencia `Después` antes del cierre;
- confirmación de efectivo cuando corresponda;
- ampliaciones/precio adicional sólo como excepción explícita y aprobable;
- Realtime y trazabilidad.

La evidencia obligatoria se captura desde la acción humana (`EMPEZAR TRABAJO` / `LISTO`) sin convertirla en un paso administrativo separado. `LISTO` agrupa el cierre visible, mientras backend mantiene guards de evidencia, dinero y aprobación del cliente.

La llegada automática usa el tracking real y radio operativo de 200 m cuando hay geolocalización autorizada; el botón manual permanece como recuperación.

Estado de madurez: **IMPLEMENTED**. Para pasar a `VALIDATED` faltan E2E real Cliente↔Proveedor en TEST, GPS/cámara/permisos en dispositivo y smoke responsive del recorrido completo.

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
| Home | 🟡 | P1 | smoke responsive con datos reales |
| Demanda | 🟡 | P1 | fuente analítica |
| Oportunidades | 🟡 | P0 | flujo problem-first implementado; falta E2E real |
| Aceptar/Rechazar | ✅ | P0 | E2E competitivo |
| Tarifa al asignar | ✅ | P0 | monitoreo |
| Trabajo activo | 🟡 | P0 | flujo simple implementado; falta E2E lifecycle |
| Tracking | 🟡 | P1 | llegada automática implementada; falta E2E GPS/reconexión |
| Radio 200 m | ✅ | P1 | E2E GPS |
| Evidencia por estado | ✅ | P0 | integrada detrás de CTA; E2E positivo/negativo |
| Ampliar servicio | 🟡 | P0 | excepción contextual; convergencia E2E |
| Efectivo recibido | 🟡 | P0 | cierre visible unificado; ledger + E2E |
| Hugo Asistente | 🟡 | P2 | mantener fuera del happy path salvo ayuda contextual |

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
2 E2E solicitud→asignación→Proveedor problem-first
3 E2E pago electrónico base
4 E2E efectivo
5 E2E ESTOY YENDO→llegada automática/fallback→EMPEZAR→LISTO
6 E2E evidencia Antes/Después integrada detrás de acciones
7 E2E delta ampliación
8 tests RPC/RLS aislados
9 responsive/accessibility 360–430 + desktop
10 deploy objetivo + smoke
```

Casos críticos del flujo Proveedor:

```text
sin forma de pago válida → ESTOY YENDO bloqueado
GPS autorizado + <=200 m → llegada automática
GPS denegado/error → YA LLEGUÉ disponible
sin evidencia Antes → inicio no persiste
foto Antes válida → inicio persiste
sin evidencia Después → cierre no persiste
foto Después válida → LISTO avanza a revisión
cash → LISTO registra recepción antes de revisión
ampliación con costo → no se ejecuta/cierra sin aprobación/financiación aplicable
retry/realtime → mismo serviceId y estado real
```

---

# 9. UI/UX

Después de integridad P0:

```text
[ ] Cliente converge completamente al journey Hugo
[~] Proveedor happy path simple implementado; falta smoke/E2E real
[ ] Proveedor legacy fuera de operación
[ ] Admin/Super Admin converge
[ ] loading/empty/error/offline consistentes
[ ] mobile 360–430 validado en dispositivo
[ ] desktop real validado
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

Cliente pide/paga/sigue/amplía/aprueba; Proveedor ve el problema, acepta, va, resuelve y marca listo; Admin resuelve excepciones y observa integraciones reales. Permisos, dinero, evidencia y secretos están protegidos. CI, deploy y smoke son demostrables.

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

**El próximo gran avance de UGO es convertir el circuito ya existente —incluidas sus integraciones— en un sistema confiable, validado, medible, repetible y observable sin trasladar esa complejidad al proveedor.**