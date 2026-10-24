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

---

## Checkpoint 20/09/2026 · WordPress pull updater desde GitHub (histórico; retirado el 28/09/2026)

Este checkpoint describe una integración histórica. Por pedido del propietario se retiraron del repositorio el workflow de publicación, los MU plugins, el contrato de pruebas y la guía de despliegue WordPress. La eliminación remota de archivos previamente publicados requiere verificación independiente; este cambio no acredita borrado del servidor WordPress ni de la release existente.

- GitHub Actions genera `ugo-wordpress-build.zip` desde el SHA exacto de `main`;
- la release fija `wordpress-latest` publica manifest + ZIP + SHA-256;
- WordPress incorpora `Herramientas → UGO Actualizaciones` para comparar revisión, actualizar y hacer rollback;
- el updater valida checksum, commit y estructura antes de activar;
- conserva tres backups y no persiste tokens GitHub en opciones WordPress;
- el FTP existente queda como espejo compatible, no como única ruta de actualización;
- madurez: implementación integrada; publicación/activación y smoke WordPress deben verificarse en el SHA resultante.


---

## Checkpoint 20/09/2026 · historial detallado Proveedor

- `Mis trabajos` permite volver a abrir cualquier servicio del historial en modo sólo lectura;
- cada tarjeta Proveedor incorpora `Abrir trabajo`;
- el detalle reconstruye pedido, cliente, dirección, importe, programación y estado;
- muestra fotos originales enviadas por el Cliente y evidencias del Proveedor separadas en Antes / Durante / Después;
- cada foto puede abrirse en tamaño completo mediante URL firmada temporal;
- incorpora pago/resumen económico cuando existe y timeline persistido de estados para explicar cómo se hizo;
- el detalle queda ligado al `serviceId` exacto y usa RLS del rol Proveedor;
- madurez: implementación en código; pendiente smoke visual/runtime autenticado sobre un servicio completado real.


---

## Checkpoint 20/09/2026 · Hugo Proveedor conoce su historial

- Hugo Proveedor recibe desde backend el historial propio del proveedor autenticado, no sólo la misión/cliente actual;
- puede responder cantidad histórica de trabajos completados, trabajos completados/cancelados hoy y últimos servicios realizados;
- calcula para el día operativo de Florianópolis/São Paulo ganancia neta, cobro bruto, comisión UGO, efectivo y pagos electrónicos desde pagos persistidos;
- preguntas informativas sobre “ganancias” o “historial” ya no abren pantallas automáticamente: navegar requiere una intención explícita como abrir/ver/mostrar;
- el prompt prohíbe responder “no tengo acceso al historial” cuando DATOS UGO ya contiene esa información;
- “qué pasó hoy” y seguimientos conversacionales pueden resumirse usando hechos persistidos, sin inventar;
- pendiente de madurez: smoke autenticado por voz con un proveedor que tenga trabajos/pagos históricos reales.


---

## Checkpoint 20/09/2026 · paridad Voz ↔ formulario Cliente

- el pedido por voz usa el mismo orden canónico que el formulario: profesional/categoría → qué hay que hacer → dónde → cuándo → pago → confirmación;
- “necesito un electricista” ya no dispara disponibilidad/recomendaciones largas: valida la categoría y pregunta una sola cosa, “¿Qué hay que hacer?”;
- la voz no salta la ubicación usando silenciosamente una dirección predeterminada; Casa/Trabajo se usan sólo cuando el cliente los menciona;
- “acá”, “aquí”, “donde estoy” y “usar mi ubicación” toman GPS explícitamente, hacen reverse geocoding y preservan lat/lng + procedencia `current`;
- ubicaciones guardadas conservan lat/lng cuando existen;
- el borrador de voz sincroniza dirección, etiqueta, coordenadas, cuándo y pago con las mismas pantallas escritas;
- se elimina el monólogo de disponibilidad durante la captura: Hugo hace una pregunta por turno y valida brevemente la respuesta;
- pendiente de madurez: smoke físico por voz completo desde Home hasta Resumen, verificando permiso GPS y texto visible en “¿Qué hay que hacer?”.


### Hotfix 20/09/2026 · “utiliza mi ubicación” por voz

- el intent GPS de Hugo reconoce “mi ubicación”, “utiliza mi ubicación”, “usa mi ubicación”, “tomá mi ubicación”, “acá/aquí” y equivalentes PT-BR;
- el comando GPS se procesa aunque la conversación ya haya avanzado o exista una dirección previa: reemplaza la dirección del borrador por la ubicación actual;
- la voz llama directamente a `navigator.geolocation.getCurrentPosition`, hace reverse geocoding, persiste lat/lng y emite `clientHugoDraft`;
- `ClientLocationScreen` recibe el mismo borrador y carga dirección + coordenadas sin exigir tocar “Usar mi ubicación”;
- si el permiso GPS falla, Hugo lo informa y mantiene el pedido abierto para escribir la dirección.


---

## Checkpoint 20/09/2026 · Cliente punta a punta auditado

Se consolidó el recorrido canónico Cliente como una sola cadena operativa:

`Inicio → Qué hay que hacer + fotos opcionales → Dónde → Cuándo → Cómo pagar → Resumen → Confirmar → Matching → Asignación → Seguimiento/chat/pago → Aprobación → Pago/cierre → Calificación`.

Correcciones del barrido:
- las fotos previas vuelven a estar dentro del flujo canónico y quedan ligadas al mismo `request_draft_id`;
- ubicación guardada, GPS y dirección manual conservan etiqueta, complemento y procedencia correctos sin reciclar coordenadas de otra dirección;
- el paso Pago aclara que Efectivo es el default y que PIX se completa después de la asignación; no se cobra al armar el pedido;
- Resumen valida datos obligatorios y muestra forma de pago + fotos antes de publicar;
- creación del servicio recupera por `request_draft_id` ante reintentos/23505 y elimina el bloqueo singleton que impedía pedidos independientes;
- Matching ya no expulsa automáticamente al Cliente a Home: queda visible, permite reintentar y también “Seguir usando UGO” mientras la búsqueda continúa;
- el contexto de retry permanece en memoria aunque el borrador se limpie tras iniciar matching;
- un pedido que quedó `buscando/ofrecido` puede reintentar matching desde su detalle;
- cierre conserva la regla: primero validar trabajo; en efectivo después pagar y marcar “YA PAGUÉ”; electrónico libera sólo el pago protegido;
- la calificación final usa el componente canónico con `autor_tipo='cliente'`, evitando un segundo camino de rating.

Madurez: cobertura estática/CI de punta a punta; la prueba física completa Cliente + Proveedor en dos dispositivos sigue siendo el gate para marcar FULL-E2E.

---

## Checkpoint 21/09/2026 · Hugo voz Gemini Live

- reemplazado en el bridge principal el ciclo `MediaRecorder → blob completo → /api/test → transcripción → reinicio` por streaming PCM16 directo a Gemini Live;
- `/api/test` emite tokens efímeros sólo después de validar sesión Supabase + rol Cliente/Proveedor; la API key de Gemini continúa server-side;
- el token queda restringido a `gemini-3.5-transcribe-live`, salida TEXT e input transcription;
- el WebSocket usa el endpoint efímero `BidiGenerateContentConstrained` y setup correcto con `generationConfig.responseModalities`;
- Hugo muestra hipótesis `interimInputTranscription` mientras escucha y procesa únicamente `inputTranscription` final;
- TTS pausa/reanuda la captura sin destruir la sesión Live, eliminando la reconexión por cada turno;
- reconexión con token nuevo ante cierre inesperado y fallback al reconocimiento del dispositivo/texto si Live no puede arrancar;
- paridad voz ↔ texto preservada: el transcript final entra al mismo `handleText`, GPS/pago/confirmación/matching siguen gobernados por UGO;
- madurez: IMPLEMENTED; CI y smoke físico de micrófono/ES-PT/reconexión pendientes del SHA resultante.


---

## Checkpoint 21/09/2026 · Hugo Admin · Gemini Live + acciones del Control Center

