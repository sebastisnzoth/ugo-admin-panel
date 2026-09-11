# UGO — Testing & Release Master

**Versión:** 2.5 · 11 de septiembre de 2026  
**Estado:** contrato maestro de calidad y release  
**Rama de integración:** `main`

> `IMPLEMENTED ≠ VALIDATED ≠ RELEASED`. Cada tramo crítico debe demostrar estado real, permisos reales y recuperación real.

---

# 1. Quality Gates

```text
L0 TypeScript/Lint
→ L1 Contract tests / UX states
→ L2 Domain/RPC/API
→ L3 RLS/roles/Storage
→ L4 Integration/Realtime/Pagos/Mapas
→ L5 E2E Cliente↔Proveedor↔Admin
→ L6 Deploy/Smoke/Rollback readiness
```

No declarar `OK` sin evidencia de ejecución.

---

# 2. Scripts

```text
npm run build      ✅ disponible
npm run lint       ✅ disponible
npm run test       ✅ disponible
npm run test:e2e   ⬜ pendiente
```

`npm test` ejecuta contract tests sobre código/migraciones. No reemplaza RPC/RLS ni E2E real.

---

# 3. Cobertura contractual actual

`tests/contracts/core-lifecycle.test.mjs` cubre:

```text
radio llegada UI/backend = 200 m
evidencia Antes/Durante/Después por lifecycle
guards inicio/finalización
efectivo presencial
checkout separado para delta de ampliación
idempotency/external_reference de ajuste
webhook de ampliación → confirmar_pago_ampliacion
validación monto antes de incorporar delta
review cliente: ownership + proveedor asignado
```

Próximo nivel: RPC/RLS ejecutados contra base aislada.

---

# 4. E2E ecosistémico

```text
Cliente auth/onboarding
→ solicitud + evidencia
→ matching
→ oportunidad mismo serviceId
→ aceptación única
→ pago electrónico protegido O efectivo seleccionado
→ en_camino → llegada → Antes → inicio
→ ampliación opcional
→ Después → cierre
→ aprobación/disputa
→ cobro según método
→ reputación/historial
→ Admin observa datos correctos
```

---

# 5. Pagos electrónicos

Probar selección, creación, autorización, webhook, retención/protección, retry, duplicados, liberación, reembolso/disputa y ampliación financiada.

Aserción: ningún servicio avanza por condición financiera inexistente.

---

# 6. Efectivo

Probar selección, habilitación, copy correcto, confirmación proveedor, duplicado, registro financiero, comisión/ledger, cierre Cliente y disputa sin promesa de reembolso automático.

Aserción: efectivo nunca se describe como electrónicamente protegido.

---

# 7. Llegada + evidencia

```text
pago no habilitado → no en_camino
pago habilitado → en_camino
>200 m → llegado rechazado
<=200 m → llegado permitido
llegado sin Antes → inicio rechazado
llegado + Antes → inicio permitido
Antes fuera de llegado → rechazado
Durante fuera de en_progreso → rechazado
Después antes de en_progreso → rechazado
en_progreso + Después → cierre elegible según método
```

---

# 8. Ampliaciones + dinero

```text
extra 0 → aprobable
sin pago + extra → total antes del checkout
efectivo pendiente + extra → reajuste consistente
pago fallido/reembolsado → siguiente intento ajustado
electrónico activo + extra → checkout separado
checkout pendiente → reutilizable
approved monto/moneda válidos → incorpora una vez
mismatch → no incorpora
rechazado/cancelado → retry
webhook duplicado → sin doble incremento
refunded después de aplicado → pendiente_ajuste + bloqueo cierre
actor no cliente → denegado
```

Implementado no equivale todavía a E2E validado.

---

# 9. Admin / Super Admin

Pruebas positivas y negativas sobre acceso por rol, KYC, servicios, finanzas, disputas, configuración, feature flags, integraciones y auditoría.

Query params/UI nunca escalan privilegios.

## Integraciones Admin

`api/admin/integrations-status.ts` y `AdminSystemSettings → Integraciones` son superficies críticas.

Casos obligatorios:

```text
sin Bearer → 401
sesión inválida → 401
usuario no admin → 403
admin/super activo → metadata segura
respuesta nunca contiene valores secretos
configured != enabled != validated E2E
credencial de bóveda no implica runtime activo
```

El endpoint puede comprobar presencia/configuración del runtime, pero no debe etiquetarse como prueba de transacción E2E con el proveedor externo.

