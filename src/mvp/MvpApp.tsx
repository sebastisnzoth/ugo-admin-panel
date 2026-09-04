import React from'react'
import{AdminGate}from'./AdminGate'
import{ClientOnboardingGate}from'./ClientOnboardingGate'
import{ProviderOnboardingGate}from'./ProviderOnboardingGate'
import{Launcher}from'./Launcher'
import'./mvp.css'
export function MvpApp(){const app=new URLSearchParams(window.location.search).get('app');if(app==='client')return<ClientOnboardingGate/>;if(app==='provider')return<ProviderOnboardingGate/>;if(app==='admin')return<AdminGate/>;return<Launcher/>}
