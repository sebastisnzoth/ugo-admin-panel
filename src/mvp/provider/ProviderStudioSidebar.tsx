import React from'react'
import{useProviderData}from'./providerData'
import{useProviderFlow}from'./providerFlow'

export function ProviderStudioSidebar(){
 const d=useProviderData(),f=useProviderFlow()
 return <aside className="provider-studio-sidebar" aria-label="Menú proveedor">
  <div className="provider-studio-brand">UGO</div>
  <div className="provider-studio-user">
   <span>{(d.name||'P').slice(0,1).toUpperCase()}</span>
   <strong>{d.name||'Proveedor UGO'}</strong>
   <small>★ {d.karma.toFixed(1)} · Proveedor verificado</small>
  </div>

  <nav className="provider-studio-nav" aria-label="Navegación principal">
   <button type="button" onClick={f.actions.openHome}>⌂ Inicio</button>
   <button type="button" onClick={f.actions.openOpportunities}>▣ Trabajos {d.opportunities.length>0&&<b>{d.opportunities.length}</b>}</button>
   <button type="button" onClick={f.actions.openAgenda}>▦ Calendario</button>
   <button type="button" onClick={f.actions.openEarnings}>＄ Ganancias</button>
   <button type="button" onClick={d.service?f.actions.openActiveJob:f.actions.openAgenda}>▤ {d.service?'Trabajo activo':'Mis trabajos'}</button>
   <button type="button" onClick={f.actions.openHistory}>◷ Historial</button>
   <button type="button" onClick={f.actions.openProfile}>♙ Perfil</button>
  </nav>

  <div className="provider-studio-footer">
   <button type="button" className="provider-studio-utility" onClick={f.actions.openAgenda}>⚖ Elegir servicio</button>
   <button type="button" className="provider-studio-utility" onClick={f.actions.openDispute}>? Ayuda</button>
   <button type="button" className="provider-studio-availability" disabled={d.busy} onClick={()=>void d.toggleOnline()}>
    {d.online?'● Online · Cambiar a Offline':'○ Offline · Cambiar a Online'}
   </button>
  </div>
 </aside>
}