- Hugo Admin usa el bridge Gemini Live para voz en navegador cuando existe sesión Admin/Super Admin autorizada;
- la respuesta hablada usa Gemini TTS con fallback del navegador, evitando depender sólo de Web Speech;
- el contexto operativo de Hugo cubre dashboard, usuarios, proveedores, servicios, disputas, pagos, retiros, deuda UGO, documentos, categorías, tarifas, notificaciones, mapa operativo, timeline de estados, calificaciones, mensajes y claves no sensibles de configuración;
- las fuentes que fallen se declaran como `fuentes_no_disponibles` para que Hugo no invente datos faltantes;
- Gemini puede solicitar únicamente acciones UI allowlisted: navegar módulos, abrir un servicio, refrescar datos y abrir/filtrar el mapa;
- el mapa acepta comandos de Hugo para estado, categoría, zona, localidad, radio y visibilidad Cliente/Proveedor;
- cambios sensibles de usuarios, dinero, permisos, KYC, disputas o configuración siguen pasando por los controles auditados y confirmaciones existentes del panel;
- pendiente de madurez: smoke autenticado por voz en Admin real verificando Gemini Live → consulta de datos → navegación/filtrado → Gemini TTS.
## QA evidence binding (2026-09-29)

The independent QA evidence path now binds each assertion to the scenario's current demo service and invalidates coverage after a service change. The migration was applied in UGO TEST and a rollback-only positive and negative probe passed. Customer #1 remains blocked pending the remaining coverage and physical acceptance.

The next GPS worker gate found a legacy JWT claim guard on a service-role-only QA RPC. `20260929150000_qa_gps_service_role_claim_compat.sql` preserves the ACL and removes that redundant check; UGO TEST migration and same-SHA Worker verification are required before this blockage closes.

The following Worker run on `85986f5f` exposed the same obsolete guard in the nested P0 harness. `20260929151500_qa_p0_harness_secret_key_compat.sql` replaces that function with identical lifecycle checks and service-role-only ACL, removing only the incompatible entry claim check. Runtime verification remains pending.

## Scout CRM · Gmail outreach (2026-09-22)

Implementado en `main` y con migración aplicada en UGO Arena/TEST: OAuth Gmail server-side, estado conectar/desconectar en Scout y CRM, envío individual y campañas de hasta 20 destinatarios por lote, link de onboarding UGO, cooldown de campaña, auditoría de envíos y convergencia con el embudo CRM. Pendiente externo para runtime: habilitar Gmail API en Google Cloud, registrar `/api/scout/gmail` como redirect URI del cliente OAuth, cargar las credenciales OAuth server-side y autorizar una cuenta Google desde el panel. No requiere deploy hasta que se autorice la etapa de publicación.



---

## Checkpoint · Hugo Voice baja latencia Cliente/Proveedor · 23/09/2026

- Se comparó la implementación de voz de UGO con el patrón operativo de `gods-eye-view`.
- Cliente y Proveedor conservan Gemini Live persistente para transcripción, pero ahora prefieren un segundo canal Gemini Live persistente para la respuesta de audio incremental.
- La respuesta hablada ya no necesita esperar el ciclo completo `POST /api/hugo/chat → audio base64 completo` cuando el speaker Live está disponible; ese TTS queda como fallback.
- El modelo speaker sólo vocaliza texto ya resuelto por el dominio UGO y no recibe autoridad sobre lifecycle, pagos, disponibilidad, permisos ni persistencia.
- La clave Gemini continúa exclusivamente server-side y ambos canales usan tokens efímeros de un uso.
- Estado de madurez al integrar: IMPLEMENTED. Requiere CI del SHA exacto y smoke real con micrófono para promover a CI/RUNTIME VALIDATED.


## Command Center resource safety · 30/09/2026 · pending integration

Base: `08f8823959aee8000764faa38c0770423444a913`. The functional readiness engine now reserves resources from every live global job, including jobs outside the functional catalog and additional resources in its lease. Expired global leases release capacity. This prevents an AVAILABLE control from competing with a global worker for the same resource.

Local verification: three regression cases, 11 readiness tests, 14 scheduler/Command Center tests, full suite 1058 passed / 0 failed / 8 skipped, TypeScript/build and changed-file lint passed. Evidence: `docs/evidence/command-center-resource-safety-20260930.json`. This is not same-SHA CI, TEST runtime, Judge/Sentinel certification or VERIFIED.

Next: integrate safely after confirming automatic Vercel/Netlify deployments cannot violate the no-deploy instruction, then validate the resulting main SHA. Keep readiness unchanged until the required independent validators pass. No production changes or branch ref movement.


## Provider dispute integration · 30/09/2026

PR #307 supplied the active-job dispute entry and a TEST lifecycle probe. Its original Judge/Sentinel only checked caller booleans, so historical PASS is insufficient for authoritative DONE. The integration keeps this control IN_PROGRESS and preserves historical run references. The strengthened Judge independently queries persisted ownership, resolution, audit, notices and actual uploaded synthetic image bytes. Cleanup verifies fixture ownership and reports errors; Sentinel independently checks absence of database, Auth and Storage fixtures. The workflow runs on main in UGO TEST only. Anonymous opening and provider self-resolution are negative probes.

Next: same-SHA runtime/Core CI/Pages, then persist the independent artifacts before closing the lock. Synthetic media is automation evidence; physical camera/GPS and human Customer #1 acceptance remain separate. No deployment to production.

## Recuperación de alertas del proveedor · 02/10/2026

Bloque `provider-notification-recovery`, base `2c7e23b434d68e5e5feb2e3bdb21e64059add633`. `NotificationCenter` suscribe Realtime antes de consultar avisos o inicializar Web Push. La espera de Service Worker tiene un límite de 5 s; su fallo no cancela el canal foreground. Un INSERT válido alerta directamente y la reconciliación posterior se serializa. Focus/online/visibility y un resync visible cada 20 s recuperan eventos perdidos. La selección salta ofertas vencidas o ya alertadas y respeta Offline/deuda. El banner conserva X y cierre a 5 s.

La migración de convergencia de expiración versiona el arreglo de PR #322 que ya existe en Arena TEST: no reemplazar una expiración futura por un deadline de servicio vencido. No cambia GPS, radio, permisos ni estado lifecycle. No se aplicó DDL a producción.

Regresión del consumidor: el código base falla antes de SUBSCRIBED con Push pendiente; el corregido pasa los siete casos del navegador (`scripts/provider-notification-recovery-browser.mjs`). Backend de esos casos controlado: no constituye prueba de matching real, sonido audible ni vibración física. Suite local: 1197 PASS, 0 FAIL, 8 SKIP; build y lint sin errores. CI y runtime deben comprobarse en el SHA integrado; ningún readiness se promueve por estos resultados locales.

Vercel Git deployment queda pausado para respetar la orden de validar sin desplegar; restaurarlo requiere una publicación deliberada. Netlify no se invoca; los commits llevan `[skip netlify]`.

Validación adicional del mismo bloque: run `37029628074`, SHA `e02d6a855f9215ee3872aa8c6e48726153c772b0`, PASS en navegador con matching dirigido autenticado, oferta/notificación persistidas y aceptación. Artifact `11237425414`, digest `sha256:dc40339fb87dd79b2bd25f0a0288ffbd4231c450aa77682c8dd1302dff2797a1`. Los validadores originales sólo inspeccionaban booleanos; se agrega un proceso Persistence Judge que lee DB antes de cleanup y un Sentinel que verifica ausencia de fixtures DB/Auth después. Pendiente ejecutar estos validadores reforzados en su SHA exacto. No prueba matching automático por proximidad ni sonido/vibración físicos.

La regresión agrega un octavo caso: una consulta atrasada de una suscripción retirada no puede alertar luego de pasar Offline. `load()` valida la vigencia del consumidor después de cada await antes de modificar estado o emitir atención. Los resync de un canal retirado no afectan a su reemplazo.

Run `37030359501`: Persistence Judge PASS por lecturas independientes, pero Sentinel FAIL detectó cleanup silencioso: `pagos` impide borrar el servicio por FK. El harness ahora valida ownership/sha/ephemeral antes de limpiar, elimina primero el pago temporal y comprueba errores de cada operación. El residuo exacto de ese run se retiró en una transacción acotada a TEST; DB/Auth confirmados vacíos. El fallo histórico permanece registrado y no se convierte en verde.

## Matching automático autenticado · 03/10/2026

