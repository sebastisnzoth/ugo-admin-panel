import { RealFlowDemo } from '../../design-preview/RealFlowDemo'
import '../../design-preview/roles.css'
import '../design-preview/design-preview.css'

/*
 * Flujo v2 del cliente (scaffold detrás de feature flag).
 * Solo se monta con VITE_FLAG_CLIENT_RIDESHARE_FLOW=true en build no productivo.
 * Hoy usa la demo local: NO está conectado a datos reales todavía.
 */
export function ClientFlowV2() {
  return (
    <div className="ugo-dp-gallery">
      <p className="ugo-rp-role-desc">Flujo v2 · datos de demostración (no conectado a servicios reales)</p>
      <RealFlowDemo />
    </div>
  )
}
