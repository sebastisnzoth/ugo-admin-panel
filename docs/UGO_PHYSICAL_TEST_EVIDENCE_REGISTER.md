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
