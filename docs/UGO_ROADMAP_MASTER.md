# UGO — Roadmap Master

**Versión:** 3.5 · 20 de septiembre de 2026  
**Estado:** tablero maestro vivo de ejecución  
**Rama de verdad:** `main`

> **Un pedido. Un profesional. Sin vueltas.**

## 1. Madurez

```text
IMPLEMENTED → CI VALIDATED → RUNTIME VALIDATED → PUBLISHED
```

## 2. Checkpoint actual

```text
c89a9bf7b8baacc949d0639371d87cbf9e78bc46
UGO Core CI run 35052952138 → SUCCESS
319 tests/contratos + build + lints → verde
```

## 3. Bloque endurecido

- Actividad Cliente carga su CSS real y ya no duplica filtros de estado.
- Rating reconcilia INSERT ambiguo antes de Sentinel.
- GPS Proveedor reconcilia timestamp persistido antes de fallo.
- disponibilidad online/offline reconcilia backend y clasifica fallo confirmado como `MATCH-ONLINE`.
- rechazo de oferta reconcilia la oferta exacta.
- chat usa `clientMessageId`, recovery exacto e índice idempotente server-side en TEST.
- chat no trata contact guard esperado ni offline/hidden como P0.
- pagos separan mutación crítica de errores de sincronización/realtime.
- Centinela mantiene aislamiento por revisión y nunca aprueba checklist.

## 4. P0 inmediato

```text
[✅] Core CI exacto verde en c89a9bf…
[🟡] Development público/read-only → falta smoke del candidato final
[🟡] CHAT-REALTIME → hardening completo; falta dos sesiones reales
[🟡] multi-pedido A+B+C → contratos verdes; falta runtime real
[🟡] matching/radar/cancelación → recovery protegido; falta E2E
[🟡] Proveedor Agenda/lifecycle → contratos verdes; falta físico
[🟡] GPS → persistencia protegida; falta permiso/GPS real
[🟡] Rating → recovery protegido; falta post-servicio real
[🟡] Android HEAD exacto → generar artifact del SHA final
[⛔] TWO-DEVICES / FULL-E2E / GO-LIVE → evidencia externa pendiente
```

## 5. Cliente

| Área | Estado | Próximo cierre |
|---|---|---|
| Solicitud guiada | 🟡 | E2E real |
| Matching | 🟡 | proveedor / cero proveedor / timeout / retry / cancel |
| Online/cards | 🟡 | smoke UI real |
| Multi-pedido | 🟡 | A+B+C con IDs reales |
| Actividad/detalle | 🟡 | validación visual móvil |
| Chat | 🟡 | dos sesiones bidireccionales |
| Tracking/GPS | 🟡 | dispositivo real |
| Pago | 🟡 | E2E por método |
| Rating | 🟡 | post-servicio real |

## 6. Proveedor

| Área | Estado | Próximo cierre |
|---|---|---|
| Disponibilidad | 🟡 | UI/runtime real |
| Oportunidades | 🟡 | E2E |
| Aceptar/rechazar | 🟡 | runtime real |
| Agenda | 🟡 | varios trabajos + serviceId exacto |
| En camino/Llegué/Empezar/Listo | 🟡 | lifecycle físico |
| Chat | 🟡 | proveedor→cliente visible realtime |
| Evidencia | 🟡 | cámara/Storage real |
| Cobro/cierre | 🟡 | method-aware E2E |

## 7. Orden de ejecución UGO A

```text
1 generar Android TEST del SHA final exacto
2 validar metadata/revisión embebida
3 smoke Development + Sentinel del mismo build
4 E2E Cliente request→matching→asignación
5 chat bidireccional exact serviceId
6 A+B+C + cancelación selectiva
7 Proveedor Agenda + lifecycle + GPS
8 pagos/evidencia/rating
9 dos Android físicos
10 publicar sólo cuando corresponda
```

## 8. Track paralelo UGO B — AI Studio

Contrato: `docs/UGO_DUAL_IMPLEMENTATION_MASTER.md`.

UGO B (`sebastisnzoth/UGO-PRODUCCION`) avanza en paralelo sin detener este orden. Comparte el contrato Supabase TEST, no crea otro backend y no toca PROD para habilitar la competencia.

