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
import'./mvp.css'
import'./ugo-uiux.css'
import'./mobile-runtime-fixes.css'
import'./service-history.css'

export function MvpApp(){
 const app=new URLSearchParams(window.location.search).get('app')
 if(app==='client')return <div className="ugo-client-root"><DemoSebastianPaymentBridge/><ClientOnboardingGate/><ClientGlobalMenu/><ClientCompletionReview/><ServiceHistoryPanel role="client"/><DisputeDock role="client"/><AppLocationButton role="client"/></div>
 if(app==='provider')return<><ProviderOnboardingGate/><ServiceHistoryPanel role="provider"/><DisputeDock role="provider"/><AppLocationButton role="provider"/></>
 if(app==='admin')return<AdminGate/>
 return<Launcher/>
}
