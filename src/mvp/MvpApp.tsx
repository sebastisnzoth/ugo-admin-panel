import React from'react'
import{AdminGate}from'./AdminGate'
import{ClientFirstRunOnboarding}from'./ClientFirstRunOnboarding'
import{ProviderFirstRunOnboarding}from'./ProviderFirstRunOnboarding'
import{Launcher}from'./Launcher'
import{AppLocationButton}from'./AppLocationButton'
import{DemoSebastianPaymentBridge}from'./DemoSebastianPaymentBridge'
import{ServiceHistoryPanel}from'./ServiceHistoryPanel'
import{DisputeDock}from'./DisputeDock'
import{ClientGlobalMenu}from'./ClientGlobalMenu'
import{ClientCompletionReview}from'./ClientCompletionReview'
import{ProviderDemandMap}from'./ProviderDemandMap'
import'./mvp.css'
import'./ugo-uiux.css'
import'./mobile-runtime-fixes.css'
import'./service-history.css'

export function MvpApp(){
 const app=new URLSearchParams(window.location.search).get('app')
 if(app==='client')return <div className="ugo-client-root"><DemoSebastianPaymentBridge/><ClientFirstRunOnboarding/><ClientGlobalMenu/><ClientCompletionReview/><ServiceHistoryPanel role="client"/><DisputeDock role="client"/><AppLocationButton role="client"/></div>
 if(app==='provider')return<><ProviderFirstRunOnboarding/><ProviderDemandMap/><ServiceHistoryPanel role="provider"/><DisputeDock role="provider"/><AppLocationButton role="provider"/></>
 if(app==='admin')return<AdminGate/>
 return<Launcher/>
}
