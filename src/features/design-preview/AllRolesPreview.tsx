import{useLocale}from'../../i18n/locale'
import { useState, type ReactNode } from 'react'
import '../client/design-preview/design-preview.css'
import './roles.css'
import {
  ClientHomeScreen,
  ProviderDetailScreen,
  AssistantListeningScreen,
  ProviderEnRouteScreen,
  ClientWebScreen,
} from '../client/design-preview/ClientDesignPreview'
import {
  ProviderActiveJobScreen,
  ProviderEarningsScreen,
  ProviderEvidenceScreen,
  ProviderHomeScreen,
} from './ProviderDesignPreview'
import { AdminDemo } from './FunctionalDemo'
import { RealFlowDemo } from './RealFlowDemo'
import {
  AdminDashboardScreen,
  AdminDisputesScreen,
  SuperAdminCommandCenterScreen,
} from './AdminDesignPreview'

type Role = 'cliente' | 'proveedor' | 'admin' | 'superadmin' | 'demo'

const roles: { id: Role; label: string }[] = [
  { id: 'cliente', label: 'Cliente' },
  { id: 'proveedor', label: 'Proveedor' },
  { id: 'admin', label: 'Admin' },
  { id: 'superadmin', label: 'Super Admin' },
  { id: 'demo', label: 'Demo funcional' },
]

const roleDescription: Record<Role, string> = {
  cliente: 'Pedir, seguir y calificar un servicio desde el celular o la web.',
  proveedor: 'Recibir ofertas, ejecutar el trabajo, subir evidencia y ver ganancias.',
  admin: 'Operar servicios en curso, pagos y disputas en tiempo real.',
  superadmin: 'Gobierno, readiness, evidencia y controles globales de la plataforma.',
  demo: 'Flujo real de UGO: el cliente pide, el proveedor acepta y ejecuta, y el cierre pasa por revisión. Estado local, sin datos reales.',
}

const screens: Record<Role, ReactNode[]> = {
  cliente: [
    <ClientHomeScreen key="c1" />,
    <ProviderDetailScreen key="c2" />,
    <AssistantListeningScreen key="c3" />,
    <ProviderEnRouteScreen key="c4" />,
    <ClientWebScreen key="c5" />,
  ],
  proveedor: [
    <ProviderHomeScreen key="p1" />,
    <ProviderActiveJobScreen key="p2" />,
    <ProviderEvidenceScreen key="p3" />,
    <ProviderEarningsScreen key="p4" />,
  ],
  admin: [<AdminDashboardScreen key="a1" />, <AdminDisputesScreen key="a2" />],
  superadmin: [<SuperAdminCommandCenterScreen key="s1" />],
  demo: [<RealFlowDemo key="d1" />, <AdminDemo key="d3" />],
}

/** Galería de todos los roles con selector de rol. Preview aislado, no conectado a rutas de producción. */
export default function AllRolesPreview() {
  const{t}=useLocale()
  const [role, setRole] = useState<Role>('cliente')
  return (
    <div>
      <nav className="ugo-rp-role-tabs" aria-label={t('preview.role')}>
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`ugo-rp-role-tab${role === r.id ? ' is-active' : ''}`}
            aria-pressed={role === r.id}
            onClick={() => setRole(r.id)}
          >
            {r.label}
          </button>
        ))}
      </nav>
      <p className="ugo-rp-role-desc">{roleDescription[role]}</p>
      <main className="ugo-dp-gallery">{screens[role]}</main>
    </div>
  )
}
