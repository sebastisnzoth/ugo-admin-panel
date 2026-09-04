import React from'react'
import{AdminGate}from'./AdminGate'
import{ClientOnboardingGate}from'./ClientOnboardingGate'
import{ProviderOnboardingGate}from'./ProviderOnboardingGate'
import{Launcher}from'./Launcher'
import{AppLocationButton}from'./AppLocationButton'
import'./mvp.css'

export function MvpApp(){
 const app=new URLSearchParams(window.location.search).get('app')
 if(app==='client')return<><ClientOnboardingGate/><AppLocationButton role="client"/></>
 if(app==='provider')return<><ProviderOnboardingGate/><AppLocationButton role="provider"/></>
 if(app==='admin')return<><AdminGate/><AppLocationButton role="admin"/></>
 return<Launcher/>
}
