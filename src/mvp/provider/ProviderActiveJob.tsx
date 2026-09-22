import React,{useState}from'react'
import{ServiceExpansionPanel}from'../ServiceExpansionPanel'
import{ServiceChat}from'../ServiceChat'
import{useProviderData,money}from'./providerData'
import{useProviderFlow}from'./providerFlow'
import{ProviderEvidencePanel}from'./ProviderEvidencePanel'
import{ProviderRequestEvidence}from'./ProviderRequestEvidence'
import{Button,Card,EmptyState,SectionHeader}from'../../shared/ui'

const STATE_LABEL:Record<string,string>={asignado:'Listo para ir',en_camino:'Vas al cliente',llegado:'Ya estás en el lugar',en_progreso:'Resolvé el problema',esperando_aprobacion:'Trabajo listo',completado:'Completado'}
const FLOW_STEPS=[{state:'asignado',label:'Ir'},{state:'llegado',label:'Llegar'},{state:'en_progreso',label:'Resolver'},{state:'esperando_aprobacion',label:'Listo'}] as const
const FLOW_ORDER:Record<string,number>={asignado:0,en_camino:0,llegado:1,en_progreso:2,esperando_aprobacion:3,completado:3}
const CANCELLABLE=new Set(['asignado','en_camino','llegado'])
function scheduledLabel(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'Horario programado':date.toLocaleString('es-AR',{weekday:'long',day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit'})}

export function ProviderActiveJob(){
 const d=useProviderData(),flow=useProviderFlow(),s=d.service
 const[evidence,setEvidence]=useState({initial:false,final:false})
 if(!s)return <section className="provider-screen provider-empty-screen"><EmptyState title="No tenés un trabajo activo" description="Cuando aparezca un pedido, mirá el problema y aceptalo si lo podés resolver." action={<Button variant="primary" className="provider-primary provider-wide" onClick={flow.actions.openOpportunities}>Ver pedidos</Button>}/></section>
 const scheduledAt=(s as{programado_para?:string|null}).programado_para||null
 const paymentReady=d.funded||d.cashSelected
 const address=s.direccion_cliente||'Dirección por confirmar'
 const mapHref=s.direccion_cliente?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.direccion_cliente)}`:null
 const stateLabel=STATE_LABEL[s.estado]||s.estado.replaceAll('_',' ')
 const progressIndex=FLOW_ORDER[s.estado]??0
 const confirmArrival=async()=>{await d.advance('llegado')}
 const cancelJob=async()=>{if(d.busy||!CANCELLABLE.has(s.estado))return;if(!window.confirm('¿Realmente querés cancelar este pedido?'))return;const reason=window.prompt('Contanos brevemente por qué cancelás este pedido. El motivo queda registrado.');if(reason===null)return;if(reason.trim().length<5){window.alert('Indicá un motivo de al menos 5 caracteres para cancelar el pedido.');return}await d.cancelService(reason)}
 return <section className="provider-screen provider-active-job" aria-labelledby="provider-job-title">
  <><Button variant="ghost" className="provider-back" onClick={flow.actions.openHome}>← Inicio</Button><SectionHeader eyebrow="TRABAJO ACTIVO" title={stateLabel} description="Un paso por vez. UGO se ocupa del resto."/></>
  <div className="provider-job-progress" aria-label="Progreso del trabajo">{FLOW_STEPS.map((step,index)=><div key={step.state} className={index<=progressIndex?'is-done':''}><span>{index<progressIndex?'✓':index+1}</span><small>{step.label}</small></div>)}</div>
  <Card className="provider-card provider-job-summary">
   <div className="provider-job-problem"><small>QUÉ HAY QUE RESOLVER</small><h2>{s.categoria?.emoji} {s.categoria?.nombre||'Servicio'}</h2><p>{s.descripcion}</p></div>
   <div className="provider-job-facts">
    <div><small>DÓNDE</small><strong>📍 {address}</strong>{mapHref&&<a href={mapHref} target="_blank" rel="noreferrer">Abrir mapa →</a>}</div>
    {scheduledAt&&<div><small>CUÁNDO</small><strong>🗓 {scheduledLabel(scheduledAt)}</strong></div>}
    <div><small>COBRÁS</small><strong>{money(s.ganancia_proveedor||s.tarifa,s.moneda)}</strong><span>{s.tarifa?`Total cliente ${money(s.tarifa,s.moneda)} · Comisión UGO ${money(s.comision_ugo||0,s.moneda)}`:'Importe por confirmar'} · {d.funded?'Pago protegido por UGO':d.cashSelected?'Pago en efectivo':'Forma de pago pendiente'}</span></div>
   </div>
   <details className="provider-secondary-details"><summary>Fotos o detalles del cliente</summary><ProviderRequestEvidence serviceId={s.id}/></details>
  </Card>

  <Card className="provider-card provider-job-control-card provider-active-control" aria-label="Cambiar estado del pedido">
   <small>CONTROL DEL PEDIDO · #{s.numero??String(s.id).slice(0,8)}</small>
   {s.estado==='asignado'&&!paymentReady&&<><Button variant="primary" className="provider-primary provider-main-action" disabled>ESTOY YENDO</Button><div className="provider-simple-status" role="status"><strong>Falta confirmar la forma de pago</strong><span>El botón queda visible y se habilita automáticamente cuando UGO confirma PIX o efectivo.</span></div></>}
   {s.estado==='asignado'&&paymentReady&&<Button variant="primary" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void d.advance('en_camino')}>{d.busy?'Procesando…':'ESTOY YENDO'}</Button>}
   {s.estado==='en_camino'&&<div className="provider-arrival-auto" role="status"><strong>Seguí hasta el lugar</strong><span>UGO intenta detectar tu llegada automáticamente. Si el GPS no la confirma, el botón siempre te permite confirmarla.</span><Button variant="primary" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void confirmArrival()}>{d.busy?'Confirmando…':'YA LLEGUÉ'}</Button></div>}
   {s.estado==='llegado'&&(evidence.initial?<Button variant="primary" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void d.advance('en_progreso')}>{d.busy?'Procesando…':'EMPEZAR TRABAJO'}</Button>:<ProviderEvidencePanel service={s} compact forceKind="antes" actionLabel="EMPEZAR TRABAJO" actionBusyLabel="GUARDANDO…" disabled={d.busy} onReadinessChange={setEvidence} onUploaded={()=>d.advance('en_progreso')}/>)}
   {s.estado==='en_progreso'&&!evidence.final&&<ProviderEvidencePanel service={s} compact forceKind="despues" actionLabel="TRABAJO LISTO" actionBusyLabel="GUARDANDO…" disabled={d.busy} onReadinessChange={setEvidence} onUploaded={()=>d.completeService()}/>} 
   {s.estado==='en_progreso'&&evidence.final&&<Button variant="primary" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void d.completeService()}>{d.busy?'Procesando…':'TRABAJO LISTO'}</Button>}
   {s.estado==='en_progreso'&&d.cashSelected&&!evidence.final&&<p className="provider-action-note">Documentá el resultado y marcá “TRABAJO LISTO”. Primero confirma el cliente; el pago en efectivo viene después.</p>}
   {s.estado==='esperando_aprobacion'&&<div className="provider-simple-done" role="status"><strong>✓ Trabajo enviado al cliente</strong><span>{d.cashSelected?'Primero el cliente confirma el trabajo. Después UGO le muestra cuánto pagarte y, cuando confirme el pago, el servicio se cierra.':'El cliente ahora revisa y aprueba. UGO sigue el cierre y el cobro por detrás.'}</span></div>}
   {CANCELLABLE.has(s.estado)&&<Button variant="secondary" className="provider-secondary provider-wide" disabled={d.busy} onClick={()=>void cancelJob()}>Cancelar este pedido</Button>}
  </Card>

  <Card className="provider-card provider-job-chat" aria-label="Chat con el cliente"><div className="provider-job-chat-head"><small>CHAT DEL PEDIDO</small><strong>Cliente ↔ Proveedor</strong></div><ServiceChat role="provider" serviceId={s.id} compact/></Card>
  {s.estado==='en_progreso'&&<details className="provider-exception"><summary>Cambió el trabajo o el precio</summary><p>Usalo sólo si apareció algo nuevo que el cliente tiene que aprobar.</p><ServiceExpansionPanel role="provider" serviceId={s.id} compact/></details>}
 </section>
}
