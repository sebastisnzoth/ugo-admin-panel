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
import{ClientNeedScreen}from'./ClientNeedScreen'
import{ClientHomeScreen}from'./ClientHomeScreen'
import{ClientHugoBridge}from'./ClientHugoBridge'
import{ClientPaymentChoice}from'./ClientPaymentChoice'
import{ClientProfilePanel}from'./ClientProfilePanel'
import{ClientProviderRadarBridge}from'./ClientProviderRadarBridge'
import{ClientRatingPrompt}from'./ClientRatingPrompt'
import{ClientServiceDetail}from'./ClientServiceDetail'
import{useClientFlow}from'./clientFlow'
import'../../features/client/clientStyles'
type Props={demo:boolean}
export function ClientRoot({demo}:Props){
 const flow=useClientFlow(),pushServiceId=typeof window==='undefined'?null:new URLSearchParams(window.location.search).get('serviceId'),[selectedServiceId,setSelectedServiceId]=useState<string|null>(()=>pushServiceId)
 const openService=(serviceId:string)=>{setSentinelContext({role:'client',serviceId,action:'client.activity.open_order',checklistCode:'CLIENT-ORDER-OPEN',severity:'P0'});setSelectedServiceId(serviceId)}
 const openNotice=(notice:UgoNotification)=>{if(notice.tipo.includes('disputa'))return flow.actions.openDispute();if(notice.tipo==='servicio_completado')return flow.actions.openReview();const serviceId=typeof notice.datos?.servicio_id==='string'?notice.datos.servicio_id:null;if(serviceId)return openService(serviceId);flow.navigate('home')}
 const closeService=()=>{clearSentinelContext();setSelectedServiceId(null)}
 const goHome=()=>{closeService();flow.navigate('home')}
 const detailOpen=Boolean(selectedServiceId),canonical=flow.screen==='home'||flow.screen==='request'
 return <ClientOnboardingGate><div className={`ugo-client-root ugo-client-screen-${flow.screen}`}><ClientFlowActionsBridge/>{demo&&<DemoSebastianPaymentBridge/>}<div className="ugo-client-persistent-header" aria-label="Cabecera UGO"><button type="button" className="ugo-client-header-menu" onClick={()=>document.querySelector<HTMLButtonElement>('.ugo-client-global-trigger')?.click()} aria-label="Abrir menú">☰</button><button type="button" className="ugo-client-header-logo" onClick={goHome} aria-label="Ir al inicio">UG<span>O</span></button></div>{flow.screen==='home'&&<ClientHomeScreen onOpenService={openService}/>} {flow.screen==='request'&&<ClientNeedScreen/>}<ClientGlobalMenu/><NotificationCenter role="client" onOpenNotice={openNotice}/><ClientHugoBridge/>{!canonical&&!detailOpen&&<ClientPaymentChoice/>}{!canonical&&!detailOpen&&<ClientLiveTracking/>}{!canonical&&!detailOpen&&<ClientCompletionReview onOpenDispute={flow.actions.openDispute}/>}{flow.screen!=='request'&&!detailOpen&&<ClientRatingPrompt/>}{!canonical&&!detailOpen&&<ServiceChat role="client"/>}{!canonical&&!detailOpen&&<DisputeDock role="client" openRequest={flow.screen==='dispute'}/>}{!canonical&&!detailOpen&&<AppLocationButton role="client"/>}{!canonical&&<ClientProviderRadarBridge/>}{flow.screen==='history'&&!detailOpen&&<div className="ugo-client-screen-overlay"><div className="ugo-client-history-wrap"><button type="button" className="ugo-client-activity-back" onClick={goHome} aria-label="Volver al inicio">‹ <span>Inicio</span></button><ServiceHistoryPanel role="client" embedded onOpenService={openService}/></div></div>}{selectedServiceId&&<SentinelErrorBoundary role="client" serviceId={selectedServiceId} checklistCode="CLIENT-ORDER-OPEN" action="client.activity.open_order" severity="P0" title="No pudimos abrir este pedido" onClose={closeService}><ClientServiceDetail serviceId={selectedServiceId} onClose={closeService}/></SentinelErrorBoundary>}{flow.screen==='profile'&&!detailOpen&&<ClientProfilePanel/>}</div></ClientOnboardingGate>
}
