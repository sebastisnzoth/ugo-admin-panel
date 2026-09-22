# UGO — Plan de ejecución por sprints

Objetivo: llevar la línea base actual hasta un release verificable sin reescribir el producto ni mezclar rediseño con deuda crítica.

## Principios

1. Backend y seguridad son la fuente de verdad.
2. Cada sprint termina con evidencia, no solo código.
3. Todo remoto se ejecuta contra UGO TEST.
4. No se promueve mientras exista un P0 de dinero, permisos, evidencia o convergencia.
5. Stitch y el polish visual entran después de estabilizar el journey.

## Sprint 0 — Preparación y baseline

**Objetivo:** hacer reproducible la validación.

Tareas:

- Confirmar que `main` es la base candidata.
- Confirmar secrets TEST de Cliente, Proveedor y Admin.
- Ejecutar `npm run verify:test-env`.
- Ejecutar `npm ci --include=dev`.
- Ejecutar `npm run build` y `npm test`.
- Ejecutar la Action aislada manualmente.
- Registrar SHA, resultado y bloqueos.

Salida:

- Entorno TEST confirmado.
- CI básico verde.
- Lista de fallos reproducible.

No avanzar si:

- una prueba apunta a producción,
- faltan credenciales para un gate requerido,
- el build base no es reproducible.

## Sprint 1 — Lifecycle y matching

**Objetivo:** cerrar el ciclo de asignación y estados.

Tareas:

- Validar creación de solicitud.
- Validar matching dirigido y oportunidad redactada.
- Validar privacidad antes de asignación.
- Validar aceptación atómica.
- Probar doble aceptación concurrente.
- Validar `serviceId` único en Cliente, Proveedor y Admin.
- Validar cancelación y ownership.

Evidencia:

- servicio creado,
- oferta recibida,
- aceptación única,
- estado asignado persistido,
- actor no autorizado rechazado.

## Sprint 2 — Pago y cierre financiero

**Objetivo:** impedir estados operativos sin dinero válido.

Tareas:

- Probar pago electrónico.
- Probar pago efectivo separado.
- Validar gate `asignado → en_camino`.
- Validar confirmación de efectivo.
- Probar doble webhook y retry.
- Validar comisión, ganancia y monto bruto.
- Probar doble aprobación y doble cierre.
- Validar ampliación con delta financiado.

Evidencia:

- snapshot de pagos antes y después,
- importe final,
- estado financiero final,
- resultado de retries sin duplicación.

## Sprint 3 — Evidencia, Storage y disputas

**Objetivo:** garantizar trazabilidad del trabajo.

Tareas:

- Validar evidencia `antes` antes de iniciar.
- Validar evidencia `despues` antes de revisión.
- Rechazar filas sin objeto real en Storage.
- Validar ownership de evidencias.
- Probar visualización autorizada con URL firmada.
- Probar disputa desde Cliente.
- Confirmar que Admin puede auditar el expediente.

Evidencia:

- objetos reales en Storage,
- filas vinculadas,
- tipos `antes` y `despues`,
- acceso permitido y denegado.

## Sprint 4 — RLS/RPC y hardening

**Objetivo:** cerrar permisos reales, no solo contratos estáticos.

Tareas:

- Ejecutar Cliente, Proveedor y Admin contra base aislada.
- Probar cada operación con actor permitido.
- Repetir con actor incorrecto.
- Revisar funciones `SECURITY DEFINER`.
- Revisar grants públicos y autenticados.
- Auditar tablas auxiliares, Storage y canales.
- Verificar que errores de dominio tengan códigos y mensajes estables.

Evidencia:

- matriz permitida/denegada,
- logs de RPC,
- resultados RLS,
- lista de funciones sensibles revisadas.

## Sprint 5 — Realtime y resiliencia

**Objetivo:** asegurar que todas las sesiones convergen.

Tareas:

- Validar cambios de servicio sin refresh.
- Validar cambios de pago.
- Validar evidencias y ampliaciones.
- Validar mensajes bidireccionales.
- Cortar y restaurar conexión.
- Repetir eventos duplicados.
- Confirmar resync desde estado persistido.
- Ejecutar `scripts/chat-realtime-probe.mjs`.

Evidencia:

- timeline de eventos,
- estado final idéntico en Cliente/Proveedor/Admin,
- reconexión exitosa,
- ausencia de duplicados.

## Sprint 6 — QA físico y accesibilidad operativa

**Objetivo:** validar lo que CI no puede probar.

Tareas:

- Ejecutar flujo en dos dispositivos reales.
- Probar permisos GPS.
- Probar llegada automática y fallback manual.
- Probar cámara y subida de imágenes.
- Probar voz/Hugo con fallback si el servicio no está disponible.
- Probar viewport móvil y desktop.
- Revisar errores visibles y estados de carga.
- Confirmar recuperación tras cerrar/reabrir la app.

Evidencia:

- checklist firmado,
- capturas o grabación breve,
- `serviceId` por escenario,
- incidentes clasificados P0/P1/P2.

## Sprint 7 — UX final y Stitch

**Objetivo:** aplicar el diseño sin alterar contratos de negocio.

Tareas:

- Comparar la UI actual con la fuente Stitch.
- Portar tokens y componentes de forma controlada.
- No copiar HTML exportado directamente a producción.
- Mantener actions y hooks existentes.
- Revisar estados loading, empty, error, success y offline.
- Ejecutar contratos después de cada bloque visual.
- Revisar Cliente, Proveedor y Admin por separado.

Evidencia:

- capturas comparativas,
- contratos verdes,
- lista de componentes modificados,
- ausencia de regresiones funcionales.

## Sprint 8 — Release candidate

**Objetivo:** preparar una versión promovible.

Tareas:

- Congelar el SHA candidato.
- Ejecutar checklist `docs/UGO_RELEASE_CHECKLIST.md`.
- Ejecutar Core CI y Isolated RPC RLS.
- Repetir prueba manual electrónica y efectiva.
- Revisar migraciones y rollback.
- Actualizar runbook y roadmap.
- Obtener aprobación técnica y funcional.

Salida:

- estado `RELEASE CANDIDATE` si todo está verde.
- estado `NO PROMOVER` ante cualquier P0.

## Sprint 9 — Promoción controlada

**Objetivo:** promover solo con evidencia completa.

Tareas:

- Confirmar que la promoción no ejecuta pruebas sobre producción.
- Aplicar migraciones mediante el procedimiento aprobado.
- Verificar health checks.
- Ejecutar smoke post-deploy.
- Monitorear errores, pagos, Storage y Realtime.
- Mantener rollback disponible.

Salida:

- release promovido,
- evidencia post-deploy,
- monitoreo activo,
- incidentes documentados.

## Orden diario de trabajo

1. Leer el último fallo real.
2. Reproducirlo en UGO TEST.
3. Corregir la capa responsable.
4. Ejecutar la prueba específica.
5. Ejecutar `npm test`.
6. Ejecutar integración si cambió backend, seguridad o flujo.
7. Actualizar checklist y runbook.
8. No mezclar una mejora visual con un fix financiero en el mismo cambio si dificulta la trazabilidad.

## Definición de terminado

UGO puede considerarse terminado cuando:

- Sprints 0–6 tienen evidencia verde.
- Sprint 7 no introduce regresiones.
- Sprint 8 queda aprobado por CI y QA manual.
- No quedan P0 de dinero, RLS/RPC, ownership, evidencia o Realtime.
- Existe rollback y documentación de release.
