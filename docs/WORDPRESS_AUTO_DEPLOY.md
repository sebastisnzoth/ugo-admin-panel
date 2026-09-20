# UGO WordPress automatic deployment

The repository includes `.github/workflows/wordpress-deploy.yml`.

## What it does

On every push to `main` that changes the web application, GitHub Actions:

1. installs dependencies with `npm ci`;
2. checks TypeScript;
3. builds UGO with Vite using `--base=./`;
4. uploads the contents of `dist/` to the build directory used by the UGO WordPress plugin.

Remote destination:

```text
/htdocs/wp-content/uploads/ugo-app-build/current/
```

The WordPress plugin reads `index.html` and its hashed assets directly from this directory, so a successful workflow updates Cliente, Proveedor and Admin without importing another ZIP.

## Required GitHub Actions secrets

In GitHub open:

`Settings → Secrets and variables → Actions → New repository secret`

Create:

- `UGO_FTP_SERVER` — FTP host shown by InfinityFree.
- `UGO_FTP_USERNAME` — InfinityFree FTP username.
- `UGO_FTP_PASSWORD` — InfinityFree FTP password.

Do not commit FTP credentials to the repository.

Until these secrets exist, the workflow still builds and finishes successfully but skips the FTP publish step.

## URLs to verify after deploy

```text
https://ugoapp.infy.click/ugo-cliente/?app=client
https://ugoapp.infy.click/ugo-proveedor/?app=provider
https://ugoapp.infy.click/ugo-admin/?app=admin
```

If an old screen remains in the browser, force refresh once because the HTML may be cached locally. Vite asset filenames are content-hashed, so normal future updates should load the new files automatically.

## Actualización directa desde GitHub

WordPress también puede actualizar el build sin subir un ZIP manualmente ni depender del FTP. El workflow publica en la release fija `wordpress-latest`:

- `ugo-build-manifest.json` con el SHA exacto de `main`;
- `ugo-wordpress-build.zip` con el contenido portable de `dist/`;
- `ugo-wordpress-build.zip.sha256` para verificar integridad.

El MU plugin `wordpress/mu-plugins/ugo-github-updater.php` agrega `Herramientas → UGO Actualizaciones`. Desde ahí un administrador puede comparar la revisión instalada, ejecutar **Actualizar ahora** y usar **Volver a versión anterior**.

Antes de activar un paquete el updater valida SHA-256, rutas seguras del ZIP, `index.html`, `assets/` y que el commit interno coincida con el manifest. La versión activa se mueve a `wp-content/uploads/ugo-app-build/backups/` y se conservan los tres backups más recientes.

El repositorio es público actualmente, por lo que no requiere token. Si en el futuro pasa a privado, usar `UGO_GITHUB_TOKEN` sólo como constante/variable server-side; el plugin no persiste ese secreto en opciones de WordPress.