Base `e148a4b224e17183fe19a12b6e2419b0027e4b15`. Incidentes recientes `client.request.matching` no quedan explicados por la alerta foreground: se reprodujo SQLSTATE 42501 `permission denied for function iniciar_matching_impl` usando el rol SQL real authenticated sobre un servicio propio. La puerta pública `iniciar_matching` es SECURITY INVOKER, pero la implementación privada sólo tenía EXECUTE para service_role. Los QA SECURITY DEFINER podían pasar con un JWT cambiado sin ejercitar este permiso.

La migración `20261003000211_authenticated_matching_gateway.sql` concede sólo EXECUTE authenticated sobre la implementación privada ya protegida por auth.uid y owner/admin. No cambia SECURITY DEFINER/INVOKER, RLS, GPS, radio, deuda, estados ni políticas. PUBLIC/anon siguen sin ejecución. Aplicada exclusivamente a TEST. Rollback: revocar EXECUTE authenticated de la función privada. Probe transaccional bajo rol authenticated: una oferta para fixture con ubicación TEST fresca; no-owner rechazado por wrapper y privada; anon rechazado 42501. Todo ROLLBACK.

El runtime web deja de usar matching dirigido: invoca iniciar_matching con cliente autenticado real, prueba negativos no-owner/anon, refresca posición sintética TEST antes del matching y conserva Judge independiente DB + Sentinel DB/Auth. El harness de consumidor ahora distingue callbacks por tabla/evento y cubre offer INSERT sin aviso y deduplicación offer/notice. Diez regresiones PASS; suite 1282 PASS / 8 SKIP / 0 FAIL, build y lint de archivos modificados PASS. Pendiente evidencia del SHA integrado. GPS/audio/vibración físicos no demostrados.

Para respetar no-deploy se conserva la reactivación existente de deploymentEnabled, pero Vercel ignoreCommand omite commits marcados [ugo-test-only]. Estos commits también llevan [skip netlify]. No se ejecuta publicación ni se toca Supabase producción.

Además se reprodujo y corrigió el click en el banner fallback: su ID temporal offer:<uuid> no corresponde a notificaciones.id. Se omite marcar lectura sólo para ese aviso transitorio exacto y se conserva la apertura del oferta_id. Regresión 11 PASS. Run 37080731560 falló por permiso geolocation prompt: la UI actual puso Offline al fixture, correctamente; el harness debe conceder ubicación sintética sólo al contexto TEST. Se incorpora apertura y aceptación desde UI real, además de lectura DB independiente. No se desactiva el guard de permisos del producto.

Prueba completa `60fa1677faa3d71774f0641249477ea1b7e235a5`: run `37081054367` PASS; cliente real autenticado inicia matching automático, una oferta/notificación correlacionadas, banner sin refresh, apertura y aceptación por UI del proveedor y servicio asignado persistido. Persistence Judge y Sentinel independientes PASS; artifact `11259425363`, digest `sha256:1b29733588b5ed19bfc652775d8ed73cd35fb45c342b8e5e2a5e59252a3baae2`. Core CI `37081054318` PASS; suite local final 1290 PASS / 8 SKIP. El workflow antiguo Provider Alerts `37081054227` falló por geolocation prompt/Offline: se ajusta su contexto sintético TEST y se agregan lecturas independientes de persistencia y cleanup, sin convertir ese probe de notificación directa en matching. En el harness integral se cierra primero el navegador para evitar snapshot loads contra el actor que se está eliminando. Pendiente revalidar ambos workflows. Accessibility `37081054229` falla fuera de este bloque; no certificamos todo el proyecto ni borramos incidentes históricos.

Cierre de última regresión de recepción: la clave offer:<uuid> silenciaba una nueva alerta de oferta reactivada con el mismo UUID. Reproducido timeout del banner renovado; se normaliza el timestamp de expira_at en la clave común offer/notice. Así se deduplica un ciclo y se permite alertar el siguiente. La identificación de aviso transitorio permanece independiente de esa clave para no volver a escribir un ID ficticio en notificaciones. Doce casos navegador PASS (working tree); nueva prueba exact-SHA pendiente. Ambos runtimes anteriores `37081539183` y `37081539151` pasaron en `895c6e84a19e08ae950d5caab985b091d1964964`; Sentinel sin incidentes abiertos en esa revisión.

Cierre verificado del bloque de alertas/matching automático: código `355b5a2e9d66a3758d243d3ba7fbd120a20ffc86`; runtime `37081816627` PASS con matching automático de cliente autenticado, oferta/notificación correlacionadas, banner sin refresh, apertura exacta y aceptación por UI. Doce regresiones PASS. Persistence Judge independiente DB y Sentinel independiente DB/Auth PASS; fixtures eliminados. Artifact `11259262212`, digest `sha256:2c5ae2d1e5637e865da49bfa7b9878f332881b8152cc66d3789f128d7d3c3892`. Provider Alerts `37081816564` PASS con validadores reforzados; Core CI `37081816562` PASS. Vercel hook cancelado por ignored-build-step (`dpl_8XYDb9szsejQbevgj5RYw1VxVcz5`), sin publicación ni Supabase producción. Lock DONE sólo para este alcance; checklist/readiness global no modificados. GPS/audio/vibración físicos siguen sin certificación. Sentinel consultado: sin incidentes actuales de matching/oferta/notificación; quedan CLOSED de agenda/rating fuera del bloque. Accessibility `37081816607` FAIL fuera del alcance, sin afirmar CI global verde. Este cierre documental no cambia el código probado y conserva fallos históricos.

### 18/10/2026 — Admin/Super Admin (en validación)

PR #503 incorpora #504 y conserva ambos controles: lectura persistida antes del éxito y errores de autonomía visibles tras recarga. Se recupera la cola serializada de TEST mediante `queue: max`, conservando la capacidad unitaria del proveedor compartido. Runtime multirrol amplía edición de usuario efímero, aislamiento de permisos y cero filas sin falso éxito. El gate ON se reevaluó READY en TEST; modo seguía OFF. Customer #1 conserva pruebas humanas pendientes. Fuente de continuidad: `docs/UGO_CAMINO_MAESTRO.md`, bloque 18/10. No producción, no readiness global promovido, validación del SHA final pendiente.

Corrección del enfoque de QA: la corrida queue:max también resultó cancelada. Multirrol se migra a identidades efímeras propias por ejecución y grupo por SHA; no comparte ni modifica credenciales/estado de los robots de los demás workflows. No declarar recuperado hasta runtime remoto PASS.

Edición integral Admin ampliada a contacto/domicilio, foto por URL, bio/experiencia y categorías del proveedor, con verificación de persistencia por tabla y mensajes en tres idiomas. Pendiente UI/DB same-SHA de los cambios; no certificado por la presencia del formulario.

Se alinea la autoridad backend con la UI de cuentas privilegiadas: Admin no puede modificar perfiles de otros administradores/Super Admin/árbitros directamente por `usuarios`. Migración sólo TEST y probes transaccionales positivos/negativos; falta runtime PostgREST del SHA integrado antes del cierre.

API/Admin en Pages: base canónica explícita, CORS preflight de integraciones y aliases TEST consistentes. Se amplía el runtime a APIs reales del mismo SHA sin deploy, creación auditada/reset de contraseña y SHADOW→OFF restaurado. La publicación Vercel sigue sujeta a cuota externa; no se generan deploys de prueba.

### Hive — implementación aislada autorizada 18/10/2026

Ver [checkpoint HU0–HU3](ugo-hive/IMPLEMENTATION_STATUS.md). Código y ensayos locales sobre PR515/FreeAPI1, sin refs remotas modificadas; previews automáticos bloquean publicación sin nueva autorización. Inferencia OFF; persistencia remota/Render/facturación/pinning/worker/Judge/Sentinel siguen pendientes. No altera el readiness del primer cliente.


Hive preparación fusionada: PR515→4191978 y FreeAPI PR1→77daf32, árboles idénticos a PR revisados; revalidación18PASS y19PASS/1SKIP. Backend/inferenciaOFF; Pages observado aún7931173. Ver checkpoint vigente en docs/ugo-hive/IMPLEMENTATION_STATUS.md; CI del merge omitido para no ejecutar probes/modelos/GHCR, CI del PR documentado.


## Contrato de ejecución y actualización continua — 20/10/2026

