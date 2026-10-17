import React from'react'
import{useLocale}from'../../i18n/locale'
import{useProviderData}from'./providerData'
import{useProviderFlow}from'./providerFlow'
import{Button}from'../../shared/ui'

export function ProviderStudioSidebar(){
 const{t}=useLocale()
 const d=useProviderData(),f=useProviderFlow(),screen=f.screen
 const active=(...screens:string[])=>screens.includes(screen)?'is-active':''
 return <aside className="provider-studio-sidebar" aria-label="Menú proveedor">
  <div className="provider-studio-brand">UGO</div>
  <div className="provider-studio-user">
   <span className="provider-studio-avatar" aria-hidden="true">{(d.name||'P').slice(0,1).toUpperCase()}</span>
   <div className="provider-studio-user-copy">
    <strong>{d.name||'Proveedor UGO'}</strong>
    <small>★ {d.karma.toFixed(1)} · {d.online?t('nav.available'):t('nav.unavailable')}</small>
   </div>
  </div>

  <nav className="provider-studio-nav" aria-label="Navegación principal">
   <Button variant="ghost" className={active('home')} aria-current={screen==='home'?'page':undefined} onClick={f.actions.openHome}>{t('nav.home')}</Button>
   <Button variant="ghost" className={active('demand','opportunities','opportunity-detail')} aria-label="Trabajos y pedidos" aria-current={['demand','opportunities','opportunity-detail'].includes(screen)?'page':undefined} onClick={f.actions.openOpportunities} >{t('nav.orders')} {d.opportunities.length>0&&<b>{d.opportunities.length}</b>}</Button>
   <Button variant="ghost" className={active('active-job','agenda')} aria-current={['active-job','agenda'].includes(screen)?'page':undefined} onClick={d.service?f.actions.openActiveJob:f.actions.openAgenda}>{d.service?t('nav.active'):t('nav.jobs')}</Button>
   <Button variant="ghost" className={active('history')} aria-current={screen==='history'?'page':undefined} onClick={f.actions.openHistory}>{t('nav.history')}</Button>
   <Button variant="ghost" className={active('earnings')} aria-current={screen==='earnings'?'page':undefined} onClick={f.actions.openEarnings}>{t('nav.earnings')}</Button>
   <Button variant="ghost" className={active('profile')} aria-current={screen==='profile'?'page':undefined} onClick={f.actions.openProfile}>{t('nav.profile')}</Button>
  </nav>

  <div className="provider-studio-footer">
   <Button variant="ghost" className="provider-studio-utility" onClick={()=>f.actions.openDispute()}>{t('nav.help')}</Button>
   <Button variant={d.online?'primary':'secondary'} className="provider-studio-availability" disabled={d.busy||(d.debtBlocked&&!d.online)} onClick={()=>void d.toggleOnline()}>
    <span className="provider-studio-status-dot" aria-hidden="true"/>
    {d.online?t('nav.goOffline'):t('nav.goOnline')}
   </Button>
  </div>
 </aside>
}
