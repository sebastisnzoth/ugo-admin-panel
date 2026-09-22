import React from'react'
import{useProviderFlow}from'./providerFlow'
import{useProviderData,money,timeAgo}from'./providerData'
import{ProviderDemandMap}from'./ProviderDemandMap'
import{Button,Card,EmptyState,SectionHeader,StatusPill}from'../../shared/ui'

export function ProviderDemand(){
 const flow=useProviderFlow(),d=useProviderData()
 return <section className="provider-screen" aria-labelledby="provider-demand-title">
  <SectionHeader eyebrow="RADAR UGO" title="Demanda" description="¿Dónde hay trabajo para vos ahora?" actions={<Button variant="ghost" onClick={()=>void d.reload()} disabled={d.busy}>Actualizar</Button>}/>
  {!d.online&&<Card className="provider-card provider-demand-offline"><StatusPill tone="warning">Offline</StatusPill><span>Podés explorar el radar, pero activá Online desde Inicio para recibir oportunidades nuevas.</span></Card>}
  <ProviderDemandMap signals={d.demand} online={d.online}/>
  {d.demandError&&<Card className="provider-card provider-demand-error" role="alert"><EmptyState title="No se pudo actualizar la demanda" description={d.demandError} action={<Button variant="secondary" onClick={()=>void d.reload()}>Reintentar</Button>}/></Card>}
  <div className="provider-list">{!d.demandError&&d.demand.length===0?<Card className="provider-card"><EmptyState title="Sin demanda compatible ahora" description="UGO actualiza el radar automáticamente mientras estás Online."/></Card>:d.demand.map(item=><Card className="provider-card" key={item.id}><strong>{item.demandLevel==='high'?'Alta demanda':item.demandLevel==='medium'?'Demanda media':'Demanda baja'} · {item.category}</strong><span>{item.zone}{item.distanceKm>0?` · ${item.distanceKm.toFixed(1)} km`:''}</span><span>{item.latitude!=null&&item.longitude!=null?'Zona geográfica disponible en el radar':'Zona sin coordenadas publicadas'}</span><span>{timeAgo(item.requestedAt)}{item.estimatedValue?` · ${money(item.estimatedValue)}`:''}</span></Card>)}</div>
  <Button variant="primary" className="provider-primary provider-wide" onClick={flow.actions.openOpportunities} disabled={d.opportunities.length===0}>Ver {d.opportunities.length||''} oportunidades concretas</Button>
 </section>
}
