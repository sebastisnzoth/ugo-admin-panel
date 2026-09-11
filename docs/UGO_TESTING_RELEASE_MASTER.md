# UGO — Testing & Release Master

**Versión:** 2.4 · 11 de septiembre de 2026  
**Estado:** contrato maestro de calidad y release  
**Rama de integración:** `main`

> `IMPLEMENTED ≠ VALIDATED ≠ RELEASED`. UGO sólo puede crecer con confianza si cada tramo crítico demuestra que funciona con estado real, permisos reales y recuperación real.

---

# 1. Quality Gates

```text
L0 TypeScript/Lint
→ L1 Contract tests / Component / UX states
→ L2 Domain/RPC/API
→ L3 RLS/roles/Storage
→ L4 Integration/Realtime/Pagos/Mapas
→ L5 E2E Cliente↔Proveedor↔Admin
→ L6 Deploy/Smoke/Rollback readiness
```

No declarar `OK` sin evidencia de ejecución.

---

# 2. Scripts mínimos

Estado actual:

```text
npm run build      ✅ disponible
npm run lint       ✅ disponible
npm run test       ✅ disponible · Node test runner sin dependencia adicional
npm run test:e2e   ⬜ pendiente
```

`npm test` ejecuta `tests/**/*.test.mjs`. El primer paquete cubre contratos críticos del lifecycle, pero **no reemplaza tests de RPC/RLS ni E2E real**.

---

# 3. Contract tests ejecutables

Archivo inicial:

`tests/contracts/core-lifecycle.test.mjs`

Cobertura actual:

```text
radio llegada UI/backend = 200 m
evidencia Antes/Durante/Después respeta lifecycle
guards de inicio/finalización por evidencia
efectivo sigue modelo presencial
ampliación electrónica activa usa checkout separado de delta
checkout de ampliación lleva idempotency key y external_reference propio
webhook detecta ampliacion_id y llama confirmar_pago_ampliacion
RPC valida monto antes de incorporar el delta
ClientCompletionReview respeta ownership + proveedor asignado
```

Estos tests son una red de regresión de contrato sobre código/migraciones versionadas. Próximo nivel: tests que ejecuten RPC/RLS contra una base aislada.

---

# 4. E2E ecosistémico principal

```text
Cliente registro/login
→ onboarding
→ solicitud + evidencia
→ matching
→ oportunidad mismo serviceId
→ Proveedor autorizado ve contexto
→ acepta
→ asignación única
→ pago electrónico protegido O efectivo seleccionado
→ en camino
→ llegada
→ evidencia inicial
→ iniciar
→ ampliación opcional
→ evidencia final
→ solicitar finalización
→ Cliente aprueba O disputa
→ cierre/cobro según método
→ calificación/historial
→ Admin/Scout reciben datos correctos
```

---

# 5. E2E electrónico

Probar:

```text
selección
creación/autorización
webhook
retención/protección
retry
webhook duplicado
liberación
reembolso/disputa
ampliación con ajuste financiado
```

Aserción: servicio no debe avanzar por una condición financiera inexistente cuando el contrato exige custodia.

---

# 6. E2E efectivo

Probar:

```text
selección de efectivo
servicio habilitado
copy correcto
confirmación proveedor
confirmación duplicada
registro financiero
comisión/ledger cuando aplique
cierre Cliente
disputa sin promesa de reembolso automático UGO
```

Aserción obligatoria: **ningún estado o UI describe efectivo como electrónicamente protegido.**

---

# 7. Cliente

Validar:

```text
auth/recovery
onboarding
Home/Radar
búsqueda/categorías
solicitud
evidencia previa
matching
proveedor seleccionado
pago method-aware
tracking
servicio activo
ampliación
aprobación/disputa
historial/notificaciones
offline/retry
```

---

# 8. Proveedor

Validar:

```text
auth/onboarding/KYC
Online/Offline
Home
Demanda
Oportunidades
serviceId
evidencia autorizada
aceptar/rechazar
concurrencia
trabajo activo
tracking
evidencia operacional
ampliación
efectivo
ganancias
Realtime/reconexión
sin dependencia operacional legacy
```

---

# 9. Llegada + evidencia operacional

Casos obligatorios del tramo `en_camino → llegado → en_progreso`:

```text
pago no habilitado → no puede pasar asignado→en_camino
pago habilitado → puede pasar asignado→en_camino
cliente con coordenada + proveedor >200 m → llegado rechazado
cliente con coordenada + proveedor <=200 m → llegado permitido
llegado sin foto Antes → en_progreso rechazado
llegado + foto Antes → en_progreso permitido
foto Antes fuera de llegado → insert rechazado
foto Durante fuera de en_progreso → insert rechazado
foto Después antes de en_progreso → insert rechazado
en_progreso + foto Después → cierre elegible según método de pago
```

La UI debe reflejar el mismo radio de 200 m y los mismos tipos de evidencia admitidos por backend; una discrepancia de copy o controles es una regresión P1/P0 según impacto.

---

# 10. Ampliaciones + dinero

Casos obligatorios:

