import React from'react'
import ReactDOM from'react-dom/client'
import{MvpApp}from'./mvp/MvpApp'
import{installApiRuntimeBase}from'./lib/apiRuntime'
import{installSentinel}from'./lib/sentinel'
import{AppErrorBoundary}from'./app/AppErrorBoundary'
import{EnvironmentBadge}from'./app/EnvironmentBadge'
import'./lib/browserVoiceBridge'
import'./styles/tokens.css'
import'./styles/globals.css'
import'./shared/ui/ui.css'
import'./mvp/development-dashboard-status.css'
import'./mvp/client-mobile-p0.css'

installApiRuntimeBase()
installSentinel()

ReactDOM.createRoot(document.getElementById('root')!).render(
 <React.StrictMode>
  <AppErrorBoundary><EnvironmentBadge/><MvpApp/></AppErrorBoundary>
 </React.StrictMode>,
)
