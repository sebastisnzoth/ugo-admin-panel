# UGO — Data & Backend Master

**Versión:** 2.6 · 20 de septiembre de 2026  
**Estado:** contrato maestro de datos, Supabase y backend  
**Rama de verdad:** `main`

> PostgreSQL/Supabase es la fuente persistente de verdad operacional. La UI interpreta estado; no lo inventa.

---

# 1. Principios

- un solo `serviceId` para Cliente, Proveedor y Admin;
- RLS por rol, ownership y participación;
- RPC/transacción para transiciones críticas;
- Realtime refleja cambios persistidos;
- Storage sensible privado;
- migraciones versionadas;
- DEMO y REAL explícitos;
- dinero y estados críticos auditables e idempotentes;
- toda escritura crítica valida actor + estado anterior + precondiciones;
- secretos nunca vuelven al navegador;
- credencial almacenada, configuración presente, feature habilitada y E2E validado son estados distintos.

---

# 2. Dominios

```text
Auth/Identidad · Clientes · Proveedores/KYC · Categorías
Servicios · Matching/Ofertas · Tracking · Pagos · Ledger/Comisiones
Retiros · Evidencias · Ampliaciones · Disputas · Calificaciones
Notificaciones · Scout/Analytics · Hugo · Academia · Auditoría
Integraciones/credenciales
```

---

# 3. Estado de servicio

```text
borrador → buscando → ofrecido → asignado
→ en_camino → llegado → en_progreso
→ esperando_aprobacion → completado
```

Excepciones: `cancelado`, `disputado`.

La preparación financiera no agrega estados artificiales al servicio. Para `asignado → en_camino`:

```text
electrónico = retenido/protegido + referencia verificable
O
efectivo = método presencial explícitamente seleccionado
```

---

# 4. Estado operacional del proveedor

```text
offline → available → opportunity_pending → assigned
→ busy → completion_pending → available
```

No mezclar con el lifecycle del servicio.

---

# 5. Matching

`ofertas_servicio` representa oportunidades concretas. Demanda agregada es analítica separada.

Contrato:

```text
serviceId → oferta → proveedor autorizado
→ aceptación atómica → asignación única
→ tarifa real + comisión + neto
→ invalidación de competidoras
```

Producción fue verificada sin servicios asignados ni ofertas pendientes con tarifa inválida al cerrar el hardening del 11/09/2026.

---

# 6. Pagos

## Electrónico

```text
pendiente → autorizado → retenido/protegido
→ liberación pendiente → liberado/pagado
```

Requiere referencia externa, importe/moneda reconciliados server-side, webhook idempotente, duplicados seguros y reembolso/liberación auditables.

## Efectivo

```text
seleccionado → presencial pendiente
→ proveedor marca TRABAJO LISTO
→ cliente aprueba el trabajo
→ cliente entrega el efectivo y confirma “YA PAGUÉ”
→ registrado/liberado + servicio completado + notificación al proveedor
```

Efectivo nunca se representa como custodia electrónica UGO. El proveedor no confirma el cobro desde su app: el cierre lo confirma el cliente después de aprobar el trabajo. La RPC canónica es `confirmar_pago_efectivo_cliente(serviceId)`.

## Lock de método

Una vez elegido un método válido no se sustituye silenciosamente mientras siga activo; recuperación sólo para intento fallido o contrato backend explícito.

---

# 7. Ledger / comisiones

Cada obligación financiera debe explicar:

```text
origen · serviceId · método · bruto · comisión UGO · neto proveedor
estado · fecha · referencia
```

El saldo UI nunca es autoridad suficiente para retiro.

---

# 8. Evidencia de solicitud

Cliente carga evidencia vinculada inequívocamente a draft/request; luego solicitud/matching/proveedor autorizado. Validar MIME, tamaño, ownership y signed URLs.

P0: eliminar asociaciones ambiguas de evidencia huérfana.

---

# 9. Evidencia operacional

```text
llegado              → Antes
en_progreso          → Durante / Después
esperando_aprobacion → Después sólo recuperación histórica
```

Reglas backend:

- `Antes` fuera de `llegado`: rechazado;
- `Durante` fuera de `en_progreso`: rechazado;
- `Después` antes de `en_progreso`: rechazado;
- iniciar exige evidencia inicial del proveedor asignado;
- solicitar finalización exige evidencia final real;
- `storage_path` no vacío.

Migración vigente: `20260911215500_service_evidence_state_guard.sql`.

