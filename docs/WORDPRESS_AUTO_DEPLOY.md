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