```text
monto extra 0 → cliente puede aprobar sin alterar fondos
sin pago creado + monto extra → total/comisión/neto se actualizan antes del checkout
efectivo pendiente + monto extra → servicio y pago se reajustan al mismo total
pago fallido/reembolsado + monto extra → servicio se reajusta y exige nuevo intento
pago electrónico activo + monto extra → checkout de delta separado
checkout pendiente → se reutiliza y no duplica preferencia intencionalmente
webhook approved + monto/moneda válidos → RPC incorpora delta y aprueba ampliación
webhook approved + monto/moneda inválidos → no incorpora delta
webhook rechazado/cancelado → ampliación sigue pendiente y permite retry
webhook duplicado approved → idempotente, sin doble incremento
ajuste ya aplicado + refunded → pago_estado vuelve a pendiente_ajuste y bloquea cierre
ampliación aprobada + pendiente_ajuste → servicio no pasa a esperando_aprobacion
actor no cliente → no puede iniciar checkout/resolver ampliación
```

Aserción P0: **ningún trabajo adicional con costo queda aprobado si su impacto financiero no está incorporado o financiado según el método.**

La implementación actual cubre contrato estático y migración en producción. Falta E2E real del procesador, webhook duplicado/reembolso y RPC/RLS ejecutados contra base de prueba antes de considerar este tramo VALIDATED.

---

# 11. Admin / Super Admin

Pruebas positivas y negativas sobre:

```text
acceso por rol
KYC
servicios
finanzas/retiros
disputas
configuración
feature flags
auditoría
```

Query params o UI nunca escalan privilegios.

---

# 12. RLS

Para cada tabla/bucket sensible:

```text
actor autorizado → permitido
actor no participante → denegado
anónimo → denegado salvo público explícito
admin → según privilegio real
```

Incluir upload/read/delete y signed URLs cuando aplique.

---

# 13. Concurrencia e idempotencia

Obligatorio probar:

```text
dos proveedores aceptando misma oportunidad
doble click
doble webhook
doble confirmación efectivo
doble checkout ampliación
doble confirmación pago ampliación
doble aprobación ampliación
doble cierre
doble retiro
retry después de timeout
```

Resultado debe ser determinista y auditable.

---

# 14. Realtime

```text
evento correcto
sin duplicado
cleanup
reconexión
refetch
cambio de usuario/serviceId
múltiples pestañas cuando aplique
```

Cliente y Proveedor deben converger al mismo estado persistido.

---

# 15. Responsive

Validar:

```text
360×800
390×844
430×932
768 tablet
1280 desktop
1440 desktop
```

Safe area, teclado, scroll, nav, mapa, sheet, modal y formularios.

---

# 16. Accesibilidad

Objetivo WCAG AA:

```text
foco visible
teclado
labels/aria
contraste
estado no sólo por color
targets ≥48px
reduced motion
orden lógico
errores accionables
```

---

# 17. Recuperación

Todo E2E crítico debe cubrir:

```text
timeout
error 4xx/5xx
sin conexión
reconexión
sin proveedor
rechazo
sin método de pago
checkout adicional fallido/reembolsado
cancelación
retry
```

No basta probar happy path.

---

# 18. CI / Deploy

`UGO Core CI` ejecuta actualmente:

```text
npm ci
npm audit --audit-level=high
npm run build
npm test
lint crítico operacional
lint ClientApp con deuda registrada aislada
lint general como reporte de deuda
```

Release requiere además evidencia de deploy/smoke.

Smoke mínimo:

```text
landing
?app=client
?app=provider
?app=admin
?app=web
Auth
Supabase data
API crítica
```

Si no hay check verificable: estado `DESCONOCIDO`, nunca asumir `OK`.

---

# 19. Severidad

```text
P0 seguridad · datos · auth · dinero · core roto
P1 flujo principal degradado · Realtime/UX crítico
P2 secundaria · consistencia · escala
P3 polish
```

No release con P0 conocido.

---

# 20. Definition of Done

```text
contrato funcional definido
UI/UX compatible
estado persistido correcto
RLS/RPC correcto
método de pago correcto
happy/error/offline
responsive/accesibilidad
build/lint
contract tests
tests RPC/RLS cuando apliquen
E2E cuando aplique
CI/deploy/smoke
rollback evaluado
maestros actualizados
Roadmap actualizado
```

---

# 21. Release checklist

```text
[ ] main contiene cambios esperados
[ ] build
[ ] lint
[ ] npm test
[ ] E2E aplicable
[ ] flujo afectado
[ ] mismo serviceId entre roles
[ ] permisos/RLS
[ ] concurrencia/idempotencia
[ ] pagos method-aware
[ ] ampliaciones financiadas/reconciliadas
[ ] Storage/evidencia
[ ] Realtime/reconexión
[ ] mobile
[ ] desktop
[ ] accesibilidad
[ ] CI/deploy
[ ] smoke
[ ] rollback
[ ] maestros
[ ] Roadmap
```

---

# 22. Regla final

**UGO está listo cuando el circuito real funciona, resiste errores, preserva integridad y puede demostrarse; no porque exista código o se vea bien.**