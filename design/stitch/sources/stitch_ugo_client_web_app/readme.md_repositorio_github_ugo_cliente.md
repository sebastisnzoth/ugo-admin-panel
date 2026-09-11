# UGO Cliente · Web App

Plataforma web de servicios del hogar bajo protocolo de **confianza fiduciaria**, custodia bancaria (*Itaú Escrow API*), validación biométrica y garantías extendidas Tokio Marine Seguradora (*UGO Shield*).

Diseñado con el Design System **Kinetic Trust** para interfaces SaaS de alta resolución y confiabilidad transaccional.

---

## 🚀 Stack Tecnológico

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Lenguaje:** [TypeScript 5.x](https://www.typescriptlang.org/)
- **Librería UI:** [React 19](https://react.dev/)
- **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Iconografía:** Material Symbols Outlined
- **Tipografía:** Plus Jakarta Sans
- **Validaciones & Estado:** Zod + TanStack Query (React Query)
- **Mapas & Telemetría:** Leaflet / Mapbox GL JS

---

## 📂 Arquitectura de Directorios

```text
ugo-cliente-web/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Lint, Typecheck y Test
│       └── deploy.yml             # Despliegue en Vercel / Cloudflare
├── public/
│   ├── brand/                     # Logotipos UGO, sellos CREA y Tokio Marine
│   └── avatars/                   # Mockups de perfil y técnicos
├── src/
│   ├── app/                       # Rutas Next.js App Router (Desktop-first)
│   │   ├── layout.tsx             # Root layout (TopBar + SideRail collapsable)
│   │   ├── page.tsx               # Home interactiva & Radar en vivo
│   │   ├── buscar/                # Directorio de prestadores matriculados
│   │   ├── nueva-solicitud/       # Wizard multipaso con diagnóstico Hugo IA
│   │   ├── matching/              # Radar de asignación algorítmica
│   │   ├── servicios/
│   │   │   ├── [id]/              # Bitácora cronológica y liquidación
│   │   │   ├── en-camino/         # Telemetría GPS en tiempo real
│   │   │   ├── ejecucion/         # Cronómetro de obra y tareas complementarias
│   │   │   ├── calificar/         # Liberación de PIN, propinas y Tokio Marine
│   │   │   └── disputa/           # Apertura y peritaje de mediación
│   │   ├── actividad/             # Historial completo de órdenes
│   │   ├── mensajes/              # Mensajería cifrada E2EE y soporte Hugo IA
│   │   ├── ugo-shield/            # Pólizas, garantías y mediación
│   │   ├── pagos/                 # Billetera UGO (102% CDI) y recargas PIX
│   │   ├── perfil/                # KYC federal, domicilios y contactos delegados
│   │   └── sandbox/               # Entorno de pruebas sintéticas y mock BACEN
│   ├── components/
│   │   ├── shell/                 # TopNavBar, SideNavBar, UserBadge
│   │   ├── ui/                    # Botones, Modales, Badges, Steppers, Inputs
│   │   ├── maps/                  # Mapas de telemetría y geocercas
│   │   ├── fiduciario/            # Widget de custodia Itaú, input de PIN y póliza
│   │   └── chat/                  # Burbujas cifradas, notas de voz, adjuntos
│   ├── lib/
│   │   ├── api/                   # Clientes HTTP, TanStack Query y WebSockets
│   │   ├── constants/             # Design tokens, categorías y aranceles
│   │   └── utils/                 # Formateadores BRL, CPF y timestamps
│   ├── types/
│   │   └── domain.ts              # Contratos de datos y tipos TypeScript
│   └── styles/
│       └── globals.css            # Tokens Kinetic Trust & utilidades
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

---

## 🛡️ Principios y Protocolos del Dominio

### 1. Custodia Fiduciaria (*Itaú Escrow*)
Ningún pago se liquida al profesional de forma directa ni por adelantado. Los fondos permanecen bloqueados en una cuenta fiduciaria bajo custodia de Banco Itaú / BACEN SPI hasta que el cliente valida e ingresa el **PIN numérico de 4 dígitos** al concluir el servicio a satisfacción.

### 2. Garantía Tokio Marine (*UGO Shield*)
Cada servicio cerrado mediante PIN activa automáticamente una póliza de responsabilidad civil y daños materiales respaldada por Tokio Marine Seguradora (hasta R$ 15.000 / R$ 50.000 según la categoría) con cobertura de 60 a 90 días.

### 3. Copiloto de Diagnóstico (*Hugo IA*)
Motor de diagnóstico preventivo basado en modelos multimodales que analiza fotografías de fallas técnicas (ej. display con error en split, tablero eléctrico, pérdidas de plomería), sugiere materiales normalizados y valida la razonabilidad de los aranceles propuestos.

---

## 🛠️ Instalación y Puesta en Marcha

### Prerrequisitos
- Node.js >= 20.0.0
- pnpm o npm >= 10.0.0

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/<tu-organizacion>/ugo-cliente-web.git
   cd ugo-cliente-web
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   # o con pnpm
   pnpm install
   ```

3. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env.local
   ```
   Completar las claves correspondientes:
   ```env
   NEXT_PUBLIC_APP_ENV=development
   NEXT_PUBLIC_API_URL=https://api.ugo.com.br/v2
   NEXT_PUBLIC_ITAU_ESCROW_GATEWAY=https://sandbox.itau.com.br/escrow
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
   ```

4. **Ejecutar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## 🎨 Design System · Kinetic Trust

El proyecto implementa la paleta semántica oficial:

| Token | Hex | Uso |
|---|---|---|
| `--color-primary` | `#00B4D8` | Cyan UGO, acentos interactivos y foco |
| `--color-primary-dark` | `#0077B6` | Azul fiduciario, botones de acción principal |
| `--color-brand-green` | `#00875A` | Sellos Shield, validaciones biométricas y éxito |
| `--color-surface-bg` | `#F8F9FF` | Fondo de aplicación desktop |
| `--color-surface-card` | `#FFFFFF` | Tarjetas elevadas y contenedores |
| `--color-text-slate` | `#1E293B` | Tipografía principal de alta legibilidad |
| `--color-text-muted` | `#64748B` | Etiquetas secundarias, metadatos y leyendas |

---

## 🧪 Entorno de Sandbox & Pruebas

La aplicación incluye un entorno de testing desacoplado en `/sandbox` para simular:
- Inyección de eventos de geolocalización sintética.
- Pagos instantáneos PIX simulados con callback de webhook BACEN.
- Validación de liveness biométrico (score > 99%).
- Bloqueo y liberación de fondos de custodia fiduciaria.

---

## 📄 Licencia

Propiedad de **UGO Brasil Tecnologia de Confiança Fiduciária S.A.** Todos los derechos reservados.