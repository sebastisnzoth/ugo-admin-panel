import{useLocale}from'../../i18n/locale'
import{ProviderCustomerCard}from'./ProviderCustomerCard'
import React,{useState}from'react'
import{ServiceExpansionPanel}from'../ServiceExpansionPanel'
import{ServiceChat}from'../ServiceChat'
import{useProviderData,money}from'./providerData'
import{useProviderFlow}from'./providerFlow'
import{ProviderEvidencePanel}from'./ProviderEvidencePanel'
import{ProviderRequestEvidence}from'./ProviderRequestEvidence'
import{Button,Card,EmptyState,SectionHeader}from'../../shared/ui'
import{useDialog}from'../dialogs'

const STATE_LABEL:Record<string,string>={asignado:'Listo para ir',en_camino:'Vas al cliente',llegado:'Ya estás en el lugar',en_progreso:'Resolvé el problema',esperando_aprobacion:'Trabajo listo',disputado:'En disputa',completado:'Completado'}
const FLOW_STEPS=[{state:'asignado',label:'Ir'},{state:'llegado',label:'Llegar'},{state:'en_progreso',label:'Resolver'},{state:'esperando_aprobacion',label:'Listo'}] as const
const FLOW_ORDER:Record<string,number>={asignado:0,en_camino:0,llegado:1,en_progreso:2,esperando_aprobacion:3,disputado:3,completado:3}
const CANCELLABLE=new Set(['asignado','en_camino','llegado'])
function scheduledLabel(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'Horario programado':date.toLocaleString('es-AR',{weekday:'long',day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit'})}

export function ProviderActiveJob(){
 const{t}=useLocale()
 const d=useProviderData(),flow=useProviderFlow(),s=d.service
const{confirm,prompt,alert,node:dialog}=useDialog()
 const[evidence,setEvidence]=useState({initial:false,final:false})
 if(!s)return <section className="provider-screen provider-empty-screen"><EmptyState title="No tenés un trabajo activo" description="Cuando aparezca un pedido, mirá el problema y aceptalo si lo podés resolver." action={<Button variant="primary" className="provider-primary provider-wide" onClick={flow.actions.openOpportunities}>{t('screen.active.1')}</Button>}/></section>
 const scheduledAt=(s as{programado_para?:string|null}).programado_para||null
 const paymentReady=d.funded||d.cashSelected||d.paymentPreferenceSelected
 const amountReady=Number(s.tarifa||0)>0
 const address=s.direccion_cliente||'Dirección por confirmar'
 const mapHref=s.direccion_cliente?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.direccion_cliente)}`:null
 const stateLabel=STATE_LABEL[s.estado]||s.estado.replaceAll('_',' ')
 const progressIndex=FLOW_ORDER[s.estado]??0
 const nextAction=s.estado==='asignado'
  ?(paymentReady?'Salí hacia el cliente':'Esperá la confirmación del pago')
  :s.estado==='en_camino'
   ?'Llegá al lugar y confirmá tu llegada'
   :s.estado==='llegado'
    ?(!amountReady?'Definí el importe antes de empezar':!paymentReady?'Esperá la confirmación del pago':evidence.initial?'Empezá el trabajo':'Sacá la foto inicial')
    :s.estado==='en_progreso'
     ?(evidence.final?'Marcá el trabajo listo':'Sacá la foto final')
     :s.estado==='esperando_aprobacion'
      ?'Esperá la aprobación del cliente'
      :s.estado==='disputado'?'Seguí la disputa':'Revisá el estado del servicio'
 const paymentLabel=d.funded?'Pago protegido':d.cashSelected?'Efectivo':d.paymentPreferenceSelected?'Forma elegida · importe pendiente':'Pago pendiente'
 const locationLabel=s.estado==='en_camino'?'GPS activo':s.estado==='llegado'||s.estado==='en_progreso'?'Ubicación confirmada':'Ubicación lista'
 const confirmArrival=async()=>{await d.advance('llegado')}
 const cancelJob=async()=>{if(d.busy||!CANCELLABLE.has(s.estado))return;if(!await confirm({title:'Cancelar pedido',message:'¿Realmente querés cancelar este pedido?',danger:true}))return;const reason=await prompt({title:'Cancelar pedido',message:'Contanos brevemente por qué cancelás este pedido. El motivo queda registrado.',label:'Motivo de cancelación',required:true});if(reason===null)return;if(reason.trim().length<5){await alert({title:'Cancelar pedido',message:'Indicá un motivo de al menos 5 caracteres para cancelar el pedido.'});return}await d.cancelService(reason)}
 return <section className="provider-screen provider-active-job" aria-labelledby="provider-job-title">
  <><Button variant="ghost" className="provider-back" onClick={flow.actions.openHome}>{t('screen.active.2')}</Button><SectionHeader eyebrow="TRABAJO ACTIVO" title={stateLabel} description="Un paso por vez. UGO se ocupa del resto."/></>
  <div className="provider-job-progress" aria-label="Progreso del trabajo">{FLOW_STEPS.map((step,index)=><div key={step.state} className={index<=progressIndex?'is-done':''}><span>{index<progressIndex?'✓':index+1}</span><small>{step.label}</small></div>)}</div>
  <Card className="provider-card provider-mission-brief" aria-label="Qué hacer ahora">
   <div className="provider-mission-brief-head"><div><small>{t('screen.active.3')}</small><strong>{nextAction}</strong></div><span className="provider-mission-state">{stateLabel}</span></div>
   <div className="provider-mission-brief-chips"><span>{paymentLabel}</span><span>{locationLabel}</span><span>#{s.numero??String(s.id).slice(0,8)}</span></div>
   <div className="provider-mission-brief-actions">{mapHref&&<a href={mapHref} target="_blank" rel="noreferrer">{t('screen.active.4')}</a>}<span className="provider-mission-brief-hint">{t('screen.active.5')}</span></div>
  </Card>
  <ProviderCustomerCard clientId={s.cliente_id} serviceId={s.id}/>
  <Card className="provider-card provider-job-summary">
   <div className="provider-job-problem"><small>{t('screen.active.6')}</small><h2>{s.categoria?.emoji} {s.categoria?.nombre||'Servicio'}</h2><p>{s.descripcion}</p></div>
   <div className="provider-job-facts">
    <div><small>{t('screen.active.7')}</small><strong>📍 {address}</strong>{mapHref&&<a href={mapHref} target="_blank" rel="noreferrer">{t('screen.active.8')}</a>}</div>
    {scheduledAt&&<div><small>{t('screen.active.9')}</small><strong>🗓 {scheduledLabel(scheduledAt)}</strong></div>}
    <div><small>{t('screen.active.10')}</small><strong>{money(s.ganancia_proveedor||s.tarifa,s.moneda)}</strong><span>{s.tarifa?`Total cliente ${money(s.tarifa,s.moneda)} · Comisión UGO ${money(s.comision_ugo||0,s.moneda)}`:'Importe por confirmar'} · {d.funded?'Pago protegido por UGO':d.cashSelected?'Pago en efectivo':'Forma de pago pendiente'}</span></div>
   </div>
   <details className="provider-secondary-details"><summary>{t('screen.active.11')}</summary><ProviderRequestEvidence serviceId={s.id}/></details>
  </Card>

  <Card id="provider-primary-control" tabIndex={-1} className="provider-card provider-job-control-card provider-active-control" aria-label="Cambiar estado del pedido">
   <small>CONTROL DEL PEDIDO · #{s.numero??String(s.id).slice(0,8)}</small>
   {s.estado==='asignado'&&!paymentReady&&<><Button variant="primary" className="provider-primary provider-main-action" disabled>{t('screen.active.12')}</Button><div className="provider-simple-status" role="status"><strong>{t('screen.active.13')}</strong><span>PIX o efectivo se elige desde la app Cliente. No tenés que elegirlo vos. Cuando el cliente confirme, UGO habilita “ESTOY YENDO” automáticamente.</span></div></>}
   {s.estado==='asignado'&&paymentReady&&<Button variant="primary" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void d.advance('en_camino')}>{d.busy?'Procesando…':'ESTOY YENDO'}</Button>}
   {s.estado==='en_camino'&&<div className="provider-arrival-auto" role="status"><strong>{t('screen.active.14')}</strong><span>{t('screen.active.15')}</span><Button variant="primary" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void confirmArrival()}>{d.busy?'Confirmando…':'YA LLEGUÉ'}</Button></div>}
   {s.estado==='llegado'&&!amountReady&&<div className="provider-simple-status" role="status"><strong>{t('screen.active.16')}</strong><span>{t('screen.active.17')}</span><ServiceExpansionPanel role="provider" serviceId={s.id} compact/></div>}
   {s.estado==='llegado'&&amountReady&&!paymentReady&&<div className="provider-simple-status" role="status"><strong>{t('screen.active.18')}</strong><span>{t('screen.active.19')}</span></div>}
   {s.estado==='llegado'&&amountReady&&paymentReady&&(evidence.initial?<Button variant="primary" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void d.advance('en_progreso')}>{d.busy?'Procesando…':'EMPEZAR TRABAJO'}</Button>:<ProviderEvidencePanel service={s} compact forceKind="antes" actionLabel="EMPEZAR TRABAJO" actionBusyLabel="GUARDANDO…" disabled={d.busy} onReadinessChange={setEvidence} onUploaded={()=>d.advance('en_progreso')}/>)}
   {s.estado==='en_progreso'&&!evidence.final&&<ProviderEvidencePanel service={s} compact forceKind="despues" actionLabel="TRABAJO LISTO" actionBusyLabel="GUARDANDO…" disabled={d.busy} onReadinessChange={setEvidence} onUploaded={()=>d.completeService()}/>} 
   {s.estado==='en_progreso'&&evidence.final&&<Button variant="primary" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void d.completeService()}>{d.busy?'Procesando…':'TRABAJO LISTO'}</Button>}
   {s.estado==='en_progreso'&&d.cashSelected&&!evidence.final&&<p className="provider-action-note">{t('screen.active.20')}</p>}
   {s.estado==='esperando_aprobacion'&&<div className="provider-simple-done" role="status"><strong>{t('screen.active.21')}</strong><span>{d.cashSelected?'Primero el cliente confirma el trabajo. Después UGO le muestra cuánto pagarte y, cuando confirme el pago, el servicio se cierra.':'El cliente ahora revisa y aprueba. UGO sigue el cierre y el cobro por detrás.'}</span><Button variant="secondary" className="provider-secondary provider-wide" onClick={()=>flow.actions.openDispute(s.id)}>{t('screen.active.22')}</Button></div>}
   {s.estado==='disputado'&&<div className="provider-simple-done" role="status"><strong>{t('screen.active.23')}</strong><span>{t('screen.active.24')}</span><Button variant="secondary" className="provider-secondary provider-wide" onClick={()=>flow.actions.openDispute(s.id)}>{t('screen.active.25')}</Button></div>}
   {!['esperando_aprobacion','disputado','completado'].includes(s.estado)&&<Button variant="secondary" className="provider-secondary provider-wide provider-dispute-entry" onClick={()=>flow.actions.openDispute(s.id)}>{t('screen.active.26')}</Button>}
   {CANCELLABLE.has(s.estado)&&<Button variant="secondary" className="provider-secondary provider-wide" disabled={d.busy} onClick={()=>void cancelJob()}>{t('screen.active.27')}</Button>}
  </Card>

  <Card className="provider-card provider-job-chat" aria-label="Chat con el cliente"><div className="provider-job-chat-head"><small>{t('screen.active.28')}</small><strong>{t('screen.active.29')}</strong></div><ServiceChat role="provider" serviceId={s.id} compact/></Card>
  {s.estado==='en_progreso'&&<details className="provider-exception"><summary>{t('screen.active.30')}</summary><p>{t('screen.active.31')}</p><ServiceExpansionPanel role="provider" serviceId={s.id} compact/></details>}
  <div className="provider-sticky-step" role="status" aria-live="polite">
   <div className="provider-sticky-step-copy"><small>AHORA · {stateLabel}</small><strong>{nextAction}</strong></div>
   <button type="button" onClick={()=>{const control=document.getElementById('provider-primary-control');control?.scrollIntoView({behavior:'smooth',block:'center'});control?.focus({preventScroll:true})}}>{t('screen.active.32')}</button>
  </div>
 {dialog}
 </section>
}
