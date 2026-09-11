---
name: ugo-deploy
description: Build, despliegue y observabilidad de UGO. Usar para Vercel, entornos, variables, CI, health checks, logs, Sentry, diagnóstico de producción y rollback.
---
# UGO Deploy / Observabilidad

## Objetivo
Desplegar UGO de forma reproducible y diagnosticable sin comprometer secretos ni estabilidad.

## Protocolo
1. Verificar rama/commit objetivo.
2. Ejecutar build y tests aplicables antes de deploy.
3. Verificar variables requeridas por nombre, nunca revelar valores secretos.
4. Confirmar configuración de entorno y output.
5. Desplegar sólo cuando esté autorizado por el flujo del proyecto.
6. Ejecutar smoke checks posteriores.
7. Revisar logs/observabilidad si hay fallo.
8. Mantener estrategia de rollback.

## Reglas
- No declarar deploy exitoso sin confirmación real.
- Diferenciar desarrollo, testing/preview y producción.
- No usar producción como entorno de prueba.
- Registrar causa y evidencia de fallos relevantes.