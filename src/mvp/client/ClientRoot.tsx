import React,{useState}from'react'
import{setSentinelContext,clearSentinelContext}from'../../lib/sentinel'
import{AppLocationButton}from'../AppLocationButton'
import{DemoSebastianPaymentBridge}from'../DemoSebastianPaymentBridge'
import{ServiceHistoryPanel}from'../ServiceHistoryPanel'
import{DisputeDock}from'../DisputeDock'
import{ClientGlobalMenu}from'../ClientGlobalMenu'
import{ClientCompletionReview}from'../ClientCompletionReview'
import{ClientLiveTracking}from'../ClientLiveTracking'
import{NotificationCenter,type UgoNotification}from'../NotificationCenter'
import{ServiceChat}from'../ServiceChat'
import{SentinelErrorBoundary}from'../SentinelErrorBoundary'
import{ClientOnboardingGate}from'../ClientOnboardingGate'
import{ClientFlowActionsBridge}from'./ClientFlowActionsBridge'
import{ClientGuidedRequest}from'./ClientGuidedRequest'
import{ClientHugoBridge}from'./ClientHugoBridge'
import{ClientPaymentChoice}from'./ClientPaymentChoice'
import{ClientPremiumHome}from'./ClientPremiumHome'
import{ClientProfilePanel}from'./ClientProfilePanel'
import{ClientProviderRadarBridge}from'./ClientProviderRadarBridge'
import{ClientRatingPrompt}from'./ClientRatingPrompt'
import{ClientServiceDetail}from'./ClientServiceDetail'
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
import'./client-ai-studio-adapter.css'

type Props={demo:boolean}

export function ClientRoot({demo}:Props){
 const flow=useClientFlow(),[selectedServiceId,setSelectedServiceId]=useState<string|null>(null)
 const openNotice=(notice:UgoNotification)=>{if(notice.tipo.includes('disputa'))return flow.actions.openDispute();if(notice.tipo==='servicio_completado')return flow.actions.openReview();flow.navigate('home')}
 const openService=(serviceId:string)=>{setSentinelContext({role:'client',serviceId,action:'client.activity.open_order',checklistCode:'CLIENT-ORDER-OPEN',severity:'P0'});setSelectedServiceId(serviceId)}
 const closeService=()=>{clearSentinelContext();setSelectedServiceId(null)}
 return <ClientOnboardingGate><div className="ugo-client-root"><ClientFlowActionsBridge/>{demo&&<DemoSebastianPaymentBridge/>}<ClientPremiumHome/>{flow.screen==='request'&&<ClientGuidedRequest key={flow.providerId||'default'}/>} {flow.screen!=='request'&&<ClientHugoBridge/>}<ClientPaymentChoice/><ClientGlobalMenu/><NotificationCenter role="client" onOpenNotice={openNotice}/><ClientLiveTracking/><ClientCompletionReview onOpenDispute={flow.actions.openDispute}/><ClientRatingPrompt/><ServiceChat role="client"/><DisputeDock role="client" openRequest={flow.screen==='dispute'}/><AppLocationButton role="client"/><ClientProviderRadarBridge/>{flow.screen==='history'&&<div className="ugo-client-screen-overlay"><div className="ugo-client-history-wrap"><button type="button" className="ugo-client-history-back" onClick={()=>flow.navigate('home')} aria-label="Volver">←</button><ServiceHistoryPanel role="client" embedded onOpenService={openService}/></div></div>}{selectedServiceId&&<SentinelErrorBoundary role="client" serviceId={selectedServiceId} checklistCode="CLIENT-ORDER-OPEN" action="client.activity.open_order" severity="P0" title="No pudimos abrir este pedido" onClose={closeService}><ClientServiceDetail serviceId={selectedServiceId} onClose={closeService}/></SentinelErrorBoundary>} {flow.screen==='profile'&&<ClientProfilePanel/>}</div></ClientOnboardingGate>
}
