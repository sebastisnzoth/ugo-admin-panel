# UGO — Registro de evidencias físicas y cadena de custodia

**Fecha:** 2026-11-11  
**Estado:** inventario documental, sin consulta a datos personales ni acceso a PROD.

## Fuentes técnicas localizadas
1. [Runbook de dos dispositivos](UGO_TWO_DEVICE_PHYSICAL_RUNBOOK.md): describe procedimiento TEST, controles GPS, geofence, cámara, Storage, Realtime, pagos y campos para registrar una corrida. **Es procedimiento, no constancia de ejecución.**
2. [Production readiness](PRODUCTION_READINESS.md): exige pruebas físicas y SAME-SHA del candidato final. Su estado registrado `NOT READY` no invalida pruebas físicas parciales o anteriores; distingue certificación final de pruebas ya realizadas.
3. [Evidencia automatizada histórica](evidence/readiness-client-provider-lifecycle-20261002.json): declara PASS de un servicio simulado en SHA `5603f21...`; reconoce que no cubrió GPS/cámara físicos.
4. [Auditoría Pix posterior al servicio](UGO_PIX_POST_SERVICE_CLIENT_PROVIDER_AUDIT_20261110.md): enumera bloqueos actuales del flujo Pix; no contradice una prueba previa con efectivo.

## Antecedentes de pruebas reales reportados en el historial del proyecto
| Fecha | Prueba reportada | Clasificación | Artefacto técnico primario |
| --- | --- | --- | --- |
| 2026-10-01 | Hugo voz, geofence y fotografías | Reporte del fundador | Pendiente de localizar |
| 2026-10-03 | Proveedor Chrome, sesión Online y GPS | Reporte del fundador | Pendiente de localizar |
| 2026-10-28 | Dos celulares, servicio TEST #2697, llegada, fotografías y cierre con efectivo | Reporte del fundador | Pendiente de localizar |
| 2026-10-29 | GPS/matching y correcciones de campo | Antecedentes del proyecto | Pendiente de delimitar por SHA y artefactos |

**Precisión:** una búsqueda GitHub de `2697` no devolvió coincidencias. No prueba que el servicio no existió; el registro primario no fue localizado en el repositorio.

## Cadena de custodia pendiente para #2697
- [ ] Determinar instancia **TEST** exacta, SHA y fecha/hora de la prueba, sin usar datos de PROD.
- [ ] Localizar ID de servicio y estados backend en TEST; no publicar identificadores personales.
- [ ] Corroborar geofence con registro de decisión y frescura GPS, sin exponer coordenadas de domicilios.
- [ ] Confirmar presencia de evidencia inicial/final mediante metadatos sanitizados de Storage, sin publicar fotografías de personas o viviendas.
- [ ] Corroborar método efectivo, valor R$120 y comisión R$18 como registros de TEST; no confundir saldo calculado con dinero efectivamente transferido.
- [ ] Verificar entrega de oferta y actualización Cliente/Proveedor si hay registros persistidos.
- [ ] Anotar SHA/fecha y enlaces a artefactos no sensibles; registrar huecos como pendientes.

## Reglas de certificación
- **Reportado:** fundador confirmó una prueba en conversación.
- **Documentado:** existe un archivo de procedimiento o resumen.
- **Corroborado:** artefacto técnico primario contrastado en TEST con fecha, SHA y resultado.
- **SAME-SHA final:** conjunto de pruebas requerido para el candidato de lanzamiento; no se obtiene combinando evidencias históricas.

La prueba física reportada **no debe borrarse del relato de UGO** por faltar el artefacto primario; tampoco se debe presentar como certificación final independiente sin él.

## Restricciones
R$0; solo lectura; no modificar Arena PROD, no hacer pruebas sobre PROD; no publicar fotos privadas, coordenadas, identidades, secretos o registros de clientes.

## Próxima tarea
Buscar evidencias TEST de #2697 y adjuntar referencias sanitizadas. Si el backend TEST no está disponible, dejar explícito el bloqueo y preservar los testimonios fechados.

## Comprobación de ubicación de datos — 2026-11-11

Se consultó **solo metadatos** de proyectos Neon accesibles: `ugo-pagamentos-v2-test` (creado 2026-11-06) y `UGOAPP` (creado 2026-10-30). **Ninguno de estos proyectos puede presumirse origen del servicio físico #2697 del 2026-10-28**, dado que ambos se crearon después de la prueba reportada. No se ejecutó SQL ni se consultaron filas de usuarios, servicios o pagos.

El runbook de dos dispositivos identifica un proyecto Supabase TEST distinto (`tmossnqfwfwjrtzwcbmm`), pero el procedimiento no confirma que esa fuera la instancia del servicio #2697. No se intentó consultar Supabase PROD.

