# UGO Admin Panel — Especificación de Integración TypeScript & Guía de GitHub Workflow

Documento de ingeniería para exportar y conectar la suite visual de **UGO Admin Panel** (22 pantallas diseñadas en Stitch) directamente al repositorio React/Vite + TypeScript existente en GitHub (`sebastisnzoth/ugo-admin-panel`, rama `main`).

---

## 1. Arquitectura de Tipos en TypeScript (`src/types/ugo-admin.d.ts`)

Para asegurar la robustez de misión crítica requerida por UGO Control Hub Florianópolis, se define el modelo de datos fuertemente tipado:

```typescript
// ==========================================
// ROLES, AUTENTICACIÓN Y AUDITORÍA
// ==========================================
export type AdminRole = 
  | 'SUPER_ADMIN' 
  | 'ADMIN_OPERATIONS' 
  | 'ADMIN_FINANCE' 
  | 'ADMIN_SUPPORT' 
  | 'ADMIN_VERIFICATION';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  hub: 'FLORIANOPOLIS_HUB';
  mfaEnforced: boolean;
  avatarUrl: string;
  lastLoginAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminId: string;
  adminName: string;
  action: 'UPDATE_RATE' | 'OVERRIDE_PAYOUT' | 'RESOLVE_DISPUTE' | 'APPROVE_KYC' | 'DISPATCH_OVERRIDE';
  entity: 'SERVICE' | 'PROVIDER' | 'PAYMENT' | 'ZONE' | 'CONFIG';
  entityId: string;
  previousValue?: Record<string, unknown>;
  newValue: Record<string, unknown>;
  ipAddress: string;
  geoCluster: 'sa-east-1-fln';
}

// ==========================================
// OPERACIONES Y SERVICIOS
// ==========================================
export type ServiceStatus = 
  | 'REQUESTED' 
  | 'MATCHING' 
  | 'CONFIRMED' 
  | 'PROVIDER_EN_ROUTE' 
  | 'PROVIDER_ARRIVED' 
  | 'IN_PROGRESS' 
  | 'PENDING_APPROVAL' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'DISPUTED';

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface ServiceOrder {
  id: string; // ej: '#UGO-1855'
  category: 'CLIMATIZACION' | 'ELECTRICIDAD' | 'PLOMERIA' | 'LIMPIEZA' | 'PINTURA' | 'CERRAJERIA';
  client: {
    id: string;
    name: string;
    phone: string;
    isVip: boolean;
  };
  provider?: {
    id: string;
    name: string;
    license: string;
    rating: number;
    currentCoords?: GeoCoordinate;
  };
  zone: string; // 'Canasvieiras' | 'Jurerê' | 'Ingleses' | 'Centro' | 'Lagoa'
  address: string;
  status: ServiceStatus;
  scheduledTime: string;
  originalAmount: number;
  extensionsAmount: number;
  totalAmount: number;
  slaRiskMinutes?: number;
  escrowStatus: 'PENDING' | 'LOCKED' | 'RELEASED' | 'REFUNDED' | 'DISPUTE_HOLD';
}

// ==========================================
// FINANZAS, MERCADO PAGO Y PIX
// ==========================================
export interface PaymentTransaction {
  id: string; // '#TRX-9812903'
  serviceOrderId: string;
  mercadoPagoPaymentId: string;
  externalReference: string;
  currency: 'BRL';
  grossAmount: number;
  mercadoPagoFee: number;
  ugoTakeRatePercent: 0.15;
  ugoTakeRateAmount: number;
  providerNetPayout: number;
  status: 'APPROVED' | 'IN_PROCESS' | 'REJECTED' | 'REFUNDED' | 'CHARGEBACK';
  splitBreakdown: {
    issMunicipalTax: number;
    pisCofinsFederalTax: number;
    netUgoRevenue: number;
  };
  ipnWebhooks: Array<{
    timestamp: string;
    topic: string;
    status: number;
    hmacSha256Verified: boolean;
  }>;
}

export interface PixPayoutBatchItem {
  id: string; // '#RET-8418'
  providerId: string;
  providerName: string;
  pixKeyType: 'CPF' | 'EMAIL' | 'PHONE' | 'EVP';
  pixKey: string;
  bankName: string;
  amount: number;
  status: 'PENDING_REVIEW' | 'QUEUED' | 'SETTLED' | 'REJECTED';
  riskScore: number; // 0 a 100
  requiresBiometricSelfie: boolean;
}

// ==========================================
// DISPUTAS & ARBITRAJE FORENSE
// ==========================================
export interface DisputeCase {
  id: string; // '#D-1042'
  serviceId: string;
  clientId: string;
  providerId: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_PARTIAL' | 'RESOLVED_FULL_CLIENT' | 'RESOLVED_FULL_PROVIDER';
  escrowHoldAmount: number;
  slaRemainingMinutes: number;
  evidenceItems: Array<{
    uploaderRole: 'CLIENT' | 'PROVIDER';
    url: string;
    exifTimestamp: string;
    exifCoords: GeoCoordinate;
  }>;
  copilotRecommendation: {
    confidence: number;
    action: string;
    suggestedClientRefund: number;
    suggestedProviderPayout: number;
  };
  resolutionNote?: string;
  resolvedByAdminId?: string;
}
```

