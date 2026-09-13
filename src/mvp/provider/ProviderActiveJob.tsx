import React,{useState}from'react'
import{ServiceExpansionPanel}from'../ServiceExpansionPanel'
import{useProviderData,money}from'./providerData'
import{useProviderFlow}from'./providerFlow'
import{ProviderEvidencePanel}from'./ProviderEvidencePanel'
import{ProviderRequestEvidence}from'./ProviderRequestEvidence'

const STATE_LABEL:Record<string,string>={asignado:'Listo para ir',en_camino:'Vas al cliente',llegado:'Ya estás en el lugar',en_progreso:'Resolvé el problema',esperando_aprobacion:'Trabajo listo',completado:'Completado'}
function scheduledLabel(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'Horario programado':date.toLocaleString('es-AR',{weekday:'long',day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit'})}

export function ProviderActiveJob(){
 const d=useProviderData(),flow=useProviderFlow(),s=d.service
 const[evidence,setEvidence]=useState({initial:false,final:false})
 if(!s)return <section className="provider-screen provider-empty-screen"><span className="provider-kicker">TRABAJO</span><h1>No tenés un trabajo activo</h1><p>Cuando aparezca un pedido, mirá el problema y aceptalo si lo podés resolver.</p><button type="button" className="provider-primary provider-wide" onClick={flow.actions.openOpportunities}>Ver pedidos</button></section>
 const scheduledAt=(s as{programado_para?:string|null}).programado_para||null
 const paymentReady=d.funded||d.cashSelected
 const address=s.direccion_cliente||'Dirección por confirmar'
 const mapHref=s.direccion_cliente?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.direccion_cliente)}`:null
 const stateLabel=STATE_LABEL[s.estado]||s.estado.replaceAll('_',' ')
 return <section className="provider-screen provider-active-job" aria-labelledby="provider-job-title">
  <header className="provider-mission-head"><span className="provider-kicker">TRABAJO ACTIVO</span><h1 id="provider-job-title">{stateLabel}</h1></header>
  <article className="provider-card provider-problem-card"><small>QUÉ HAY QUE RESOLVER</small><h2>{s.categoria?.emoji} {s.categoria?.nombre||'Servicio'}</h2><p>{s.descripcion}</p><details className="provider-secondary-details"><summary>Ver fotos o detalles del cliente</summary><ProviderRequestEvidence serviceId={s.id}/></details></article>
  <article className="provider-card provider-location-card"><small>DÓNDE</small><strong>📍 {address}</strong>{scheduledAt&&<span>🗓 {scheduledLabel(scheduledAt)}</span>}{mapHref&&<a href={mapHref} target="_blank" rel="noreferrer">Cómo llegar →</a>}</article>
  <div className="provider-mission-meta"><span>{money(s.ganancia_proveedor||s.tarifa,s.moneda)}</span>{d.funded?<small>Pago protegido por UGO</small>:d.cashSelected?<small>Pago en efectivo</small>:<small>Forma de pago pendiente</small>}</div>
  {s.estado==='asignado'&&!paymentReady&&<div className="provider-simple-status" role="status"><strong>Esperando al cliente</strong><span>UGO te avisa cuando la forma de pago esté confirmada.</span></div>}
  {s.estado==='asignado'&&paymentReady&&<button type="button" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void d.advance('en_camino')}>{d.busy?'Procesando…':'ESTOY YENDO'}</button>}
  {s.estado==='en_camino'&&<div className="provider-arrival-auto" role="status"><strong>UGO detecta tu llegada automáticamente</strong><span>Seguí hasta el lugar. Si el GPS no confirma, usá el botón de respaldo.</span><button type="button" className="provider-arrival-fallback" disabled={d.busy} onClick={()=>void d.advance('llegado')}>YA LLEGUÉ</button></div>}
  {s.estado==='llegado'&&(evidence.initial?<button type="button" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void d.advance('en_progreso')}>{d.busy?'Procesando…':'EMPEZAR TRABAJO'}</button>:<ProviderEvidencePanel service={s} compact forceKind="antes" actionLabel="EMPEZAR TRABAJO" actionBusyLabel="GUARDANDO…" disabled={d.busy} onReadinessChange={setEvidence} onUploaded={()=>d.advance('en_progreso')}/>)}
  {s.estado==='en_progreso'&&(evidence.final?<button type="button" className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>void d.completeService()}>{d.busy?'Procesando…':'LISTO'}</button>:<ProviderEvidencePanel service={s} compact forceKind="despues" actionLabel="LISTO" actionBusyLabel="CERRANDO…" disabled={d.busy} onReadinessChange={setEvidence} onUploaded={()=>d.completeService()}/>)}
  {s.estado==='en_progreso'&&d.cashSelected&&<p className="provider-action-note">Al marcar LISTO confirmás que el trabajo terminó y que recibiste el efectivo acordado.</p>}
  {s.estado==='en_progreso'&&<details className="provider-exception"><summary>Cambió el trabajo o el precio</summary><p>Usá esto sólo si apareció algo nuevo que el cliente tiene que aprobar.</p><ServiceExpansionPanel role="provider" serviceId={s.id} compact/></details>}
  {s.estado==='esperando_aprobacion'&&<div className="provider-simple-done" role="status"><strong>✓ Listo de tu lado</strong><span>UGO avisó al cliente y sigue la aprobación y el cobro por detrás.</span></div>}
 </section>
}
