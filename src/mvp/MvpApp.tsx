import React from'react'
import{AdminGate}from'./AdminGate'
import{ClientApp}from'./ClientApp'
import{ProviderOnboardingGate}from'./ProviderOnboardingGate'
import{Launcher}from'./Launcher'
import'./mvp.css'
export function MvpApp(){const app=new URLSearchParams(window.location.search).get('app');if(app==='client')return<ClientApp/>;if(app==='provider')return<ProviderOnboardingGate/>;if(app==='admin')return<AdminGate/>;return<Launcher/>}
