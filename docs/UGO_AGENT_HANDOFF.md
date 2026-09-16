# UGO — Agent Handoff

**Actualizado:** 16 de septiembre de 2026  
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
HEAD funcional/test previo a esta sincronización: c89a9bf7b8baacc949d0639371d87cbf9e78bc46
UGO Core CI run: 35052952138
conclusion: SUCCESS
319 tests/contratos + TypeScript/build + lints: verde
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
Oferta → Aceptar → Estoy yendo → Llegué → Empezar → Listo → Cobro/cierre
```

- online/offline reconcilia `disponible + online`.
- fallo confirmado de disponibilidad clasifica `MATCH-ONLINE` server-side.
- rechazo de oferta reconcilia `rechazada` exacta.
- GPS reconcilia `ultima_ubicacion_at` antes de incidente.
- Agenda debe contener todos los trabajos futuros/asignados; misión activa sólo selecciona el trabajo accionable.

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
1 confirmar HEAD después de esta sincronización documental
2 consultar Centinela para ese SHA
3 generar Android TEST del SHA final exacto
4 verificar VITE_APP_REVISION / bundleRuntime=local-dist / TEST
5 descargar y validar artifact
6 pasar a prueba física: dos sesiones/dispositivos
7 Cliente A+B+C + matching + cancelación
8 Proveedor Agenda + lifecycle + GPS
9 chat visual bidireccional/reconnect
10 pago/evidencia/rating
11 publicar sólo cuando corresponda
```

**No tocar Supabase PROD. No crear ramas. No Vercel para resolver QA Android.**