Orden inicial de UGO B:

```text
B1 shell responsive móvil
B2 entrypoint de producto sin demo obligatoria
B3 configuración Supabase TEST por env
B4 capa backend/sesión/roles
B5 request persistido + serviceId
B6 online/matching/aceptación
B7 chat bidireccional realtime
B8 lifecycle + Actividad
B9 cancelación + multi-pedido
B10 cierre + rating
```

Ciclo de aprendizaje:

```text
A demuestra mejora compatible → evaluar/portar a B
B demuestra mejora compatible → evaluar/portar a A
fallo de contrato común        → corregir una vez en backend/maestros
```

Milestone comparable: ambos ejecutan con datos TEST reales `login → pedido → matching → aceptación → chat → lifecycle → completar → rating`, más cancelación selectiva, multi-pedido, reload/reconnect y móvil sin superposición crítica.

## 9. Gates

```text
TWO-DEVICES = BLOCKED
FULL-E2E = BLOCKED
GO-LIVE = BLOCKED
```

Persistencia DB, contratos verdes y APK compilado no sustituyen evidencia física.

UGO B tampoco puede usar mocks o navegación local como sustituto de runtime real para declararse comparable.

## 10. Regla económica transversal

Objetivo: **costo directo $0** mientras los recursos gratuitos verificados lo permitan.

No habilitar gasto o infraestructura paga para acelerar A o B sin autorización explícita. Antes de sumar un servicio externo, verificar pricing/free tier actual y alternativa gratuita. La competencia no justifica duplicar infraestructura.

## 11. Regla final

**El siguiente avance real de UGO A sigue siendo convertir el checkpoint CI VALIDATED en evidencia runtime del mismo SHA, no sumar features. UGO B puede avanzar en paralelo para demostrar una experiencia mejor sobre el mismo contrato TEST; ninguna implementación puede fingir persistencia, frenar a la otra ni crear una segunda realidad UGO.**

No tocar Supabase PROD. No crear ramas. No desplegar web sólo para trazabilidad de QA.


---

## 12. Checkpoint 20/09/2026 · trazabilidad Admin + rating bilateral

Implementado en `main`:

- ficha completa de servicio Admin/Super Admin con cronología, request evidence, evidencia operativa, pagos y calificaciones;
- historial legacy `eventos_servicio` fusionado con `servicio_estado_eventos`;
- ficha completa por usuario con alta, acceso, servicios, documentos y reputación;
- `resenas` permite dos direcciones por servicio mediante `autor_tipo`;
- Cliente mantiene visible la calificación post-servicio sin depender de una pantalla secundaria;
- Proveedor puede calificar al Cliente y el prompt se difiere mientras exista misión activa;
- RLS de ambas direcciones validada con actor Cliente y actor Proveedor sobre servicio completado;
- lectura de historial legacy habilitada a `authenticated` bajo RLS de participante/Admin.

Estado de madurez del bloque:

```text
Backend migration             APPLIED en UGO TEST
RLS bilateral                 VALIDATED con transacciones rollback
UI/código                     IMPLEMENTED en main
Vercel/build                  validar SHA final del bloque
E2E dos dispositivos          pendiente
rating post-servicio real     pendiente
cámara/evidencia física       pendiente
```

Este bloque no elimina los gates TWO-DEVICES / FULL-E2E / GO-LIVE.


---

## 13. Checkpoint 20/09/2026 · reparación Admin operacional

Cerrado en código/backend y validado por CI:

- restauradas `mapa_operativo_usuarios`, `mapa_operativo_servicios` y `vista_todos_proveedores` como vistas Admin-only;
- el mapa deja de depender de una relación inexistente y muestra fallback/reintento sin error SQL crudo;
- creado `prospectos_scouts` con RLS Admin-only;
- Scout migrado del proyecto Supabase hard-coded viejo a la sesión UGO actual + bearer Admin;
- Scout guarda prospectos, registra contacto/aprobación y enlaza Outreach con Hugo/WhatsApp;
- Personas → Verificación incorpora documentos enviados, archivos faltantes, vista privada y aprobación/rechazo por documento;
- Finanzas → PIX rediseñado inline con KPIs, estados vacíos y contexto de servicio/cliente/proveedor;
- botón `Actualizar` y contención de módulos corregidos;
- Super Admin degrada a datos parciales si falla una consulta secundaria y las cards de gobierno quedan compactas;
- contratos automáticos nuevos para mapa/Scout y KYC documentos.

