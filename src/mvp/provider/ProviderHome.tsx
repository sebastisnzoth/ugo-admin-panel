import{ProviderCustomerCard}from'./ProviderCustomerCard'
import React from'react'
import{useLocale}from'../../i18n/locale'
import{Button,Card,SectionHeader,StatusPill}from'../../shared/ui'
import{useProviderFlow}from'./providerFlow'
import{useProviderData,money}from'./providerData'

export function ProviderHome(){
 const{t}=useLocale()
 const flow=useProviderFlow(),d=useProviderData()
 const demandTop=[...d.demand].sort((a,b)=>(b.demandLevel==='high'?3:b.demandLevel==='medium'?2:1)-(a.demandLevel==='high'?3:a.demandLevel==='medium'?2:1))[0]||null
 const availability=d.debtBlocked
  ?{tone:'danger' as const,title:t('providerHome.debtPaused'),text:t('providerHome.debtHelp',{count:d.pendingDebtCount})}
  :!d.online
   ?{tone:'neutral' as const,title:t('provider.offline'),text:t('provider.offlineHelp')}
   :!d.matchingReady
    ?{tone:'warning' as const,title:t('providerHome.outsideRadar'),text:t('providerHome.gpsHelp')}
    :{tone:'success' as const,title:t('provider.title'),text:t('provider.available')}
 const next=d.service
  ?{eyebrow:t('providerHome.activeJob'),title:t('providerHome.activeTitle'),text:d.cashSelected?t('providerHome.activeCash'):d.funded?t('providerHome.activeFunded'):t('providerHome.activeWaiting'),action:flow.actions.openActiveJob,label:t('providerHome.continueJob')}
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
  <SectionHeader screenHeading eyebrow="UGO PRO" title={t('provider.welcome').replace('{name}',d.name)} description={t('provider.rating').replace('{rating}',d.karma.toFixed(1)).replace('{zone}',d.provider.ciudad_base||'Florianópolis')} actions={<Button className={`provider-status ${d.online?'is-online':'is-offline'}`} type="button" onClick={d.toggleOnline} disabled={d.busy||(d.debtBlocked&&!d.online)} aria-pressed={d.online} aria-label={d.online?(d.matchingReady?t('providerHome.deactivateOnlineReady'):t('providerHome.deactivateOnlinePending')):t('providerHome.activateOffline')}>{d.online?'Online':'Offline'}</Button>}/>
  <div className="provider-home-overview"><Card className="provider-card provider-hero provider-focus-card">
   <StatusPill tone={d.debtBlocked?'danger':d.service?'warning':d.online&&!d.matchingReady?'warning':d.online?'success':'neutral'}>{next.eyebrow}</StatusPill>
   <h2>{next.title}</h2><p>{next.text}</p>
   <Button variant="primary" size="lg" className="provider-primary provider-main-action" onClick={next.action} disabled={d.busy}>{d.busy?t('providerHome.processing'):next.label}</Button>
  </Card>
  <Card className={`provider-card provider-status-card is-${availability.tone}`} aria-live="polite">
   <div className="provider-status-card-head">
    <div><small>{t('providerHome.operational')}</small><strong>{availability.title}</strong></div>
    <StatusPill tone={availability.tone}>{d.debtBlocked?t('providerHome.paused'):!d.online?'Offline':!d.matchingReady?t('providerHome.gpsPending'):t('providerHome.available')}</StatusPill>
   </div>
   <p>{availability.text}</p>
   <div className="provider-status-facts">
    <span className={d.online&&d.matchingReady&&!d.debtBlocked?'is-ok':'is-alert'}><i aria-hidden="true">●</i>{d.online&&d.matchingReady&&!d.debtBlocked?t('providerHome.availableRequests'):d.debtBlocked?t('providerHome.paused'):d.online?t('providerHome.waitingGps'):t('providerHome.noRequests')}</span>
    <span className={d.matchingReady?'is-ok':'is-alert'}><i aria-hidden="true">⌖</i>{d.matchingReady?t('providerHome.currentLocation'):t('providerHome.gpsNeedsUpdate')}</span>
    <span className={d.debtBlocked?'is-alert':''}><i aria-hidden="true">$</i>{d.debtBlocked?t('providerHome.pendingFees',{count:d.pendingDebtCount}):t('providerHome.feesCurrent')}</span>
   </div>
   {!d.debtBlocked&&(!d.online||!d.matchingReady)&&<Button variant="primary" className="provider-primary provider-wide" disabled={d.busy} onClick={()=>void d.setOnline(true)}>{d.online?t('providerHome.updateLocation'):t('providerHome.setOnline')}</Button>}
  </Card>
  </div>
  {d.service?.cliente_id&&<ProviderCustomerCard clientId={d.service.cliente_id} serviceId={d.service.id} compact/>}
  {d.debtBlocked&&<Card className="provider-card provider-debt-lock"><StatusPill tone="danger">{t('providerHome.newJobsPaused')}</StatusPill><span>{t('providerHome.debtLock',{amount:money(d.ugoDebt),count:d.pendingDebtCount})}</span><Button variant="primary" className="provider-primary provider-wide" onClick={flow.actions.openEarnings}>{t('providerHome.pay').toUpperCase()}</Button></Card>}
  <h2 className="provider-home-section-title">{t('providerHome.quickAccess')}</h2>
  <div className="provider-quick-grid">
   <button type="button" className="provider-card provider-quick-card" onClick={flow.actions.openOpportunities}><small>{t('providerHome.ordersTitle')}</small><strong>{d.opportunities.length?t('providerHome.availableCount',{count:d.opportunities.length}):t('providerHome.viewOrders')}</strong><span>{t('providerHome.opportunities')}</span></button>
   <button type="button" className="provider-card provider-quick-card" onClick={flow.actions.openAgenda}><small>{t('providerHome.schedule')}</small><strong>{t('providerHome.upcomingJobs')}</strong><span>{t('providerHome.hours')}</span></button>
   <button type="button" className="provider-card provider-quick-card" onClick={flow.actions.openEarnings}><small>{t('providerHome.money')}</small><strong>{t('providerHome.balance',{amount:money(d.released)})}</strong><span>{t('providerHome.cashDebt',{cash:money(d.cashReceived),debt:money(d.ugoDebt)})}</span></button>
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
