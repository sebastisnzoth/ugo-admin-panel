import React from'react'

/**
 * @deprecated
 * El flujo operativo legado fue retirado. La única experiencia operativa
 * soportada vive en provider/ProviderRoot.tsx y está gobernada por
 * ProviderDataProvider + ProviderFlowProvider.
 *
 * Este componente se conserva temporalmente sólo como salida de compatibilidad
 * para referencias históricas durante la migración del onboarding.
 */
export function ProviderApp(){
 const openCanonical=()=>{
  const url=new URL(window.location.href)
  url.searchParams.set('app','provider')
  window.location.assign(url.toString())
 }
 return <main className="mvp-auth-page role-provider" aria-labelledby="provider-legacy-retired-title">
  <section className="mvp-auth-card">
   <div className="mvp-kicker">U.G.O. · PROVEEDOR</div>
   <h1 id="provider-legacy-retired-title">UGO Pro actualizado</h1>
   <p>Esta vista antigua fue retirada para evitar dos flujos operativos distintos. Tu operación continúa en la experiencia única de UGO Pro.</p>
   <button type="button" className="mvp-primary" onClick={openCanonical}>Abrir UGO Pro</button>
  </section>
 </main>
}