Evidencia técnica del bloque antes de sincronizar estos maestros:

```text
Supabase TEST map views       VALIDATED como Super Admin
Scout INSERT/RLS              VALIDATED dentro de ROLLBACK
Core CI c99ff7fd              PASS
Vercel c99ff7fd               READY
```

No se marca APPROVED visual/E2E hasta prueba real en navegador/dispositivo con sesión Admin.

---

## Checkpoint · trazabilidad Admin extendida · 20/09/2026

- `Operaciones → Servicios → Ver / Editar` conserva el historial existente y suma chat canónico, última ubicación persistida y expediente de disputas/reclamos sobre el mismo `serviceId`.
- La extensión reutiliza `mensajes`, `mapa_operativo_servicios`, `disputas` y `disputa_mensajes`; no crea una fuente paralela.
- Chat/ubicación/reclamos degradan con aviso si una fuente secundaria falla, sin ocultar cronología, pagos, evidencias o reputación.
- Contrato `admin-complete-trace` ampliado para cubrir las cuatro fuentes nuevas.

---

## Checkpoint · cierre efectivo Cliente P0 · 20/09/2026

- Detectada regresión en `confirmar_pago_efectivo_cliente(serviceId)`: el cierre ejecutado por Cliente intentaba actualizar `usuarios.servicios_completados` del Proveedor.
- `trg_00_usuario_sensitive_guard` rechazaba correctamente esa escritura cruzada con `ADMIN_REQUIRED`, revirtiendo pago + cierre completos.
- El cierre canónico vuelve a mutar sólo `servicios` + `pagos`; `servicios` permanece fuente de verdad de trabajos completados.
- Se corrige también la rama electrónica de `aprobar_servicio_impl` para evitar la misma regresión.
- Contrato automático agregado para impedir futuras escrituras del Cliente sobre el perfil protegido del Proveedor.

---

## Checkpoint · Orbe Hugo Cliente · 20/09/2026

- Orbe habilitado desde Inicio/Solicitud; en reposo no despliega el panel conversacional sobre la interfaz.
- Browser voice usa MediaRecorder + transcripción Gemini autenticada y muestra la voz convertida a texto.
- Categoría/problema hablado puede iniciar pedido sin frase mágica; Hugo pregunta únicamente datos faltantes.
- Confirmación explícita persiste un único `serviceId` en `buscando` y ejecuta `dispatch.start()` para generar ofertas reales.
- Se mantiene alternativa completa por texto y la confirmación humana antes de publicar una solicitud.

---

## Checkpoint · Hugo Companion Gemini · 20/09/2026

- Orbe Cliente conectado al endpoint Gemini autenticado con memoria conversacional corta.
- Gemini interpreta necesidades ambiguas y puede proponer una categoría real UGO o hacer una única pregunta aclaratoria.
- El catálogo real de categorías y los profesionales verificables se incorporan al contexto de Gemini.
- La conversación mantiene tono cercano/simpático sin ceder a Gemini autoridad para inventar o ejecutar acciones.
- Pedido, confirmación, matching y ofertas siguen usando el lifecycle canónico y datos reales de UGO.
- Fallback local permanece disponible si Gemini está temporalmente indisponible.



---

## 14. Checkpoint 20/09/2026 · efectivo y tarifa única

Implementado:

- tarifa UGO cotizada se persiste en el servicio y se congela al asignar proveedor;
- Cliente, Proveedor, pago e historial administrativo comparten el mismo snapshot económico;
- proveedor ve total cliente, comisión y neto;
- efectivo confirmado por el cliente se registra como dinero recibido directamente por el proveedor;
- efectivo no vuelve a formar parte del saldo retirable UGO;
- creada `deudas_ugo_proveedor` para comisión pendiente de cada cobro presencial;
- proveedor ve `Cobrado en efectivo` y `Debés a UGO`;
- proveedor puede informar referencia de pago de comisión;
- Admin puede conciliar la comisión con referencia externa y auditoría;
- historial del servicio incorpora deuda/comisión del efectivo;
- backfill TEST: 7 cobros, R$ 880,00 efectivo y R$ 132,00 comisión pendiente;
- RLS validada: proveedor sólo ve su deuda; Super Admin ve todas.