`admin_payment_credentials_status()` debe ser Admin-only y devolver sólo metadata. Migración de portabilidad: `20260911230000_admin_payment_credentials_status_fix.sql`.

---

# 10. RLS

Por cada tabla/bucket sensible:

```text
autorizado → permitido
no participante → denegado
anónimo → denegado salvo público explícito
admin → privilegio real
```

Incluir upload/read/delete y signed URLs cuando aplique.

---

# 11. Concurrencia e idempotencia

Probar doble aceptación, doble click, doble webhook, doble efectivo, doble checkout/confirmación de ampliación, doble cierre/retiro y retry tras timeout. Resultado determinista y auditable.

---

# 12. Realtime

Evento correcto, sin duplicado, cleanup, reconexión/refetch, cambio usuario/serviceId y convergencia al mismo estado persistido.

---

# 13. Responsive + accesibilidad

Breakpoints mínimos: `360×800`, `390×844`, `430×932`, tablet, `1280`, `1440`.

Objetivo WCAG AA: foco visible, teclado, labels/aria, contraste, estado no sólo color, targets ≥48 px, errores accionables.

---

# 14. Recuperación

Todo E2E crítico cubre timeout, 4xx/5xx, sin conexión, reconexión, rechazo, pago fallido/reembolsado, cancelación y retry.

---

# 15. CI / Deploy

`UGO Core CI` ejecuta:

```text
npm ci
npm audit --audit-level=high
npm run build
npm test
lint crítico operacional
lint ClientApp con deuda registrada aislada
lint general como reporte de deuda
```

Superficies Admin/integraciones incluidas en lint crítico:

```text
api/admin/integrations-status.ts
AdminSystemSettings.tsx
AdminPaymentCredentials.tsx
AdminPaymentMethods.tsx
```

## Evidencia reciente

Run `#260` / head `efec5f26`:

```text
audit           ✅ 0 vulnerabilidades
build/TS        ✅
npm test        ✅ 6/6
lint crítico    ❌
```

El fallo de lint correspondió a versiones anteriores de `AdminPaymentCredentials.tsx` y `AdminSystemSettings.tsx` (explicit `any` y setState directo en effect). Esos dos archivos fueron corregidos posteriormente en `main`; por lo tanto el run #260 **no valida ni invalida por sí solo el HEAD actual**. Requiere nuevo CI por SHA actual.

## Vercel

La auditoría encontró un deployment production `ERROR` en commit `61872b20`. El log mostró imports TypeScript de `@vercel/node` sin tipos resolubles en serverless. `main` ya contiene `api/vercel-node.d.ts` mediante fix `2bef4d97`, pero la recuperación **no se considera validada hasta observar un deployment posterior READY y hacer smoke**.

Había un deployment production previo `READY` en commit `555daf48`, disponible como rollback candidate.

Release exige deploy/smoke verificable; un build GitHub verde no sustituye Vercel READY.

Smoke mínimo:

```text
landing
?app=client
?app=provider
?app=admin
?app=web
Auth
Supabase data
/api/admin/integrations-status
API pagos crítica
```

Si no hay check: `DESCONOCIDO`, nunca asumir `OK`.

---

# 16. Severidad

```text
P0 seguridad · datos · auth · dinero · core roto
P1 flujo principal degradado · integración/Realtime/UX crítico
P2 secundaria · consistencia · escala
P3 polish
```

No release con P0 conocido.

---

# 17. Definition of Done

```text
contrato definido
UI/UX compatible
persistencia correcta
RLS/RPC correcto
método de pago correcto
happy/error/offline
build/lint/npm test
RPC/RLS/E2E cuando aplican
integraciones seguras y observables
CI/deploy/smoke
rollback evaluado
maestros + Roadmap actualizados
```

---

# 18. Release checklist

```text
[ ] main esperado
[ ] build
[ ] lint
[ ] npm test
[ ] E2E aplicable
[ ] permisos/RLS
[ ] concurrencia/idempotencia
[ ] pagos method-aware
[ ] ampliaciones financiadas
[ ] Storage/evidencia
[ ] Realtime/reconexión
[ ] integraciones Admin sin secretos
[ ] mobile/desktop/accesibilidad
[ ] CI
[ ] Vercel READY
[ ] smoke
[ ] rollback
[ ] maestros
[ ] Roadmap
```

---

# 19. Regla final

**UGO está listo cuando el circuito real y sus integraciones funcionan, resisten errores, preservan integridad y pueden demostrarse; no porque exista código o se vea bien.**