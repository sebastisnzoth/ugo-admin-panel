import{useLocale}from'../../i18n/locale'
import React,{useEffect,useState}from'react'
import{useProviderFlow}from'./providerFlow'
import{useProviderData}from'./providerData'
import{ProviderRequestEvidence}from'./ProviderRequestEvidence'
import type{ProviderOpportunity}from'./providerTypes'
import{Button,Card,EmptyState,SectionHeader,StatusPill}from'../../shared/ui'

function compareOpportunityPriority(a:ProviderOpportunity,b:ProviderOpportunity){const urgency=(b.urgency==='urgent'?1:0)-(a.urgency==='urgent'?1:0);if(urgency)return urgency;const distance=Math.max(a.distanceKm,0)-Math.max(b.distanceKm,0);if(distance)return distance;const value=Number(b.estimatedValue||0)-Number(a.estimatedValue||0);if(value)return value;return Number(a.matchScore??Number.MAX_SAFE_INTEGER)-Number(b.matchScore??Number.MAX_SAFE_INTEGER)}
const formatCountdown=(ms:number)=>{const total=Math.max(0,Math.ceil(ms/1000)),minutes=Math.floor(total/60),seconds=total%60;return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`}
function scheduleLabel(item:ProviderOpportunity,locale:string,t:(key:string)=>string){if(item.urgency==='urgent'&&!item.scheduledAt)return t('providerOpportunity.earliest');if(!item.scheduledAt)return t('providerOpportunity.coordinate');const date=new Date(item.scheduledAt);return Number.isNaN(date.getTime())?t('providerOpportunity.coordinate'):date.toLocaleString(locale,{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}

export function ProviderOpportunities(){
 const{t,locale}=useLocale()
 const flow=useProviderFlow(),d=useProviderData(),items=[...d.opportunities].sort(compareOpportunityPriority)
 const hasDeadlines=items.some(item=>item.expiresAt),[now,setNow]=useState(()=>Date.now())
 useEffect(()=>{if(!hasDeadlines)return;const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[hasDeadlines])
 return <section className="provider-screen provider-opportunities-simple" aria-labelledby="provider-opportunities-title">
  <SectionHeader eyebrow={t('providerOpportunity.eyebrow')} title={t('providerOpportunity.title')} description={t('providerOpportunity.description')} actions={<Button variant="ghost" type="button" onClick={flow.actions.openDemand}>{t('screen.opportunities.1')}</Button>}/>
  {d.debtBlocked?<Card className="provider-card provider-debt-lock"><StatusPill tone="danger">{t('screen.opportunities.2')}</StatusPill><span>{t('providerOpportunity.debtHelp',{count:d.pendingDebtCount})}</span><Button variant="primary" className="provider-primary provider-wide" onClick={flow.actions.openEarnings}>{t('screen.opportunities.3')}</Button></Card>:<div className="provider-list">{items.length===0?<Card className="provider-card provider-empty"><EmptyState title={t('providerOpportunity.emptyTitle')} description={d.online?t('providerOpportunity.emptyOnline'):t('providerOpportunity.emptyOffline')}/></Card>:items.map(item=><Card className="provider-card provider-opportunity-simple" key={item.id}>
   <div className="provider-opportunity-meta"><span className="provider-chip">{item.category}</span>{item.urgency==='urgent'&&<span className="provider-chip is-urgent">{t('screen.opportunities.4')}</span>}{item.expiresAt&&(()=>{const left=new Date(item.expiresAt).getTime()-now;if(!Number.isFinite(left)||left<=0)return <span className="provider-chip is-expired">{t('screen.opportunities.5')}</span>;return <span className={`provider-chip ${left<=60_000?'is-expiring':''}`}>{t('providerOpportunity.expiresIn',{time:formatCountdown(left)})}</span>})()}</div>
   <h2>{item.title}</h2>
   <div className="provider-opportunity-facts">
    <div><small>{t('screen.opportunities.6')}</small><strong>{item.zone}{item.distanceKm>0?` · ${item.distanceKm.toFixed(1)} km`:''}</strong></div>
    <div><small>{t('screen.opportunities.7')}</small><strong>{scheduleLabel(item,locale,t)}</strong></div>
    <div><small>{t('screen.opportunities.8')}</small><strong>{new Intl.NumberFormat(locale,{style:'currency',currency:'BRL'}).format(Number(item.estimatedValue||0))}</strong></div>
   </div>
   <Button variant="primary" className="provider-primary provider-wide" onClick={()=>flow.actions.openOpportunity(item.id)}>{t('screen.opportunities.9')}</Button>
  </Card>)}</div>}
 </section>
}

export function ProviderOpportunityDetail({id}:{id:string|null}){
 const{t,locale}=useLocale()
 const flow=useProviderFlow(),d=useProviderData(),item=d.opportunities.find(opportunity=>opportunity.id===id),[now,setNow]=useState(()=>Date.now())
 useEffect(()=>{if(!item?.expiresAt)return;queueMicrotask(()=>setNow(Date.now()));const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[item?.id,item?.expiresAt])
 const expiry=item?.expiresAt?new Date(item.expiresAt).getTime():Number.POSITIVE_INFINITY,remainingMs=expiry-now,expired=remainingMs<=0
 const requestedMs=item?.requestedAt?new Date(item.requestedAt).getTime():NaN,offerWindowMs=Number.isFinite(requestedMs)&&Number.isFinite(expiry)&&expiry>requestedMs?expiry-requestedMs:Math.max(60_000,remainingMs),offerProgress=expired?0:Math.max(4,Math.min(100,Math.round((remainingMs/offerWindowMs)*100)))
 if(d.debtBlocked)return <section className="provider-screen provider-opportunity-detail"><Button variant="ghost" className="provider-back" onClick={flow.actions.openOpportunities}>{t('screen.opportunities.10')}</Button><span className="provider-kicker">{t('screen.opportunities.11')}</span><h1>{t('screen.opportunities.12')}</h1><p>{t('providerOpportunity.debtDetail',{count:d.pendingDebtCount})}</p><Button variant="primary" className="provider-primary provider-wide" onClick={flow.actions.openEarnings}>{t('screen.opportunities.3')}</Button></section>
 if(!item)return <section className="provider-screen"><Button variant="ghost" className="provider-back" onClick={flow.actions.openOpportunities}>{t('screen.opportunities.10')}</Button><h1>{t('screen.opportunities.13')}</h1><p>{t('screen.opportunities.14')}</p></section>
 return <section className="provider-screen provider-opportunity-detail provider-opportunity-decision">
  <Button variant="ghost" className="provider-back" onClick={flow.actions.openOpportunities}>{t('screen.opportunities.10')}</Button>
  <span className="provider-kicker">{t('screen.opportunities.15')}</span><h1>{t('screen.opportunities.16')}</h1>
  <Card className="provider-card provider-offer-countdown" aria-live="polite">{expired?<><strong>{t('screen.opportunities.17')}</strong><span>{t('screen.opportunities.18')}</span></>:<><strong>{t('providerOpportunity.newRequest',{time:formatCountdown(remainingMs)})}</strong><span>{t('screen.opportunities.19')}</span></>}{!expired&&<div className="provider-offer-timer" aria-hidden="true"><i className={remainingMs<=30_000?'is-critical':remainingMs<=60_000?'is-warning':undefined} style={{width:`${offerProgress}%`}}/></div>}</Card>
  <div className="provider-decision-reasons" aria-label={t('providerOpportunity.why')}>
   {item.urgency==='urgent'&&<span className="is-urgent">{t('screen.opportunities.20')}</span>}
   {item.distanceKm>0&&<span>⌖ {item.distanceKm.toFixed(1)} km</span>}
   {item.durationMinutes?<span>◷ ~{item.durationMinutes} min</span>:null}
   {item.scheduledAt&&<span>{t('screen.opportunities.21')}</span>}
  </div>
  <Card className="provider-card provider-offer-sheet">
   <div className="provider-opportunity-meta"><span className="provider-chip">{item.category}</span>{item.urgency==='urgent'&&<span className="provider-chip is-urgent">{t('screen.opportunities.4')}</span>}</div>
   <div className="provider-offer-problem"><small>{t('screen.opportunities.22')}</small><p>{item.description||item.title}</p></div>
   <div className="provider-decision-facts">
    <div><small>{t('screen.opportunities.6')}</small><strong>{item.zone}{item.distanceKm>0?` · ${item.distanceKm.toFixed(1)} km`:''}</strong></div>
    <div><small>{t('screen.opportunities.7')}</small><strong>{scheduleLabel(item,locale,t)}</strong></div>
    <div><small>{t('screen.opportunities.8')}</small><strong>{new Intl.NumberFormat(locale,{style:'currency',currency:'BRL'}).format(Number(item.estimatedValue||0))}</strong></div>
   </div>
   {item.preferences&&<details className="provider-secondary-details"><summary>{t('screen.opportunities.23')}</summary><p>{item.preferences}</p></details>}
   <details className="provider-secondary-details"><summary>{t('screen.opportunities.24')}</summary><ProviderRequestEvidence serviceId={item.serviceId}/></details>
  </Card>
  <div className="provider-decision provider-decision-bar">
   {d.service&&<p className="provider-action-note">{item.scheduledAt?t('providerOpportunity.otherScheduled'):t('providerOpportunity.otherUnscheduled')}</p>}
   <Button variant="primary" size="lg" className="provider-primary provider-main-action" disabled={d.busy||expired} onClick={()=>flow.actions.acceptOpportunity(item.id)}>{d.busy?t('providerOpportunity.processing'):t('providerOpportunity.accept')}</Button>
   <Button variant="ghost" className="provider-reject provider-wide" disabled={d.busy||expired} onClick={()=>flow.actions.rejectOpportunity(item.id)}>{t('screen.opportunities.25')}</Button>
  </div>
 </section>
}
