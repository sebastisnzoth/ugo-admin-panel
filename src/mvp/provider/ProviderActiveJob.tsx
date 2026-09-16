import React,{useMemo,useState}from'react'
import{getRoleSupabase}from'../../lib/roleSupabase'
import{ServiceExpansionPanel}from'../ServiceExpansionPanel'
import{ServiceChat}from'../ServiceChat'
import{useProviderData,money}from'./providerData'
import{useProviderFlow}from'./providerFlow'
import{ProviderEvidencePanel}from'./ProviderEvidencePanel'
import{ProviderRequestEvidence}from'./ProviderRequestEvidence'

const STATE_LABEL:Record<string,string>={asignado:'Listo para ir',en_camino:'Vas al cliente',llegado:'Ya estás en el lugar',en_progreso:'Resolvé el problema',esperando_aprobacion:'Trabajo listo',completado:'Completado'}
const FLOW_STEPS=[{state:'asignado',label:'Ir'},{state:'llegado',label:'Llegar'},{state:'en_progreso',label:'Resolver'},{state:'esperando_aprobacion',label:'Listo'}] as const
const FLOW_ORDER:Record<string,number>={asignado:0,en_camino:0,llegado:1,en_progreso:2,esperando_aprobacion:3,completado:3}
function scheduledLabel(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'Horario programado':date.toLocaleString('es-AR',{weekday:'long',day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit'})}

export function ProviderActiveJob(){
 const d=useProviderData(),flow=useProviderFlow(),s=d.service,supabase=useMemo(()=>getRoleSupabase('provider'),[])
 const[evidence,setEvidence]=useState({initial:false,final:false})
 if(!s)return <section className="provider-screen provider-empty-screen"><span className="provider-kicker">TRABAJO</span><h1>No tenés un trabajo activo</h1><p>Cuando aparezca un pedido, mirá el problema y aceptalo si lo podés resolver.</p><button type="button" className="provider-primary provider-wide" onClick={flow.actions.openOpportunities}>Ver pedidos</button></section>
 const scheduledAt=(s as{programado_para?:string|null}).programado_para||null
 const paymentReady=d.funded||d.cashSelected
 const address=s.direccion_cliente||'Dirección por confirmar'
 const mapHref=s.direccion_cliente?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.direccion_cliente)}`:null
 const stateLabel=STATE_LABEL[s.estado]||s.estado.replaceAll('_',' ')
 const progressIndex=FLOW_ORDER[s.estado]??0
 const confirmArrival=async()=>{const normal=await d.advance('llegado');if(normal)return;const{error}=await supabase.rpc('avanzar_servicio',{p_servicio_id:s.id,p_estado:'llegado'});if(!error)await d.reload()}
 return <section className="provider-screen provider-active-job" aria-labelledby="provider-job-title">
  <header className="provider-mission-head"><button type="button" className="provider-back" onClick={flow.actions.openHome}>← Inicio</button><span className="provider-kicker">TRABAJO ACTIVO</span><h1 id="provider-job-title">{stateLabel}</h1><p>Un paso por vez. UGO se ocupa del resto.</p></header>
  <div className="provider-job-progress" aria-label="Progreso del trabajo">{FLOW_STEPS.map((step,index)=><div key={step.state} className={index<=progressIndex?'is-done':''}><span>{index<progressIndex?'✓':index+1}</span><small>{step.label}</small></div>)}</div>
  <article className="provider-card provider-job-summary">
   <div className="provider-job-problem"><small>QUÉ HAY QUE RESOLVER</small><h2>{s.categoria?.emoji} {s.categoria?.nombre||'Servicio'}</h2><p>{s.descripcion}</p></div>
   <div className="provider-job-facts">
    <div><small>DÓNDE</small><strong>📍 {address}</strong>{mapHref&&<a href={mapHref} target="_blank" rel="noreferrer">Abrir mapa →</a>}</div>
    {scheduledAt&&<div><small>CUÁNDO</small><strong>🗓 {scheduledLabel(scheduledAt)}</strong></div>}
    <div><small>VALOR</small><strong>{money(s.ganancia_proveedor||s.tarifa,s.moneda)}</strong><span>{d.funded?'Pago protegido por UGO':d.cashSelected?'Pago en efectivo':'Forma de pago pendiente'}</span></div>
   </div>
   <details className="provider-secondary-details"><summary>Fotos o detalles del cliente</summary><ProviderRequestEvidence serviceId={s.id}/></details>
  </article>
  <section className="provider-card provider-job-chat" aria-label="Chat con el cliente"><div className="provider-job-chat-head"><small>CHAT DEL PEDIDO</small><strong>Cliente ↔ Proveedor</strong></div><ServiceChat role="provider" serviceId={s.id} compact/></section>
  <div className="provider-job-action">
   {s.estado==='asignado'&&!paymentReady&&<div className="provider-simple-status" role="status"><strong>Esperando al cliente</strong><span>UGO te avisa cuando la forma de pago esté confirmada.</span></div>}
   {s.estado==='asignado'&&paymentReady&&<button type="button" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void d.advance('en_camino')}>{d.busy?'Procesando…':'ESTOY YENDO'}</button>}
   {s.estado==='en_camino'&&<div className="provider-arrival-auto" role="status"><strong>Seguí hasta el lugar</strong><span>UGO usa el GPS como ayuda, pero el botón siempre debe permitirte confirmar la llegada.</span><button type="button" className="provider-arrival-fallback" disabled={d.busy} onClick={()=>void confirmArrival()}>YA LLEGUÉ</button></div>}
   {s.estado==='llegado'&&(evidence.initial?<button type="button" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void d.advance('en_progreso')}>{d.busy?'Procesando…':'EMPEZAR TRABAJO'}</button>:<ProviderEvidencePanel service={s} compact forceKind="antes" actionLabel="EMPEZAR TRABAJO" actionBusyLabel="GUARDANDO…" disabled={d.busy} onReadinessChange={setEvidence} onUploaded={()=>d.advance('en_progreso')}/>)}
   {s.estado==='en_progreso'&&(evidence.final?<button type="button" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void d.completeService()}>{d.busy?'Procesando…':'TRABAJO LISTO'}</button>:<ProviderEvidencePanel service={s} compact forceKind="despues" actionLabel="TRABAJO LISTO" actionBusyLabel="CERRANDO…" disabled={d.busy} onReadinessChange={setEvidence} onUploaded={()=>d.completeService()}/>)}
   {s.estado==='en_progreso'&&d.cashSelected&&<p className="provider-action-note">Al marcar TRABAJO LISTO confirmás que terminaste y que recibiste el efectivo acordado.</p>}
   {s.estado==='esperando_aprobacion'&&<div className="provider-simple-done" role="status"><strong>✓ Listo de tu lado</strong><span>El cliente ahora revisa y aprueba. UGO sigue el cierre y el cobro por detrás.</span></div>}
  </div>
  {s.estado==='en_progreso'&&<details className="provider-exception"><summary>Cambió el trabajo o el precio</summary><p>Usalo sólo si apareció algo nuevo que el cliente tiene que aprobar.</p><ServiceExpansionPanel role="provider" serviceId={s.id} compact/></details>}
 </section>
}
