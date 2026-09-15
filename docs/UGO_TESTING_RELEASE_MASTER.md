# UGO — Testing & Release Master

**Versión:** 2.7 · 15 de septiembre de 2026  
**Estado:** contrato maestro de calidad y release  
**Rama de integración:** `main`

> `IMPLEMENTED ≠ VALIDATED ≠ MEASURED ≠ RELEASED`. Cada tramo crítico debe demostrar estado real, permisos reales y recuperación real.

---

# 1. Quality Gates

```text
L0 TypeScript/Lint
→ L1 Contract tests / UX states
→ L2 Domain/RPC/API
→ L3 RLS/roles/Storage
→ L4 Integration/Realtime/Pagos/Mapas
→ L5 E2E Cliente↔Proveedor↔Admin + multi-pedido A+B+C
→ L6 Dispositivo físico Android Cliente↔Proveedor
→ L7 Deploy/Smoke/Rollback readiness
```

No declarar `VALIDATED`, `MEASURED` ni `RELEASED` sin evidencia correspondiente.

---

# 2. Scripts y gates actuales

```text
npm run build      ✅ disponible
npm run lint       ✅ disponible
npm run test       ✅ disponible
npm run test:e2e   ⬜ no es el gate autoritativo actual
```

Harness autenticado:

```text
tests/integration/client-provider-rpc-rls.test.mjs
```

Variables:

```text
UGO_TEST_SUPABASE_URL
UGO_TEST_SUPABASE_ANON_KEY
UGO_TEST_CLIENT_EMAIL
UGO_TEST_CLIENT_PASSWORD
UGO_TEST_PROVIDER_EMAIL
UGO_TEST_PROVIDER_PASSWORD
UGO_TEST_ADMIN_EMAIL
UGO_TEST_ADMIN_PASSWORD
```

El harness rechaza cualquier Supabase que no sea TEST `tmossnqfwfwjrtzwcbmm` y rechaza explícitamente producción `trfsjuseqjxlhrxuvdsm` antes de ejecutar el recorrido.

En Core CI, URL + publishable key TEST están fijadas en workflow. Las seis credenciales humanas deben vivir exclusivamente en GitHub Secrets.

---

# 3. Estado CI autoritativo

Base funcional/CI:

```text
7fed2b5511e4a66e946cce04f610addf7b9bf7cf
ci(android): resolve sdkmanager from runner SDK
```

Core:

```text
UGO Core CI #807
run: 34935021482
SHA: 7fed2b5511e4a66e946cce04f610addf7b9bf7cf
status: completed
conclusion: success
```

Pasaron:

- `npm ci --include=dev`;
- `npm audit --audit-level=high`;
- guard de entorno TEST;
- preflight E2E;
- TypeScript + Vite production build;
- contratos/tests/integración local;
- lint crítico operacional;
- ClientApp lint;
- full repository lint.

En #807 el E2E autenticado remoto fue omitido explícitamente porque estas seis variables estaban vacías:

```text
UGO_TEST_CLIENT_EMAIL
UGO_TEST_CLIENT_PASSWORD
UGO_TEST_PROVIDER_EMAIL
UGO_TEST_PROVIDER_PASSWORD
UGO_TEST_ADMIN_EMAIL
UGO_TEST_ADMIN_PASSWORD
```

Por lo tanto:

```text
E2E harness: IMPLEMENTED
E2E autenticado: BLOCKED — missing GitHub TEST credentials
```

No convertir este bloqueo en `VALIDATED` por inferencia.

---

# 4. Gate multi-pedido A+B+C

Principio:

> **Un pedido. Un profesional. Sin vueltas.**

significa un profesional por PEDIDO, no un único pedido activo por cliente.

Caso mínimo obligatorio:

```text
A = Electricista · mañana 15:00
B = Plomero · hoy
C = Limpieza · viernes 10:00
```

Una validación real debe demostrar:

```text
crear A
volver a Inicio
crear B sin finalizar A
volver a Inicio
crear C sin finalizar A/B
A.id != B.id
B.id != C.id
A.id != C.id
Actividad muestra A+B+C
abrir A por serviceId
abrir B por serviceId
cancelar B
A intacto
B cancelado
C intacto
```

Además por pedido:

- categoría independiente;
- `programado_para` independiente;
- proveedor independiente;
- estado independiente;
- chat `mensajes.servicio_id` correcto;
- tracking correcto;
- pago `servicio_id` correcto;
- evidencia correcta;
- ampliación correcta;
- disputa correcta.

Estado actual:

```text
multi-pedido arquitectura + contratos: IMPLEMENTED
A+B+C autenticado con IDs reales: BLOCKED por credenciales TEST
```

No inventar IDs.

---

# 5. Backend multi-pedido / idempotencia

TEST debe conservar:

