# UGO — Development Readiness Master

**Versión:** 1.3 · 16 de septiembre de 2026  
**Objetivo:** una sola verdad medible para llegar al primer cliente real.  
**Fuente privada/autorizada:** `public.development_checklist` en UGO TEST.  
**Panel público:** `/?app=development`.

## 1. Regla principal

```text
código integrado                     → implemented
prueba técnica aplicable superada    → validated
aceptación/runtime requerido superado→ approved
prueba falla                         → failed
trabajo activo                       → in_progress
bloqueo externo comprobado           → blocked
```

Sólo `approved` cuenta en el porcentaje de preparación verificada.

## 2. Madurez de release

```text
IMPLEMENTED → CI VALIDATED → RUNTIME VALIDATED → PUBLISHED
```

CI no reemplaza runtime y un APK compilado no reemplaza prueba física.

## 3. Checkpoint exacto actual

```text
SHA funcional/test: c89a9bf7b8baacc949d0639371d87cbf9e78bc46
UGO Core CI run: 35052952138
conclusion: SUCCESS
```

Pasaron instalación reproducible, security gate, TypeScript/build, 319 tests/contratos, lint crítico, lint ClientApp y reporte global de lint. El harness autenticado Cliente/Proveedor/Admin sigue omitido cuando faltan sus seis credenciales TEST; ese skip no constituye runtime validation.

## 4. Hardening runtime incorporado en este checkpoint

- Actividad Cliente carga `service-history.css` en runtime y elimina la segunda fila duplicada de filtros.
- Rating: INSERT ambiguo se reconcilia por `servicio_id + cliente_id`; persistido = éxito, no verificable = telemetría P1, ausencia confirmada = fallo real.
- GPS Proveedor: UPDATE ambiguo verifica `ultima_ubicacion_at` exacta antes de reportar `MAP-GPS`.
- Disponibilidad Proveedor: online/offline reconcilia `disponible + online`; fallo confirmado se clasifica server-side como `MATCH-ONLINE`; recovery no verificable no contamina readiness.
- Rechazo de oferta: RPC ambiguo verifica la oferta exacta y su estado `rechazada` antes de incidente.
- Chat: cada intento lleva `clientMessageId`; se reconcilia por `serviceId + emisor + clientMessageId`; TEST tiene índice único parcial `mensajes_sender_client_message_id_uidx`; rechazo esperado por datos de contacto y offline/hidden no escalan a P0.
- Pago Cliente: carga/Realtime fallidos generan telemetría P1 `client.order.payment.sync` sólo foreground+online; `PAYMENT-CLOSE` P0 queda reservado al fallo de mutación confirmado tras recovery.
- Centinela sigue sin mutar `development_checklist`.

## 5. Development público

`/?app=development` permanece público, sin login y read-only. Sólo consume vistas sanitizadas y señal realtime no sensible. Las tablas privadas, evidencia completa, stack, metadata, reporter IDs y `serviceId` de incidentes no se exponen.

Los incidentes se separan por `runtimeRevision`; históricos/unversioned no bloquean el build actual.

## 6. Estado de readiness que NO debe inflarse

Mantener sin promoción hasta evidencia real:

```text
CHAT-REALTIME = implemented
CLIENT-ACTIVITY-UX = implemented
MAP-GPS = implemented
RATING = implemented
TWO-DEVICES = blocked
FULL-E2E = blocked
GO-LIVE = blocked
```

`MATCH-ONLINE` y `PAYMENT-CLOSE` pueden conservar su estado técnico validado existente; esto no sustituye el smoke UI/físico del candidato final.

## 7. P0 chat

No cerrar hasta demostrar con dos sesiones reales y el mismo `serviceId`:

1. Cliente → Proveedor visible realtime.
2. Proveedor → Cliente visible realtime.
3. reload/reconnect rehidrata historial.
4. quick replies funcionan en ambas superficies.
5. contacto off-platform se bloquea.
6. pedido A no mezcla mensajes con B/C.

Persistencia DB e idempotencia server-side no sustituyen esta prueba.

## 8. P0 multi-pedido

Caso mínimo:

```text
A Electricista
B Plomero sin cerrar A
C Limpieza sin cerrar A/B
```

Debe demostrar IDs distintos, Actividad A+B+C, apertura exacta por `serviceId`, cancelación selectiva de B y A/C intactos.

## 9. Próximo gate

Generar Android TEST del **SHA final exacto**, verificar `VITE_APP_REVISION`, instalar en dos sesiones/dispositivos y ejecutar Cliente → matching → asignación → chat → lifecycle → pago/cierre/rating, incluyendo A+B+C y recuperación offline/reconnect.

**Supabase PROD permanece fuera de alcance. No crear ramas. No aprobar checklist por código o CI solamente.**
