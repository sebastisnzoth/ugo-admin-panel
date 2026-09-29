# UGO GitHub Pages

Contenido estático y sanitizado para GitHub Pages.

## Límites de seguridad

- No incluir secretos, tokens, claves ni variables privadas.
- No incluir datos personales de clientes o proveedores.
- No conectar esta superficie directamente a producción.
- No usar Pages como sustituto de Supabase, APIs, pagos, GPS o Realtime.
- Cada publicación muestra el SHA de GitHub que la generó.

El workflow `.github/workflows/github-pages.yml` publica esta carpeta cuando sus archivos cambian en `main`, y también permite ejecución manual.