**Estado:** origen de datos primarios de #2697 sin identificar con certeza; pendiente acceso de solo lectura a la instancia TEST histórica correcta y a sus artefactos. Evitar buscar #2697 en Neon Pagamentos V2 como si fuera el sistema original.

**Siguiente verificación segura:** contrastar despliegue/fecha/entorno de la prueba histórica con los registros TEST disponibles, sin tocar PROD.

## Verificación del mapa de entornos — 2026-11-11

Fuentes consultadas:
- [UGO_ENVIRONMENTS.md](UGO_ENVIRONMENTS.md): declara canónicamente `tmossnqfwfwjrtzwcbmm` como UGO TEST y `trfsjuseqjxlhrxuvdsm` como producción; advierte que el nombre visible puede confundirse con Arena.
- [src/lib/supabaseProject.ts](../src/lib/supabaseProject.ts): confirma que la configuración del cliente `main` fija `UGO_ENVIRONMENT='test'` y el mismo project ref TEST.
- [complete-test-journey-20260929.json](evidence/complete-test-journey-20260929.json): acredita documentalmente una corrida **automatizada** en UGO TEST, servicio #815, SHA de ejecución `e523862f6913cc3f3ee02f84de09e7cbaa71e27f`, con estados y pago efectivo, pero **expresamente no valida GPS físico ni aceptación humana**.

**Conclusión:** `tmossnqfwfwjrtzwcbmm` es el candidato canónico para localizar los registros físicos históricos de #2697. Esto **no prueba todavía** que #2697 exista en ese proyecto ni que sus archivos sigan conservados.

**Limitación de acceso:** las herramientas conectadas en esta sesión permiten leer metadatos Neon, pero no proporcionan acceso de lectura directa a las tablas/Storage del proyecto Supabase TEST histórico. No se ejecutó SQL ni se consultó PROD. No se inventan resultados de base de datos.

**Próximo paso ejecutable al contar con acceso de solo lectura a Supabase TEST:** buscar el identificador numérico 2697 en la tabla de servicios de TEST; obtener ID interno y eventos por referencia; corroborar evidencias Storage y pagos con consultas mínimas y RLS; publicar únicamente un resumen sanitizado.

## Evidencia primaria corroborada en Supabase TEST — 2026-11-11

**NOVEDAD: acceso de solo lectura obtenido mediante conector Supabase.** Proyecto `tmossnqfwfwjrtzwcbmm` confirmó estado `ACTIVE_HEALTHY`. Se consultaron únicamente metadatos, esquema y filas filtradas por servicio; **ninguna escritura ni consulta a PROD**.

### Servicio físico #2697 — verificado en base TEST
- `public.servicios.numero=2697`; identificador interno `1e3151b2-c920-4a5e-a47b-751516a3808e`; creado 2026-10-25 00:57:09 UTC; estado actual `completado`.
- Eventos de estado persistidos: `ofrecido → asignado` (2026-10-27 04:43:42 UTC), `asignado → en_camino` (04:43:54); `en_camino → llegado` (2026-10-28 10:50:05 UTC), `llegado → en_progreso` (10:50:22), `en_progreso → esperando_aprobacion` (10:50:51), `esperando_aprobacion → completado` (10:51:53).
- Dos filas en `public.evidencias_servicio`: `antes` (2026-10-28 10:50:21 UTC) y `despues` (10:50:51 UTC), ambas con `storage_path` no nulo. **No se abrieron fotografías ni se validó contenido de los objetos Storage**.
- Una fila en `public.pagos`: método `efectivo`, monto bruto **R$120**, estado `liberado`, fecha de confirmación presente. Esto **no** acredita una transferencia electrónica.
- Una fila en `public.deudas_ugo_proveedor`: monto de servicio **R$120**, monto pagado UGO **R$18**, estado `pagado`. Son registros de TEST, **no ingresos comerciales auditados**.
- Ofertas consultadas: una `aceptada` y una `expirada`. Hay transiciones de búsqueda/oferta previas, que no se deben omitir si se evalúa la experiencia completa.

### Qué queda sin corroborar
- Capturas/fotos originales y su contenido; metadatos de Storage solo acreditan referencias.
- GPS físico, precisión, geofence y ubicación real; no se inspeccionaron eventos específicos de ubicación.
- Dos dispositivos reales y acciones humanas: respaldados por reporte del fundador, no por la sola base de datos.
- Conciliación bancaria/efectivo real y facturación de una empresa; no inferirlas desde filas TEST.
- Prueba Pix/split/escrow; el servicio #2697 usó efectivo.

### Estado de evidencia para inversores
**CORROBORADO EN TEST:** existencia, cadena final de estados, referencias de dos evidencias, importe y comisión registrada del servicio #2697.  
**REPORTADO POR FUNDADOR:** ejecución física con dos teléfonos.  
**PENDIENTE:** evidencia de geofence/GPS y verificación no invasiva de objetos Storage.