**Meta:** UGO/HUGO funciona de extremo a extremo y se lanza en Florianópolis; HIVE, Maestro, Empresa Autónoma y Observatory son medios. El roadmap es obligatorio para todas las sesiones: al iniciar, contrastar con main, CI, UGO Arena, producción y Sentinel; al terminar, actualizar fase, evidencia, SHA, regresiones y siguiente trabajo. Nunca declarar éxito por código o deploy sin pruebas.

**Secuencia hasta producción:** 0) estado y baseline; 1) Auth y deslogueo de Proveedor/Cliente; 2) permisos GPS y disponibilidad; 3) pedido→matching→alerta; 4) Realtime y reconexión; 5) aceptación, traslado, PIN/QR, ejecución y cierre; 6) chat; 7) agenda, programados y multipedidos; 8) PIX, efectivo, deuda y comisión; 9) perfiles, fotos y KYC; 10) HUGO voz/texto; 11) UX, accesibilidad y PT-BR; 12) Admin y Super Admin; 13) seguridad, rendimiento, CI y regresiones; 14) recuperar e integrar HIVE, Empresa Autónoma y Observatory; 15) continuidad autónoma, presupuestos y límites Supabase; 16) piloto Faxina/Marido de Aluguel; 17) E2E humano dos dispositivos y primer cliente; 18) lanzamiento gradual en Florianópolis; 19) operación repetible y mejoras.

**«Seguí»** = ejecutar el siguiente bloqueo priorizado y verificable sin perder el objetivo general; no implica trabajo continuo después de finalizar la ejecución del chat. No alterar producción ni datos sin gates; no romper funcionalidades previamente comprobadas. Actualizar también `docs/UGO_CAMINO_MAESTRO.md` para permitir retomar sin repetir instrucciones. Estados: PENDIENTE, IMPLEMENTADO, CI VALIDATED, RUNTIME VALIDATED, PUBLISHED, ACCEPTED.


### 20/10/2026 — Proveedor Auth: recuperación tras SIGNED_OUT transitorio

Cambio aplicado en `src/mvp/shared.tsx` (`ad695b4f`) y contrato ajustado (`710744f`): cuando el SDK emite SIGNED_OUT pero `getSession()` confirma una sesión válida, se recupera también el perfil y se finaliza la carga; antes sólo se restauraba el objeto de sesión y podía quedar la interfaz esperando indefinidamente. La condición de autenticación verdadera sigue respetada. **Estado: IMPLEMENTADO; falta CI del SHA integrado, smoke autenticado de Online/GPS/refresh y E2E cliente-proveedor.** No confundir con validación de producción. Próxima ejecución: pruebas exact-SHA y corregir cualquier regresión observada antes de publicar.

## Regla de cierre secuencial obligatorio (20/10/2026)

**Cuando termine una tarea, no salto a otra por impulso. Sólo paso a la siguiente cuando la actual esté corregida, probada y registrada con evidencia real.** Antes de cambiar de tarea: comprobar aceptación y ausencia de regresiones; guardar commit/SHA, pruebas, entorno y resultado en `docs/UGO_ROADMAP_MASTER.md` y `docs/UGO_CAMINO_MAESTRO.md`. Si falta una prueba, el estado es **PENDIENTE / NO VERIFICADO**, nunca DONE, y el siguiente paso verificable queda registrado. Si existe un bloqueo externo genuino, mantener el trabajo abierto y pasar únicamente a otra tarea independiente permitida, sin ocultar ni cancelar la anterior. Esta regla alcanza **también todos los compromisos, mejoras y tareas previas pendientes**, incluidos los dos plugins, Auth/GPS/Realtime, HIVE, Empresa Autónoma, Observatory, y los gates de producción. Una nueva instrucción no borra pendientes anteriores; sólo una cancelación explícita modifica la cola. No extender un diagnóstico ni abandonar la reparación por reportar. No convertir falta de pruebas en éxito.


### 2026-10-20 — P0 GPS Proveedor, compatibilidad API productiva (PR #545)

- Estado: **IMPLEMENTADO EN RAMA / NO APLICADO EN PRODUCCIÓN**. La app `main` usa `activar_disponibilidad_proveedor` y `publicar_ubicacion_disponibilidad_proveedor`, RPC ausentes en UGO producción y presentes en Arena TEST.
- Cambio: migración aditiva `20261020223000_production_provider_gps_rpc_compat.sql` con 2 columnas GPS ausentes y RPC autenticadas, autorización de proveedor y rechazo de GPS viejo/inexacto, sin sustituir matching ni políticas o triggers.
- Evidencia pendiente: ejecución en clon del esquema productivo, pruebas runtime de seguridad y E2E Cliente → Proveedor → Oferta, aprobación de migración productiva. No declarar VERIFIED hasta completar la validación.
- CI SHA de PR #545: `60dbe330e61f78e00809ca7f9b887ddee58f068a`; roadmap gate exige esta actualización. Core CI muestra `npm audit` Vite high preexistente y debe remediarse o verificarse sin obviar seguridad.
- Próximo paso: validar contra esquema real sin datos personales, resolver CI, y sólo entonces evaluar promover a `main` y desplegar migración con verificación y rollback.


### 2026-10-20 — Recuperación Cross Regression tras GPS PROD
- Incidente: workflow de push `39514154593` (merge SHA `48f49214`) falló porque `scripts/cross-regression-runtime.mjs` exigía el literal retirado `Reintentar pedido`; UI actual usa `t('clientMatch.searchNow')` con `restartMatching(service.id,true)`.
- Corrección mínima: actualizar solo el guard para exigir el handler real y la clave i18n; no alterar acciones del producto. Rama `fix/p0-cross-regression-retry-label-20261020`.
- Estado: IMPLEMENTADO; antes de DONE exigir Cross Regression TEST same-SHA PASS, resto CI, y preservar P0 GPS/Proveedor prueba física todavía pendiente.


### 2026-10-20 — P0 deslogueo transitorio Proveedor (pendiente de aceptación)
- Reporte humano vigente: Proveedor sigue volviendo al login pese a la reparación GPS productiva PR #545. No marcar AUTH como resuelto.
- Implementación rama `fix/p0-provider-transient-signed-out-grace-20261020`: confirmación de `SIGNED_OUT` vacío tras 1200ms, conservando pantalla y sesión mientras el SDK renueva token; el logout explícito continúa limpiando inmediatamente la sesión. Dos contratos de regresión para desaparición transitoria y confirmación auténtica.
- Estado: IMPLEMENTADO EN RAMA, PENDING_VERIFICATION; requiere same-SHA CI, runtime con cuenta Proveedor y GPS, reconexión, dispositivo físico. Sin publicar hasta validar.


### 2026-10-20 — P0 Proveedor: persiste logout tras PR #548
- Estado **NO RESUELTO** por reporte de prueba humana inmediatamente posterior al despliegue `31c50d7`. No repetir parches de temporización sin conocer la causa.
- Se inspeccionaron `useRoleSession`, guard de `providerData` y cliente Supabase. Lecturas vacías repetidas de `getSession` pueden representar pérdida real del refresh token y los tests de race no identifican esa causa.
- Implementación en rama `fix/p0-provider-auth-trace-20261020`: registro acotado de 40 eventos de Auth (motivo, tipo, hora, sin JWT ni IDs) persistente después de reabrir login; botón para copiar diagnóstico en login Proveedor; test de privacidad.
- Próxima acción: CI same-SHA, despliegue sólo si controles superados, reproducir con Proveedor real y recibir trace saneado. Verificar error Auth/refresh y reparar causa raíz. **No marcar P0 DONE ni aceptación piloto**.


### 2026-10-20 — P0 Proveedor: tormenta de canales Realtime tras refresh
- Evidencia humana traza saneada: 20+ `TOKEN_REFRESHED` y `channel_ready` alternados en ~20 segundos, termina `SIGNED_OUT` y `login_confirmed_signed_out`. Se ve en Vercel y Pages, ambos usando Supabase Arena TEST.
- Causa encontrada en código: `useProviderRealtime` dependía de callback `onChange` recreado en cada render, provocando unsubscribe/subscribe reiterados; el canal del perfil dependía del objeto completo `session` que cambia tras `TOKEN_REFRESHED`. Suscripción inestable alimenta exceso de reconexiones y carga Auth/Realtime. No confundir correlación con prueba definitiva de que es el único origen de logout.
- Cambio P0 rama `fix/p0-provider-realtime-subscription-storm-20261020`: refs al callback y a sesión actual, dependencias por ID estable, dos tests de contrato; sin cambiar negocio GPS/matching.
- Estado `PENDING_VERIFICATION`: ejecutar CI same-SHA, comprobar reducción de renovaciones y canales en navegador real, y retest humano; no declarar DONE sólo por contrato.


