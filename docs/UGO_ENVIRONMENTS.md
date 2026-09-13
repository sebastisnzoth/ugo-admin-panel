# UGO · Ambientes y protección de datos

## Mapa canónico

| Ambiente | Supabase project ref | Uso |
| --- | --- | --- |
| **UGO TEST** | `tmossnqfwfwjrtzwcbmm` | Desarrollo integrado, QA, E2E y despliegue actual de `main` mientras el producto está en validación |
| **Producción** | `trfsjuseqjxlhrxuvdsm` | Datos reales. No se modifica durante trabajo TEST sin una autorización explícita de release/producción |

El nombre visible del proyecto TEST en Supabase puede seguir apareciendo como **UGO Arena**. La identidad técnica autoritativa es el project ref, no el nombre de la consola.

## Regla operativa

Durante la fase actual, `main`, el navegador, los wrappers serverless y los contratos de CI deben apuntar exclusivamente a **UGO TEST**. Una variable de entorno que contenga el project ref de producción hace fallar `npm run build` y `npm test` mediante `scripts/assert-test-environment.mjs`.

Antes de aplicar una migración desde una herramienta externa se debe comprobar el project ref del destino. Las migraciones de validación funcional se aplican a `tmossnqfwfwjrtzwcbmm`. Escribir en `trfsjuseqjxlhrxuvdsm` requiere una decisión explícita de producción y no se infiere de una orden genérica como “seguí”, “trabajá” o “completa todo”.

## Gates automáticos

```bash
npm run verify:test-env
npm test
npm run build
npm run lint
```

`verify:test-env` valida que:

- el SDK del navegador esté fijado a TEST;
- `api/proxy.js`, `api/operations.ts` y `vercel.json` no contengan el project ref de producción;
- ninguna variable de entorno Supabase usada durante build/test apunte a producción.

Los tests contractuales también preservan este mapa para evitar que un refactor vuelva a mezclar ambientes silenciosamente.

## Promoción a producción

La promoción no consiste en cambiar un string de forma ad hoc. Requiere release explícito, migrations revisadas, backup/rollback readiness, smoke tests y verificación de auth/pagos/permisos. Hasta entonces, producción permanece aislada del ciclo TEST.