**Corrección a notas anteriores:** la limitación de acceso Supabase ya no aplica; se obtuvo acceso de lectura en esta sesión. Las notas históricas permanecen como registro de decisiones anteriores, no como estado actual.

## Segunda corroboración: objetos Storage y auditoría — 2026-11-11

Consultas **solo SELECT**, restringidas al servicio #2697 de Supabase TEST `tmossnqfwfwjrtzwcbmm`:
- `public.servicios.metadata.demo` devuelve `false`. Esto caracteriza el registro como **no demo**; no es certificación externa de personas, geofence ni facturación real.
- Dos objetos coinciden en `storage.objects.name` con las rutas de `public.evidencias_servicio.storage_path`: `antes` con metadato MIME `image/png` y `despues` con `image/jpeg`. **Existencia de objetos corroborada**; no se descargaron, visualizaron ni divulgaron imágenes.
- `public.audit_log` contiene dos eventos vinculados al servicio: `cliente_ubicacion_servicio_guardada` y `client.cash_payment.confirmed`. Confirman registros de auditoría de ubicación del cliente y confirmación de efectivo; **no prueban precisión GPS del proveedor, radio de geofence, ni liquidación bancaria**.

**Actualización del estado:** existencia de objetos Storage y auditoría de pago/ubicación = **CORROBORADO EN TEST**. Evidencia GPS/geofence físico detallada = **PENDIENTE**. Ninguna modificación a datos ni a producción.

## Auditoría específica GPS/geofence — 2026-11-11

Consultas SELECT a Supabase TEST para el servicio #2697:
- Dos ofertas con `distancia_km` registrada, ambas **0,30 km (300 m)**. **Distancia de oferta/matching, no distancia de llegada**. No usar esta cifra como validación del geofence de 200 m.
- Un evento persistido de transición a `llegado` (2026-10-28). **Estado de llegada acreditado**; el evento por sí solo no conserva la lectura GPS que permitió la transición.
- Ningún evento de `audit_log` asociado directamente al ID del servicio con nombre que incluya `gps`, `geofence` o `llegad`. **Ausencia en ese filtro no demuestra que no se haya verificado GPS**.
- El esquema incluye `perfiles_proveedor.ubicacion_accuracy_m` y `ubicacion_updated_at`, pero representan ubicación del perfil (potencialmente actualizada desde la prueba), no necesariamente una instantánea histórica del 28 de octubre. No se consultaron coordenadas privadas.

**Dictamen:** llegada y matching con distancias registradas = **corroborado**; cumplimiento físico del umbral geofence y precisión GPS histórica = **no certificable con los registros inspeccionados**. No repetir pruebas por defecto; buscar logs históricos o capturas fechadas antes de solicitar nueva ejecución.

Esta verificación no alteró TEST ni PROD.

## Corroboración del control de llegada en backend ACTIVO — 2026-11-11

Se inspeccionó **en la base TEST activa**, sin mutaciones, la definición de las funciones PostgreSQL y el estado de los triggers:
- `public.marcar_llegada_proveedor` **sí** contiene la condición de rechazo por distancia `> 200 m`, controles de GPS antiguo (`gps_stale`) y precisión insuficiente (`gps_inaccurate`).
- `private.enforce_validated_provider_arrival` está presente y su trigger `trg_enforce_validated_provider_arrival` sobre `public.servicios` aparece **habilitado** (`tgenabled='O'`). La migración versionada `supabase/migrations/20260924162000_provider_arrival_gps_gate.sql` explica que el trigger requiere el marcador transaccional de llegada validada para pasar de `en_camino` a `llegado`.
- En #2697 consta la transición `en_camino → llegado` el 2026-10-28 10:50:05 UTC, seguida por `llegado → en_progreso` a las 10:50:22, `en_progreso → esperando_aprobacion` a las 10:50:51 y `esperando_aprobacion → completado` a las 10:51:53.
- En TEST consta pago efectivo R$120, confirmación auditada `client.cash_payment.confirmed` y comisión R$18 registrada `pagado`.

**Interpretación probatoria precisa:** se corroboró que **hoy** el backend TEST tiene una barrera activa de GPS/geofence de 200 m, y que #2697 pasó por la secuencia de llegada, inicio y finalización. Es evidencia conjunta sólida del flujo funcional. No se ha demostrado mediante una instantánea histórica de definición de función/trigger que la misma configuración exacta estuviera activa el 28/10; tampoco se recuperó la distancia/precisión GPS exacta usada en esa transición. No presentar el matching de 300 m como distancia de llegada.

**Sin acciones sobre producción ni escrituras en TEST.**
