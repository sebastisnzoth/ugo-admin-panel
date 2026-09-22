import React from'react'
import{DemoSebastianPaymentBridge}from'../DemoSebastianPaymentBridge'
import{ClientOnboardingGate}from'../../features/client/onboarding/ClientOnboardingGate'
import{ClientFlowActionsBridge}from'../../features/client/actions/ClientFlowActionsBridge'
import{ClientNeedScreen}from'../../features/client/request/ClientNeedScreen'
import{ClientHomeScreen}from'../../features/client/home/ClientHomeScreen'
import{ClientProfilePanel}from'../../features/client/profile/ClientProfilePanel'
import{useClientFlow}from'./clientFlow'
import{useClientRootNavigation}from'../../features/client/navigation/useClientRootNavigation'
import{ClientPersistentHeader}from'../../features/client/ui/ClientPersistentHeader'
import{ClientHistoryOverlay}from'../../features/client/ui/ClientHistoryOverlay'
import{ClientOrderDetailBoundary}from'../../features/client/ui/ClientOrderDetailBoundary'
import{ClientOperationalSurfaces}from'../../features/client/ui/ClientOperationalSurfaces'
import{ClientGlobalSurfaces}from'../../features/client/ui/ClientGlobalSurfaces'
import'../../features/client/clientStyles'
type Props={demo:boolean}
export function ClientRoot({demo}:Props){
 const flow=useClientFlow()
 const{selectedServiceId,detailOpen,openService,closeService,goHome,openNotice}=useClientRootNavigation({navigateHome:()=>flow.navigate('home'),openDispute:flow.actions.openDispute,openReview:flow.actions.openReview})
 const canonical=flow.screen==='home'||flow.screen==='request'
 return <ClientOnboardingGate><div className={`ugo-client-root ugo-client-screen-${flow.screen}`}><ClientFlowActionsBridge/>{demo&&<DemoSebastianPaymentBridge/>}<ClientPersistentHeader onHome={goHome}/>{flow.screen==='home'&&<ClientHomeScreen onOpenService={openService}/>} {flow.screen==='request'&&<ClientNeedScreen/>}<ClientGlobalSurfaces onOpenNotice={openNotice}/><ClientOperationalSurfaces canonical={canonical} detailOpen={detailOpen} screen={flow.screen} openDispute={flow.actions.openDispute}/>{flow.screen==='history'&&!detailOpen&&<ClientHistoryOverlay onHome={goHome} onOpenService={openService}/>}{selectedServiceId&&<ClientOrderDetailBoundary serviceId={selectedServiceId} onClose={closeService}/>}{flow.screen==='profile'&&!detailOpen&&<ClientProfilePanel/>}</div></ClientOnboardingGate>
}