### 2026-10-20 — P0 renovación de token en bucle: Calendar opcional
- La nueva traza humana tras PR #550 muestra aproximadamente 35 `TOKEN_REFRESHED` en ~12s, sin tormenta `channel_ready` equivalente, y termina `SIGNED_OUT`/`login_confirmed_signed_out`. Auth **NO DONE**.
- Ruta de código adicional encontrada: `src/mvp/provider/providerCalendar.ts` forzaba `auth.refreshSession()` por todo 401 de API Calendar; `ProviderCalendarIntegration.tsx` carga estado con `accessToken` como dependencia. Un 401 persistente puede crear lazo 401→refresh→token nuevo→status Calendar→401. No se ha comprobado que el usuario estuviera en esa pantalla; verificar vía nuevo test humano.
- Reparación rama `fix/p0-provider-calendar-refresh-loop-20261020`: Calendar opcional no fuerza renovación Auth por 401; informa error sin cerrar sesión ni refrescar token; contratos para evitar regresión, sin tocar GPS o matching.
- Pendiente: CI same-SHA, postmerge check, evidencia de sesión de proveedor en navegador; P0 permanece PENDING_VERIFICATION.


### 2026-10-21 — P0 ubicación manual del Proveedor y matching
- Baseline `main` `8c9e1276f4daf3ea3ba8e67efed610075c9bb41d` (Vercel READY); pedido real de Electricidad a las 16:45 de Florianópolis registrado `buscando`, sin oferta, con logs `provider_dispatch eligible_count=0`.
- Root causes concurrentes: horario del proveedor Online 08:00–18:00 vs duración estimada 120 min (inicio 16:45 permitido, finalización fuera de horario), y GPS que puede caducar al pasar 90 s. Bloqueo RLS impide renovar `matching_expires_at` desde RPC invocadora.
- Cambio aislado de esta rama: al elegir **Actualizar ubicación** estando Online/disponible, además de guardar ubicación base se publica una posición GPS fresca para matching y se actualiza snapshot local, sin activar Online a quien está Offline. Prueba de contrato `provider-manual-location-refresh-matching.test.mjs`. No modifica reglas de matching, ubicación confiable, horarios ni permisos.
- El backend de horario + vencimiento se propone por separado en PR #560; el control de seguridad impidió aplicar la migración a UGO Arena TEST, por lo que **no se aplicó, no hay E2E backend y no debe fusionarse a ciegas**.
- Estado de esta mejora UI: IMPLEMENTADA EN RAMA / CI Y VALIDACIÓN RUNTIME PENDIENTES, nunca marcar matching end-to-end como DONE por este cambio. Siguiente paso: CI same-SHA y validación no regresiva de botón GPS; resolver migración autorizada en TEST y verificar oferta/alerta real.


### 2026-10-21 — P0 nueva_oferta suprimida pese a matching válido · recuperación foreground
- Evidencia read-only UGO Arena TEST: pedido real Electricidad `c27498a3-f5f4-4b96-8b69-573a69023d09`, proveedor elegible a ~3,11 km, oferta `pendiente` creada el 21/10 a 20:09:30 UTC tras actualizar horario 08:00–23:00. PostgreSQL registró `provider_dispatch eligible_count=1`, pero `provider_offer_alert_suppressed` a las 20:09:31–32 UTC; no existe fila `nueva_oferta` persistida para ese servicio/proveedor. Causa exacta: matching GPS <=90s vs trigger de notificaciones <=30s. Hasta alinear backend, Web Push fuera de UGO puede seguir sin emitirse.
- Corrección backend segura diseñada por separado en PR #560 (`20261021201500_provider_offer_alert_gps_freshness_parity.sql`) para unificar los 90s, manteniendo GPS preciso, radio, identidad, disponibilidad y dedupe. La herramienta bloqueó la escritura SQL anterior en Arena TEST; **ninguna migración se aplicó**. No declarar push/cierre P0.
- Corrección frontend independiente (esta rama): `NotificationCenter` recibe las ofertas persistidas ya cargadas por `ProviderData`, recupera alerta visual, sonido y vibración para ofertas `pendiente` con expiración del ciclo de 5 min dentro de los primeros 90 s, incluso si no hay fila `notificaciones`. Reutiliza `signalProviderAlert`, dedupe `oferta_id+expira_at`, guard de disponibilidad, sin lecturas extra, cambios RLS ni notificaciones sintéticas en DB.
- Estado: IMPLEMENTADO EN RAMA / tests del mismo SHA y validación runtime pendientes. El fallback sólo es una alerta **con la app abierta**; no sustituye Web Push. Revisar CI y P0 E2E antes de merge.


### 2026-10-21 — P0 GPS del Proveedor: recuperación directa desde radar (candidato)
- Baseline GitHub `main` `c2ab5c57fd4efeff36367cc239409433ae0da6da` publicado en Vercel. Arena TEST: varios perfiles Online/disponible con GPS superior a 90 s; no se los debe considerar aptos para matching. De los cuatro pedidos reales consultados, cuatro tuvieron al menos una oferta histórica; esto NO demuestra recepción actual de alertas.
- Mitigación mínima en rama `fix/p0-provider-gps-retry-from-radar-20261021`: los avisos `Online sem GPS válido` y `Localização desatualizada` incluyen el botón `Atualizar GPS`. Sólo dispara `getFreshBrowserPosition()` y el RPC existente `publicar_ubicacion_disponibilidad_proveedor` para un proveedor que ya figura Online, con timestamp y precisión validados; **nunca** altera Online/Offline ni amplía tolerancia 90 s/250 m.
- Se agregó contrato `tests/contracts/provider-radar-gps-manual-retry-20261021.test.mjs`, traducciones pt-BR/es/en y control táctil 44 px; validar CI same SHA y Android real antes de declarar DONE. No se creó migración, no se aplicó SQL, ni se modificó Supabase PROD.
- La migración en PR #560 (horario inmediato y deadline) sigue sin ejecutar en TEST por bloqueo de seguridad y conflicto con `main`; no fusionarla ni sustituir E2E real con contratos.
- Objetivo medible: volver a publicar GPS reciente desde la alerta sin que se desloguee el Proveedor y comprobar nueva oferta + notificación + sonido + aceptación en dos sesiones. Estado `IMPLEMENTED / CI PENDING / HUMAN E2E PENDING`.


### 2026-10-21 — CI exact-SHA: accesibilidad Admin y pruebas de navegador sin falsos bloqueos
- Base de corrección: `main` `d0f501c7e2515d3a6094b34a4bac2f2b757f6084` (UGO TEST / Vercel READY); PR #564 `fix/ci-a11y-provider-visual-20261021`.
- `UGO Cross Accessibility Runtime TEST` run 39676501503: AXE confirmó contraste insuficiente en `.mvp-kicker` y el submit del login de Admin. Corregido el kicker blanco/negro con prioridad CSS y botón Admin `#075bb8` para texto blanco WCAG AA. No cambia el color violeta de Super Admin.
- `UGO Provider Readiness Batch TEST` run 39676501536: selector basado en nombre literal `Trabajo` fallaba porque el nombre accesible cambia a `Agenda` o estado del servicio. Se comprueban los cuatro `data-testid` existentes con `waitFor(state: visible)`, sin omitir controles.
- `UGO Cross Visual Runtime TEST` run 39676501530: `ECONNREFUSED 127.0.0.1:4174` porque invocaba `role-ui-runtime.mjs` sin levantar el backend API de TEST. Se inicia el servidor local de la misma revisión (`scripts/admin-api-runtime-server.mjs`) con `UGO_TEST_ONLY`, `VITE_API_BASE_URL`, verificación `/__health` y cierre de procesos por trap. No se mockea la API.
- Contratos en `tests/contracts/ci-a11y-provider-visual-20261021.test.mjs`. Mantener pruebas reales Auth/RLS, matching y alertas separadas. Fase `IMPLEMENTED / CI CHECK`; no declarar corregido lo que sólo tenga prueba estructural.
- Sin cambios de SQL, matching, notificaciones, Auth, GPS, secretos ni Supabase PROD. Verificar la revisión exacta y el navegador antes de fusionar a `main`.

