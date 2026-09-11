# UGO Admin Panel — Guía Completa de Configuración y Deploy en Vercel

Guía de ingeniería y DevOps para desplegar el frontend de producción de **UGO Admin Panel** (React 18 + Vite + TypeScript) en **Vercel**, integrado automáticamente con el repositorio GitHub `sebastisnzoth/ugo-admin-panel` (rama `main`).

---

## 1. Configuración de Vercel (`vercel.json`)

Para aplicaciones Single-Page Application (SPA) construidas con Vite y React Router v6, es crucial configurar la reescritura de rutas (`rewrites`) para evitar errores 404 al recargar rutas profundas (ej: `/servicios/:id`, `/disputas/:id`, `/command-center`), además de definir cabeceras de seguridad estrictas compatibles con un panel administrativo de misión crítica:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [
    {
      "source": "/api/proxy-bacen/(.*)",
      "destination": "https://api.ugo.com.br/v1/bacen/$1"
    },
    {
      "source": "/api/proxy-mp/(.*)",
      "destination": "https://api.mercadopago.com/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(self), microphone=(), geolocation=(self)"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://api.ugo.com.br https://api.mercadopago.com wss://ws.ugo.com.br;"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 2. Variables de Entorno en Vercel (`.env.production`)

Configurar en el panel de Vercel (**Project Settings → Environment Variables**):

| Variable | Tipo / Scope | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `VITE_APP_ENV` | Plaintext (All) | Entorno de ejecución | `production` |
| `VITE_API_BASE_URL` | Plaintext (Production) | Endpoint del backend REST / GraphQL | `https://api.ugo.com.br/v1` |
| `VITE_WS_GATEWAY_URL` | Plaintext (Production) | WebSocket para Command Center y telemetría | `wss://ws.ugo.com.br/socket` |
| `VITE_HUB_CLUSTER` | Plaintext (All) | Identificador de región de despacho | `sa-east-1-fln` |
| `VITE_MP_PUBLIC_KEY` | Plaintext (Production) | Clave pública de Mercado Pago Brasil | `APP_USR-789a421-....` |
| `VITE_MAPS_ACCESS_TOKEN` | Encrypted (Production) | Token de Mapbox/Google Maps para tracking | `pk.eyJ1Ijo...` |
| `VITE_ENABLE_MFA_FIDO2` | Plaintext (Production) | Exigir autenticación WebAuthn/YubiKey | `true` |
| `VITE_SENTRY_DSN` | Plaintext (Production) | Monitoreo de errores en producción | `https://ugo@sentry.io/...` |

---

## 3. GitHub Actions para Deploy Automatizado a Vercel (`.github/workflows/deploy-vercel.yml`)

Workflow para compilar, validar TypeScript y desplegar en Vercel con alias de producción en cada push a `main`:

```yaml
name: Deploy UGO Admin to Vercel

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
  NODE_VERSION: '20.x'

jobs:
  validate-and-test:
    name: 🛡️ Type Check & Unit Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Validate TypeScript (Strict)
        run: npx tsc --noEmit

      - name: Run Unit Tests (Vitest)
        run: npm run test:run

  deploy-preview:
    name: 🔍 Vercel Preview Deploy (PR)
    needs: validate-and-test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
      - name: Build Project Artifacts
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
      - name: Deploy Preview to Vercel
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "preview_url=$url" >> $GITHUB_OUTPUT
      - name: Comment PR with Preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `✅ **UGO Admin Preview listo en Vercel**: [${{ steps.deploy.outputs.preview_url }}](${{ steps.deploy.outputs.preview_url }})`
            })

  deploy-production:
    name: 🚀 Vercel Production Deploy
    needs: validate-and-test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      - name: Deploy Production to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 4. Pasos de Activación en Vercel (Paso a Paso)

### Paso 1: Conectar Repositorio GitHub en Vercel
1. Ingresar a [Vercel Dashboard](https://vercel.com/dashboard) y hacer clic en **"Add New..." → "Project"**.
2. Seleccionar el repositorio `sebastisnzoth/ugo-admin-panel`.
3. Configurar los parámetros del proyecto:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (o `src` si estuviera en subcarpeta)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`

### Paso 2: Obtener Credenciales para GitHub Secrets
Para habilitar el despliegue automático mediante GitHub Actions:
1. Generar un Vercel Access Token en **Account Settings → Tokens** y guardarlo como secret en GitHub: `VERCEL_TOKEN`.
2. En la terminal local, dentro de la carpeta del proyecto, ejecutar:
   ```bash
   npx vercel link
   ```
3. Esto vinculará el proyecto y generará `.vercel/project.json` conteniendo:
   - `orgId` → Guardar como secret de GitHub: `VERCEL_ORG_ID`
   - `projectId` → Guardar como secret de GitHub: `VERCEL_PROJECT_ID`

### Paso 3: Dominio Personalizado y SSL
1. En Vercel: **Settings → Domains**.
2. Añadir: `admin.ugo.com.br` o `control.ugo.com.br`.
3. Configurar el registro CNAME en el proveedor de DNS:
   - `admin` CNAME `cname.vercel-dns.com.`
4. Vercel emitirá automáticamente el certificado SSL Let's Encrypt con renovación automática.

---

## 5. Script de Verificación Pre-Deploy en `package.json`

Añadir estos scripts en `package.json` para garantizar que ningún build con errores tipográficos o de compilación se suba a Vercel:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "test:run": "vitest run",
    "deploy:preview": "vercel",
    "deploy:prod": "vercel --prod"
  }
}
```
