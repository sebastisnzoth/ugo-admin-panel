# UGO — Agent Handoff

**Actualizado:** 18 de septiembre de 2026  
**Estado:** UGO TEST; CI verde, runtime físico pendiente  
**Rama única:** `main`

## Entorno

```text
Repo: sebastisnzoth/ugo-admin-panel
Supabase TEST: tmossnqfwfwjrtzwcbmm
Supabase PROD: FUERA DE ALCANCE
Cliente: /?app=client
Proveedor: /?app=provider
Admin: /?app=admin
Desarrollo: /?app=development · público/read-only
```

## Checkpoint exacto

```text
HEAD main validado: 14f75074d2e19a8dda2f02a3343b93ea2eb40fdb
Runtime funcional Proveedor: 1890c805fab826199c854b53112a627b70015494
UGO Core CI run: 35418764077
conclusion: SUCCESS
TypeScript/build + npm test + lint crítico + ClientApp lint + full lint: verde
Vercel TEST deployment: dpl_9SAFDe7quyWhxnt3eYbc3u24irJ3 · READY
Android TEST run: 35418703450 · SUCCESS · runtime 1890c805
APK digest: sha256:a47a4afa7b432a1b01baa4382db01062632c26b606b2de53e67068a89537b82c
```

Los E2E autenticados Cliente/Proveedor/Admin se omiten si faltan las seis credenciales TEST; ese skip no valida runtime.

## Sentinel / recovery

Regla obligatoria:

```text
operación ambigua
→ leer estado persistido exacto
→ persistido = éxito recuperado
→ fallo confirmado = incidente real
→ no verificable = recovery telemetry, no falso readiness
```

Este patrón cubre matching, cancelación, aceptación/rechazo de oferta, disponibilidad, lifecycle, GPS, chat send, rating y pagos críticos. Centinela nunca muta `development_checklist`.

## Cliente

- A+B+C permitido y aislado por `serviceId`.
- Actividad usa una sola navegación de estado y carga el CSS Cliente real.
- cancelación y matching recuperan estado persistido.
- chat exacto por `serviceId`, realtime + fallback/resync.
- chat usa `clientMessageId` e idempotencia server-side en TEST.
- quick replies y bloqueo de datos de contacto siguen activos.
- rating reconcilia persistencia exacta.
- pago separa fallo de mutación P0 de sync/realtime P1.

## Proveedor

```text
Oferta → Aceptar → Estoy yendo → Llegué → Empezar → Listo → Cliente aprueba → Cliente paga/confirma → Cierre
```

- online/offline reconcilia `disponible + online`.
- fallo confirmado de disponibilidad clasifica `MATCH-ONLINE` server-side.
- rechazo de oferta reconcilia `rechazada` exacta.
- GPS reconcilia `ultima_ubicacion_at` antes de incidente.
- Agenda debe contener todos los trabajos futuros/asignados; misión activa sólo selecciona el trabajo accionable.
- efectivo canónico: el proveedor NO confirma cobro; marca TRABAJO LISTO, el cliente aprueba y después confirma “YA PAGUÉ”.
- `confirmar_pago_efectivo_cliente(serviceId)` está aplicada en Supabase TEST mediante `provider_multi_jobs_cash_close_flow`.
- “Elegir servicio” abre Agenda y no Historial.
- “Trabajo activo” abre Agenda/Mis trabajos cuando no existe misión accionable; nunca deriva a Historial por ausencia de misión.
- responsive tablet 600–999 conserva navegación móvil; sidebar desktop toma control recién desde 1000 px.
- un servicio pasivo (`esperando_aprobacion`/`disputado`) no tapa un nuevo pedido inmediato o programado ya accionable.
- errores recuperables de Realtime y validaciones normales de horario no se elevan como P0.
- Skills QA/Design System están alineadas: el proveedor no confirma efectivo; el cliente aprueba y luego confirma `YA PAGUÉ`.
- Centinela para revisiones `1890c80`/`14f7507`: 0 P0/P1 abiertos al checkpoint.

