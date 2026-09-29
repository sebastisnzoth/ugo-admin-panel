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
