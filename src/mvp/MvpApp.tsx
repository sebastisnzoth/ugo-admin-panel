import React from'react'
import{AdminGate}from'./AdminGate'
import{ClientOnboardingGate}from'./ClientOnboardingGate'
import{ProviderOnboardingGate}from'./ProviderOnboardingGate'
import{Launcher}from'./Launcher'
import{AppLocationButton}from'./AppLocationButton'
import{DemoSebastianPaymentBridge}from'./DemoSebastianPaymentBridge'
import{ServiceHistoryPanel}from'./ServiceHistoryPanel'
import{DisputeDock}from'./DisputeDock'
import{ClientGlobalMenu}from'./ClientGlobalMenu'
import{ClientCompletionReview}from'./ClientCompletionReview'
import{ClientFlowProvider,useClientFlow}from'./client/clientFlow'
import'./mvp.css'
import'./ugo-uiux.css'
import'./mobile-runtime-fixes.css'
import'./service-history.css'
import'./stitch-client.css'

// UGO Cliente: la revisión final se monta junto al flujo principal para bloquear la liberación hasta revisar evidencias.
export function MvpApp(){
 const app=new URLSearchParams(window.location.search).get('app')
 if(app==='client')return <ClientFlowProvider><ClientRoot/></ClientFlowProvider>
 if(app==='provider')return <div className="ugo-provider-root"><ProviderOnboardingGate/><ServiceHistoryPanel role="provider"/><DisputeDock role="provider"/><AppLocationButton role="provider"/></div>
 if(app==='admin')return<AdminGate/>
 return<Launcher/>
}

function ClientRoot(){
 const flow=useClientFlow()
 return <div className="ugo-client-root"><DemoSebastianPaymentBridge/><ClientOnboardingGate/><ClientGlobalMenu/><ClientCompletionReview onOpenDispute={flow.actions.openDispute}/><ServiceHistoryPanel role="client" openRequest={flow.screen==='history'}/><DisputeDock role="client" openRequest={flow.screen==='dispute'}/><AppLocationButton role="client"/></div>
}
