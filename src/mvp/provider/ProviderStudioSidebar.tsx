import React from'react'
import{useProviderData}from'./providerData'
import{useProviderFlow}from'./providerFlow'
import{Button}from'../../shared/ui'

export function ProviderStudioSidebar(){
 const d=useProviderData(),f=useProviderFlow(),screen=f.screen
 const active=(...screens:string[])=>screens.includes(screen)?'is-active':''
 return <aside className="provider-studio-sidebar" aria-label="Menú proveedor">
  <div className="provider-studio-brand">UGO</div>
  <div className="provider-studio-user">
   <span className="provider-studio-avatar" aria-hidden="true">{(d.name||'P').slice(0,1).toUpperCase()}</span>
   <div className="provider-studio-user-copy">
    <strong>{d.name||'Proveedor UGO'}</strong>
    <small>★ {d.karma.toFixed(1)} · {d.online?'Disponible':'Fuera de línea'}</small>
   </div>
  </div>

  <nav className="provider-studio-nav" aria-label="Navegación principal">
   <Button variant="ghost" className={active('home')} aria-current={screen==='home'?'page':undefined} onClick={f.actions.openHome}>Inicio</Button>
   <Button variant="ghost" className={active('demand','opportunities','opportunity-detail')} aria-current={['demand','opportunities','opportunity-detail'].includes(screen)?'page':undefined} onClick={f.actions.openOpportunities}>Pedidos {d.opportunities.length>0&&<b>{d.opportunities.length}</b>}</Button>
   <Button variant="ghost" className={active('active-job','agenda')} aria-current={['active-job','agenda'].includes(screen)?'page':undefined} onClick={d.service?f.actions.openActiveJob:f.actions.openAgenda}>{d.service?'Trabajo activo':'Mis trabajos'}</Button>
   <Button variant="ghost" className={active('history')} aria-current={screen==='history'?'page':undefined} onClick={f.actions.openHistory}>Historial</Button>
   <Button variant="ghost" className={active('earnings')} aria-current={screen==='earnings'?'page':undefined} onClick={f.actions.openEarnings}>Ganancias</Button>
   <Button variant="ghost" className={active('profile')} aria-current={screen==='profile'?'page':undefined} onClick={f.actions.openProfile}>Perfil</Button>
  </nav>

  <div className="provider-studio-footer">
   <Button variant="ghost" className="provider-studio-utility" onClick={()=>f.actions.openDispute()}>Ayuda y disputa</Button>
   <Button variant={d.online?'primary':'secondary'} className="provider-studio-availability" disabled={d.busy||(d.debtBlocked&&!d.online)} onClick={()=>void d.toggleOnline()}>
    <span className="provider-studio-status-dot" aria-hidden="true"/>
    {d.online?'Online · dejar de recibir':'Offline · empezar a recibir'}
   </Button>
  </div>
 </aside>
}