Mantener como VALIDATED hasta completar un servicio físico nuevo de punta a punta en dos dispositivos.


---

## 15. Checkpoint 20/09/2026 · límite de comisión UGO del proveedor

Implementado en código/backend:

- botón `PAGAR UGO · PIX` en Ganancias por deuda de comisión;
- a partir de **3 servicios** con comisión real pendiente, el proveedor queda Offline para nuevos pedidos;
- las ofertas pendientes se expiran al alcanzar el límite;
- backend impide volver Online y también bloquea cualquier nueva asignación mientras persistan 3 o más deudas;
- trabajos ya asignados permanecen operables y se pueden finalizar;
- informar una referencia no libera el bloqueo por sí solo: al menos una deuda debe quedar conciliada como `pagado` o `anulado`;
- al quedar por debajo de 3, el proveedor puede volver Online manualmente.

Migración aplicada en UGO TEST: un proveedor con 6 deudas abiertas quedó `Offline`, `disponible=false` y sin ofertas pendientes; otro con 1 deuda continuó Online. Core CI del bloque quedó verde. Pendiente de cierre de madurez: validar Pix con `UGO_PIX_KEY` configurada y ejecutar E2E de pago/conciliación → Online.


---

## 16. Checkpoint 20/09/2026 · consolidación Frontend Premium

- Diseño aprobado para unificar Cliente, Proveedor y Admin bajo tokens `--ugo-*`.
- `UX-CONTRACT.md` documenta comportamiento frontend transversal sin duplicar lifecycle.
- Baseline: WCAG 2.2 AA, targets de 48 px, scrollbar visible y movimiento reducido.
- Slices: Home/Mapa Cliente, alias visuales Proveedor, legibilidad/semántica Admin y frontera DEMO para `?app=web`.
- CSS histórico se retira sólo con evidencia de consumidor cero, build, tests y verificación visual.


---

## Checkpoint 20/09/2026 · solicitud Cliente/Hugo coherente

- la descripción escrita puede corregir una categoría anterior de Hugo antes de continuar (ej. “pérdida de agua” cambia Electricidad → Plomería);
- el catálogo de voz reconoce fuga/pérdida de agua, cañería/desagüe y vazamento como Plomería antes del fallback genérico de Reparaciones;
- al abrir el compositor canónico de solicitud, la conversación expandida de Hugo se cierra para no competir visualmente con el paso 1/5; el orbe queda disponible para reabrirlo;
- una falla sólo de audio TTS ya no se presenta como error rojo del pedido cuando el texto de Hugo sí llegó y el flujo sigue operativo.


### Checkpoint 20/09/2026 · mejora visual paso 1/5 Cliente

- el paso “qué hay que hacer” deja de verse como una tira móvil perdida en desktop: ahora usa un panel centrado más ancho, jerarquía visual, card de categoría y opciones rápidas 2×2;
- “Continuar” sólo se habilita cuando hay categoría y una descripción válida, evitando errores tardíos;
- las opciones rápidas priorizan la categoría realmente inferida desde la descripción; un hint viejo ya no puede volver a mostrar opciones de Electricidad después de corregir a Plomería;
- el orbe de Hugo queda disponible como acceso lateral compacto en desktop sin competir con el formulario.


---

## Checkpoint 20/09/2026 · alertas Cliente en tiempo real

- asignación y lifecycle del Proveedor ya generan notificaciones Cliente por `serviceId`;
- chat Proveedor → Cliente ahora crea `chat_mensaje` server-side, deduplicado por mensaje/destinatario;
- Cliente recibe banner visible, vibración y tono foreground para chat y cambios críticos de estado;
- tocar la alerta abre el pedido exacto; el detalle y Home continúan resincando `servicios` por Realtime;
- notificaciones también alimentan Web Push cuando el usuario lo habilitó;
- pendiente de madurez RUNTIME: prueba física en dos dispositivos con Proveedor marcando ESTOY YENDO/LLEGUÉ y enviando chat mientras Cliente está en Home y con la app en background.


