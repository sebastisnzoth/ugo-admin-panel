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
import{ClientOnboardingGate}from'../ClientOnboardingGate'
import{ClientFlowActionsBridge}from'./ClientFlowActionsBridge'
import{ClientGuidedRequest}from'./ClientGuidedRequest'
import{ClientPaymentChoice}from'./ClientPaymentChoice'
import{ClientPremiumHome}from'./ClientPremiumHome'
import{ClientProfilePanel}from'./ClientProfilePanel'
import{useClientFlow}from'./clientFlow'
import'./client-guided-request.css'
import'./client-payment-choice.css'

type Props={demo:boolean}

export function ClientRoot({demo}:Props){
 const flow=useClientFlow()
 const openNotice=(notice:UgoNotification)=>{if(notice.tipo.includes('disputa'))return flow.actions.openDispute();if(notice.tipo==='servicio_completado')return flow.actions.openReview();flow.navigate('home')}
 return <ClientOnboardingGate><div className="ugo-client-root"><ClientFlowActionsBridge/>{demo&&<DemoSebastianPaymentBridge/>}<ClientPremiumHome/><ClientGuidedRequest/><ClientPaymentChoice/><ClientGlobalMenu/><NotificationCenter role="client" onOpenNotice={openNotice}/><ClientLiveTracking/><ClientCompletionReview onOpenDispute={flow.actions.openDispute}/><ServiceExpansionPanel role="client"/><DisputeDock role="client" openRequest={flow.screen==='dispute'}/><AppLocationButton role="client"/>{flow.screen==='history'&&<div className="ugo-client-screen-overlay"><div style={{maxWidth:430,margin:'0 auto',padding:'12px 12px 28px'}}><button type="button" onClick={()=>flow.navigate('home')} style={{width:44,height:44,borderRadius:14,border:'1px solid #2d4357',background:'#102335',color:'#f6fbff',fontSize:20,marginBottom:10}} aria-label="Volver">←</button><ServiceHistoryPanel role="client" embedded/></div></div>}{flow.screen==='profile'&&<ClientProfilePanel/>}</div></ClientOnboardingGate>
}