---

# 10. Tracking y llegada

Durante `en_camino`, proveedor actualiza ubicación por RPC y Cliente consulta tracking autorizado del mismo `serviceId`.

Cuando existe coordenada exacta y no aplica excepción, `en_camino → llegado` exige proximidad backend. Radio vigente: **200 m**.

---

# 11. Ampliaciones

```text
propuesta pendiente → aprobada / rechazada / cancelada
```

Datos mínimos: `serviceId`, autor, descripción, costo, tiempo, estado, resolución, impacto de pago y timestamps.

Contrato financiero:

```text
monto_extra = 0 → puede aprobarse
sin pago → incorpora monto antes del checkout
efectivo pendiente → reajusta servicio + pago
pago fallido/reembolsado → reajusta siguiente intento
pago electrónico activo + extra > 0
→ checkout separado del delta
→ webhook valida monto/moneda
→ confirmar_pago_ampliacion incorpora delta/comisión/neto
→ aprobada + incluido
```

El pago base no se reescribe. La ampliación registra estado/procesador/referencia/monto/moneda del ajuste. Reembolso posterior devuelve `pago_estado` a `pendiente_ajuste` y bloquea cierre hasta conciliación.

Migraciones vigentes:

- `20260911222000_service_expansion_payment_guard.sql`
- `20260911224500_expansion_electronic_checkout.sql`

P0 restante: E2E real de retry/webhook duplicado/reembolso + convergencia Realtime.

---

# 12. Disputas

Toda disputa conserva `serviceId`, actor, motivo, cronología, evidencia, método de pago, impacto financiero, resolución y admin responsable. La resolución financiera depende de fondos realmente custodiados.

---

# 13. Realtime

Dominios principales: `servicios`, `ofertas`, `pagos`, `notificaciones`, `ampliaciones`, evidencias cuando aplique.

Reglas: filtros por usuario/servicio, cleanup, reconexión/refetch, sin autorización implícita y persistencia confirmada antes de considerar mutación real.

---

# 14. RLS objetivo

```text
                     Cliente      Proveedor       Admin/Super
perfil propio          RW            RW              R*
servicio propio        RW            R/RW*           RW
oferta                 R*            RW propia       RW
pago                   R             R propia        RW
evidencia solicitud    RW            R autoriz.      R
evidencia servicio     R             RW autoriz.     RW
disputa propia         RW            RW propia       RW
KYC sensible           limitado      limitado        autorizado
config global          -             -               RW privilegiado
```

Debe verificarse con pruebas positivas y negativas.

---

# 15. Admin / Super Admin

La UI puede ocultar acciones, pero autorización real vive server-side/RLS/RPC. Acciones críticas dejan actor, acción, recurso, antes/después, motivo y timestamp.

## Integraciones y credenciales

UGO distingue cuatro niveles:

```text
1 credencial almacenada
2 configuración disponible en runtime
3 feature habilitada
4 integración validada E2E
```

No son equivalentes.

### Bóveda privada

`private.payment_credentials` almacena credenciales administrables. Los RPC:

```text
admin_payment_credentials_status
admin_set_payment_credentials
admin_clear_payment_credentials
```

exigen `private.is_admin(auth.uid())`. `admin_payment_credentials_status()` devuelve sólo metadata (`provider`, país, entorno, enabled, configured, updated_at), nunca secretos.

La migración `20260911230000_admin_payment_credentials_status_fix.sql` está aplicada en producción. Reemplaza una dependencia no portable de `jsonb_object_length` por comparación segura con `{}` y mantiene `public/anon` revocados.

Al momento de la auditoría del 11/09/2026, la bóveda privada tenía **0 filas configuradas**. Eso no permite inferir si Vercel posee variables de entorno; son fuentes distintas.

### Runtime real actual

Los adapters server-side consumen actualmente variables de entorno, no la bóveda privada:

```text
Mercado Pago BR → MERCADO_PAGO_ACCESS_TOKEN
Pix direto      → UGO_PIX_KEY
OpenPix         → OPENPIX_SANDBOX_APP_ID + PAYMENTS_OPENPIX_ENABLED
Hugo Voice      → OPENAI_API_KEY
WhatsApp        → WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID
```

Mercado Pago Argentina permanece bloqueado por el router en esta fase aunque exista flag declarada.

`api/admin/integrations-status.ts` verifica Admin/Super Admin y expone únicamente metadata segura del runtime. Nunca devuelve valores secretos.