- Revalidación del PR #564: `UGO Cross-role UI Runtime TEST` run 39678359088 falló sólo en `testTranslations()` después del recorrido desktop: esperaba `.ugo-client-root` tras reload, aunque artefacto `role-ui-client-desktop.png` demuestra Cliente autenticado en `Tu perfil` (`.ugo-client-profile-panel`). Se actualizó el locator para esperar sólo Home o Profile autenticados, sin admitir login; nuevo contrato de persistencia. Fase `FIXED IN PR / SAME-SHA BROWSER RETEST PENDING`. Core CI anterior PASS para las reparaciones de contraste/nav/API, pero el nuevo HEAD requiere CI nuevamente.

## 2026-10-21 — Revisión preventiva de metodología y piloto Florianópolis (NO VALIDADA)

**Pedido:** revisar pros, contras, errores históricos y futuros de conectar HIVE/Empresa Autónoma, cola, GitHub Actions, Judge/Sentinel y Command Center; corregir los riesgos antes de activar automatización y conservar un método comprobado para terminar el piloto. Este registro es un **análisis preventivo con controles propuestos**, NO un certificado de que esos controles ya funcionan. El análisis debe ejecutarse sobre piezas existentes, sin crear orquestador paralelo.

### Beneficios sujetos a prueba
- Cola persistente: continuidad de un chat a otro, priorización y un dueño por tarea.
- Worker supervisado: reducir intervención repetitiva e incrementar trazabilidad.
- CI+Judge+Sentinel: imposibilidad de cerrar o publicar por simples commits y alertas tempranas de regresión.
- Command Center: visibilidad del mismo estado persistido, no tablero cosmético.

### Riesgos y fallas futuras que deben cerrarse ANTES de autonomía o piloto

| Riesgo/fallo probable | Control técnico concreto | Prueba de fallo obligatoria | Estado al 21/10 |
| --- | --- | --- | --- |
| R1 Trabajo duplicado/repetición tras reinicio | Idempotency key estable por trabajo/servicio, lease con TTL, fencing token, compare-and-swap, dedupe de side effects | Interrumpir worker en mitad de acción y reiniciar dos workers; exactamente un efecto de negocio | NO VERIFICADO |
| R2 Cola detenida por único P0 bloqueado | Estados BLOCKED/HUMAN_REQUIRED, grafo de dependencias y selección de siguiente tarea independiente; dead letter/retry budget | Bloquear dependencia externa y comprobar avance independiente sin cerrar P0 | NO VERIFICADO |
| R3 Autonomía infinita agota Free tier/API/DB | Limitar concurrencia, backoff+jitter, circuit breaker, cuotas y costo cero, heartbeat prudente, telemetría agregada | Forzar 429, timeout, 5xx y cuota agotada; sin tormenta de refresh/consultas | NO VERIFICADO |
| R4 Realtime/Auth/GPS degradados por agentes | Aislar carga agente de Supabase transaccional, límites por rol y circuito, observabilidad por operación | Simular reconexión/timeout y sesión token refresh con Cliente/Proveedor; sin logout ni carga excesiva | NO VERIFICADO |
| R5 False green CI o autoaprobarse | Judge lee evidencia persistida independiente, Sentinel no muta aprobación, protección branch/checks por SHA y contexto | Inyectar defecto y prueba negativa: no merge/no DONE incluso si agente reporta PASS | NO VERIFICADO |
| R6 Carrera main/PR/deploy SHA distintos | Releer HEAD antes de escribir, CAS/fast-forward, CI exact SHA, artifact digest, runtime revision y publicación deliberada | Avanzar main durante prueba; resultado viejo jamás promueve commit nuevo | NO VERIFICADO |
| R7 Migración o cambio productivo irreversible | TEST con contrato y datos sintéticos; backups restaurables; dry run/esquema, rollback/recovery, aprobación para operación de alto riesgo | Rechazar schema incompatible; ensayo rollback sin tocar datos productivos | NO VERIFICADO |
| R8 Datos sensibles filtrados en evidencias/logs | Redacción de tokens, GPS, identidades/servicios, RLS, secretos solo servidor; escaneo de artefactos | Intentar leer recursos de otro rol y buscar secretos en logs/artifacts | NO VERIFICADO |
| R9 E2E verde no refleja uso físico | Separar pruebas simuladas de GPS/cámara/sonido/push y de dos dispositivos Android reales; criterios humanos explícitos | Cliente/Proveedor reales: entrega, navegación, alertas, fotos, pago/cierre | NO VERIFICADO |
| R10 Publicación rompe funcionalidad antigua | Baseline/contratos, smoke post-deploy, monitoreo por revisión, canary/rollback apropiado y detener ante regresión | Sembrar fallo en preview y comprobar bloqueo de producción | NO VERIFICADO |
| R11 HIVE/worker/web sin continuidad real | Estado y ledger persistidos + supervisor, heartbeat y watchdog independientes, alerta de jobs atascados, modo OFF seguro | Matar worker/reiniciar servidor y reconstruir cola sin perder tareas ni fingir 24/7 | NO VERIFICADO |
| R12 UI y tablero desconectados de backend | Una sola fuente de verdad: ledger/checklist/eventos; mostrar SHA/entorno/estado/evidencia en Command Center | Comparar tablero contra DB/CI y detectar estado stale/incoherente | NO VERIFICADO |

### Puertas para corregir y volver a verificar
1. **Baseline:** capturar main HEAD, CI, estado real TEST/PROD, locks/queue, Supabase IO, Sentinel, PR #568 y flujos de Cliente/Proveedor. No usar checkpoint histórico como actual.
2. **Gates de metodología (antes de ON):** escribir y ejecutar fallos inyectados R1–R8, R11–R12. Implementar correcciones pequeñas sobre componentes que ya existen; repetir regresiones al mismo SHA. Tres mínimos: éxito confirmado, CI fallido bloquea DONE/merge y caída de worker recuperada sin duplicación.
3. **Gates de producto:** P0 Auth/GPS/matching/alerta/aceptación, luego lifecycle, mapa, agenda, reprogramación, 24h, fotos y pagos. E2E por servicio con estado persistido y pruebas negativas.
4. **Gates de publicación:** CI+TEST+Judge+Sentinel, verificación post-deploy del SHA, control rollback, aprobación humana requerida para producción y test físico en Florianópolis. No activar Empresa Autónoma antes de pruebas.
5. **Cierre documental SOLO DESPUÉS:** registrar evidencia reproducible por R#, run, SHA, fecha, entorno, owner, fallo previo, corrección, nuevo resultado y regresiones. Marcar VALIDADO sólo lo pasado; cualquier fallo queda pendiente abierto.

**Riesgos residuales inevitables:** pérdida de conectividad, GPS/background OS, límites de proveedores externos y fallos de dispositivos físicos. Diseñar recuperación y mensajes claros; no prometer ausencia total de fallos.

**No ejecutado en este registro:** pruebas de fallas inyectadas, modificaciones al worker, activación HIVE, migraciones o despliegues. **Próximo trabajo de ingeniería:** inspeccionar el ejecutor/cola/locks existentes y correr pruebas de R1/R3/R5/R11 sobre TEST de forma contenida; corregir causas y conservar evidencia antes de ampliar.


### P0 2026-10-21 — Recuperación automática del matching (PR #566)
- Preparada migración `20261021223000_safe_automatic_rematch_recovery.sql`: reintenta lotes de hasta 20 servicios `buscando`/`ofrecido` sin ofertas vigentes, omite asignados/cancelados, usa `FOR UPDATE SKIP LOCKED` y reutiliza controles existentes de autorización, GPS, deudas, categoría y horario.
- Agregado contrato `tests/contracts/p0-safe-automatic-rematch.test.mjs`. `UGO Core CI` run 39695166059 PASS; verificación de trazabilidad falló por falta de estas entradas, corregida en este PR.
- **No desplegado:** `pg_cron` de TEST sigue deshabilitado tras errores `job startup timeout`; producción no intervenida. Falta resolver PR #560, aplicar y validar migraciones TEST, verificar cancelación/aceptación simultáneas y E2E de ciclos de 5 minutos antes de activar cron o fusionar.
- Estado: `IMPLEMENTED IN DRAFT PR / TEST E2E AND MIGRATION PENDING`. La aprobación de requisitos no es evidencia de 12 pruebas completas.

