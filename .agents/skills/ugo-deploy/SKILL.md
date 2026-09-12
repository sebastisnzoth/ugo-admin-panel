---
name: ugo-deploy
description: Build, despliegue y observabilidad de UGO. Usar para Vercel, entornos, variables, CI, health checks, logs, Sentry, diagnóstico de producción y rollback.
---
# UGO Deploy / Observabilidad

## Objetivo
Desplegar UGO de forma reproducible y diagnosticable sin comprometer secretos, estabilidad ni cuota operativa.

## Presupuesto de deploy
- UGO usa como **techo presupuestario interno 100 deployments/día** para el plan actual de Vercel.
- El Dashboard de Vercel es la autoridad final si cambia el plan o la cuota.
- La cuota es recurso compartido: reservar capacidad para hotfix y rollback.
- `main` puede autodesplegar; por eso no hacer un push por cada ajuste mínimo.
- Mantener la arquitectura actual dentro del límite operativo de **12 Node.js Serverless Functions por deployment** mientras rija el plan Hobby actual.

## Protocolo
1. Verificar rama/commit objetivo y MD maestro `DEPLOY.md`.
2. Agrupar cambios relacionados en un bloque verificable antes de pushear.
3. Ejecutar TypeScript, tests, lint y build aplicables antes del release.
4. Verificar variables requeridas por nombre, nunca revelar valores secretos.
5. Confirmar configuración de entorno, output, rewrites y número de funciones si cambia `/api`.
6. Desplegar sólo cuando esté autorizado por el flujo del proyecto.
7. Esperar estado real `READY`; CI pendiente no equivale a release verde.
8. Ejecutar smoke checks posteriores sobre dominio, ruta y endpoints afectados.
9. Revisar runtime/build logs si hay fallo.
10. Mantener estrategia de rollback y actualizar maestros/Roadmap si cambia una restricción operativa.

## Reglas
- No declarar deploy exitoso sin confirmación real `READY` y smoke checks.
- Diferenciar desarrollo, testing/preview y producción.
- No usar producción como entorno de prueba.
- No crear commits `touch`, redeploy-only o cambios artificiales para sortear rate limits.
- Si Vercel bloquea por cuota, esperar ventana o usar rollback/promoción controlada; no quemar más deploys.
- Un bloque funcional debe procurar un único push/deploy cuando sea razonable; componente, estilos, tests y documentación relacionados se agrupan.
- Registrar causa y evidencia de fallos relevantes.
