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
import{ClientStudioNavbar}from'./ClientStudioNavbar'
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
import'./client-ai-studio-flow.css'
import'./client-google-ai-studio.css'
import'./client-studio-reference.css'
import'./client-studio-radar.css'
import'./client-navbar-cleanup.css'
import'./client-ai-studio-production-lock.css'
import'./client-ai-studio-production-ops.css'
import'./client-ai-studio-final-lock.css'
import'./client-ai-studio-guided-complete.css'
import'./client-real-test-fixes.css'
import'./client-flow-reference-2026.css'

type Props={demo:boolean}
export function ClientRoot({demo}:Props){
 const flow=useClientFlow(),[selectedServiceId,setSelectedServiceId]=useState<string|null>(null)
 const openNotice=(notice:UgoNotification)=>{if(notice.tipo.includes('disputa'))return flow.actions.openDispute();if(notice.tipo==='servicio_completado')return flow.actions.openReview();flow.navigate('home')}
 const openService=(serviceId:string)=>{setSentinelContext({role:'client',serviceId,action:'client.activity.open_order',checklistCode:'CLIENT-ORDER-OPEN',severity:'P0'});setSelectedServiceId(serviceId)}
 const closeService=()=>{clearSentinelContext();setSelectedServiceId(null)}
 const detailOpen=Boolean(selectedServiceId)
 return <ClientOnboardingGate><div className={`ugo-client-root ugo-client-screen-${flow.screen}`}><ClientFlowActionsBridge/>{demo&&<DemoSebastianPaymentBridge/>}<ClientStudioNavbar/>{flow.screen==='home'&&<ClientPremiumHome onOpenService={openService}/>} {flow.screen==='request'&&<ClientGuidedRequest/>} {flow.screen!=='request'&&!detailOpen&&<ClientHugoBridge/>}{flow.screen!=='request'&&!detailOpen&&<ClientPaymentChoice/>}<ClientGlobalMenu/><NotificationCenter role="client" onOpenNotice={openNotice}/>{!detailOpen&&<ClientLiveTracking/>}{flow.screen!=='request'&&!detailOpen&&<ClientCompletionReview onOpenDispute={flow.actions.openDispute}/>}{flow.screen!=='request'&&!detailOpen&&<ClientRatingPrompt/>}{flow.screen!=='request'&&!detailOpen&&<ServiceChat role="client"/>}{flow.screen!=='request'&&!detailOpen&&<DisputeDock role="client" openRequest={flow.screen==='dispute'}/>}{flow.screen!=='request'&&!detailOpen&&<AppLocationButton role="client"/>}<ClientProviderRadarBridge/>{flow.screen==='history'&&!detailOpen&&<div className="ugo-client-screen-overlay"><div className="ugo-client-history-wrap"><ServiceHistoryPanel role="client" embedded onOpenService={openService}/></div></div>}{selectedServiceId&&<SentinelErrorBoundary role="client" serviceId={selectedServiceId} checklistCode="CLIENT-ORDER-OPEN" action="client.activity.open_order" severity="P0" title="No pudimos abrir este pedido" onClose={closeService}><ClientServiceDetail serviceId={selectedServiceId} onClose={closeService}/></SentinelErrorBoundary>}{flow.screen==='profile'&&!detailOpen&&<ClientProfilePanel/>}</div></ClientOnboardingGate>
}
