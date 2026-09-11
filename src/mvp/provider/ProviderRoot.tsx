import React,{useEffect}from'react'
import{ProviderOnboardingGate}from'../ProviderOnboardingGate'
import{ServiceHistoryPanel}from'../ServiceHistoryPanel'
import{DisputeDock}from'../DisputeDock'
import{AppLocationButton}from'../AppLocationButton'
import{useProviderFlow}from'./providerFlow'
import{ProviderHome}from'./ProviderHome'
import{ProviderDemand}from'./ProviderDemand'
import{ProviderOpportunities,ProviderOpportunityDetail}from'./ProviderOpportunities'
import'./provider-flow.css'

export function ProviderRoot(){
 const flow=useProviderFlow()
 useEffect(()=>flow.registerActions({openHome:()=>flow.navigate('home'),openDemand:()=>flow.navigate('demand'),openOpportunities:()=>flow.navigate('opportunities'),openOpportunity:id=>flow.navigate('opportunity-detail',id),openActiveJob:()=>flow.navigate('active-job'),openEarnings:()=>flow.navigate('earnings'),openProfile:()=>flow.navigate('profile'),openHistory:()=>flow.navigate('history'),openDispute:()=>flow.navigate('dispute')}),[flow.navigate,flow.registerActions])
 const screen=flow.screen
 return <div className="ugo-provider-root"><ProviderOnboardingGate/>{screen==='home'&&<ProviderHome/>}{screen==='demand'&&<ProviderDemand/>}{screen==='opportunities'&&<ProviderOpportunities/>}{screen==='opportunity-detail'&&<ProviderOpportunityDetail id={flow.opportunityId}/>}<ServiceHistoryPanel role="provider" openRequest={screen==='history'}/><DisputeDock role="provider" openRequest={screen==='dispute'}/><AppLocationButton role="provider"/><nav className="provider-bottom-nav" aria-label="Navegación proveedor"><button className={screen==='home'?'active':''} onClick={flow.actions.openHome}>Inicio</button><button className={screen==='demand'||screen==='opportunities'||screen==='opportunity-detail'?'active':''} onClick={flow.actions.openDemand}>Demanda</button><button className={screen==='active-job'||screen==='history'?'active':''} onClick={flow.actions.openHistory}>Trabajos</button><button className={screen==='profile'?'active':''} onClick={flow.actions.openProfile}>Perfil</button></nav></div>
}
