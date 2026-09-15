import React from'react'
import{AppLocationButton}from'../AppLocationButton'
import{DemoSebastianPaymentBridge}from'../DemoSebastianPaymentBridge'
import{ServiceHistoryPanel}from'../ServiceHistoryPanel'
import{DisputeDock}from'../DisputeDock'
import{ClientGlobalMenu}from'../ClientGlobalMenu'
import{ClientCompletionReview}from'../ClientCompletionReview'
import{ClientLiveTracking}from'../ClientLiveTracking'
import{NotificationCenter,type UgoNotification}from'../NotificationCenter'
import{ServiceExpansionPanel}from'../ServiceExpansionPanel'
import{ServiceChat}from'../ServiceChat'
import{ClientOnboardingGate}from'../ClientOnboardingGate'
import{ClientFlowActionsBridge}from'./ClientFlowActionsBridge'
import{ClientGuidedRequest}from'./ClientGuidedRequest'
import{ClientHugoBridge}from'./ClientHugoBridge'
import{ClientPaymentChoice}from'./ClientPaymentChoice'
import{ClientPremiumHome}from'./ClientPremiumHome'
import{ClientProfilePanel}from'./ClientProfilePanel'
import{ClientProviderRadarBridge}from'./ClientProviderRadarBridge'
import{useClientFlow}from'./clientFlow'
import'./client-guided-request.css'
import'./client-payment-choice.css'
import'./client-responsive-layout.css'
import'./client-conversational-stage.css'
import'./client-web-conversational.css'
import'./client-visual-polish.css'
import'./client-guided-request-redesign.css'
import'./client-guided-request-review.css'
import'./client-redesign-2026.css'
import'./client-stitch-orb-home.css'
import'./client-stitch-radar.css'

type Props={demo:boolean}

export function ClientRoot({demo}:Props){
 const flow=useClientFlow()
 const openNotice=(notice:UgoNotification)=>{if(notice.tipo.includes('disputa'))return flow.actions.openDispute();if(notice.tipo==='servicio_completado')return flow.actions.openReview();flow.navigate('home')}
 return <ClientOnboardingGate><div className={`ugo-client-root screen-${flow.screen}`}><ClientFlowActionsBridge/>{demo&&<DemoSebastianPaymentBridge/>}<ClientPremiumHome/>{flow.screen==='request'&&<ClientGuidedRequest key={flow.providerId||'default'}/>} {flow.screen!=='request'&&<ClientHugoBridge/>}<ClientPaymentChoice/><ClientGlobalMenu/><NotificationCenter role="client" onOpenNotice={openNotice}/><ClientLiveTracking/><ClientCompletionReview onOpenDispute={flow.actions.openDispute}/><ServiceExpansionPanel role="client"/><ServiceChat role="client"/><DisputeDock role="client" openRequest={flow.screen==='dispute'}/><AppLocationButton role="client"/><ClientProviderRadarBridge/>{flow.screen==='history'&&<div className="ugo-client-screen-overlay"><div className="ugo-client-history-wrap"><button type="button" onClick={()=>flow.navigate('home')} style={{width:44,height:44,borderRadius:14,border:'1px solid #2d4357',background:'#102335',color:'#f6fbff',fontSize:20,marginBottom:10}} aria-label="Volver">←</button><ServiceHistoryPanel role="client" embedded/></div></div>}{flow.screen==='profile'&&<ClientProfilePanel/>}</div></ClientOnboardingGate>
}