---

## 2. GitHub Actions CI/CD Pipeline (`.github/workflows/deploy-admin.yml`)

Workflow automatizado para compilar TypeScript con validación estricta de tipos, ejecutar pruebas unitarias y empaquetar el Admin para staging o producción:

```yaml
name: UGO Admin CI/CD Pipeline

on:
  push:
    branches:
      - main
      - 'release/**'
  pull_request:
    branches:
      - main

env:
  NODE_VERSION: '20.x'
  VITE_API_ENDPOINT: https://api.ugo.com.br/v1
  VITE_MP_GATEWAY_ENV: production
  VITE_HUB_CLUSTER: sa-east-1-fln

jobs:
  type-check-and-lint:
    name: 🛡️ TypeScript Validation & ESLint
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

      - name: Run TypeScript Compiler (Strict Check)
        run: npx tsc --noEmit

      - name: Run ESLint
        run: npm run lint

  test-unit:
    name: 🧪 Unit & Integration Tests
    runs-on: ubuntu-latest
    needs: type-check-and-lint
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

      - name: Execute Vitest Suite
        run: npm run test:run

  build-production:
    name: 🚀 Vite Production Build
    runs-on: ubuntu-latest
    needs: test-unit
    if: github.ref == 'refs/heads/main'
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

      - name: Compile & Build Bundle
        run: npm run build

      - name: Verify Distribution Artifacts
        run: |
          ls -la dist/
          test -f dist/index.html || exit 1

      - name: Upload Build Artifact
        uses: actions/upload-artifact@v4
        with:
          name: ugo-admin-dist
          path: dist/
          retention-days: 7
```

---

## 3. Estructura de Mapeo de Rutas & Componentes React/TypeScript (`src/router.tsx`)

Para trasladar de forma limpia las pantallas de Stitch a la arquitectura `src/mvp` de Vite:

```tsx
import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import AdminShellLayout from './components/layout/AdminShellLayout';
import LoadingScreen from './components/feedback/LoadingScreen';

// Lazy loading de módulos con TypeScript
const DashboardOverview = lazy(() => import('./mvp/dashboard/DashboardOverview'));
const CommandCenterPage = lazy(() => import('./mvp/operations/CommandCenterPage'));
const LiveOperationsPage = lazy(() => import('./mvp/operations/LiveOperationsPage'));
const ServicesListPage = lazy(() => import('./mvp/services/ServicesListPage'));
const ServiceDetailTimeline = lazy(() => import('./mvp/services/ServiceDetailTimeline'));
const ProvidersDirectory = lazy(() => import('./mvp/providers/ProvidersDirectory'));
const ProviderProfile360 = lazy(() => import('./mvp/providers/ProviderProfile360'));
const VerificationKycPage = lazy(() => import('./mvp/providers/VerificationKycPage'));
const DisputesListPage = lazy(() => import('./mvp/disputes/DisputesListPage'));
const DisputeForesicDetail = lazy(() => import('./mvp/disputes/DisputeForesicDetail'));
const FinanceSummaryPage = lazy(() => import('./mvp/finance/FinanceSummaryPage'));
const PixPayoutsManagement = lazy(() => import('./mvp/finance/PixPayoutsManagement'));
const MercadoPagoDetail = lazy(() => import('./mvp/finance/MercadoPagoDetail'));
const ScoutIntelligencePage = lazy(() => import('./mvp/scout/ScoutIntelligencePage'));
const ReportsExecutivePage = lazy(() => import('./mvp/reports/ReportsExecutivePage'));
const ZonesCategoriesPage = lazy(() => import('./mvp/territory/ZonesCategoriesPage'));
const AuditLogSecurityPage = lazy(() => import('./mvp/security/AuditLogSecurityPage'));
const SystemLogsTelemetry = lazy(() => import('./mvp/system/SystemLogsTelemetry'));
const AdminLoginMfa = lazy(() => import('./mvp/auth/AdminLoginMfa'));

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AdminLoginMfa />
  },
  {
    path: '/',
    element: <AdminShellLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardOverview /> },
      { path: 'command-center', element: <CommandCenterPage /> },
      { path: 'operaciones', element: <LiveOperationsPage /> },
      { path: 'servicios', element: <ServicesListPage /> },
      { path: 'servicios/:id', element: <ServiceDetailTimeline /> },
      { path: 'proveedores', element: <ProvidersDirectory /> },
      { path: 'proveedores/:id', element: <ProviderProfile360 /> },
      { path: 'verificaciones', element: <VerificationKycPage /> },
      { path: 'disputas', element: <DisputesListPage /> },
      { path: 'disputas/:id', element: <DisputeForesicDetail /> },
      { path: 'finanzas', element: <FinanceSummaryPage /> },
      { path: 'finanzas/retiros-pix', element: <PixPayoutsManagement /> },
      { path: 'finanzas/pagos/:id', element: <MercadoPagoDetail /> },
      { path: 'scout', element: <ScoutIntelligencePage /> },
      { path: 'reportes', element: <ReportsExecutivePage /> },
      { path: 'zonas-categorias', element: <ZonesCategoriesPage /> },
      { path: 'seguridad-audit', element: <AuditLogSecurityPage /> },
      { path: 'system-logs', element: <SystemLogsTelemetry /> }
    ]
  }
]);

export const AppRouter: React.FC = () => (
  <Suspense fallback={<LoadingScreen message="Sincronizando con Cluster SC-FLN-01..." />}>
    <RouterProvider router={router} />
  </Suspense>
);
```

---

## 4. Guía de Exportación y Git Workflow

1. **Clonar el repo y crear rama de feature**:
   ```bash
   git clone git@github.com:sebastisnzoth/ugo-admin-panel.git
   cd ugo-admin-panel
   git checkout -b feature/stitch-design-sync
   ```

2. **Copiar las definiciones de tipos TypeScript**:
   Guardar las interfaces en `src/types/ugo-admin.d.ts`.

3. **Integrar componentes visuales**:
   - Cada pantalla generada en Stitch exporta su estructura modular a la carpeta correspondiente dentro de `src/mvp/`.
   - Utilizar el diseño y tokens de Tailwind definidos en `{{DATA:DESIGN_SYSTEM:DESIGN_SYSTEM_1}}`.

4. **Verificación y Push**:
   ```bash
   npm run build # Valida tipos con tsc y empaqueta Vite
   git add .
   git commit -m "feat(admin): sync 22 operational screens and types from Stitch"
   git push origin feature/stitch-design-sync
   ```
5. **Crear Pull Request en GitHub**:
   Abrir PR hacia la rama `main`. El GitHub Action ejecutará automáticamente `tsc --noEmit` y `npm run build` para asegurar 0 regresiones.
