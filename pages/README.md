# UGO GitHub Pages

Contenido público, estático y sanitizado para UGO Observatory.

## Qué muestra

- snapshot generado en cada deployment desde resultados verificables de UGO TEST;
- Quality Coverage;
- assurance checks;
- bloqueos finales explícitos;
- estado de Customer #1;
- SHA y fecha UTC de cada publicación.

La fuente de evidencia es `docs/UGO_AUTONOMOUS_CORPORATION_IMPLEMENTATION.md`. `status.json` no se mantiene a mano: el workflow lo genera de forma determinista y falla si no encuentra la evidencia esperada.

## Límites de seguridad

- No incluir secretos, tokens, claves ni variables privadas.
- No incluir datos personales de clientes o proveedores.
- No conectar esta superficie directamente a producción.
- No usar Pages como sustituto de Supabase, APIs, pagos, GPS o Realtime.
- No convertir resultados TEST en autorización de producción.
- El workflow valida patrones sensibles antes de publicar.

El workflow `.github/workflows/github-pages.yml` publica esta carpeta cuando cambian Pages, la fuente de implementación o el propio workflow.


## Command Center v2

- Muestra el objetivo final y el camino crítico hasta DONE.
- Separa trabajo técnico pendiente de blockers del gate final.
- Cada paso explica: por qué falta, cómo resolverlo, evidencia de DONE, responsable y dependencia.
- Cada paso ofrece `Resolver con UGO Maestro`: copia el prompt específico y abre directamente UGO Maestro Autónomo.
- Cada paso puede abrir su fuente de evidencia.
- Publica `ci-status.json` con workflows completados del mismo SHA.
- Permite revalidar el snapshot desde la UI.
- GitHub Pages se regenera por cambios relevantes y también cada 15 minutos.
- El panel sigue siendo read-only respecto del runtime: no contiene service-role keys ni autoridad de producción.