**Regla:** una credencial guardada en el panel no debe mostrarse como “integración activa” mientras el adapter productivo no la consuma realmente.

P1 arquitectónico: unificar resolución de credenciales server-side (bóveda segura con auditoría/rotación + fallback controlado) antes de depender operacionalmente del editor de credenciales Admin.

---

# 16. Privacidad y geolocalización

Minimizar coordenadas por rol. Cliente recibe proveedor/ETA necesarios; Proveedor ve destino autorizado; Admin sólo según privilegio; Scout usa agregados preferentemente.

---

# 17. Atomicidad obligatoria

RPC/transacción/constraint para:

```text
aceptar oportunidad · asignar proveedor · estados críticos
aprobar ampliación · confirmar pago/efectivo/ampliación
liberar/reembolsar · cerrar servicio · retiro · disputa financiera
```

Bloquear doble click sólo es defensa UX.

---

# 18. Eventos conceptuales

```text
service.requested · match.offered · match.accepted · service.assigned
payment.method_selected · payment.authorized · payment.protected
provider.on_the_way · provider.arrived · service.started
expansion.proposed · expansion.payment_adjustment_required
expansion.payment_adjusted · expansion.resolved
service.completion_requested · service.approved · payment.released
cash.received · service.disputed · service.completed
```

---

# 19. Definition of Done backend

```text
migración versionada
schema/constraints
RLS
RPC/API
actor permitido + denegado
happy path + error + retry
idempotencia/concurrencia
Realtime/Storage si aplica
auditoría financiera si aplica
tests ejecutables
maestros + Roadmap actualizados
```

Para integraciones externas: metadata segura, secretos server-side, feature state explícito, observabilidad, retry y evidencia E2E cuando corresponda.

---

# 20. Regla final

**Si frontend y backend difieren, se corrige el contrato completo; nunca se maquilla una inconsistencia sólo en la UI.**

---

# 21. Trazabilidad Admin/Super Admin y reputación bilateral · 20/09/2026

## Historial completo por `serviceId`

Admin y Super Admin deben poder reconstruir un servicio de punta a punta sin depender de la pantalla operativa de Cliente o Proveedor. La vista administrativa consume la misma realidad persistida y une, por `serviceId`:

```text
servicios
+ evidencias_solicitud / request-evidence
+ evidencias_servicio / service-evidence
+ eventos_servicio (histórico legacy)
+ servicio_estado_eventos (auditoría actual)
+ pagos
+ resenas
```

La cronología conserva actor, rol, estado anterior/nuevo, motivo y timestamps disponibles. Las fotos de solicitud quedan vinculadas al servicio por `request_draft_id`; las evidencias operativas mantienen ownership y signed URL privada. Admin no duplica archivos ni crea una fuente de verdad paralela.

`eventos_servicio` conserva el historial anterior a `servicio_estado_eventos`; su lectura para `authenticated` queda limitada por la RLS participante/Admin ya existente.

## Reputación bilateral

Un servicio completado admite como máximo dos reseñas direccionales:

```text
cliente  → proveedor   autor_tipo = cliente
proveedor → cliente    autor_tipo = proveedor
```

La unicidad vigente es `(servicio_id, autor_tipo)`, no `servicio_id` aislado. RLS valida que el actor autenticado sea exactamente el cliente o proveedor del servicio completado y sólo pueda emitir su propia dirección.

Las reseñas históricas previas a este contrato se interpretan como `autor_tipo='cliente'`.

## Historial por usuario

La ficha Admin/Super Admin de una persona debe componer, según rol y permisos: alta, último acceso, estado de cuenta, perfil, servicios como cliente/proveedor, documentos canónicos de `documentos`, calificaciones emitidas y recibidas y sus timestamps. Todo enlace conserva el `serviceId` original.


---

# 22. Reparación Admin operacional · 20/09/2026

El panel Admin/Super Admin recupera contratos reales para mapa, Scout, KYC y Finanzas sin fuentes paralelas:

```text
mapa_operativo_usuarios      vista security_invoker · Admin only
mapa_operativo_servicios     vista security_invoker · Admin only
vista_todos_proveedores      vista security_invoker · Admin only
prospectos_scouts            tabla RLS Admin only
documentos                   fuente canónica de KYC
pagos                        fuente canónica de conciliación PIX
```

