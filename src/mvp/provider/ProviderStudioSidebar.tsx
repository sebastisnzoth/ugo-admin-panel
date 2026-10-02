import React from'react'
import{useProviderData}from'./providerData'
import{useProviderFlow}from'./providerFlow'
import{Button}from'../../shared/ui'

export function ProviderStudioSidebar(){
 const d=useProviderData(),f=useProviderFlow(),screen=f.screen
 const current=(active:boolean):'page'|undefined=>active?'page':undefined
 const market=screen==='demand'||screen==='opportunities'||screen==='opportunity-detail'
 const work=screen==='active-job'||screen==='agenda'
 return <aside className="provider-studio-sidebar" aria-label="Menú proveedor">
  <div className="provider-studio-brand">UGO <span>PRO</span></div>
  <div className="provider-studio-user">
   <span className="provider-studio-avatar" aria-hidden="true">{(d.name||'P').slice(0,1).toUpperCase()}</span>
   <strong>{d.name||'Proveedor UGO'}</strong>
   <small>★ {d.karma.toFixed(1)} · {d.online?'Online':'Offline'}</small>
  </div>

  <nav className="provider-studio-nav" aria-label="Navegación principal">
   <Button variant="ghost" className={screen==='home'?'is-active':''} aria-current={current(screen==='home')} onClick={f.actions.openHome}>Inicio</Button>
   <Button variant="ghost" aria-label="Trabajos" className={market?'is-active':''} aria-current={current(market)} onClick={f.actions.openOpportunities}>Pedidos {d.opportunities.length>0&&<b>{d.opportunities.length}</b>}</Button>
   <Button variant="ghost" aria-label="Calendario" className={screen==='agenda'?'is-active':''} aria-current={current(screen==='agenda')} onClick={f.actions.openAgenda}>Calendario</Button>
   <Button variant="ghost" className={work?'is-active':''} aria-current={current(work)} onClick={d.service?f.actions.openActiveJob:f.actions.openAgenda}>{d.service?'Trabajo activo':'Mis trabajos'}</Button>
   <Button variant="ghost" className={screen==='earnings'?'is-active':''} aria-current={current(screen==='earnings')} onClick={f.actions.openEarnings}>Ganancias</Button>
   <Button variant="ghost" className={screen==='history'?'is-active':''} aria-current={current(screen==='history')} onClick={f.actions.openHistory}>Historial</Button>
   <Button variant="ghost" className={screen==='profile'?'is-active':''} aria-current={current(screen==='profile')} onClick={f.actions.openProfile}>Perfil</Button>
  </nav>

  <div className="provider-studio-footer">
   <Button variant="ghost" className="provider-studio-utility" onClick={()=>f.actions.openDispute()}>Ayuda y soporte</Button>
   <Button variant={d.online?'primary':'secondary'} className="provider-studio-availability" disabled={d.busy} onClick={()=>void d.toggleOnline()}>
    {d.online?'● Online · Pasar a Offline':'○ Offline · Ponerme Online'}
   </Button>
  </div>
 </aside>
}
