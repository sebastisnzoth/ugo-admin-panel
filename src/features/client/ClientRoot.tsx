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
import{ConnectionBanner,ScreenAnnouncer,useScreenFocus}from'../../shared/ux'
import type{ClientScreen}from'./types/clientTypes'
import'./clientStyles'
type Props={demo:boolean}
const SCREEN_LABEL:Partial<Record<ClientScreen,string>>={home:'Inicio. Elegí un servicio.',request:'Nuevo pedido.',history:'Tu actividad.',profile:'Tu perfil.'}
export function ClientRoot({demo}:Props){
 const flow=useClientFlow()
 const{selectedServiceId,detailOpen,openService,closeService,goHome,openNotice}=useClientRootNavigation({navigateHome:()=>flow.navigate('home'),openDispute:flow.actions.openDispute,openReview:flow.actions.openReview})
 useScreenFocus(flow.screen)
 return <ClientOnboardingGate><div className={`ugo-client-root ugo-client-screen-${flow.screen}${detailOpen?' ugo-client-detail-open':''}`}><a className="ugo-ux-skip-link" href="#ugo-main-content">Saltar al contenido</a><ClientFlowActionsBridge/>{demo&&<DemoSebastianPaymentBridge/>}<ConnectionBanner/><ScreenAnnouncer label={SCREEN_LABEL[flow.screen]||'UGO'}/>{flow.screen==='home'&&!detailOpen&&<ClientPersistentHeader onHome={goHome}/>}<div id="ugo-main-content" className="ugo-ux-screen-host" tabIndex={-1}>{flow.screen==='home'&&<ClientHomeScreen onOpenService={openService}/>} {flow.screen==='request'&&<ClientNeedScreen/>}{flow.screen==='history'&&!detailOpen&&<ClientHistoryOverlay onHome={goHome} onOpenService={openService}/>}{flow.screen==='profile'&&!detailOpen&&<ClientProfilePanel/>}</div><ClientGlobalSurfaces onOpenNotice={openNotice}/><ClientOperationalSurfaces detailOpen={detailOpen} screen={flow.screen}/>{selectedServiceId&&<ClientOrderDetailBoundary serviceId={selectedServiceId} onClose={closeService}/>}</div></ClientOnboardingGate>
}
