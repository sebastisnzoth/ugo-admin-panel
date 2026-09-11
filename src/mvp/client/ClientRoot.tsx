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
import{ClientGuidedRequest}from'./ClientGuidedRequest'
import{ClientHugoBridge}from'./ClientHugoBridge'
import{ClientPaymentChoice}from'./ClientPaymentChoice'
import{useClientFlow}from'./clientFlow'
import'./client-guided-request.css'
import'./client-payment-choice.css'

type Props={demo:boolean}

export function ClientRoot({demo}:Props){
 const flow=useClientFlow()
 const openNotice=(notice:UgoNotification)=>{if(notice.tipo.includes('disputa'))return flow.actions.openDispute();if(notice.tipo==='servicio_completado')return flow.actions.openReview();flow.navigate('home')}
 return <div className="ugo-client-root">{demo&&<DemoSebastianPaymentBridge/>}<ClientOnboardingGate/><ClientGuidedRequest/><ClientPaymentChoice/><ClientHugoBridge/><ClientGlobalMenu/><NotificationCenter role="client" onOpenNotice={openNotice}/><ClientLiveTracking/><ClientCompletionReview onOpenDispute={flow.actions.openDispute}/><ServiceExpansionPanel role="client"/><ServiceHistoryPanel role="client" openRequest={flow.screen==='history'}/><DisputeDock role="client" openRequest={flow.screen==='dispute'}/><AppLocationButton role="client"/></div>
}