```text
servicios_cliente_estado_created_idx = NON-UNIQUE
servicios_cliente_request_draft_uidx = UNIQUE sobre cliente_id + request_draft_id no vacío
single-active trigger = AUSENTE
```

La unicidad de `request_draft_id` protege retry/doble submit del MISMO draft; no puede impedir pedidos intencionalmente distintos.

Prohibido reintroducir como selector de mutación:

```text
activeServiceId global
latest active service
.limit(1) para decidir qué pedido cancelar
“ya tenés un pedido activo; cancelalo antes”
```

Una mutación crítica debe recibir un `serviceId` explícito o negarse a actuar si hay ambigüedad.

---

# 6. Hugo multi-pedido

Contratos obligatorios:

```text
A activo + “necesito un plomero hoy” → iniciar nuevo B
A+B activos + “necesito limpieza viernes” → iniciar nuevo C
“cómo viene el electricista de mañana” → resolver pedido concreto
“cancelá el plomero de hoy” → cancelar serviceId concreto
“cancelá mi pedido” con varios candidatos → preguntar cuál; no mutar
```

Hugo puede resolver por categoría, proveedor, número, fecha u horario. Nunca inventa proveedor, rating, precio, disponibilidad, pago o estado.

Voz/texto deben compartir contexto. El bridge Android nativo debe conservar STOP/fallback texto.

---

# 7. Proveedor / Agenda

Proveedor puede tener varias asignaciones futuras compatibles.

Separar conceptualmente:

```text
AGENDA = múltiples trabajos futuros
MISIÓN ACTIVA = un servicio concreto accionable
```

Cada elemento de Agenda debe mantener/abrir su `serviceId` y mostrar fecha/hora, cliente, categoría, dirección y estado.

Lifecycle operativo:

```text
Asignado
→ En camino
→ Llegué
→ evidencia Antes
→ Iniciar trabajo
→ chat/ampliación si aplica
→ evidencia Después
→ Finalizar
→ Esperando aprobación
→ Completado
```

Backend de horarios/solapamientos es autoridad; no imponer un veto frontend global “ya tenés un trabajo”.

---

# 8. E2E autenticado 3 roles

Una corrida válida debe crear datos NUEVOS y conservar cada `serviceId` durante su journey:

```text
Cliente autenticado
→ crea servicio
→ matching
→ Proveedor recibe oportunidad
→ acepta
→ Cliente + Admin observan mismo servicio
→ chat Cliente↔Proveedor
→ Admin audita mismo chat
→ pago
→ en_camino
→ llegado
→ evidencia REAL antes
→ en_progreso
→ ampliación si corresponde
→ evidencia REAL después
→ confirmación de pago
→ revisión/aprobación Cliente
→ completado
→ Cliente + Proveedor + Admin convergen
```

Bucket canónico:

```text
service-evidence
```

La evidencia debe existir realmente en Storage; metadata/path sin objeto no cuenta.

El fixture E2E preservado debe incluir `e2e_run_id` para auditoría.

---

# 9. Pagos / efectivo / ampliaciones

Pagos electrónicos: probar selección, creación, autorización, webhook, retry, duplicados, ampliación financiada, rechazo y recovery.

Efectivo:

```text
en_progreso
→ evidencia Después
→ confirmar_pago_efectivo
→ esperando_aprobacion
→ aprobar_servicio
```

Pedir revisión antes de confirmar efectivo debe fallar. Repetir confirmación válida debe ser idempotente.

Ampliaciones deben preservar descripción, costo, tiempo, aprobación, checkout/delta e idempotencia sin incrementar dos veces.

La política definitiva de saldo/retiro sigue:

```text
BLOCKED — PRODUCT DECISION REQUIRED
```

No inventar `saldo_proveedor()` ni `solicitar_retiro(...)`.

---

# 10. Llegada + evidencia

```text
pago no habilitado → no en_camino
pago habilitado → en_camino
>200 m → llegado rechazado cuando aplica geofence
<=200 m → llegado permitido
llegado sin Antes → inicio rechazado
llegado + Antes real → inicio permitido
Antes fuera de llegado → rechazado
Durante fuera de en_progreso → rechazado
Después antes de en_progreso → rechazado
en_progreso + Después real → cierre elegible según método
```

---

# 11. RLS / RPC / SECURITY DEFINER

Por tabla/bucket sensible:

```text
autorizado → permitido
no participante → denegado
anónimo → denegado salvo público explícito
admin → privilegio real y justificado
```

Los guards críticos ya fueron revisados con negativos reales en UGO TEST. No reabrir auditoría completa sin regresión demostrable.

---

# 12. Concurrencia / Realtime

Probar doble aceptación, doble click, webhook duplicado, retry tras timeout, doble efectivo, doble confirmación de ampliación y doble cierre.

Realtime debe:

- aplicar evento al `serviceId` correcto;
- evitar duplicados;
- limpiar subscriptions;
- recuperar/refetch al reconectar;
- converger a persistencia;
- no convertir un único “servicio activo” en estado global de cuenta.

