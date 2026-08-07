import React from'react'
import{AdminPanel}from'../components/AdminPanel'
import{ClientApp}from'./ClientApp'
import{ProviderApp}from'./ProviderApp'
import{Launcher}from'./Launcher'
import'./mvp.css'
export function MvpApp(){const app=new URLSearchParams(window.location.search).get('app');if(app==='client')return<ClientApp/>;if(app==='provider')return<ProviderApp/>;if(app==='admin')return<AdminPanel/>;return<Launcher/>}
