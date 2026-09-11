import React from'react'
import{AdminGate}from'./AdminGate'
import{ClientOnboardingGate}from'./ClientOnboardingGate'
import{ProviderOnboardingGate}from'./ProviderOnboardingGate'
import{Launcher}from'./Launcher'
import{UgoLanding}from'./UgoLanding'
import{UgoWeb}from'./UgoWeb'
import{AppLocationButton}from'./AppLocationButton'
import{DemoSebastianPaymentBridge}from'./DemoSebastianPaymentBridge'
import{ServiceHistoryPanel}from'./ServiceHistoryPanel'
import{DisputeDock}from'./DisputeDock'
import{ClientGlobalMenu}from'./ClientGlobalMenu'
import{ClientCompletionReview}from'./ClientCompletionReview'
import{ClientFlowProvider,useClientFlow}from'./client/clientFlow'
import'./mvp.css'
import'./ugo-design-system.css'
import'./ugo-uiux.css'
import'./mobile-runtime-fixes.css'
import'./service-history.css'

// UGO Cliente: la revisión final se monta junto al flujo principal para bloquear la liberación hasta revisar evidencias.
export function MvpApp(){
 const app=new URLSearchParams(window.location.search).get('app')
 const demo=new URLSearchParams(window.location.search).get('demo')==='1'
 if(app==='client')return <ClientFlowProvider><ClientRoot demo={demo}/></ClientFlowProvider>
 if(app==='provider')return <div className="ugo-provider-root"><ProviderOnboardingGate/><ServiceHistoryPanel role="provider"/><DisputeDock role="provider"/><AppLocationButton role="provider"/></div>
 if(app==='admin')return<AdminGate/>
 if(app==='web')return<UgoWeb/>
 return<UgoLanding/>
}

function ClientRoot({demo}:{demo:boolean}){
 const flow=useClientFlow()
 return <div className="ugo-client-root">{demo&&<DemoSebastianPaymentBridge/>}<ClientOnboardingGate/><ClientGlobalMenu/><ClientCompletionReview onOpenDispute={flow.actions.openDispute}/><ServiceHistoryPanel role="client" openRequest={flow.screen==='history'}/><DisputeDock role="client" openRequest={flow.screen==='dispute'}/><AppLocationButton role="client"/></div>
}
