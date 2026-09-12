# U.GO Quantum OS — Deploy Maestro

## Producción
- Panel: https://ugo-admin-panel.vercel.app
- Ruta Admin: `/?app=admin`
- Ruta Proveedor: `/?app=provider`
- Ruta Cliente: `/?app=client`
- Hosting: Vercel
- Rama de verdad: `main`

## Presupuesto operativo de Vercel
UGO opera con un **techo presupuestario interno de 100 deployments por día** para el plan actual. Este número es una regla operativa del proyecto; el Dashboard de Vercel es la autoridad final si el plan, la cuota o las condiciones del proveedor cambian.

La cuota de deploy es un recurso compartido y debe preservarse para release, hotfix y rollback.

### Reglas obligatorias
1. **No desplegar producción por cada cambio pequeño.** Agrupar cambios relacionados en bloques verificables.
2. **No usar producción como entorno de prueba.** TypeScript, tests, lint y build aplicables deben ejecutarse antes del release.
3. **`main` autodespliega.** Reducir pushes innecesarios a `main`; evitar commits de toque/redeploy salvo recuperación real.
4. **Un bloque funcional debe terminar en un solo push/deploy siempre que sea razonable.** No fragmentar CSS, componente y documentación en deploys separados si forman el mismo bloque.
5. **Conservar reserva diaria.** No consumir deliberadamente toda la cuota; debe quedar capacidad para hotfix/rollback.
6. **Vercel Hobby: mantener el proyecto dentro del límite operativo actual de 12 Node.js Serverless Functions por deployment.** Si cambia el plan, verificar el límite vigente antes de expandir `/api`.
7. **CI primero.** Un deploy no se considera candidato a producción estable mientras CI no esté verde.
8. **Release real = READY + smoke checks.** Un commit pusheado o un build iniciado no equivale a producción verificada.
9. Si Vercel informa rate-limit/cuota agotada, **no generar commits artificiales para reintentar**. Esperar ventana disponible o promover/reintentar de forma controlada.
10. Registrar bloqueos de deploy que cambien arquitectura, cuota o contrato operativo en los MD maestros y Roadmap.

## Secuencia de release
`bloque de trabajo → validación local/CI → push único a main → Vercel build → READY → smoke checks → cierre documental`

## Smoke checks mínimos
- dominio de producción responde;
- ruta afectada carga;
- no hay error crítico nuevo en runtime;
- endpoints afectados conservan contrato;
- si hay cambios en Admin/Cliente/Proveedor, verificar la ruta correspondiente;
- si cambia `/api`, verificar cantidad de funciones y rewrites.

## Política de rollback
Ante regresión crítica, priorizar rollback/promoción de un deployment previamente READY antes que encadenar commits de emergencia sin validar.
