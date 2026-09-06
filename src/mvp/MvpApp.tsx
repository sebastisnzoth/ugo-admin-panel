import React from'react'
import{AdminGate}from'./AdminGate'
import{ClientOnboardingGate}from'./ClientOnboardingGate'
import{ProviderOnboardingGate}from'./ProviderOnboardingGate'
import{Launcher}from'./Launcher'
import{AppLocationButton}from'./AppLocationButton'
import{DemoSebastianPaymentBridge}from'./DemoSebastianPaymentBridge'
import{ServiceHistoryPanel}from'./ServiceHistoryPanel'
import'./mvp.css'
import'./ugo-uiux.css'
import'./mobile-runtime-fixes.css'
import'./service-history.css'

export function MvpApp(){
 const app=new URLSearchParams(window.location.search).get('app')
 if(app==='client')return<><DemoSebastianPaymentBridge/><ClientOnboardingGate/><ServiceHistoryPanel role="client"/><AppLocationButton role="client"/></>
 if(app==='provider')return<><ProviderOnboardingGate/><ServiceHistoryPanel role="provider"/><AppLocationButton role="provider"/></>
 if(app==='admin')return<><AdminGate/><ServiceHistoryPanel role="admin"/><AppLocationButton role="admin"/></>
 return<Launcher/>
}
