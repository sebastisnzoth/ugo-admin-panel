import React,{useEffect}from'react'
import{ServiceHistoryPanel}from'../ServiceHistoryPanel'
import{DisputeDock}from'../DisputeDock'
import{AppLocationButton}from'../AppLocationButton'
import{ProviderLocationTracker}from'../ProviderLocationTracker'
import{NotificationCenter,type UgoNotification}from'../NotificationCenter'
import{useProviderFlow}from'./providerFlow'
import{ProviderDataProvider,useProviderData,money}from'./providerData'
import{ProviderHome}from'./ProviderHome'
import{ProviderDemand}from'./ProviderDemand'
import{ProviderOpportunities,ProviderOpportunityDetail}from'./ProviderOpportunities'
import{ProviderActiveJob}from'./ProviderActiveJob'
import'./provider-flow.css'

export function ProviderRoot(){return <ProviderDataProvider><ProviderOperationalRoot/></ProviderDataProvider>}

function ProviderOperationalRoot(){
 const flow=useProviderFlow(),data=useProviderData()
 useEffect(()=>flow.registerActions({openHome:()=>flow.navigate('home'),openDemand:()=>flow.navigate('demand'),openOpportunities:()=>flow.navigate('opportunities'),openOpportunity:id=>flow.navigate('opportunity-detail',id),acceptOpportunity:async id=>{const ok=await data.acceptOpportunity(id);if(ok)flow.navigate('active-job');return ok},rejectOpportunity:async id=>{const ok=await data.rejectOpportunity(id);if(ok)flow.navigate('opportunities');return ok},openActiveJob:()=>flow.navigate('active-job'),openEarnings:()=>flow.navigate('earnings'),openProfile:()=>flow.navigate('profile'),openHistory:()=>flow.navigate('history'),openDispute:()=>flow.navigate('dispute')}),[data.acceptOpportunity,data.rejectOpportunity,flow.navigate,flow.registerActions])
 const screen=flow.screen
 const opportunityScreen=screen==='opportunities'||screen==='opportunity-detail'
 const openNotice=(notice:UgoNotification)=>{const offerId=typeof notice.datos.oferta_id==='string'?notice.datos.oferta_id:null;if(notice.tipo==='nueva_oferta')return offerId?flow.actions.openOpportunity(offerId):flow.actions.openOpportunities();if(notice.tipo.includes('disputa'))return flow.actions.openDispute();if(notice.tipo==='pago_liberado')return flow.actions.openEarnings();if(notice.tipo==='servicio_completado'||notice.tipo==='servicio_cancelado')return flow.actions.openHistory();return data.service?flow.actions.openActiveJob():flow.actions.openHome()}
 return <div className="ugo-provider-root">{data.notice&&<div className={`provider-notice ${data.notice.type}`} role="status">{data.notice.text}</div>}<NotificationCenter role="provider" onOpenNotice={openNotice}/>{screen==='home'&&<ProviderHome/>}{screen==='demand'&&<ProviderDemand/>}{screen==='opportunities'&&<ProviderOpportunities/>}{screen==='opportunity-detail'&&<ProviderOpportunityDetail id={flow.opportunityId}/>} {screen==='active-job'&&<ProviderActiveJob/>}{screen==='earnings'&&<section className="provider-screen"><span className="provider-kicker">GANANCIAS</span><h1>Tu dinero</h1><div className="provider-grid"><article className="provider-card"><small>PROTEGIDO</small><strong>{money(data.retained)}</strong></article><article className="provider-card"><small>LIBERADO</small><strong>{money(data.released)}</strong></article></div></section>}{screen==='profile'&&<section className="provider-screen"><span className="provider-kicker">PERFIL PROFESIONAL</span><h1>{data.name}</h1><article className="provider-card"><strong>⭐ {data.karma.toFixed(1)}</strong><p>{data.provider.ciudad_base||'Ciudad no definida'}</p><p>Radio de trabajo: {data.provider.zona_radio_km||15} km</p></article></section>}<ServiceHistoryPanel role="provider" openRequest={screen==='history'}/><DisputeDock role="provider" openRequest={screen==='dispute'}/><ProviderLocationTracker service={data.service}/><AppLocationButton role="provider"/><nav className="provider-bottom-nav" aria-label="Navegación proveedor"><button className={screen==='home'?'active':''} onClick={flow.actions.openHome}>Inicio</button><button className={opportunityScreen?'active':''} onClick={flow.actions.openOpportunities}>Oportunidades{data.opportunities.length>0&&<b className="provider-nav-badge" aria-label={`${data.opportunities.length} oportunidades`}>{data.opportunities.length}</b>}</button><button className={screen==='active-job'||screen==='history'?'active':''} onClick={data.service?flow.actions.openActiveJob:flow.actions.openHistory}>Actividad</button><button className={screen==='profile'?'active':''} onClick={flow.actions.openProfile}>Perfil</button></nav></div>
}
