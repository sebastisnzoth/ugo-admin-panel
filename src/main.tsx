import React from 'react'
import ReactDOM from 'react-dom/client'
import { MvpApp } from './mvp/MvpApp'
import { UGO_ENVIRONMENT } from './lib/supabaseProject'
import { installApiRuntimeBase } from './lib/apiRuntime'
import { installSentinel,reportSentinelIncident } from './lib/sentinel'
import './lib/browserVoiceBridge'
import './mvp/development-dashboard-status.css'
import './mvp/client-mobile-p0.css'

// Runtime candidate marker: source commits trigger exact-SHA CI, Android TEST packaging and Vercel publication.
installApiRuntimeBase()
installSentinel()

class AppErrorBoundary extends React.Component<React.PropsWithChildren, {error: Error | null}> {
  state={error:null as Error|null}
  static getDerivedStateFromError(error:Error){return{error}}
  componentDidCatch(error:Error,info:React.ErrorInfo){console.error('UGO runtime error',error,info);void reportSentinelIncident({eventType:'react_render_error',message:error.message||'React no pudo renderizar la pantalla',error,severity:'P0',metadata:{componentStack:info.componentStack||''}})}
  render(){
    if(this.state.error){
      return <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:24,background:'#f8faf9',color:'#101828',fontFamily:'Inter,system-ui,sans-serif'}}>
        <section style={{width:'min(480px,100%)',background:'#fff',border:'1px solid #e4e7ec',borderRadius:20,padding:24,boxShadow:'0 18px 50px rgba(16,24,40,.10)'}}>
          <strong style={{color:'#067647',fontSize:13,letterSpacing:'.05em'}}>U.GO</strong>
          <h1 style={{fontSize:24,margin:'8px 0'}}>No pudimos cargar esta pantalla</h1>
          <p style={{color:'#667085',lineHeight:1.5}}>La aplicación encontró un error temporal. El Sentinela registró el fallo para Desarrollo. Recargá para volver a entrar sin perder tu cuenta.</p>
          <button type="button" onClick={()=>window.location.reload()} style={{width:'100%',minHeight:48,border:0,borderRadius:14,background:'#079455',color:'#fff',fontWeight:800,cursor:'pointer'}}>Recargar UGO</button>
        </section>
      </main>
    }
    return this.props.children
  }
}

function TestEnvironmentBadge(){if(UGO_ENVIRONMENT!=='test')return null;return <div aria-label="UGO ambiente de prueba" style={{position:'fixed',top:8,right:8,zIndex:99999,padding:'5px 9px',borderRadius:999,background:'#101828',color:'#fff',font:'700 11px/1.2 Inter,system-ui,sans-serif',letterSpacing:'.08em',boxShadow:'0 4px 14px rgba(16,24,40,.18)',pointerEvents:'none'}}>UGO TEST</div>}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary><TestEnvironmentBadge/><MvpApp /></AppErrorBoundary>
  </React.StrictMode>,
)
