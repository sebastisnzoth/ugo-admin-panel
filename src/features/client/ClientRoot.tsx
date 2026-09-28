import React from'react'
import{DemoSebastianPaymentBridge}from'./payments/DemoSebastianPaymentBridge'
import{ClientOnboardingGate}from'./onboarding/ClientOnboardingGate'
import{ClientFlowActionsBridge}from'./actions/ClientFlowActionsBridge'
import{ClientNeedScreen}from'./request/ClientNeedScreen'
import{ClientHomeScreen}from'./home/ClientHomeScreen'
import{ClientProfilePanel}from'./profile/ClientProfilePanel'
import{useClientFlow}from'./flow/clientFlow'
import{useClientRootNavigation}from'./navigation/useClientRootNavigation'
import{ClientPersistentHeader}from'./ui/ClientPersistentHeader'
import{ClientHistoryOverlay}from'./ui/ClientHistoryOverlay'
import{ClientOrderDetailBoundary}from'./ui/ClientOrderDetailBoundary'
import{ClientOperationalSurfaces}from'./ui/ClientOperationalSurfaces'
import{ClientGlobalSurfaces}from'./ui/ClientGlobalSurfaces'
import'./clientStyles'
type Props={demo:boolean}
export function ClientRoot({demo}:Props){
 const flow=useClientFlow()
 const{selectedServiceId,detailOpen,openService,closeService,goHome,openNotice}=useClientRootNavigation({navigateHome:()=>flow.navigate('home'),openDispute:flow.actions.openDispute,openReview:flow.actions.openReview})
 const canonical=flow.screen==='home'||flow.screen==='request'
 return <ClientOnboardingGate><div className={`ugo-client-root ugo-client-screen-${flow.screen}`}><ClientFlowActionsBridge/>{demo&&<DemoSebastianPaymentBridge/>}<ClientPersistentHeader onHome={goHome}/>{flow.screen==='home'&&<ClientHomeScreen onOpenService={openService}/>} {flow.screen==='request'&&<ClientNeedScreen/>}<ClientGlobalSurfaces onOpenNotice={openNotice}/><ClientOperationalSurfaces canonical={canonical} detailOpen={detailOpen} screen={flow.screen} openDispute={flow.actions.openDispute}/>{flow.screen==='history'&&!detailOpen&&<ClientHistoryOverlay onHome={goHome} onOpenService={openService}/>}{selectedServiceId&&<ClientOrderDetailBoundary serviceId={selectedServiceId} onClose={closeService}/>}{flow.screen==='profile'&&!detailOpen&&<ClientProfilePanel/>}</div></ClientOnboardingGate>
}