Backend/recovery está `VALIDATED`; convergencia visual en dos celulares sigue `MEASURED` pendiente.

---

# 13. Android nativo

Ruta canónica:

```text
android-apk/
```

Flavors:

```text
Cliente   com.ugo.client   version 1.0.0 (1)
Proveedor com.ugo.provider version 1.0.0 (1)
```

Workflow autoritativo:

```text
Build UGO Android APKs #14
run: 34935021499
SHA: 7fed2b5511e4a66e946cce04f610addf7b9bf7cf
conclusion: success
artifact: UGO-Android-APKs
```

SHA-256:

```text
UGO-Cliente.apk
47a8396c543ddf27aa8225c34dc1553c435cf69d4fde1933584e002cb49144f9

UGO-Proveedor.apk
c0ca825d54f55131fa259b280f808d4ba2c6a52ce52d607b3766656bdd88a07a
```

El APK nativo contempla INTERNET, ubicación, cámara, micrófono, file chooser y bridge SpeechRecognizer para Hugo. La autorización de geolocalización debe concederse al WebView sólo después de permiso Android.

La APK Capacitor TEST puede usarse para QA, pero no sustituye los flavors nativos.

---

# 14. Prueba física obligatoria

No marcar `MEASURED` sin dos dispositivos reales.

Cliente:

```text
login
A Electricista
B Plomero sin finalizar A
C Limpieza sin finalizar A/B
Actividad A+B+C
cancelación selectiva
Hugo voz/texto
tracking
chat
pago
revisión
```

Proveedor:

```text
login
online/offline
oportunidad
aceptar/rechazar
Agenda
abrir serviceId correcto
mapa/GPS
en_camino
llegada
cámara Antes
iniciar
chat
ampliación
cámara Después
cierre
```

Dos dispositivos:

```text
Realtime sin refresh
reconnect
background/foreground
GPS caminando
Storage
Hugo micrófono
barge-in/STOP/fallback texto
teclado
safe areas
overlays
botones táctiles
```

---

# 15. Vercel / Smoke

Release funcional exige deploy/smoke verificable; CI verde no sustituye Vercel `READY`.

Deployment funcional verificado:

```text
dpl_HVdhqu99z16qmTNvoJYjUW1jrLyy
commit: b2b0f753103520d7e5cbe4704e6322f11c5544b5
state: READY
alias: https://ugo-admin-panel.vercel.app
```

Smoke del 15/09/2026:

```text
?app=client   HTTP 200
?app=provider HTTP 200
?app=admin    HTTP 200
```

Commits posteriores exclusivos de CI/Android/docs no deben interpretarse como necesidad de quemar deploy web si no cambian el bundle funcional.

---

# 16. Responsive + accesibilidad

Breakpoints mínimos: `360×800`, `390×844`, `430×932`, tablet, `1280`, `1440`.

Objetivo WCAG AA: foco visible, teclado, labels/aria, contraste, estado no sólo color, targets ≥48 px, errores accionables.

---

# 17. Severidad

```text
P0 seguridad · datos · auth · dinero · core roto
P1 flujo principal degradado · integración/Realtime/UX crítico
P2 secundaria · consistencia · escala
P3 polish
```

No release comercial con P0 conocido.

---

# 18. Definition of Done

```text
contrato definido
UI/UX compatible
persistencia correcta
serviceId correcto
RLS/RPC correcto
happy/error/offline
build/lint/npm test
A+B+C autenticado cuando credenciales existan
integraciones seguras y observables
Android build
prueba física cuando aplica
CI/deploy/smoke
rollback evaluado
maestros + roadmap actualizados
```

---

# 19. Release checklist

```text
[x] base funcional CI #807 verde
[x] Android debug workflow #14 verde
[x] APK Cliente generada
[x] APK Proveedor generada
[x] Vercel TEST READY
[x] smoke Cliente/Proveedor/Admin HTTP 200
[x] backend TEST sin single-active guard
[x] idempotencia request_draft_id
[ ] E2E A+B+C autenticado con IDs reales
[ ] cancelación selectiva B validada remotamente dejando A/C intactos
[ ] mismo chat/pago/evidencias en Cliente/Proveedor/Admin real
[ ] prueba física dos Android
[ ] mobile hardware camera/GPS/mic/Reatime MEASURED
[ ] política financiera saldo/retiro definida
[ ] seguridad producción cerrada
[ ] rollback producción preparado
```

---

# 20. Regla final

**UGO está listo cuando el circuito real y sus integraciones funcionan, resisten errores, preservan integridad y pueden demostrarse; no porque exista código o se vea bien.**

**Supabase PROD `trfsjuseqjxlhrxuvdsm` permanece fuera de alcance y NO fue tocado en este checkpoint.**