- Integración P0 2026-10-21: consolidación del PR #560 dentro del PR #566 de las migraciones de horario inmediato/deadline y paridad GPS 90 s de notificación, junto con contratos. HEAD de integración requiere SAME-SHA CI y pruebas sobre Arena TEST. **No se aplicó SQL ni habilitó cron; no fusionar hasta confirmar E2E sin regresiones.**

- P0 GPS Pro 2026-10-21: captura de UGO Pro muestra proveedor Online fuera del radar, timeout GPS y estado Procesando. Se corrigió carrera comprobable en el código: refresco manual, primer heartbeat y refresco de foco podían iniciar capturas GPS simultáneas; ahora comparten una única adquisición en curso, con limpieza tras éxito/error, preservando validación de 90 s y precisión 250 m. Se agregó test contractual `provider-gps-singleflight-acquisition-20261021.test.mjs`. **PENDIENTE**: CI same-SHA, prueba navegador con GPS real, validación Auth/RLS, matching de alerta/aceptación/cancelación y merge; no afirmar recuperación E2E todavía.

- 2026-10-21 P0: opción voluntaria «Recibir ofertas las 24 horas» en agenda de Proveedor (schedule.receive24h=false por defecto). Solamente elimina restricción horaria para ofertas inmediatas; trabajos programados, GPS fresco, Online, zonas, deuda, calendario de conflictos y autorización permanecen. SQL `20261022014500_provider_opt_in_24h_offers.sql`, contrato `provider-24h-offers-opt-in.test.mjs`. Pendiente CI SAME-SHA, instalación controlada TEST y E2E navegador; sin aplicar producción.

- 2026-10-21 P0 opciones 24h: Core CI del SHA d4e2a9e falló en auditoría i18n JSX (una etiqueta literal de Proveedor). Corregido con `providerPortfolio.receive24h` localizado pt-BR/es/en en `extended.ts`, uso `t(...)` en UI y contrato actualizado. Matching E2E automatizado del SHA anterior SUCCESS, pero no equivale a prueba humana de aviso sonoro y aceptación. Esperar CI mismo SHA y prueba de dispositivo antes de merge.

- 2026-10-21/22 P0 avance: migración `20261022020000_rematch_on_fresh_provider_gps.sql` instalada en Arena TEST: reintenta pedidos sin ofertas tras 60 s de cooldown si existe proveedor Online/disponible con GPS <=90 s y precisión <=250 m, sin esperar vencimiento 5 min; conserva SKIP LOCKED, 20 por lote y filtros de ofertas vigentes/cancelación/asignación. Contrato `provider-fresh-gps-early-rematch.test.mjs`. Cron observado 41 SUCCESS/1 FAIL (startup timeout 01:44 UTC). Pedido real f94bb5da... aún buscando a las 01:56 UTC; pendiente proveedor GPS real estable, confirmación oferta y alerta/aceptación. Mantener PROD sin cambios.

- 2026-10-21 P0 GPS watcher: corregido reinicio de watchPosition con timeout pendiente: startWatch cancela restartTimer obsoleto y pone watchId=null tras clearWatch; callback descarta ID del timer; prueba `provider-gps-watch-restart-recovery.test.mjs`. En SHA 3d0cd6d Cross-role UI falló `AUTONOMY_UI_STATE_MISMATCH` (Super Admin), aunque Core y Matching E2E pasaron. Nuevo CI same SHA pendiente; GPS y alerta reales aún sin certificar. No fusionar ni producción.


### 2026-10-22 — PR #569: sincronización de prueba UI de autonomía
- Tras la integración P0 del PR #566 en `main` (`03b29a13`), el runtime multirrol falló en `AUTONOMY_UI_STATE_MISMATCH` por observar `aria-checked=false` antes de confirmar hidratación de la vista.
- Cambio del PR #569: esperar selección efectiva de la radio, releer el modo de autonomía persistido y mantener aserción estricta de coincidencia; no activar ni modificar Empresa Autónoma ni su gate. Core CI y Cross-role UI aprobaron el commit `8d6fddec` en PR; nuevo SHA requiere repetir controles.
- Cierre pendiente: Roadmap Traceability, demás controles del SHA final, fusión a `main`, comprobación postmerge; sin afirmar pruebas físicas GPS/oferta/sonido. Hugo Presence, RPC/RLS y Visual siguen como incidencias independientes.


### 2026-10-22 — Postmerge PR #569: compatibilidad Playwright runner
- En `main` be7377c8, Cross-role UI (run 39837869684) y Cross Visual (run 39837869745) fallaron antes de ejecutar Chromium: `Playwright 1.56.1 does not support chromium on ubuntu26.04-x64` al usar `ubuntu-latest`. No es evidencia de defecto de producto.
- Corrección acotada: fijar `runs-on: ubuntu-24.04` en `.github/workflows/role-ui-runtime.yml` y `.github/workflows/cross-visual-runtime.yml`, sin relajar las aserciones, la seguridad ni modificar la app. Estado IMPLEMENTADO EN RAMA, pendiente CI/navegador del SHA final y verificación tras fusión.
- Otras pruebas de RPC/RLS, GPS real y entrega de ofertas en dispositivo siguen pendientes de comprobación independiente.


### PR #558 — CI runtime regression fixes reconciled with current main (2026-10-23)
- Prior UI navigation and WCAG login contrast fixes already exist on newer main and are preserved intact. The missing immutable SHA handoff (`UGO_RUNTIME_SHA`) was added to the GPS/geofence workflow step, and its exact runtime contract test is included.
- No business logic, Supabase schema, production settings or autonomy permissions changed. Verify the merged branch SHA in CI and runtime before main integration.


### 2026-10-23 — PR #572: integración incremental de Agent Skills en UGO
- Objetivo: reforzar reparación P0, pruebas, revisión, seguridad, CI y publicación con 8 skills de ingeniería externas, preservando todas las skills propias `ugo-*` y el protocolo `AGENTS.md`.
- Fuente auditada: `sebastisnzoth/agent-skills` commit `aeac41d4d005999432bb7312f7ff06383a91d59d` (MIT). Copias exactas en `.agents/skills/`, licencia incluida en `docs/third-party/agent-skills-LICENSE` y guía `docs/UGO_AGENT_SKILLS_INTEGRACION.md`.
- Cambio de integración: enrutamiento de skills dentro de `AGENTS.md`, prueba `tests/contracts/agent-skills-integration.test.mjs` ejecutable desde Core CI; **ninguna modificación de lógica Cliente/Proveedor, Supabase, configuración productiva, secretos ni autonomía**.
- Evidencia parcial: preflight comparó los 8 blobs origen/destino y validó enrutamiento/licencia; en el primer SHA de PR `145a9f1b` falló Roadmap Traceability por falta de estos registros (no por fallo funcional). Este commit agrega la trazabilidad faltante. Requerido: checks actualizados del nuevo SHA y merge seguro; no marcar DONE antes de verificarlos.
- P0 Cliente → Pedido → Proveedor, Auth/GPS/Realtime y prueba humana siguen **pendientes de validación funcional**, no se declaran resueltos por importar instrucciones. No se habilita Empresa Autónoma.


### 2026-10-23 — P0: prueba real de alerta sin recarga (skills: debugging, TDD, QA)
- Se identificó un falso positivo estructural: `scripts/p0-client-provider-e2e.mjs` forzaba `page.reload()` inmediatamente antes de demostrar la oferta. Eso verificaba persistencia/RPC pero **no** alerta en vivo, que es el reclamo del piloto.
- Cambio acotado: observador de alerta visible armado **antes** de crear el pedido; registra `offerId` y `serviceId` exactos del popup en la sesión del Proveedor; exige la coincidencia antes de aceptar, sin recargar. Se preserva prueba de sesión y aceptación. El popup expone esos IDs sólo al usuario autenticado para atribución determinista en UI TEST.
- Runner de E2E fijado a `ubuntu-24.04` para Playwright 1.56.1 y contrato preventivo `tests/contracts/p0-live-offer-before-reload.test.mjs`.
- No se cambian RPC, políticas RLS, bases, disponibilidad, deuda, GPS, backend de matching ni producción. **Pendiente** Core CI, browser E2E en TEST, validación de smoke postmerge y prueba de dos dispositivos (no declarar P0 resuelto hasta superar puertas). Si falla alerta, bloquear merge y usar esa traza para reparar el componente real.

