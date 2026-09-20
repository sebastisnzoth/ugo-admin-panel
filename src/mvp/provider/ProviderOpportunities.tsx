import React from'react'
import{useProviderFlow}from'./providerFlow'
import{useProviderData,money}from'./providerData'
import{ProviderRequestEvidence}from'./ProviderRequestEvidence'
import type{ProviderOpportunity}from'./providerTypes'

function rankOpportunity(item:ProviderOpportunity){const urgent=item.urgency==='urgent'?1000:0,match=Number(item.matchScore||0)*4,value=Math.min(Number(item.estimatedValue||0),1000)/20,distance=Math.min(Math.max(item.distanceKm,0),50)*6;return urgent+match+value-distance}
function scheduleLabel(item:ProviderOpportunity){if(item.urgency==='urgent'&&!item.scheduledAt)return'Lo antes posible';if(!item.scheduledAt)return'A coordinar';const date=new Date(item.scheduledAt);return Number.isNaN(date.getTime())?'A coordinar':date.toLocaleString('es-AR',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}

export function ProviderOpportunities(){
 const flow=useProviderFlow(),d=useProviderData(),items=[...d.opportunities].sort((a,b)=>rankOpportunity(b)-rankOpportunity(a))
 return <section className="provider-screen provider-opportunities-simple" aria-labelledby="provider-opportunities-title">
  <header className="provider-section-head"><div><span className="provider-kicker">PEDIDOS PARA VOS</span><h1 id="provider-opportunities-title">Elegí qué resolver</h1><p>Primero el problema. Después dónde, cuándo y cuánto.</p></div><button className="provider-link" type="button" onClick={flow.actions.openDemand}>Radar</button></header>
  {d.debtBlocked?<article className="provider-card provider-debt-lock"><strong>Nuevos pedidos pausados</strong><span>Tenés {d.pendingDebtCount} servicios con comisión UGO pendiente. Pagá a UGO para volver a recibir y aceptar trabajos.</span><button type="button" className="provider-primary provider-wide" onClick={flow.actions.openEarnings}>PAGAR UGO</button></article>:<div className="provider-list">{items.length===0?<article className="provider-card provider-empty"><strong>No hay pedidos ahora</strong><span>{d.online?'UGO te avisa apenas aparezca uno compatible.':'Ponete Online desde Inicio para recibir pedidos.'}</span></article>:items.map(item=><article className="provider-card provider-opportunity-simple" key={item.id}>
   <div className="provider-opportunity-meta"><span className="provider-chip">{item.category}</span>{item.urgency==='urgent'&&<span className="provider-chip is-urgent">Urgente</span>}</div>
   <h2>{item.title}</h2>
   <div className="provider-opportunity-facts">
    <div><small>DÓNDE</small><strong>{item.zone}{item.distanceKm>0?` · ${item.distanceKm.toFixed(1)} km`:''}</strong></div>
    <div><small>CUÁNDO</small><strong>{scheduleLabel(item)}</strong></div>
    <div><small>VALOR</small><strong>{money(item.estimatedValue)}</strong></div>
   </div>
   <button className="provider-primary provider-wide" onClick={()=>flow.actions.openOpportunity(item.id)}>Ver y decidir</button>
  </article>)}</div>}
 </section>
}

export function ProviderOpportunityDetail({id}:{id:string|null}){
 const flow=useProviderFlow(),d=useProviderData(),item=d.opportunities.find(opportunity=>opportunity.id===id)
 if(d.debtBlocked)return <section className="provider-screen provider-opportunity-detail"><button className="provider-back" onClick={flow.actions.openOpportunities}>← Pedidos</button><span className="provider-kicker">COMISIONES UGO</span><h1>Pagá a UGO para aceptar otro trabajo</h1><p>Tenés {d.pendingDebtCount} servicios con comisión pendiente. El límite es 3.</p><button type="button" className="provider-primary provider-wide" onClick={flow.actions.openEarnings}>PAGAR UGO</button></section>
 if(!item)return <section className="provider-screen"><button className="provider-back" onClick={flow.actions.openOpportunities}>← Pedidos</button><h1>Este pedido ya no está disponible</h1><p>Puede haber sido tomado, cancelado o actualizado.</p></section>
 return <section className="provider-screen provider-opportunity-detail provider-opportunity-decision">
  <button className="provider-back" onClick={flow.actions.openOpportunities}>← Pedidos</button>
  <span className="provider-kicker">NUEVO PEDIDO</span><h1>¿Lo podés resolver?</h1>
  <article className="provider-card provider-offer-sheet">
   <div className="provider-opportunity-meta"><span className="provider-chip">{item.category}</span>{item.urgency==='urgent'&&<span className="provider-chip is-urgent">Urgente</span>}</div>
   <div className="provider-offer-problem"><small>EL PROBLEMA</small><p>{item.description||item.title}</p></div>
   <div className="provider-decision-facts">
    <div><small>DÓNDE</small><strong>{item.zone}{item.distanceKm>0?` · ${item.distanceKm.toFixed(1)} km`:''}</strong></div>
    <div><small>CUÁNDO</small><strong>{scheduleLabel(item)}</strong></div>
    <div><small>VALOR</small><strong>{money(item.estimatedValue)}</strong></div>
   </div>
   {item.preferences&&<details className="provider-secondary-details"><summary>Indicaciones del cliente</summary><p>{item.preferences}</p></details>}
   <details className="provider-secondary-details"><summary>Fotos o archivos del pedido</summary><ProviderRequestEvidence serviceId={item.serviceId}/></details>
  </article>
  <div className="provider-decision provider-decision-bar">
   {d.service&&<p className="provider-action-note">Ya tenés un trabajo activo. Podés aceptar este también: UGO lo agrega a tu agenda sin interrumpir el que estás haciendo.</p>}
   <button className="provider-primary provider-main-action" disabled={d.busy} onClick={()=>flow.actions.acceptOpportunity(item.id)}>{d.busy?'Procesando…':'ACEPTAR TRABAJO'}</button>
   <button className="provider-reject provider-wide" disabled={d.busy} onClick={()=>flow.actions.rejectOpportunity(item.id)}>No puedo tomarlo</button>
  </div>
 </section>
}