---

## Checkpoint 20/09/2026 · push bidireccional Cliente ↔ Proveedor

- `notificaciones` agrega automáticamente el rol del destinatario antes del encolado Push;
- Cliente y Proveedor reciben avisos de chat y eventos operativos críticos en foreground con tono/vibración;
- Web Push abre la app del rol correcto y conserva el `serviceId` cuando está disponible;
- `push-dispatch` v2 prioriza chat, asignación, recorrido, cancelación, aprobación y pago como eventos de alta urgencia;
- ambos roles ven una acción visible para activar Push si el navegador todavía no tiene suscripción;
- validación de base: runtime Push configurado; actualmente existen suscripciones Cliente y el Proveedor debe autorizar Push en su dispositivo para recibir avisos con la app cerrada.


---

## 17. Checkpoint 20/09/2026 · Calendar + Disputas v2

Implementado en `main`:

- integración Google Calendar Proveedor como espejo server-side e idempotente por serviceId;
- crear/actualizar/eliminar eventos programados y recordatorios;
- conexión/desconexión OAuth preparada sin exponer refresh tokens al navegador;
- catálogo formal de motivos de disputa con ventanas y severidad;
- acuerdo amistoso previo trazable;
- snapshot del contexto al abrir disputa;
- adjuntos privados de la disputa;
- asistente Gemini de evidencia para Admin, incluyendo lectura de imágenes;
- casos sensibles marcados para revisión humana obligatoria;
- reglamento y prompts/checklist registrados.

Estado de madurez:

```text
Calendar código/backend       CI VALIDATED
Calendar DB TEST              APPLIED + RLS server-only verificada
Calendar OAuth runtime        BLOCKED: credenciales OAuth Google + smoke Proveedor
Disputas v2 código/backend    CI VALIDATED
Disputas v2 DB TEST           APPLIED · 14 reglas · bucket privado · legacy RPC cerrado
IA disputa runtime            Gemini HEALTH OK · falta smoke autenticado Admin
E2E físico                    pendiente: dos sesiones/dispositivos
```

Ningún análisis IA ejecuta una resolución o movimiento de dinero. PROD permanece intacto.


### Validación técnica del bloque Calendar + Disputas

El candidato de código `8fd3811dbb6361499327f8c952aac3d7e50ce94c` pasó UGO Core CI completo y Android TEST APK. Vercel publicó ese mismo SHA como READY. En UGO TEST se verificó que hay 14 reglas activas de disputa, `dispute-evidence` es privado, `abrir_disputa_v2` es ejecutable por participantes autenticados, el RPC legacy quedó revocado y `disputa_ai_analisis` no es legible por `authenticated`.

El health canónico de Gemini respondió OK con `gemini-3.5-flash-lite`. Las rutas consolidadas de Calendar/Disputas existen en Vercel sin exceder el límite Hobby de funciones. La madurez no sube a RUNTIME VALIDATED para Calendar hasta conectar una cuenta Google real, ni para Disputas hasta ejecutar el flujo autenticado Cliente/Proveedor/Admin con adjunto.


### Checkpoint 20/09/2026 · evidencia automática en disputas

- Admin Disputas muestra en un mismo visor las evidencias operativas `Antes / Durante / Después` ya vinculadas al `serviceId` y los adjuntos cargados específicamente durante la disputa;
- cada bucket conserva su frontera de seguridad: `service-evidence` para evidencia del trabajo y `dispute-evidence` para el expediente;
- el análisis Gemini consume ambas fuentes, pero la resolución continúa siendo humana;
- validación backend real en UGO TEST con transacción ROLLBACK sobre un servicio completado: Cliente propuso acuerdo, Proveedor lo respondió y Cliente abrió `abrir_disputa_v2`; se verificó motivo, hilo y snapshot completo con servicio, pago, eventos, chat y evidencias; al terminar no quedó ningún artefacto QA persistido.


### Checkpoint 20/09/2026 · matriz objetiva de resolución

