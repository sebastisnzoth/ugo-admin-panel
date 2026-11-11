# UGO — Evaluación de privatización sin caída (2026-11-11)

**Conclusión:** NO cambiar visibilidad todavía. Riesgo confirmado de interrupción de GitHub Pages en GitHub Free. No se modificó ningún sistema.

## Evidencia comprobada

1. `sebastisnzoth/ugo-admin-panel` pertenece a una cuenta personal, rama main, visibilidad PUBLIC (consulta GitHub anterior).
2. Vercel `ugo-admin-panel` (id `prj_mamEs9taSOgtEKZsVDVcqlFes2er`) existe, framework Vite, dominio `ugo-admin-panel-sebastisnzoths-projects.vercel.app`. En consulta puntual su último despliegue estaba BUILDING; no inferir fallo.
3. Vercel `ugo-marketplace-demo` (id `prj_2hKRj1z8WukSAOxBOyhTaTkC0rv0`) existe, Vite, dominio `ugo-marketplace-demo.vercel.app`; último despliegue READY al consultar.
4. Vercel team `sebastisnzoths-projects` usa Hobby según contexto verificado. La documentación oficial indica que Hobby puede desplegar desde un repositorio privado **personal** cuando el autor del commit es el propietario de la cuenta Vercel; otros autores o bots pueden ser bloqueados. https://vercel.com/docs/git
5. GitHub oficial: GitHub Pages desde repositorio **privado** requiere GitHub Pro/Team/Enterprise; en GitHub Free requiere repositorio público. Privatizar puede despublicar Pages. https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
6. GitHub Free sí admite repositorios privados sin costo, pero no garantiza que Pages continúe funcionando. https://github.com/pricing
7. Archivo `.github/workflows/deploy.yml` no encontrado; **esto no equivale a ausencia de otros workflows**.
8. `vite.config.ts` usa `VERCEL_GIT_COMMIT_SHA` y `GITHUB_SHA`, evidencia de integración de builds.

## Riesgos antes de cambiar visibilidad

| Dependencia | Riesgo | Estado |
| --- | --- | --- |
| GitHub Pages de Arena `/app/?app=client` | Alto: despublicación con Free | No mitigado |
| Vercel Hobby | Medio: autor de commits y acceso GitHub App | Sin prueba posterior a privatización |
| GitHub Actions/CI | Medio: permisos y comportamiento de workflows, artefactos | No auditado exhaustivamente |
| Vercel múltiples proyectos | Medio: mismo repo y múltiples despliegues | Confirmado que hay dos proyectos |
| Backups, forks, clones públicos | Privacidad retroactiva imposible | No auditado |
| Dependencias de URLs públicas a código bruto | Potencial | No auditado |

## Plan de migración sin cortar el servicio

1. Inventariar URLs activas y dependencias de GitHub Pages, Vercel, OAuth, CI, callbacks, assets, webhooks y GitHub Apps.
2. Preparar alojamiento público separado solo para los artefactos estáticos de Pages, sin fuente sensible. Verificar que cumpla presupuesto R$0 y términos.
3. Ensayar despliegue desde un repositorio privado personal aislado con la misma cuenta Vercel Hobby y verificar autor de commits, build, envs, rutas, login, GPS y servicios TEST.
4. Verificar redirecciones, dominios y callbacks sin alterar PROD.
5. Preparar rollback documentado y respaldo íntegro del repositorio, incluyendo tags y ramas.
6. **Solo tras pruebas completas y autorización específica** cambiar visibilidad de repo principal, comprobar Pages y Vercel en vivo, y revertir si hay interrupción.

**Alternativa más conservadora:** mantener temporalmente el repo actual público, no añadir secretos ni código estratégico nuevo allí, y crear repositorio privado personal para desarrollos futuros mientras se migra el hosting estático.

**No se puede prometer riesgo cero**. No se realizó cambio de visibilidad, DNS, Vercel, base de datos, ramas funcionales ni pagos.