Las vistas del mapa se derivan de `usuarios`, `perfiles_proveedor`, `categorias` y `servicios`; no exponen datos a `anon`. Scout usa la sesión Supabase actual, envía bearer Admin al backend protegido y persiste prospectos sólo bajo RLS administrativa.

`prospectos_scouts` conserva fuente externa, categoría, teléfono/contacto, coordenadas, score, estado y timestamps de contacto/aprobación. Los estados administrativos son `prospecto_pendiente`, `invitado`, `aprobado` y `rechazado`.

KYC usa `documentos` y Storage privado; las vistas firmadas son temporales. La decisión individual registra revisor/timestamp y no reemplaza la decisión general del proveedor.

PIX directo mantiene el RPC protegido `conciliar_pix_direto`; la UI sólo presenta y valida pagos reales `ambiente=real`, exige referencia E2E al aprobar y motivo al rechazar.

### Extensión de la ficha administrativa por `serviceId`

La reconstrucción administrativa también consume las fuentes canónicas ya existentes:

```text
mensajes                    chat Cliente ↔ Proveedor ligado al serviceId
mapa_operativo_servicios    última posición persistida disponible para Admin
disputas                    expediente de reclamo/disputa
disputa_mensajes            conversación y evidencias del expediente
```

No se crea una tabla paralela. `private.es_participante_servicio()` incluye a Admin para lectura del chat y la RLS de disputas permite lectura administrativa. La UI trata chat, ubicación y expediente como capas secundarias: una falla de una de estas fuentes no elimina cronología, pagos, evidencia o reputación ya disponibles.

### Cierre Cliente y campos protegidos de Proveedor

Las RPC ejecutadas por Cliente para aprobar/cerrar un servicio no actualizan `usuarios.servicios_completados` del Proveedor. Ese campo está protegido por `trg_00_usuario_sensitive_guard` y una escritura cruzada debe seguir siendo rechazada. La autoridad del conteo es `servicios.estado='completado'`; cualquier materialización/analytics derivada debe ejecutarse por una ruta administrativa segura, nunca dentro de la transacción Cliente de pago/cierre.



---

# 23. Efectivo, saldo proveedor y deuda UGO · 20/09/2026

El efectivo se contabiliza separado de la custodia digital.

```text
pagos.metodo = efectivo + estado liberado
        │
        ├── monto_bruto           = dinero entregado directamente al proveedor
        ├── comision_ugo          = comisión económica del servicio
        ├── ganancia_proveedor    = neto económico después de comisión
        └── deudas_ugo_proveedor  = cuenta por cobrar de UGO
```

`deudas_ugo_proveedor` tiene una fila única por `pago_id`, RLS proveedor/Admin, saldo generado y estados `pendiente/informado/parcial/pagado/anulado`.

El proveedor puede informar una referencia con `informar_pago_deuda_ugo`, pero eso no cancela la deuda. Sólo Admin/Super Admin puede conciliarla con `admin_confirmar_deuda_ugo_pagada`, que exige referencia y genera auditoría.

Los pagos en efectivo liberados no deben participar del saldo retirable del proveedor. El saldo UGO sólo incluye ganancias de pagos digitales liberados.

La migración también recupera los cobros en efectivo históricos ya confirmados. En TEST al momento del despliegue se reconciliaron contablemente 7 cobros existentes: R$ 880,00 cobrados por proveedores y R$ 132,00 de comisión UGO pendientes.

## Snapshot de tarifa

Cuando el pedido contiene `metadata.tariff_quote.precio_referencia`, `private.apply_service_pricing_snapshot` congela ese importe en `servicios.tarifa`, calcula comisión/neto y lo vuelve a aplicar en el momento de asignación. Esto evita que `tarifa_ofrecida` o `perfiles_proveedor.tarifa_base` reemplacen silenciosamente la cotización que vio el cliente.


# 24. Límite de deuda UGO del Proveedor · 20/09/2026

La elegibilidad de matching incorpora la deuda de comisión por efectivo sin modificar trabajos ya asignados:

```text
unresolved_real_debts = count(deudas_ugo_proveedor where saldo_pendiente > 0 and estado not in pagado/anulado)
blocked = unresolved_real_debts >= 3
```

Cuando `blocked=true` el backend:

- fuerza `perfiles_proveedor.online=false` y `disponible=false`;
- expira ofertas pendientes del proveedor;
- impide volver Online mientras persista el bloqueo;
- rechaza cualquier nueva asignación en `servicios.proveedor_id`;
- conserva intactos los servicios previamente asignados para que puedan completarse.

