# UGO — Incidente de fragmentación y regla de continuidad

**Fecha:** 20 de octubre de 2026  
**Estado:** Regla permanente de trabajo para todos los agentes de UGO.  
**Ámbito:** Cliente, Proveedor, Admin, Super Admin, Empresa Autónoma, HIVE, GitHub Observatory, GitHub Actions, Supabase, Render y Vercel.

## Qué ocurrió

Durante el desarrollo de UGO, el trabajo de los asistentes quedó fragmentado: se propusieron sistemas nuevos y diagnósticos reiterados sin completar ni verificar la integración de los componentes existentes. Se confundió la presencia de código, commits, despliegues y servicios encendidos con el funcionamiento real de UGO. Se perdió continuidad entre sesiones y el usuario tuvo que reiterar instrucciones ya establecidas. La Empresa Autónoma, HIVE y GitHub Observatory quedaron sin una verificación integral de su funcionamiento; hubo problemas reportados de base de datos y de la aplicación Cliente/Proveedor. **No se atribuye una causa técnica de esos fallos sin evidencia.**

## Error reconocido y prohibición de repetición

El fallo de método fue **fragmentar la ejecución de un proyecto que debe funcionar como un solo sistema**, crear frentes y componentes sin aprovechar primero lo existente, informar avances parciales como terminados y volver a preguntar por decisiones conocidas.

**Queda prohibido:**
- Proponer otra plataforma, agente, tablero, base de datos o servicio sin inventariar y evaluar la pieza existente equivalente.
- Sustituir ejecución por reiteración de diagnósticos, planes, PR sin integrar o estados cosméticos.
- Declarar «funciona», «VERIFIED», «publicado» o «listo» sin evidencia end-to-end reproducible en el entorno y SHA correspondientes.
- Repetir preguntas ya contestadas en instrucciones, historial o documentación de continuidad.
- Atribuir fallos a Supabase, Render, HIVE u otro componente sin pruebas.
- Sobrecargar Supabase con ciclos de agentes, conexiones redundantes, sondeos agresivos o logs voluminosos.
- Reiniciar, forzar push, reemplazar la solución vigente o modificar producción sin respetar gates de validación y seguridad.

## Protocolo obligatorio al iniciar y reanudar trabajo

1. Leer `AGENTS.md`, **este documento**, `docs/UGO_CAMINO_MAESTRO.md`, el registro de continuidad y el estado actual de `main`/CI; contrastar cualquier dato desactualizado.
2. Reconstruir una **sola visión de UGO**: Cliente → Pedido → Proveedor → Aceptación, más Admin/Super Admin, autenticación, GPS, matching, Realtime, pagos, Empresa Autónoma, HIVE, Observatory, Supabase, GitHub, Render y Vercel.
3. Identificar el bloqueo P0 vigente y **continuar desde el último paso realmente verificado**, sin abrir frentes nuevos si no existe justificación objetiva.
4. Reutilizar primero componentes, skills, flujos y servicios ya existentes. Ante un error: inspeccionar, corregir, probar y revalidar hasta resolver o constatar bloqueo real.
5. Ejecutar cambios pequeños, preservar trabajos ajenos, validar en Arena/test, guardar evidencia vinculada al commit y al entorno, y pasar a `main` todo trabajo validado autorizado conforme a los gates del repositorio.
6. Mantener aislada la carga del agente de la base transaccional de UGO: controlar concurrencia, presupuesto, reintentos, conexiones, consultas, cuotas y límites reales del plan. Priorizar que no se degrade Cliente/Proveedor.
7. El orquestador 24/7 debe tener **estado persistente, cola idempotente, límites de presupuesto, circuit breaker, reanudación y auditoría**; no fingir ejecución permanente por una sesión de chat o un servicio que solo responde HTTP.
8. Informar solo el trabajo efectuado, la evidencia y los bloqueos efectivos. Diferenciar expresamente **implementado, probado, integrado, desplegado y validado con usuarios**.

## Criterio de cierre

Una tarea funcional está terminada únicamente cuando el comportamiento esperado fue comprobado con evidencia, la corrección llegó a `main` si correspondía y el despliegue autorizado está verificado. Los componentes HIVE, Empresa Autónoma y Observatory **no son objetivos independientes**: deben contribuir al funcionamiento integral y observable de UGO. Ninguna publicación de documentación demuestra por sí sola que estos sistemas ya operan 24/7.

## Compromiso de continuidad

**Antes de cada tarea:** leer estas reglas y contrastarlas con la realidad actual. **Durante la tarea:** no crear otra realidad paralela. **Al cerrar:** registrar qué se cambió, qué se verificó y qué queda pendiente sin pedir al usuario que repita su objetivo.
