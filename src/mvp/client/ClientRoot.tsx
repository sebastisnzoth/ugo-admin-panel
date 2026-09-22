import React from'react'
import{AppLocationButton}from'../AppLocationButton'
import{DemoSebastianPaymentBridge}from'../DemoSebastianPaymentBridge'
import{ServiceHistoryPanel}from'../ServiceHistoryPanel'
import{DisputeDock}from'../DisputeDock'
import{ClientGlobalMenu}from'../ClientGlobalMenu'
import{ClientCompletionReview}from'../ClientCompletionReview'
import{ClientLiveTracking}from'../ClientLiveTracking'
import{NotificationCenter}from'../NotificationCenter'
import{ServiceChat}from'../ServiceChat'
import{SentinelErrorBoundary}from'../SentinelErrorBoundary'
import{ClientOnboardingGate}from'../ClientOnboardingGate'
import{ClientFlowActionsBridge}from'./ClientFlowActionsBridge'
import{ClientNeedScreen}from'./ClientNeedScreen'
import{ClientHomeScreen}from'./ClientHomeScreen'
import{ClientHugoBridge}from'./ClientHugoBridge'
import{ClientPaymentChoice}from'./ClientPaymentChoice'
import{ClientProfilePanel}from'./ClientProfilePanel'
import{ClientProviderRadarBridge}from'./ClientProviderRadarBridge'
import{ClientRatingPrompt}from'./ClientRatingPrompt'
import{ClientServiceDetail}from'./ClientServiceDetail'
import{useClientFlow}from'./clientFlow'
import{useClientRootNavigation}from'../../features/client/navigation/useClientRootNavigation'
import{ClientPersistentHeader}from'../../features/client/ui/ClientPersistentHeader'
import'../../features/client/clientStyles'
type Props={demo:boolean}
export function ClientRoot({demo}:Props){
 const flow=useClientFlow()
 const{selectedServiceId,detailOpen,openService,closeService,goHome,openNotice}=useClientRootNavigation({navigateHome:()=>flow.navigate('home'),openDispute:flow.actions.openDispute,openReview:flow.actions.openReview})
 const canonical=flow.screen==='home'||flow.screen==='request'
 return <ClientOnboardingGate><div className={`ugo-client-root ugo-client-screen-${flow.screen}`}><ClientFlowActionsBridge/>{demo&&<DemoSebastianPaymentBridge/>}<ClientPersistentHeader onHome={goHome}/>{flow.screen==='home'&&<ClientHomeScreen onOpenService={openService}/>} {flow.screen==='request'&&<ClientNeedScreen/>}<ClientGlobalMenu/><NotificationCenter role="client" onOpenNotice={openNotice}/><ClientHugoBridge/>{!canonical&&!detailOpen&&<ClientPaymentChoice/>}{!canonical&&!detailOpen&&<ClientLiveTracking/>}{!canonical&&!detailOpen&&<ClientCompletionReview onOpenDispute={flow.actions.openDispute}/>}{flow.screen!=='request'&&!detailOpen&&<ClientRatingPrompt/>}{!canonical&&!detailOpen&&<ServiceChat role="client"/>}{!canonical&&!detailOpen&&<DisputeDock role="client" openRequest={flow.screen==='dispute'}/>}{!canonical&&!detailOpen&&<AppLocationButton role="client"/>}{!canonical&&<ClientProviderRadarBridge/>}{flow.screen==='history'&&!detailOpen&&<div className="ugo-client-screen-overlay"><div className="ugo-client-history-wrap"><button type="button" className="ugo-client-activity-back" onClick={goHome} aria-label="Volver al inicio">‹ <span>Inicio</span></button><ServiceHistoryPanel role="client" embedded onOpenService={openService}/></div></div>}{selectedServiceId&&<SentinelErrorBoundary role="client" serviceId={selectedServiceId} checklistCode="CLIENT-ORDER-OPEN" action="client.activity.open_order" severity="P0" title="No pudimos abrir este pedido" onClose={closeService}><ClientServiceDetail serviceId={selectedServiceId} onClose={closeService}/></SentinelErrorBoundary>}{flow.screen==='profile'&&!detailOpen&&<ClientProfilePanel/>}</div></ClientOnboardingGate>
}
