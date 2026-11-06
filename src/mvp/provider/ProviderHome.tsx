import{ProviderCustomerCard}from'./ProviderCustomerCard'
import React from'react'
import{useLocale}from'../../i18n/locale'
import{Button,Card,SectionHeader,StatusPill}from'../../shared/ui'
import{useProviderFlow}from'./providerFlow'
import{useProviderData,money}from'./providerData'

function QuickIcon({kind}:{kind:'orders'|'agenda'|'money'}){
 return <span className="provider-quick-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{kind==='orders'?<><path d="M8 4h8l2 3v13H6V7l2-3Z"/><path d="M6 8h12M9 12h6M9 16h6"/></>:kind==='agenda'?<><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 4v4M16 4v4M4 10h16M8 14h3M8 17h5"/></>:<><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M15 15h3"/></>}</svg></span>
}

export function ProviderHome(){
 const{t}=useLocale()
 const flow=useProviderFlow(),d=useProviderData()
 const demandTop=[...d.demand].sort((a,b)=>(b.demandLevel==='high'?3:b.demandLevel==='medium'?2:1)-(a.demandLevel==='high'?3:a.demandLevel==='medium'?2:1))[0]||null
 const activeState=d.service?({'asignado':'providerJob.state.assigned','en_camino':'providerJob.state.onWay','llegado':'providerJob.state.arrived','en_progreso':'providerJob.state.inProgress','esperando_aprobacion':'providerJob.state.awaiting','disputado':'providerJob.state.disputed','completado':'providerJob.state.completed'} as Record<string,string>)[d.service.estado]:null
 const next=d.service
  ?{eyebrow:t('providerHome.activeJob'),title:activeState?t(activeState):t('providerHome.activeTitle'),text:d.cashSelected?t('providerHome.activeCash'):d.funded?t('providerHome.activeFunded'):t('providerHome.activeWaiting'),action:flow.actions.openActiveJob,label:t('providerHome.continueJob')}
  :d.debtBlocked
   ?{eyebrow:t('providerHome.fees'),title:t('providerHome.payToReturn'),text:t('providerHome.threeFees',{count:d.pendingDebtCount}),action:flow.actions.openEarnings,label:t('providerHome.pay')}
  :d.opportunities.length
   ?{eyebrow:t('providerHome.newRequests'),title:t('providerHome.requestsForYou',{count:d.opportunities.length}),text:t('providerHome.requestHelp'),action:flow.actions.openOpportunities,label:t('providerHome.seeRequests')}
  :d.online&&!d.matchingReady
   ?{eyebrow:t('providerHome.gpsAttention'),title:t('providerHome.onlineOutside'),text:t('providerHome.updateGpsHelp'),action:()=>void d.setOnline(true),label:t('providerHome.updateLocation')}
  :d.online
   ?{eyebrow:t('provider.ready'),title:t('provider.work'),text:t('provider.available'),action:()=>void d.reload(),label:t('provider.refresh')}
   :{eyebrow:t('providerHome.offRadar'),title:t('providerHome.goOnline'),text:t('providerHome.onlineHelp'),action:d.toggleOnline,label:t('providerHome.setOnline')}
 return <section className="provider-screen provider-home" aria-label={t('providerHome.area')}>
  <SectionHeader screenHeading eyebrow="UGO PRO" title={t('provider.welcome').replace('{name}',d.name)} description={t('provider.rating').replace('{rating}',d.karma.toFixed(1)).replace('{zone}',d.provider.ciudad_base||'Florianópolis')} actions={<Button className={`provider-status ${d.online?'is-online':'is-offline'}`} type="button" onClick={d.toggleOnline} disabled={d.busy||(d.debtBlocked&&!d.online)} aria-pressed={d.online} aria-label={d.online?(d.matchingReady?t('providerHome.deactivateOnlineReady'):t('providerHome.deactivateOnlinePending')):t('providerHome.activateOffline')}>{d.online?t("providerScreen.online"):t("screen.demand.2")}</Button>}/>
  <div className="provider-home-overview"><Card className="provider-card provider-hero provider-focus-card">
   <StatusPill tone={d.debtBlocked?'danger':d.service?'warning':d.online&&!d.matchingReady?'warning':d.online?'success':'neutral'}>{next.eyebrow}</StatusPill>
   <h2>{next.title}</h2><p>{next.text}</p>
   <div className="provider-hero-actions"><Button variant="primary" size="lg" className="provider-primary provider-main-action" onClick={next.action} disabled={d.busy}>{d.busy?t('providerHome.processing'):next.label}</Button>
    {d.online&&<Button variant="ghost" className="provider-hero-offline" onClick={d.toggleOnline} disabled={d.busy}>{t('nav.goOffline')}</Button>}</div>
  </Card>
  <Card className="provider-card provider-finance-summary" aria-label={t('providerHome.money')}>
   <div className="provider-finance-summary-top">
    <small>{t('providerEarnings.releasedTotal')}</small>
    <strong>{money(d.released)}</strong>
    <p>{t('providerEarnings.releasedExplanation')}</p>
    <Button variant="ghost" type="button" onClick={flow.actions.openEarnings}>{t('providerHome.money')} →</Button>
   </div>
   <div className="provider-finance-summary-bottom">
    <small>{t('provider.rating').replace('{rating}',d.karma.toFixed(1)).replace('{zone}',d.provider.ciudad_base||'Florianópolis')}</small>
    <strong><span aria-hidden="true">★</span> {d.karma.toFixed(1)}</strong>
   </div>
  </Card>
  </div>
  {d.service?.cliente_id&&<ProviderCustomerCard clientId={d.service.cliente_id} serviceId={d.service.id} compact/>}
  {d.debtBlocked&&<Card className="provider-card provider-debt-lock"><StatusPill tone="danger">{t('providerHome.newJobsPaused')}</StatusPill><span>{t('providerHome.debtLock',{amount:money(d.ugoDebt),count:d.pendingDebtCount})}</span><Button variant="primary" className="provider-primary provider-wide" onClick={flow.actions.openEarnings}>{t('providerHome.pay').toUpperCase()}</Button></Card>}
  <h2 className="provider-home-section-title">{t('providerHome.quickAccess')}</h2>
  <div className="provider-quick-grid">
   <button type="button" className="provider-card provider-quick-card" onClick={flow.actions.openOpportunities}><QuickIcon kind="orders"/><small>{t('providerHome.ordersTitle')}</small><strong>{d.opportunities.length?t('providerHome.availableCount',{count:d.opportunities.length}):t('providerHome.viewOrders')}</strong><span>{t('providerHome.opportunities')}</span></button>
   <button type="button" className="provider-card provider-quick-card" onClick={flow.actions.openAgenda}><QuickIcon kind="agenda"/><small>{t('providerHome.schedule')}</small><strong>{t('providerHome.upcomingJobs')}</strong><span>{t('providerHome.hours')}</span></button>
   <button type="button" className="provider-card provider-quick-card" onClick={flow.actions.openEarnings}><QuickIcon kind="money"/><small>{t('providerHome.money')}</small><strong>{t('providerEarnings.releasedAmount',{amount:money(d.released)})}</strong><span>{t('providerHome.cashDebt',{cash:money(d.cashReceived),debt:money(d.ugoDebt)})}</span></button>
  </div>
  {demandTop?<Card className="provider-card provider-radar-glance">
   <div className="provider-radar-glance-head">
    <div><small>{t('providerHome.demand')}</small><strong>{d.demand.length===1?t('providerHome.zonesOne'):t('providerHome.zonesMany',{count:d.demand.length})}</strong></div>
    <StatusPill tone={demandTop.demandLevel==='high'?'success':demandTop.demandLevel==='medium'?'warning':'neutral'}>{demandTop.demandLevel==='high'?t('providerHome.movementHigh'):demandTop.demandLevel==='medium'?t('providerHome.movementMedium'):t('providerHome.movementLow')}</StatusPill>
   </div>
   <p>{demandTop.zone} · {t('providerHome.average')} {money(demandTop.estimatedValue)}</p>
   <Button variant="ghost" onClick={flow.actions.openDemand}>{t('providerHome.fullRadar')}</Button>
  </Card>:d.online&&<Button variant="ghost" className="provider-quiet-link" type="button" onClick={flow.actions.openDemand}>{t('providerHome.demandRadar')}</Button>}
 </section>
}
