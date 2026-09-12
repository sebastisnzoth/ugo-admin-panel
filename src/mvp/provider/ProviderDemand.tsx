import React from'react'
import{useProviderFlow}from'./providerFlow'
import{useProviderData,money,timeAgo}from'./providerData'
import{ProviderDemandMap}from'./ProviderDemandMap'

export function ProviderDemand(){
 const flow=useProviderFlow(),d=useProviderData()
 return <section className="provider-screen" aria-labelledby="provider-demand-title">
  <header className="provider-section-head"><div><span className="provider-kicker">RADAR UGO</span><h1 id="provider-demand-title">Demanda</h1><p>¿Dónde hay trabajo para vos ahora?</p></div><button className="provider-link" type="button" onClick={()=>void d.reload()} disabled={d.busy}>Actualizar</button></header>
  {!d.online&&<article className="provider-card provider-demand-offline"><strong>Estás Offline</strong><span>Podés explorar el radar, pero activá Online desde Inicio para recibir oportunidades nuevas.</span></article>}
  <ProviderDemandMap signals={d.demand} online={d.online}/>
  {d.demandError&&<article className="provider-card provider-demand-error" role="alert"><strong>No se pudo actualizar la demanda</strong><span>{d.demandError}</span><button className="provider-secondary" onClick={()=>void d.reload()}>Reintentar</button></article>}
  <div className="provider-list">{!d.demandError&&d.demand.length===0?<article className="provider-card"><strong>Sin demanda compatible ahora</strong><span>UGO actualiza el radar automáticamente mientras estás Online.</span></article>:d.demand.map(item=><article className="provider-card" key={item.id}><strong>{item.demandLevel==='high'?'Alta demanda':item.demandLevel==='medium'?'Demanda media':'Demanda baja'} · {item.category}</strong><span>{item.zone}{item.distanceKm>0?` · ${item.distanceKm.toFixed(1)} km`:''}</span><span>{item.latitude!=null&&item.longitude!=null?'Zona geográfica disponible en el radar':'Zona sin coordenadas publicadas'}</span><span>{timeAgo(item.requestedAt)}{item.estimatedValue?` · ${money(item.estimatedValue)}`:''}</span></article>)}</div>
  <button className="provider-primary provider-wide" onClick={flow.actions.openOpportunities} disabled={d.opportunities.length===0}>Ver {d.opportunities.length||''} oportunidades concretas</button>
 </section>
}