- **Incidencia CI confirmada (run 39935340702):** Provider Notifications Runtime completó sus 18 tests previos (18 PASS), pero la instalación de Chromium terminó con `Playwright does not support chromium on ubuntu26.04-x64`; era falla de infraestructura, NO prueba de defecto de alerta. Corrección mínima en el workflow de notificaciones: `runs-on: ubuntu-24.04`, mismo Playwright 1.56.1, sin deshabilitar checks ni modificar lógica. Reejecutar E2E y Judge/Sentinel sobre SHA actualizado para evaluar alerta de verdad.

### 2026-10-23 — P0 postmerge: restaurar runners de pruebas de navegador
- Evidencia reproducible exact SHA `6e0e8ab7`: Provider Alerts [run 39936811451] y Cross Accessibility [run 39936811417] terminaron FAIL **antes de ejecutar el navegador** por `Playwright does not support chromium on ubuntu26.04-x64` al usar `ubuntu-latest` con `playwright@1.56.1`. No adjudicar este fallo a Auth, GPS ni matching.
- Reparación mínima: fijar `ubuntu-24.04` en workflows existentes Provider Alerts, Cross Accessibility, Provider UI y Client Notifications, conservando Playwright y aserciones; se añade contrato `tests/contracts/playwright-runner-compatibility-20261023.test.mjs` para prevenir regresión. Ni lógica de producto, ni SQL, ni secretos, ni bases de datos modificados.
- Estado: **cambio pendiente de CI exact SHA, Judge/Sentinel y pruebas browser postmerge**. La prueba P0 de matching live sin recarga ya pasó para PR #573; no equivale a prueba humana de dos celulares, ni acredita que Cliente haya creado la solicitud desde su propia UI. No habilitar Empresa Autónoma ni declarar piloto READY.

### 2026-10-23 — Core CI: seguridad de dependencia Zod
- `zod@4.4.3` llegaba sólo al árbol de desarrollo mediante `eslint-plugin-react-hooks@7.1.1` / `zod-validation-error`. Advisory reproducido: `GHSA-mrhx-c7xc-m3w5`, high, rango vulnerable `<4.6.6`; run de referencia `40031488931`.
- Corrección acotada generada con npm: lockfile actualizado a `zod@4.6.7`, compatible con la gama declarada y sin cambios en `package.json`, integridades manuales, `--force` ni security gate.
- Evidencia local: instalación limpia `npm ci`; `npm audit --audit-level=high` = 0; build/TypeScript, contrato focalizado e i18n PASS; 1508 pruebas PASS / 0 FAIL / 8 SKIP; lint 0 errores con 986 warnings ya presentes en baseline `8c753669…`.
- Madurez: **candidato local verificado, CI VALIDATED e INTEGRATED pendientes del SHA exacto**. No es evidencia runtime de Hive, matching ni roles y no modifica bases o canales publicados. Siguiente: Actions same-SHA, integración independiente y verificación postmerge.

### PR #552 — Reconexión Realtime de Proveedor y prueba P0 reforzada (2026-10-23)
- Se conservó el handler `online` con resync/reconnect y cleanup simétrico. Esa refactorización por sí sola no se considera recuperación demostrada: el E2E ahora fuerza `offline/online` en Chromium, exige un nuevo `channel_ready`, mantiene la sesión y entrega después la oferta Realtime en la misma página.
- La prueba también exige una única oferta para el proveedor y repite `aceptar_oferta`: debe devolver el mismo servicio sin cambiar asignación, economics, timestamps ni ofertas. No se añadieron migraciones ni acceso a PROD.
- Árbol integrado local: 1522 tests, 1514 PASS / 0 FAIL / 8 SKIP; build/TypeScript PASS; i18n JSX/keys PASS; lint 0 errores / 986 warnings preexistentes. Pendiente P0 E2E y Cross-role del SHA final antes de cualquier merge. GPS de Chromium no equivale a GPS físico.

### 2026-10-23 — P0 presión de Supabase TEST / Super Admin Realtime (PR #552)
- Evidencia real: Cross-role UI run `40039204694` falló `ADMIN_CREATE_API_FAILED` (HTTP 500). Logs de Supabase TEST del 23-10 23:26 UTC muestran `POST /admin/users` con `request_timeout`/504 y `autonomous_jobs` PostgREST 500; **no es prueba de fallo de credenciales ni de la lógica de matching**.
- Causa de amplificación identificada en frontend: `SuperAdminCommandCenter` suscribía 18 tablas Realtime y cada evento podía disparar una recarga integral tras 250 ms, con múltiples `count:exact`, páginas y consultas por departamento. Se limita solo el refresco disparado por Realtime: intervalo mínimo 8 s, coalescencia de ráfagas, máximo una recarga Realtime concurrente, refresco pendiente y omisión cuando la pestaña está oculta. Las acciones manuales y carga inicial mantienen su ruta previa.
- Verificación previa: prueba de ejecución del scheduler con tres eventos seguidos => una sola carga, y segundo evento a +500 ms => espera 7500 ms. Se añadió contrato automatizado; CI exact-SHA, Cross-role, P0 E2E, ausencia de regresiones y smoke publicado siguen **PENDIENTES**. No se tocó PROD ni se activó Empresa Autónoma.

### PR #568 — GPS timestamp integrity (2026-10-23)
- On the reconciled branch, GPS errors during Online availability retain the last genuinely captured fix for at most 90 s; route mode retains 30 s. Rehydration and Realtime use persisted capture timestamps, reject expired/future/out-of-order fixes, and never extend freshness by reloading the UI. Contract tests accompany the fix. CI and physical E2E remain required before merging to main.

### 2026-10-24 — P0 PR #580: notificaciones del Proveedor tras Auth tardía
- Baseline main `393346831f9e63741d14c5fc16e2922d8cb70a97`. `NotificationCenter` consultaba `getSession()` una sola vez; si devolvía null antes de `SIGNED_IN`, no instalaba el canal Realtime.
- Cambio mínimo en `src/mvp/NotificationCenter.tsx`: escucha Auth antes de consultar sesión; crea canal cuando llega `SIGNED_IN`, evita re-suscripción por `TOKEN_REFRESHED` y elimina listener/canal al desmontar o salir.
- Regresión en `scripts/provider-notification-recovery-browser.mjs`: sesión inicial null, SIGNED_IN, no duplicación tras TOKEN_REFRESHED, limpieza; el mock conserva la sesión al remontar el componente, igual que Auth real.
- GitHub Actions para PR #580 (`40056574862`) encontró timeout en el test al remontar el componente porque el mock anterior siempre devolvía sesión null; reparado el mock en el mismo PR. Roadmap Traceability (`40056574850`) exige actualizar roadmap y continuidad; se conservó este gate.
- Estado: **candidato corregido en PR #580, CI del SHA nuevo aún pendiente; NO MERGE / NO PROD / E2E física HUMAN_REQUIRED**. Próximo paso: comprobar Provider Notifications Runtime, Core CI, Cross-role y seguridad del SHA vigente; corregir fallas reales antes de integrar.

### 2026-10-24 — P0 E2E cliente/proveedor UI-first (PR #580)
- `scripts/p0-client-provider-e2e.mjs` ahora obliga, en modo browser TEST, a ingresar el pedido recorriendo las pantallas Cliente need → location → when → payment → summary → confirm; verifica la fila persistida y la oferta nacida desde la UI. En modo UI queda prohibida la inserción directa del servicio y la invocación manual `iniciar_matching` por el test. El modo API-only sigue separado y no constituye comprobación visual.
- Proveedor: si el botón Online falla, la prueba falla sin activar disponibilidad mediante el RPC privilegiado de respaldo. Ubicación en Playwright = simulada, no prueba GPS física.
- Estado: implementación candidata sin resultados CI same-SHA ni comprobación física; NO MERGE a main por publicación automática Pages y Vercel de producción. Corregir cualquier fallo del runtime antes de declarar PASS. Mantener Supabase TEST exclusivamente.