La defensa de asignación es transversal y no depende de que la UI o un flujo concreto use `aceptar_oferta`. El desbloqueo ocurre cuando quedan menos de tres deudas reales abiertas; la vuelta Online es manual. No se expone un RPC público adicional de estado: la UI deriva el contador desde las deudas que ya puede leer por RLS.

`api/test?ugo_debt=1` genera un Pix server-side dentro de la función consolidada de UGO únicamente para la deuda autenticada y usa `UGO_PIX_KEY`. No muta el estado financiero. `informar_pago_deuda_ugo` registra la referencia, y `admin_confirmar_deuda_ugo_pagada` conserva la autoridad de conciliación.


# 25. Alertas Cliente ↔ Proveedor en tiempo real · 20/09/2026

Las acciones operativas del servicio convergen por el mismo `serviceId`.

- cambios de estado de `servicios` generan notificaciones deduplicadas al Cliente: asignado, en camino, llegado, iniciado, listo para aprobar, completado, cancelado y disputado;
- cada INSERT canónico en `public.mensajes` genera `chat_mensaje` para la contraparte mediante `private.notificar_mensaje_servicio()`;
- `public.notificaciones` es la fuente única para alerta foreground, Realtime y Web Push; no existe una cola paralela de chat;
- el Cliente muestra alerta accionable y sonido/vibración foreground para estados críticos y chat; al tocarla abre el `serviceId` exacto;
- Web Push continúa saliendo desde `trg_enqueue_push_for_notification` cuando el usuario activó avisos del navegador.

El sonido foreground depende de que el navegador haya permitido AudioContext después de una interacción del usuario; si la app está cerrada, el aviso depende del permiso Web Push del dispositivo.


## Push bidireccional Cliente ↔ Proveedor

Toda fila nueva de `public.notificaciones` se enriquece server-side con el rol canónico del destinatario (`client` o `provider`) antes de entrar a `push_entregas`. El Service Worker usa ese rol y, cuando existe, el `servicio_id` para abrir la app correcta desde una notificación del sistema.

El mismo canal cubre chat, asignación, recorrido del proveedor, llegada, inicio, aprobación/cierre, cancelación, disputa y eventos de pago. En foreground, Cliente y Proveedor reciben banner, vibración y tono; en background/cerrado, Web Push depende de una suscripción autorizada por el usuario. La UI muestra una acción visible `Activar notificaciones` mientras el dispositivo no esté suscripto.


# 26. Google Calendar Proveedor · 20/09/2026

UGO mantiene `servicios.programado_para` y el lifecycle persistido como única fuente de verdad. Google Calendar es un espejo opcional.

- `proveedor_calendar_conexiones`: OAuth server-only, RLS cerrada a navegador;
- `proveedor_calendar_eventos`: mapa idempotente `serviceId → google_event_id`;
- create/update/delete se exponen por `/api/calendar/sync`; en Vercel Hobby las rutas Calendar se reescriben a la función física consolidada `api/test.ts` para respetar el límite de serverless functions;
- una cancelación o eliminación de programación retira el evento Google; el historial permanece en UGO;
- el bridge Proveedor resincroniza al abrir/volver online/foreground y cada cinco minutos mientras la app está activa;
- si Google falla, no cambia el estado del servicio ni bloquea el trabajo.

Para runtime hacen falta credenciales OAuth Web y redirect URI en el entorno server-side.

# 27. Disputas v2 · reglas, snapshot e IA

`reglas_motivos_disputa` define actor, severidad, ventana y obligación humana. `abrir_disputa_v2` valida la regla, captura `snapshot` antes de mutar el servicio, escala acuerdos pendientes y conserva el expediente del mismo `serviceId`.

`acuerdos_previos_disputa` registra una propuesta amistosa antes del caso formal sin alterar dinero por sí sola. Los adjuntos viven en el bucket privado `dispute-evidence` con ruta `serviceId/userId/file`.

`disputa_ai_analisis` es server-only. Gemini recibe snapshot, hilo y hasta seis imágenes disponibles para producir soporte de decisión. El resultado no resuelve el caso, no mueve dinero y no es visible a participantes como decisión oficial. El Reglamento canónico está en `docs/UGO_DISPUTE_RULES_MASTER.md`.


## Validación 20/09/2026