## Chat P0

Hardening de código/backend está hecho, pero `CHAT-REALTIME` permanece `IMPLEMENTED` hasta demostrar:

```text
Cliente → Proveedor visible realtime
Proveedor → Cliente visible realtime
reload/reconnect conserva historial
quick replies correctas
contacto externo bloqueado
pedido A no contamina B/C
```

## Development

Mantener público, sin login, read-only, vistas sanitizadas, revisión visible, incidentes actuales separados de históricos y Admin protegido.

## Gates externos que NO se promueven

```text
CHAT-REALTIME = implemented
CLIENT-ACTIVITY-UX = implemented
MAP-GPS = implemented
RATING = implemented
TWO-DEVICES = blocked
FULL-E2E = blocked
GO-LIVE = blocked
```

## NEXT — no parar mientras haya trabajo interno

```text
1 mantener como runtime funcional validado 1890c805fab826199c854b53112a627b70015494 y HEAD CI validado 14f75074d2e19a8dda2f02a3343b93ea2eb40fdb
2 pasar a prueba física: dos sesiones/dispositivos
3 validar CHAT-REALTIME Cliente ↔ Proveedor por serviceId + reconnect
4 validar MAP-GPS/arrival en celular real
5 validar efectivo completo: Trabajo listo → cliente aprueba → YA PAGUÉ → proveedor recibe “El cliente pagó”
6 ejecutar E2E autenticado A+B+C cuando existan las 6 credenciales TEST
7 generar/validar Android TEST del candidato que vaya a prueba física
8 publicar sólo cuando corresponda
```

**No tocar Supabase PROD. No crear ramas. No Vercel para resolver QA Android.**

## Checkpoint 22 de septiembre de 2026 — Admin + Hugo Proveedor

Implementación validada por `UGO Core CI` sobre `76e63c8aeb4b8b9d6fb379be2323c4654e12a0f4`:

- Admin Gate conserva autenticación/autorización y vuelve a montar el panel operativo real mediante `features/admin/screens/AdminShell.tsx → AdminPhase2`; se eliminó la regresión que mostraba sólo el placeholder de migración.
- Test contractual agregado para impedir que el shell Admin vuelva a ocultar los módulos operativos durante la migración.
- Hugo Proveedor ahora espera el arranque real de Gemini Live antes de declarar “Te escucho”.
- Si Gemini Live falla durante setup, Proveedor cae al reconocimiento de voz del dispositivo cuando está disponible; el rechazo ya no queda como `unhandled_rejection`.
- TTS de Proveedor tiene corte rápido y fallback de voz del dispositivo; una respuesta lenta/429 de Gemini no debe dejar el orbe mudo.
- Un fallo de sesión Live resetea `voiceRunning` para permitir reintento con un solo toque.
- Sentinel TEST confirmó como P0 recientes los errores `Gemini Live setup timeout` / `Gemini Live cerró antes de completar setup` en revisiones publicadas anteriores; el fix queda pendiente de prueba física/publicación.
- `UGO Core CI`: SUCCESS para TypeScript, production build, core tests y lint.
- `UGO Isolated RPC RLS`: el código/build y los contratos pasan; el gate requerido falla por ausencia de las 6 credenciales TEST aisladas (Cliente/Proveedor/Admin email+password), por diseño fail-closed.
- Publicación automática Vercel: bloqueada por rate limit del plan. No confundir `main` validado con runtime publicado.

Pendientes de salida:
1. publicar un runtime que contenga este checkpoint cuando se libere el gate de hosting;
2. prueba física de Hugo Proveedor (Gemini Live + fallback + audio);
3. TWO-DEVICES / CHAT-REALTIME y FULL-E2E siguen requiriendo sesiones TEST reales;
4. no promover GO-LIVE mientras Sentinel/checklist mantengan gates P0 bloqueados.