- cada motivo de disputa incorpora criterio verificable y salida sugerida por política;
- Admin ve la regla junto al expediente antes de resolver;
- Gemini recibe la misma regla persistida, evitando prompts divergentes;
- `auto_aplicar=false` está protegido por constraint: la matriz nunca resuelve, sanciona ni mueve dinero sola;
- daño, fraude y seguridad continúan con salida `revision_humana`.


### Checkpoint 20/09/2026 · Proveedor acepta trabajos futuros mientras trabaja

- corregido el guard server-side que bloqueaba cualquier nueva aceptación si el Proveedor estaba `en_camino/llegado/en_progreso`;
- un pedido **inmediato** sigue bloqueado mientras hay un trabajo en ejecución;
- un pedido **programado para más adelante** puede aceptarse si comienza después de la ventana estimada del trabajo actual + 30 minutos;
- `esperando_aprobacion` y `disputado` ya no se tratan como trabajo físico en ejecución para bloquear agenda;
- los conflictos entre trabajos ya programados continúan usando duración estimada + buffer de 30 minutos;
- cada aceptación conserva su propio `serviceId` y aparece por separado en Agenda.


---

## Checkpoint 20/09/2026 · Admin cabina operativa Realtime

- Operaciones Admin se resincronizan automáticamente ante cambios de Cliente/Proveedor sin cambiar de pestaña;
- se agregó estado visible `En vivo / Conectando / Realtime degradado` y fallback periódico de recuperación;
- la ficha de servicio pasa a ser **360°**, manteniendo Cliente, Proveedor, timeline, pagos, deuda, fotos, ratings, chat, ubicación y disputas sobre el mismo `serviceId`;
- timeline, chat, pagos, evidencia y expediente se actualizan por Realtime y además tienen fallback de resincronización;
- Alertas ahora incorpora excepciones operativas reales: matching demorado, servicio inconsistente, traslado prolongado, aprobación demorada, disputas y proveedores bloqueados por deuda UGO;
- migración `admin_operational_realtime_publication` aplicada en UGO TEST;
- madurez pendiente: CI del SHA exacto y prueba de dos roles cambiando estado mientras Admin permanece abierto sin interacción manual.


---

## Checkpoint 20/09/2026 · snapshot GPS Cliente antes de matching

Sentinel detectó el incidente real `client_request_location_error`: `SupabaseDispatchProvider` ya llamaba `guardar_ubicacion_servicio_cliente`, pero el RPC no existía en UGO TEST.

Corrección validada en `615cf1b6ef479c11f56325ef7e385d6b15c29eb4`:

- RPC canónico agregado y aplicado en UGO TEST;
- valida sesión, ownership del Cliente, coordenadas y estado no terminal;
- persiste `servicios.ubicacion_cliente` con `POINT(lng lat)` / SRID 4326;
- el GPS queda ligado al `serviceId` antes de iniciar matching;
- auditoría registra la acción sin copiar coordenadas crudas al log;
- el matching sigue siendo recuperable si el GPS no está disponible.

UGO Core CI del commit pasó TypeScript/build, contratos, lifecycle/RLS y lint completo. Falta revalidación física de GPS en Cliente para promover MAP-GPS más allá del estado técnico.


### Hardening de procedencia GPS · 20/09/2026

El snapshot GPS ahora queda asociado a la **dirección elegida para ese pedido**, no al último GPS global del navegador:

- “Usar mi ubicación” guarda coordenadas exactas en el borrador del pedido;
- un lugar guardado usa coordenadas sólo si ese lugar realmente las tiene;
- una dirección escrita manualmente invalida coordenadas previas del borrador;
- valores nulos nunca se convierten accidentalmente en `0,0`;
- el flujo canónico pasa `pickupFallback='none'`, por lo que no reutiliza `ugo:last-client-location` de otra dirección;
- los flujos legacy que explícitamente quieran la ubicación reciente conservan el fallback `stored`.

UGO Core CI `e424766f36e497b079a173e5d6dae2d1906fe48e` quedó verde con build, 456 contratos (453 pass, 2 skip), lifecycle/RLS y lint. El APK Android del bundle de código `b24c74c8d6043c9edfba2568a996b01faa05fdfb` también compiló correctamente. Falta prueba física GPS para elevar `MAP-GPS` a validación runtime.
