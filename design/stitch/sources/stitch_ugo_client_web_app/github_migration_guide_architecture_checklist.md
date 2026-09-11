# Guía de Migración e Integración · UGO Cliente Web App -> GitHub

Esta guía contiene la estructura de carpetas sugerida, checklist de exportación, dependencias y pasos para inicializar el repositorio frontend (React 19 / Next.js 15 App Router / Tailwind CSS v4) a partir de los diseños y contratos creados en Stitch.

---

## 1. Arquitectura de Directorios Recomendada (Next.js App Router)

```text
ugo-cliente-web/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Lint, Typecheck y Test
│       └── deploy.yml             # Despliegue en Vercel / Cloudflare Pages
├── src/
│   ├── app/                       # Rutas de la Web App (Desktop-first)
│   │   ├── layout.tsx             # Root Layout (Fuentes, Providers, Shell Base)
│   │   ├── page.tsx               # Home principal (Servicios, Radar, Quick Book)
│   │   ├── (auth)/                # Flujos de acceso y verificación KYC
│   │   ├── buscar/                # Explorador y filtrado de técnicos
│   │   ├── nueva-solicitud/       # Wizard multipaso con asistencia Hugo IA
│   │   ├── matching/              # Radar en vivo de matching algorítmico
│   │   ├── servicios/
│   │   │   ├── [id]/              # Detalle del servicio y bitácora de ejecución
│   │   │   ├── en-camino/         # Telemetría GPS en tiempo real y chat con el técnico
│   │   │   ├── calificar/         # Calificación, propinas y activación de garantía
│   │   │   └── disputa/           # Apertura y seguimiento de mediación fiduciaria
│   │   ├── actividad/             # Historial completo de órdenes y estados
│   │   ├── mensajes/              # Centro de mensajería cifrada
│   │   ├── ugo-shield/            # Centro de garantías, mediación y pólizas
│   │   ├── pagos/                 # Billetera UGO, recargas PIX y SEFAZ
│   │   ├── perfil/                # Datos KYC, direcciones y contactos delegados
│   │   └── sandbox/               # Entorno de pruebas y simulación de eventos
│   ├── components/
│   │   ├── shell/                 # TopNavBar, SideNavBar (Collapsible Rail)
│   │   ├── ui/                    # Botones, Modales, Badges, Steppers, Inputs
│   │   ├── maps/                  # Mapas Leaflet / Mapbox para telemetría
│   │   ├── chat/                  # Burbujas de chat, grabador de audio, visor multimedia
│   │   └── fiduciario/            # Widget de custodia Itaú, input de PIN y póliza
│   ├── types/
│   │   └── domain.ts              # Contratos TypeScript v5.x (extraídos de DOCUMENT_2)
│   ├── lib/
│   │   ├── api/                   # Clientes HTTP / SWR / TanStack Query
│   │   ├── constants/             # Tokens de diseño y categorías
│   │   └── utils/                 # Formateo de moneda BRL, fechas, CPF
│   └── styles/
│       └── globals.css            # Tokens del Design System 'Kinetic Trust'
├── public/
│   ├── brand/                     # Logotipos UGO y sellos de certificación
│   └── avatars/                   # Mockups de perfil y técnicos
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

---

## 2. Tokens de Diseño CSS (Kinetic Trust Theme)

Pegar o adaptar en `src/styles/globals.css` o `tailwind.config.ts`:

```css
@theme {
  --color-primary: #00b4d8;
  --color-primary-dark: #0077b6;
  --color-brand-green: #00875a;
  --color-surface-bg: #f8f9ff;
  --color-surface-container: #eff4ff;
  --color-surface-lowest: #ffffff;
  --color-text-slate: #1e293b;
  --color-text-muted: #64748b;
  --font-family-display: "Plus Jakarta Sans", sans-serif;
  --radius-ugo: 0.5rem;
}
```

---

## 3. Pasos de Inicialización en Git & GitHub

### Paso 1: Inicializar el proyecto localmente
```bash
# Crear proyecto con Next.js + TypeScript + Tailwind CSS
npx create-next-app@latest ugo-cliente-web --typescript --tailwind --eslint --app --src-dir

cd ugo-cliente-web
```

### Paso 2: Copiar Contratos y Tipos
Copia el archivo `src/types/domain.ts` con el contenido del documento `DOCUMENT_2` del proyecto Stitch.

### Paso 3: Configurar el Repositorio Remoto
```bash
git init
git add .
git commit -m "feat: setup inicial arquitectura ugo cliente web app"
git branch -M main
git remote add origin https://github.com/<tu-usuario-o-org>/ugo-cliente-web.git
git push -u origin main
```

---

## 4. Checklist de Exportación de Pantallas y Estados

- [x] **Dominio y Modelado:** `src/types/domain.ts` con tipos de Billetera, Escrow Itaú, Órdenes, Perfil y Mediación.
- [ ] **Shell de Navegación:** `SideNavBar` con 8 secciones principales y `TopNavBar` con búsqueda y estado Hugo IA.
- [ ] **Flujo 1 (Descubrimiento):** Home con mapa interactivo y Radar de técnicos en tiempo real.
- [ ] **Flujo 2 (Contratación):** Wizard multipaso con diagnóstico asistido por IA.
- [ ] **Flujo 3 (Custodia Fiduciaria):** Billetera UGO, recarga PIX y bloqueo de PIN de 4 dígitos.
- [ ] **Flujo 4 (Operación en Vivo):** Telemetría GPS en ruta y panel de ejecución con cronómetro.
- [ ] **Flujo 5 (Cierre & Garantía):** Liberación de PIN, calificación 5 estrellas y activación de póliza Tokio Marine.