UGO TEST confirma la separación de privilegios del bloque nuevo: conexiones/tokens Calendar son server-only; el bucket `dispute-evidence` es privado; existen 14 motivos activos; el RPC legacy `abrir_disputa(uuid,text,jsonb)` ya no es ejecutable por `authenticated`; `abrir_disputa_v2` sí lo es; y los análisis IA no pueden ser leídos directamente por usuarios finales. El health de Gemini publicado responde OK. La validación Calendar completa requiere todavía OAuth Google real y no se simula.


# 26. Admin Control Center Realtime y ficha 360° · 20/09/2026

El Admin no depende de cambiar de pestaña ni de pulsar “Actualizar” para observar cambios operativos.

```text
servicios / pagos / perfiles / deuda / eventos
                 │
                 ├── Supabase Realtime
                 │      └── resync desde persistencia
                 │
                 └── fallback visible/online cada 8–15 s
```

Principios:

- Realtime sólo dispara resincronización; la verdad sigue siendo la fila persistida del `serviceId`.
- El panel de servicios escucha `servicios`, `servicio_estado_eventos`, `perfiles_proveedor`, `pagos`, `deudas_ugo_proveedor` y cambios de usuarios.
- Si el canal entra en `CHANNEL_ERROR` o `TIMED_OUT`, Admin muestra estado degradado, vuelve a suscribirse y conserva polling de recuperación.
- La ficha **360°** conserva un único `serviceId` y reúne timeline/auditoría, Cliente, Proveedor, pago, deuda UGO, evidencias, calificaciones, chat, ubicación persistida y disputas.
- Las fuentes de auditoría/360 (`servicio_estado_eventos`, `eventos_servicio`, `evidencias_solicitud`, `resenas`, `deudas_ugo_proveedor`, `disputa_mensajes`) están publicadas en `supabase_realtime` cuando existen.
- El centro de Alertas combina alertas persistidas con excepciones derivadas únicamente de datos reales: matching demorado, estado que requiere proveedor sin `proveedor_id`, traslado prolongado, aprobación demorada, disputa y bloqueo de proveedor por deuda UGO.
- Las alertas derivadas no cambian estados ni dinero automáticamente; sirven para priorizar intervención administrativa.


# 28. Snapshot GPS del pedido Cliente · 20/09/2026

`public.guardar_ubicacion_servicio_cliente(p_servicio_id, p_lat, p_lng)` es la frontera canónica para congelar la ubicación específica de un pedido antes del matching.

La función:

- exige `auth.uid()`;
- verifica que el actor sea el `cliente_id` del mismo `serviceId`;
- valida rangos de latitud/longitud;
- rechaza servicios terminales;
- escribe `servicios.ubicacion_cliente` como geography SRID 4326;
- mantiene `perfiles_cliente.ubicacion` sólo como fallback histórico de tracking;
- es ejecutable por `authenticated` y no por `anon`.

`SupabaseDispatchProvider.start()` intenta este snapshot antes de `iniciar_matching`. Un fallo de geolocalización no borra ni duplica el pedido: se reporta como `MAP-GPS` y el matching puede continuar.


## Procedencia de coordenadas por pedido

El borrador Cliente conserva `pickupLat`, `pickupLng` y `pickupSource = current | saved | manual`.

Reglas:

- `current`: coordenadas obtenidas por Geolocation API para esa selección;
- `saved`: sólo hay coordenadas si `direcciones_cliente.latitud/longitud` no son nulas y son finitas;
- `manual`: coordenadas nulas hasta que exista una geocodificación explícita;
- el dispatch canónico usa `pickupFallback='none'`, evitando que una ubicación global anterior sea atribuida a una dirección distinta;
- `null` se valida antes de conversión numérica para impedir que JavaScript lo transforme en `0`.

Esto preserva integridad geográfica para ranking por distancia y para el gate backend de llegada a 200 m.
## Scout Gmail · datos y permisos (2026-09-22)

- `scout_gmail_conexiones`: singleton de la cuenta remitente de Scout; contiene email, refresh token, scope y admin que conectó la cuenta.
- `scout_email_envios`: auditoría server-only de destinatario, asunto, IDs de Gmail, estado, error y admin remitente.
- Ambas tablas tienen RLS habilitado, sin grants para `anon` ni `authenticated`; sólo `service_role` puede leer o mutar tokens/auditoría.
- Un envío exitoso actualiza el mismo `prospectos_scouts`: `ultimo_canal=email`, intentos, timestamps y próximo seguimiento. `no_contactar` y `rechazado` bloquean el envío server-side.

