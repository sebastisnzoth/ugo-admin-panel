import{useLocale}from'../../i18n/locale'
import{ProviderCustomerCard}from'./ProviderCustomerCard'
import React,{useState}from'react'
import{ServiceExpansionPanel}from'../ServiceExpansionPanel'
import{ServiceChat}from'../ServiceChat'
import{useProviderData}from'./providerData'
import{useProviderFlow}from'./providerFlow'
import{ProviderEvidencePanel}from'./ProviderEvidencePanel'
import{ProviderRequestEvidence}from'./ProviderRequestEvidence'
import{Button,Card,EmptyState,SectionHeader}from'../../shared/ui'
import{useDialog}from'../dialogs'

const FLOW_ORDER:Record<string,number>={asignado:0,en_camino:0,llegado:1,en_progreso:2,esperando_aprobacion:3,disputado:3,completado:3}
const CANCELLABLE=new Set(['asignado','en_camino','llegado'])
function scheduledLabel(value:string,locale:string,t:(key:string)=>string){const date=new Date(value);return Number.isNaN(date.getTime())?t('providerJob.scheduled'):date.toLocaleString(locale,{weekday:'long',day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit'})}

export function ProviderActiveJob(){
 const{t,locale}=useLocale()
 const FLOW_STEPS=[{state:'asignado',label:t('providerJob.step.go')},{state:'llegado',label:t('providerJob.step.arrive')},{state:'en_progreso',label:t('providerJob.step.resolve')},{state:'esperando_aprobacion',label:t('providerJob.step.ready')}] as const
 const stateLabels:Record<string,string>={asignado:t('providerJob.state.assigned'),en_camino:t('providerJob.state.onWay'),llegado:t('providerJob.state.arrived'),en_progreso:t('providerJob.state.inProgress'),esperando_aprobacion:t('providerJob.state.awaiting'),disputado:t('providerJob.state.disputed'),completado:t('providerJob.state.completed')}
 const formatMoney=(value:number,currency:string)=>new Intl.NumberFormat(locale,{style:'currency',currency:/^[A-Z]{3}$/i.test(currency)?currency:'BRL'}).format(Number(value||0))
 const d=useProviderData(),flow=useProviderFlow(),s=d.service
const{confirm,prompt,alert,node:dialog}=useDialog()
 const[evidence,setEvidence]=useState({initial:false,final:false})
 if(!s)return <section className="provider-screen provider-empty-screen"><EmptyState title={t('providerJob.emptyTitle')} description={t('providerJob.emptyDescription')} action={<Button variant="primary" className="provider-primary provider-wide" onClick={flow.actions.openOpportunities}>{t('screen.active.1')}</Button>}/></section>
 const scheduledAt=(s as{programado_para?:string|null}).programado_para||null
 const paymentReady=d.funded||d.cashSelected||d.paymentPreferenceSelected
 const amountReady=Number(s.tarifa||0)>0
 const address=s.direccion_cliente||t('providerAgenda.addressPending')
 const mapHref=s.direccion_cliente?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.direccion_cliente)}`:null
 const stateLabel=stateLabels[s.estado]||s.estado.replaceAll('_',' ')
 const progressIndex=FLOW_ORDER[s.estado]??0
 const nextAction=s.estado==='asignado'
  ?(paymentReady?t('providerJob.nextLeave'):t('providerJob.nextWaitPayment'))
  :s.estado==='en_camino'
   ?t('providerJob.nextArrive')
   :s.estado==='llegado'
    ?(!amountReady?t('providerJob.nextSetAmount'):!paymentReady?t('providerJob.nextWaitPayment'):evidence.initial?t('providerJob.nextStart'):t('providerJob.nextInitialPhoto'))
    :s.estado==='en_progreso'
     ?(evidence.final?t('providerJob.nextMarkDone'):t('providerJob.nextFinalPhoto'))
     :s.estado==='esperando_aprobacion'
      ?t('providerJob.nextApproval')
      :s.estado==='disputado'?t('providerJob.nextDispute'):t('providerJob.nextReview')
 const paymentLabel=d.funded?t('providerJob.paymentProtected'):d.cashSelected?t('providerJob.paymentCash'):d.paymentPreferenceSelected?t('providerJob.paymentChosen'):t('providerJob.paymentPending')
 const locationLabel=s.estado==='en_camino'?t('providerJob.locationActive'):s.estado==='llegado'||s.estado==='en_progreso'?t('providerJob.locationConfirmed'):t('providerJob.locationReady')
 const confirmArrival=async()=>{await d.advance('llegado')}
 const cancelJob=async()=>{if(d.busy||!CANCELLABLE.has(s.estado))return;if(!await confirm({title:t('providerAgenda.confirmCancel'),message:t('providerJob.cancelQuestion'),danger:true}))return;const reason=await prompt({title:t('providerAgenda.confirmCancel'),message:t('providerJob.cancelReasonPrompt'),label:t('providerJob.cancelReasonLabel'),required:true});if(reason===null)return;if(reason.trim().length<5){await alert({title:t('providerAgenda.confirmCancel'),message:t('providerJob.cancelReasonInvalid')});return}await d.cancelService(reason)}
 return <section className="provider-screen provider-active-job" aria-labelledby="provider-job-title">
  <><Button variant="ghost" className="provider-back" onClick={flow.actions.openHome}>{t('screen.active.2')}</Button><SectionHeader eyebrow={t('providerJob.activeEyebrow')} title={stateLabel} description={t('providerJob.activeDescription')}/></>
  <div className="provider-job-progress" aria-label={t('providerJob.progress')}>{FLOW_STEPS.map((step,index)=><div key={step.state} className={index<=progressIndex?'is-done':''}><span>{index<progressIndex?'✓':index+1}</span><small>{step.label}</small></div>)}</div>
  <Card className="provider-card provider-mission-brief" aria-label={t('providerJob.whatNow')}>
   <div className="provider-mission-brief-head"><div><small>{t('screen.active.3')}</small><strong>{nextAction}</strong></div><span className="provider-mission-state">{stateLabel}</span></div>
   <div className="provider-mission-brief-chips"><span>{paymentLabel}</span><span>{locationLabel}</span><span>#{s.numero??String(s.id).slice(0,8)}</span></div>
   <div className="provider-mission-brief-actions">{mapHref&&<a href={mapHref} target="_blank" rel="noreferrer">{t('screen.active.4')}</a>}<span className="provider-mission-brief-hint">{t('screen.active.5')}</span></div>
  </Card>
  <ProviderCustomerCard clientId={s.cliente_id} serviceId={s.id}/>
  <Card className="provider-card provider-job-summary">
   <div className="provider-job-problem"><small>{t('screen.active.6')}</small><h2>{s.categoria?.emoji} {s.categoria?.nombre||t('providerJob.serviceDefault')}</h2><p>{s.descripcion}</p></div>
   <div className="provider-job-facts">
    <div><small>{t('screen.active.7')}</small><strong>📍 {address}</strong>{mapHref&&<a href={mapHref} target="_blank" rel="noreferrer">{t('screen.active.8')}</a>}</div>
    {scheduledAt&&<div><small>{t('screen.active.9')}</small><strong>🗓 {scheduledLabel(scheduledAt,locale,t)}</strong></div>}
    <div><small>{t('screen.active.10')}</small><strong>{formatMoney(s.ganancia_proveedor||s.tarifa,s.moneda||'BRL')}</strong><span>{s.tarifa?t('providerJob.paymentTotal',{total:formatMoney(s.tarifa||0,s.moneda||'BRL'),commission:formatMoney(s.comision_ugo||0,s.moneda||'BRL')}):t('providerJob.amountPending')} · {d.funded?t('providerJob.paymentProtectedBy'):d.cashSelected?t('providerJob.cashPayment'):t('providerJob.paymentMethodPending')}</span></div>
   </div>
   <details className="provider-secondary-details"><summary>{t('screen.active.11')}</summary><ProviderRequestEvidence serviceId={s.id}/></details>
  </Card>

  <Card id="provider-primary-control" tabIndex={-1} className="provider-card provider-job-control-card provider-active-control" aria-label={t('providerJob.control')}>
   <small>{t('providerJob.control')} · #{s.numero??String(s.id).slice(0,8)}</small>
   {s.estado==='asignado'&&!paymentReady&&<><Button variant="primary" className="provider-primary provider-main-action" disabled>{t('screen.active.12')}</Button><div className="provider-simple-status" role="status"><strong>{t('screen.active.13')}</strong><span>{t('providerJob.paymentChoiceHelp')}</span></div></>}
   {s.estado==='asignado'&&paymentReady&&<Button variant="primary" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void d.advance('en_camino')}>{d.busy?t('providerJob.processing'):t('providerJob.going')}</Button>}
   {s.estado==='en_camino'&&<div className="provider-arrival-auto" role="status"><strong>{t('screen.active.14')}</strong><span>{t('screen.active.15')}</span><Button variant="primary" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void confirmArrival()}>{d.busy?t('providerJob.confirming'):t('providerJob.arrived')}</Button></div>}
   {s.estado==='llegado'&&!amountReady&&<div className="provider-simple-status" role="status"><strong>{t('screen.active.16')}</strong><span>{t('screen.active.17')}</span><ServiceExpansionPanel role="provider" serviceId={s.id} compact/></div>}
   {s.estado==='llegado'&&amountReady&&!paymentReady&&<div className="provider-simple-status" role="status"><strong>{t('screen.active.18')}</strong><span>{t('screen.active.19')}</span></div>}
   {s.estado==='llegado'&&amountReady&&paymentReady&&(evidence.initial?<Button variant="primary" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void d.advance('en_progreso')}>{d.busy?t('providerJob.processing'):t('providerJob.start')}</Button>:<ProviderEvidencePanel service={s} compact forceKind="antes" actionLabel={t('providerJob.start')} actionBusyLabel={t('providerJob.saving')} disabled={d.busy} onReadinessChange={setEvidence} onUploaded={()=>d.advance('en_progreso')}/>)}
   {s.estado==='en_progreso'&&!evidence.final&&<ProviderEvidencePanel service={s} compact forceKind="despues" actionLabel={t('providerJob.done')} actionBusyLabel={t('providerJob.saving')} disabled={d.busy} onReadinessChange={setEvidence} onUploaded={()=>d.completeService()}/>}
   {s.estado==='en_progreso'&&evidence.final&&<Button variant="primary" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void d.completeService()}>{d.busy?t('providerJob.processing'):t('providerJob.done')}</Button>}
   {s.estado==='en_progreso'&&d.cashSelected&&!evidence.final&&<p className="provider-action-note">{t('screen.active.20')}</p>}
   {s.estado==='esperando_aprobacion'&&<div className="provider-simple-done" role="status"><strong>{t('screen.active.21')}</strong><span>{d.cashSelected?t('providerJob.cashApproval'):t('providerJob.digitalApproval')}</span><Button variant="secondary" className="provider-secondary provider-wide" onClick={()=>flow.actions.openDispute(s.id)}>{t('screen.active.22')}</Button></div>}
   {s.estado==='disputado'&&<div className="provider-simple-done" role="status"><strong>{t('screen.active.23')}</strong><span>{t('screen.active.24')}</span><Button variant="secondary" className="provider-secondary provider-wide" onClick={()=>flow.actions.openDispute(s.id)}>{t('screen.active.25')}</Button></div>}
   {!['esperando_aprobacion','disputado','completado'].includes(s.estado)&&<Button variant="secondary" className="provider-secondary provider-wide provider-dispute-entry" onClick={()=>flow.actions.openDispute(s.id)}>{t('screen.active.26')}</Button>}
   {CANCELLABLE.has(s.estado)&&<Button variant="secondary" className="provider-secondary provider-wide" disabled={d.busy} onClick={()=>void cancelJob()}>{t('screen.active.27')}</Button>}
  </Card>

  <Card className="provider-card provider-job-chat" aria-label={t('providerJob.chatWithClient')}><div className="provider-job-chat-head"><small>{t('screen.active.28')}</small><strong>{t('screen.active.29')}</strong></div><ServiceChat role="provider" serviceId={s.id} compact/></Card>
  {s.estado==='en_progreso'&&<details className="provider-exception"><summary>{t('screen.active.30')}</summary><p>{t('screen.active.31')}</p><ServiceExpansionPanel role="provider" serviceId={s.id} compact/></details>}
  <div className="provider-sticky-step" role="status" aria-live="polite">
   <div className="provider-sticky-step-copy"><small>{t('providerJob.stickyNow',{state:stateLabel})}</small><strong>{nextAction}</strong></div>
   <button type="button" onClick={()=>{const control=document.getElementById('provider-primary-control');control?.scrollIntoView({behavior:'smooth',block:'center'});control?.focus({preventScroll:true})}}>{t('screen.active.32')}</button>
  </div>
 {dialog}
 </section>
}
