import React from'react'
import{useProviderData}from'./providerData'
import{useProviderFlow}from'./providerFlow'
import{Button}from'../../shared/ui'

export function ProviderStudioSidebar(){
 const d=useProviderData(),f=useProviderFlow()
 return <aside className="provider-studio-sidebar" aria-label="Menú proveedor">
  <div className="provider-studio-brand">UGO</div>
  <div className="provider-studio-user">
   <span className="provider-studio-avatar" aria-hidden="true">{(d.name||'P').slice(0,1).toUpperCase()}</span>
   <strong>{d.name||'Proveedor UGO'}</strong>
   <small>★ {d.karma.toFixed(1)} · Proveedor verificado</small>
  </div>

  <nav className="provider-studio-nav" aria-label="Navegación principal">
   <Button variant="ghost" onClick={f.actions.openHome}>⌂ Inicio</Button>
   <Button variant="ghost" onClick={f.actions.openOpportunities}>▣ Trabajos {d.opportunities.length>0&&<b>{d.opportunities.length}</b>}</Button>
   <Button variant="ghost" onClick={f.actions.openAgenda}>▦ Calendario</Button>
   <Button variant="ghost" onClick={f.actions.openEarnings}>＄ Ganancias</Button>
   <Button variant="ghost" onClick={d.service?f.actions.openActiveJob:f.actions.openAgenda}>▤ {d.service?'Trabajo activo':'Mis trabajos'}</Button>
   <Button variant="ghost" onClick={f.actions.openHistory}>◷ Historial</Button>
   <Button variant="ghost" onClick={f.actions.openProfile}>♙ Perfil</Button>
  </nav>

  <div className="provider-studio-footer">
   <Button variant="ghost" className="provider-studio-utility" onClick={f.actions.openAgenda}>⚖ Elegir servicio</Button>
   <Button variant="ghost" className="provider-studio-utility" onClick={f.actions.openDispute}>? Ayuda</Button>
   <Button variant={d.online?'primary':'secondary'} className="provider-studio-availability" disabled={d.busy} onClick={()=>void d.toggleOnline()}>
    {d.online?'● Online · Cambiar a Offline':'○ Offline · Cambiar a Online'}
   </Button>
  </div>
 </aside>
}
